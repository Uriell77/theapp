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
			const prompt = `Eres un diseñador narrativo de campañas épicas de videojuegos. 
El usuario, llamado "${nombre_de_usuario}", tiene un desafío de productividad en el mundo real: "${title}".
El tema estético y narrativo elegido es: "${tema}".

Tu objetivo es construir una campaña narrativa inmersiva de pura acción, estrictamente secuencial y dividida exactamente en ${cantidad_de_niveles} capítulos, poniendo a ${nombre_de_usuario} como el protagonista y héroe absoluto.

REGLAS NARRATIVAS (METÁFORA DE MISIÓN Y CONTINUIDAD PERFECTA):
1. MISIÓN Y ENEMIGO CLARO: Desde el Capítulo 1, establece una AMENAZA inminente (un imperio, una horda, un cataclismo, un monstruo) y un OBJETIVO TANGIBLE que el protagonista debe lograr paso a paso (ej: cargar un arma gigante, reparar un escudo, forjar un artefacto, recorrer un territorio hostil). 
2. CONTINUIDAD ABSOLUTA: La historia NO son viñetas aisladas. Es un solo arco argumental ininterrumpido. Cada capítulo debe retomar la acción exactamente donde la dejó el anterior y escalar la tensión, sintiéndose como fases consecutivas de una misma operación contrarreloj.
3. INMERSIÓN DE VIDEOJUEGO: Utiliza un tono de urgencia. Puedes iniciar los capítulos simulando interfaces (ej: "Transmisión Entrante", "Alerta de Proximidad", "Reporte de Daños") para darle dinamismo a la historia.
4. METÁFORA SUTIL: NUNCA menciones explícitamente la tarea técnica ni la aplicación. No hagas analogías baratas. El progreso real se traduce 100% en avance de la misión ficticia.
5. ESTRUCTURA DE LA CAMPAÑA: 
   - Capítulo inicial: Presenta la crisis, el enemigo y la secuencia de inicio de la misión.
   - Capítulos intermedios: El enemigo ataca, las defensas sufren, hay tensión y resistencia, pero el objetivo de ${nombre_de_usuario} (el arma, escudo o viaje) acumula poder gracias a su esfuerzo continuo.
   - Capítulo final: El Clímax Épico. El enfrentamiento cara a cara contra el Jefe Final o la catástrofe, la ejecución de la misión al 100% y una victoria absoluta y explosiva.
6. REGLA ESTRICTA DE PUNTUACIÓN: Cada capítulo debe iniciar con un Título evocador seguido de un único punto (.). Después de ese primer punto, está ESTRICTAMENTE PROHIBIDO usar más puntos (.) en todo el texto restante del capítulo (debes hilar las ideas usando comas, punto y coma, o signos de exclamación).
7. MOTIVACIÓN ENCUBIERTA: Al final de cada capítulo, cierra con una frase de urgencia e inspiración (sin decir que es motivacional) que empuje a ${nombre_de_usuario} a no rendirse y prepararse para el siguiente embate.

REGLAS VISUALES (CINEMÁTICA):
Para cada capítulo, asigna una atmósfera visual usando EXCLUSIVAMENTE combinaciones de las siguientes etiquetas:
- effect: space-cockpit, hyper-warp, alien-forest, fire-battle, volcano-embers, ash-storm, toxic-rain, data-matrix, magic-runes, blood-drip, electric-storm, snow-blizzard, underwater-bubbles, nebula-dust.
- color: deep-space-blue, cyberpunk-neon, toxic-green, infernal-orange, blood-red, military-khaki, fantasy-gold, void-purple, ice-cyan, apocalyptic-rust.
- speed: static, slow, normal, fast, chaotic, pulsing.
- lighting: vignette-dark, lens-flare, strobe-alarm, candle-flicker, lightning-flash, eclipse-ring, none.
- mood: intro, rising-tension, boss-fight, victory, defeat.

FORMATO DE SALIDA:
Devuelve EXCLUSIVAMENTE un objeto JSON válido (sin formato Markdown adicional) con esta estructura exacta:
{
  "chapters": [
    "Capítulo 1: Título. [Narrativa continua sin usar más puntos...]",
    "Capítulo 2: Título. [Continuación directa de la acción sin usar más puntos...]",
    ... (debe haber exactamente ${cantidad_de_niveles} capítulos aquí)
  ],
  "cinematica": [
    { "effect": "...", "color": "...", "speed": "...", "lighting": "...", "mood": "..." },
    ... (debe haber exactamente ${cantidad_de_niveles} objetos aquí)
  ],
  "defeatChapter": "Final Alternativo: Retirada Táctica. [Narra de forma épica cómo ${nombre_de_usuario} debe ordenar la retirada ante fuerzas abrumadoras, dejando un mensaje profundamente humano sobre lamer las heridas, aprender de la derrota y prepararse para volver a luchar otro día, sin usar más puntos.]",
  "defeatCinematica": { "effect": "ash-storm", "color": "deep-space-blue", "speed": "slow", "lighting": "vignette-dark", "mood": "defeat" }
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
    const statusVal = (formData.get('status') as string) || '-1';
    await db
      .update(tasks)
      .set({ status: statusVal })
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
