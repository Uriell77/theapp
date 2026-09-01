import { db } from '$lib/server/db';
import { users, tasks, levels } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import { GoogleGenAI } from '@google/genai';
import { GEMINI_API_KEY } from '$env/static/private';
import type { PageServerLoad, Actions } from './$types';

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/auth');
	}

	// Consulta relacional directa con Drizzle (sin fetch HTTP en SSR)
	const userRecord = await db.query.users.findFirst({
		where: eq(users.id, locals.user.id),
		columns: {
			id: true,
			nombre_de_usuario: true,
			email: true,
			createdAt: true
		},
		with: {
			tasks: {
				with: {
					levels: true
				}
			}
		}
	});

	if (!userRecord) {
		throw redirect(303, '/auth');
	}

	return {
		user: userRecord
	};
};

export const actions: Actions = {
	createTask: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { message: 'No autenticado' });
		}

		const formData = await request.formData();
		const title = (formData.get('title') as string)?.trim();
		const tema = (formData.get('tema') as string)?.trim();
		const cantidad_de_niveles = parseInt(formData.get('cantidad_de_niveles') as string, 10);
		const nombre_de_usuario = (formData.get('nombredeusuario') as string)?.trim();

		if (!title || !tema || isNaN(cantidad_de_niveles) || cantidad_de_niveles < 1) {
			return fail(400, {
				title,
				tema,
				cantidad_de_niveles,
				message: 'Todos los campos son obligatorios'
			});
		}

		// 1. Generar narrativa con Gemini (modelo gemini-3.6-flash)
		let chapters: string[] = [];
		try {
			const prompt = `Eres un escritor experto en narrativas inmersivas y gamificación. Genera una historia secuencial y emocionante dividida exactamente en ${cantidad_de_niveles} capítulos para el proyecto "${title}" con temática "${tema}".
Cada capítulo debe relatar de forma inmersiva y descriptiva el desafío, hito o avance correspondiente a ese nivel, manteniendo coherencia de inicio a fin.
Devuelve un JSON estricto con el formato: { "chapters": ["Capítulo 1: ...", "Capítulo 2: ..."] }. Solo devuelve el JSON sin formato extra.`;

			let result;
			let retries = 3;
			while (retries > 0) {
				try {
					result = await ai.models.generateContent({
						model: 'gemini-3.6-flash',
						contents: prompt,
						config: {
							responseMimeType: 'application/json'
						}
					});
					break;
				} catch (aiError: any) {
					if ((aiError.status === 503 || aiError.status === 429) && retries > 1) {
						retries--;
						const waitTime = aiError.status === 429 ? 3000 : 2000;
						await new Promise((resolve) => setTimeout(resolve, waitTime));
						continue;
					}
					throw aiError;
				}
			}

			if (!result?.text) {
				throw new Error('Respuesta vacía del modelo de IA');
			}

			let rawText = result.text.trim();
			if (rawText.startsWith('```json')) {
				rawText = rawText.replace(/^```json\s*/, '').replace(/```\s*$/, '');
			} else if (rawText.startsWith('```')) {
				rawText = rawText.replace(/^```\s*/, '').replace(/```\s*$/, '');
			}

			const parsed = JSON.parse(rawText);
			chapters = Array.isArray(parsed.chapters) ? parsed.chapters : [];

			if (chapters.length === 0) {
				chapters = Array.from(
					{ length: cantidad_de_niveles },
					(_, i) => `Nivel ${i + 1}: Desafío de ${title}`
				);
			}
		} catch (aiError) {
			console.error('Error generando historia con IA:', aiError);
			// Fallback seguro si falla la IA
			chapters = Array.from(
				{ length: cantidad_de_niveles },
				(_, i) => `Nivel ${i + 1}: Explorando ${tema} en ${title}`
			);
		}

		// 2. Insertar tarea y niveles con Drizzle ORM
		try {
			const [newTask] = await db
				.insert(tasks)
				.values({
					title,
					tema,
					cantidad_de_niveles,
					userId: locals.user.id,
					status: '0'
				})
				.returning();

			if (!newTask) {
				return fail(500, { message: 'Error al crear la tarea' });
			}

			await db.insert(levels).values({
				taskId: newTask.id,
				content: chapters,
				cinematica: Array(cantidad_de_niveles).fill(''),
				vista: Array(cantidad_de_niveles).fill(false)
			});

			return { success: true };
		} catch (dbError) {
			console.error('Error al guardar tarea en base de datos:', dbError);
			return fail(500, { message: 'Error al registrar la tarea en la base de datos' });
		}
	},

	advanceLevel: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { message: 'No autenticado' });
		}

		const formData = await request.formData();
		const taskId = parseInt(formData.get('taskId') as string, 10);

		if (isNaN(taskId)) {
			return fail(400, { message: 'ID de tarea inválido' });
		}

		// Protección IDOR: Verificar que la tarea pertenece al usuario actual
		const [task] = await db
			.select()
			.from(tasks)
			.where(and(eq(tasks.id, taskId), eq(tasks.userId, locals.user.id)))
			.limit(1);

		if (!task) {
			return fail(404, { message: 'Tarea no encontrada o no autorizada' });
		}

		const currentStatus = parseInt(task.status, 10) || 0;
		if (currentStatus < task.cantidad_de_niveles - 1) {
			try {
				await db
					.update(tasks)
					.set({ status: (currentStatus + 1).toString() })
					.where(and(eq(tasks.id, taskId), eq(tasks.userId, locals.user.id)));

				return { success: true };
			} catch (updateError) {
				console.error('Error al actualizar nivel:', updateError);
				return fail(500, { message: 'Error al avanzar nivel' });
			}
		}

		return { success: true };
	}
};
