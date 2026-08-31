import { supabase } from '$lib/supabaseClient';
import { fail, redirect } from '@sveltejs/kit';
import { GoogleGenAI } from '@google/genai';
import { GEMINI_API_KEY } from '$env/static/private';
import fs from 'fs';
import path from 'path';

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

async function safeGenerateContent(prompt: string, config?: any) {
    let retries = 5;
    while (retries > 0) {
        try {
            return await ai.models.generateContent({
                model: 'gemini-3.6-flash',
                contents: prompt,
                ...(config ? { config } : {})
            });
        } catch (aiError: any) {
            if ((aiError.status === 503 || aiError.status === 429) && retries > 1) {
                retries--;
                const waitTime = aiError.status === 429 ? 30000 : 5000;
                console.warn(`Gemini API ${aiError.status}, retrying in ${waitTime}ms... (${retries} retries left)`);
                await new Promise((resolve) => setTimeout(resolve, waitTime));
                continue;
            }
            throw aiError;
        }
    }
    throw new Error('No se pudo generar el contenido tras varios intentos.');
}

export const load = async ({ cookies }) => {
	const userId = cookies.get('session');

	if (!userId) {
		throw redirect(303, '/auth');
	}

	// Consulta anidada: trae el usuario, sus tareas, y los niveles de cada tarea
	const { data, error } = await supabase
		.from('users')
		.select(`
			*,
			tasks (
				*,
				levels (
					*
				)
			)
		`)
		.eq('id', userId)
		.maybeSingle();

	if (error) {
		console.error('Error fetching data:', error);
		return { status: 500, error: error.message };
	}

	if (!data) {
		return { status: 404 };
	}

	return {
		user: data
	};
};

export const actions = {
	createTask: async ({ request, cookies }) => {
		const userId = cookies.get('session');
		if (!userId) {
			return fail(401, { message: 'No autenticado' });
		}

		const formData = await request.formData();
		const title = formData.get('title') as string;
		const tema = formData.get('tema') as string;
		const cantidad_de_niveles = parseInt(formData.get('cantidad_de_niveles') as string);

		if (!title || !tema || isNaN(cantidad_de_niveles)) {
			return fail(400, { title, tema, cantidad_de_niveles, message: 'Todos los campos son obligatorios' });
		}

		// 1. Crear la tarea primero
		const { data: task, error: taskError } = await supabase
			.from('tasks')
			.insert([
				{
					title,
					tema,
					cantidad_de_niveles,
					user_id: userId
				}
			])
			.select()
			.single();

		if (taskError) {
			console.error('Error al crear tarea:', taskError);
			return fail(500, { message: 'Error al crear la tarea' });
		}

		// 2. Generar narrativa con Gemini
		try {
			const prompt = `Eres un escritor experto en historias de terror. Genera una historia secuencial dividida en ${cantidad_de_niveles} capítulos para el proyecto "${title}" con temática "${tema}".
            Devuelve un JSON con la estructura: { "chapters": ["Capítulo 1...", "Capítulo 2...", ...] }. Solo devuelve el JSON.`;

			const result = await safeGenerateContent(prompt, { responseMimeType: 'application/json' });
			const responseText = result.text;
			const { chapters } = JSON.parse(responseText || '{}');

			// 3. Generar prompts e imágenes cinemáticas
			/*
			const cinematicPaths = await Promise.all(
				chapters.map(async (chapter: string, index: number) => {
					const prompt = `Describe una imagen cinematográfica de terror basada en esta narrativa: "${chapter}". Solo devuelve un prompt breve y detallado para un generador de imágenes.`;
					
					const promptResult = await safeGenerateContent(prompt);
					const imagePrompt = promptResult.text || "horror scene";
					
					// URL simulada de generación de imagen (en un escenario real aquí llamarías a una API de generación como DALL-E o similar)
					const imageUrl = `https://picsum.photos/seed/${encodeURIComponent(imagePrompt.substring(0, 20))}/800/400`;
					
					// Descargar y guardar localmente
					const filename = `level_${task.id}_${index}_${Date.now()}.jpg`;
					const filepath = path.join(process.cwd(), 'static', 'cinematicas', filename);
					
					const response = await fetch(imageUrl);
					const buffer = Buffer.from(await response.arrayBuffer());
					fs.writeFileSync(filepath, buffer);
					
					return `cinematicas/${filename}`;
				})
			);
			*/
			const cinematicPaths: string[] = [];


			// 4. Insertar niveles en la tabla 'levels'
			const { error: levelsError } = await supabase.from('levels').insert([
				{
					task_id: task.id,
					content: chapters,
					cinematica: cinematicPaths, // Usamos los paths locales generados
					vista: Array(cantidad_de_niveles).fill(false) // Placeholder inicial
				}
			]);

			if (levelsError) {
				console.error('Error al guardar niveles:', levelsError);
				// Rollback: borrar la tarea
				await supabase.from('tasks').delete().eq('id', task.id);
				return fail(500, { message: 'Tarea creada pero error al guardar niveles. Tarea eliminada.' });
			}
		} catch (aiError: any) {
			console.error('Error en generación AI:', aiError);
			// Rollback: borrar la tarea
			await supabase.from('tasks').delete().eq('id', task.id);
			
			let errorMessage = 'Error al generar la narrativa. Tarea no creada.';
			if (aiError.status === 429) {
				errorMessage = 'Se ha agotado la cuota de uso de la IA. Por favor, intenta de nuevo más tarde.';
			}
			return fail(500, { message: errorMessage });
		}

		return { success: true };
		},
		advanceLevel: async ({ request, cookies }) => {
		const userId = cookies.get('session');
		if (!userId) {
			return fail(401, { message: 'No autenticado' });
		}

		const formData = await request.formData();
		const taskId = parseInt(formData.get('taskId') as string);

		// Obtener la tarea actual y el nivel actual
		const { data: task, error: taskError } = await supabase
			.from('tasks')
			.select('*, levels(*)')
			.eq('id', taskId)
			.single();

		if (taskError || !task) {
			return fail(404, { message: 'Tarea no encontrada' });
		}

		// Incrementar nivel si es posible
		const currentStatus = parseInt(task.status) || 0;
		if (currentStatus < task.cantidad_de_niveles - 1) {
			const { error } = await supabase
				.from('tasks')
				.update({ status: (currentStatus + 1).toString() })
				.eq('id', taskId);

			if (error) {
				return fail(500, { message: 'Error al avanzar nivel' });
			}
		}

		return { success: true };
		}
		};