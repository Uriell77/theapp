import { supabase } from '$lib/supabaseClient';
import { fail, redirect } from '@sveltejs/kit';
import { GoogleGenAI } from '@google/genai';
import { GEMINI_API_KEY } from '$env/static/private';

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

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
			const prompt = `Eres un escritor experto en historias de distintos generos. Genera una historia secuencial dividida en ${cantidad_de_niveles} capítulos para el proyecto "${title}" con temática "${tema}".
            Devuelve un JSON con la estructura: { "chapters": ["Capítulo 1...", "Capítulo 2...", ...] }. Solo devuelve el JSON.`;

			let result;
			let retries = 3;
			while (retries > 0) {
				try {
					result = await ai.models.generateContent({
						model: 'gemini-3.6-flash',
						contents: prompt,
						config: { responseMimeType: 'application/json' }
					});
					break; // Éxito
				} catch (aiError: any) {
					if (aiError.status === 503 && retries > 1) {
						retries--;
						await new Promise((resolve) => setTimeout(resolve, 2000)); // Esperar 2 segundos
						continue;
					}
					throw aiError;
				}
			}

			if (!result) throw new Error('No se pudo generar la historia tras varios intentos.');

			const responseText = result.text;
			const { chapters } = JSON.parse(responseText || '{}');

			// 3. Insertar niveles en la tabla 'levels'
			const { error: levelsError } = await supabase.from('levels').insert([
				{
					task_id: task.id,
					content: chapters,
					cinematica: Array(cantidad_de_niveles).fill(''), // Placeholder inicial
					vista: Array(cantidad_de_niveles).fill(false) // Placeholder inicial
				}
			]);

			if (levelsError) {
				console.error('Error al guardar niveles:', levelsError);
				// Rollback: borrar la tarea
				await supabase.from('tasks').delete().eq('id', task.id);
				return fail(500, { message: 'Tarea creada pero error al guardar niveles. Tarea eliminada.' });
			}
		} catch (aiError) {
			console.error('Error en generación AI:', aiError);
			// Rollback: borrar la tarea
			await supabase.from('tasks').delete().eq('id', task.id);
			return fail(500, { message: 'Error al generar la narrativa. Tarea no creada.' });
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