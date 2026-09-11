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
		let cinematicaTags: any[] = [];
		let defeatChapter = '';
		try {
			const prompt = `Eres un novelista y diseñador narrativo de alta literatura. 
El usuario, llamado "${nombre_de_usuario}", tiene un desafío de productividad en el mundo real: "${title}".
El tema estético y narrativo elegido es: "${tema}".

Tu objetivo es construir una narrativa inmersiva y estrictamente secuencial dividida exactamente en ${cantidad_de_niveles} capítulos, poniendo a ${nombre_de_usuario} como el protagonista absoluto.

REGLAS NARRATIVAS (METÁFORA SUTIL):
1. NUNCA menciones explícitamente la tarea técnica ni la aplicación. No hagas analogías baratas ni infantiles.
2. Trata el universo narrativo con seriedad. El progreso en la vida real de ${nombre_de_usuario} debe traducirse en una odisea profunda de supervivencia, exploración, combate o descubrimiento acorde al tema "${tema}".
3. Estructura: El primer capítulo establece el misterio y el entorno. Los intermedios aumentan drásticamente la tensión, los obstáculos y la psicología del personaje. El último capítulo de esta lista es el Clímax Épico y la victoria absoluta.

REGLAS VISUALES (CINEMÁTICA):
Para cada capítulo, debes asignar una atmósfera visual. Usa EXCLUSIVAMENTE combinaciones de las siguientes etiquetas para poblar el objeto JSON:
- effect: space-cockpit, hyper-warp, alien-forest, fire-battle, volcano-embers, ash-storm, toxic-rain, data-matrix, magic-runes, blood-drip, electric-storm, snow-blizzard, underwater-bubbles, nebula-dust.
- color: deep-space-blue, cyberpunk-neon, toxic-green, infernal-orange, blood-red, military-khaki, fantasy-gold, void-purple, ice-cyan, apocalyptic-rust.
- speed: static, slow, normal, fast, chaotic, pulsing.
- lighting: vignette-dark, lens-flare, strobe-alarm, candle-flicker, lightning-flash, eclipse-ring, none.
- mood: intro, rising-tension, boss-fight, victory, defeat.

FORMATO DE SALIDA:
Devuelve EXCLUSIVAMENTE un objeto JSON válido (sin bloques de código Markdown, sin texto extra) con esta estructura exacta:
{
  "chapters": [
    "Capítulo 1: [Narrativa inmersiva del inicio...]",
    "Capítulo 2: [Narrativa del desarrollo...]",
    ... (debe haber exactamente ${cantidad_de_niveles} capítulos aquí)
  ],
  "cinematica": [
    { "effect": "...", "color": "...", "speed": "...", "lighting": "...", "mood": "..." },
    ... (debe haber exactamente ${cantidad_de_niveles} objetos aquí, correspondientes a cada capítulo)
  ],
  "defeatChapter": "Final Alternativo: [Narra una retirada estratégica de ${nombre_de_usuario} ante el peso de su misión. Debe tener un mensaje profundamente humano, reflexivo y de ánimo, recordando que las cicatrices enseñan y siempre se puede volver a intentar.]",
  "defeatCinematica": { "effect": "ash-storm", "color": "deep-space-blue", "speed": "static", "lighting": "vignette-dark", "mood": "defeat" }
}`;
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
			let cinematicaTags = Array.isArray(parsed.cinematica) ? parsed.cinematica : [];
			defeatChapter = parsed.defeatChapter || '';

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

		// Generar etiquetas cinemática basadas en los capítulos creados
		cinematicaTags = chapters.map((cap) => {
			const lower = cap.toLowerCase();
			if (lower.includes('tormenta')) {
				return {
					effect: 'storm',
					color: '#001f3f', // azul oscuro
					speed: 'fast',
					lighting: 'flashes',
					mood: 'dramatic'
				};
			} else if (lower.includes('volcán') || lower.includes('erupción')) {
				return {
					effect: 'volcano',
					color: '#ff4500', // rojo‑naranja
					speed: 'medium',
					lighting: 'smoke',
					mood: 'intense'
				};
			} else {
				return {
					effect: 'default',
					color: '#ffffff',
					speed: 'normal',
					lighting: 'none',
					mood: 'neutral'
				};
			}
		});

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
				cinematica: cinematicaTags.map(tag => JSON.stringify(tag)),
				vista: [defeatChapter]
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
	},
  abandonTask: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'No autenticado' });
    }
    const formData = await request.formData();
    const taskId = parseInt(formData.get('taskId') as string, 10);
    if (isNaN(taskId)) {
      return fail(400, { message: 'ID de tarea inválido' });
    }
    const [task] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, locals.user.id)))
      .limit(1);
    if (!task) {
      return fail(404, { message: 'Tarea no encontrada' });
    }
    await db
      .update(tasks)
      .set({ status: '-1'})
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, locals.user.id)));
    return { success: true };
  },

  resetTask: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { message: 'No autenticado' });
    }
    const formData = await request.formData();
    const taskId = parseInt(formData.get('taskId') as string, 10);
    if (isNaN(taskId)) {
      return fail(400, { message: 'ID de tarea inválido' });
    }
    const [task] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, locals.user.id)))
      .limit(1);
    if (!task) {
      return fail(404, { message: 'Tarea no encontrada' });
    }
    await db
      .update(tasks)
      .set({ status: '0' })
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, locals.user.id)));
    return { success: true };
  }
};
