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

		// 1. Generar narrativa con Gemini (modelo gemini-2.5-flash)
		let chapters: string[] = [];
		let cinematicaTags: any[] = [];
		let defeatChapter = '';
		let defeatCinematica: any = null;

		function detectCinematicaForText(text: string, defaultMood: string = 'rising-tension') {
			const lower = (text || '').toLowerCase();

			// Fuego / Volcán / Batalla Ígnea / Magma / Explosiones
			if (/(fuego|llama|ardient|infernal|volc[aá]n|lava|magma|incendio|combusti[oó]n|ceniza|explosi[oó]n|abrasad|calor|ascuas|antorcha)/.test(lower)) {
				return {
					effect: lower.includes('volc') || lower.includes('ceniza') ? 'volcano-embers' : 'fire-battle',
					color: 'infernal-orange',
					speed: 'normal',
					lighting: 'candle-flicker',
					mood: defaultMood === 'defeat' ? 'defeat' : 'boss-fight'
				};
			}

			// Tormenta Eléctrica / Rayos / Truenos / Tempestad / Relámpagos
			if (/(tormenta|rayo|rel[aá]mpago|trueno|tempestad|el[eé]ctric|cielo oscuro|hurac[aá]n|cicl[oó]n|lluvia|truenos)/.test(lower)) {
				return {
					effect: 'electric-storm',
					color: 'deep-space-blue',
					speed: 'fast',
					lighting: 'lightning-flash',
					mood: defaultMood === 'defeat' ? 'defeat' : 'rising-tension'
				};
			}

			// Nieve / Ventisca / Hielo / Glaciar / Congelación
			if (/(nieve|hielo|ventisca|glaci|polar|congelad|helad|fr[ií]o|escarcha|tundra|avalancha)/.test(lower)) {
				return {
					effect: 'snow-blizzard',
					color: 'ice-cyan',
					speed: 'normal',
					lighting: 'vignette-dark',
					mood: defaultMood
				};
			}

			// Submarino / Océano / Agua / Abismo Marino
			if (/(mar\b|oc[eé]ano|agua|submarin|abismo|profundidad|acu[aá]tic|olas|inmersi[oó]n|naufragio)/.test(lower)) {
				return {
					effect: 'underwater-bubbles',
					color: 'deep-space-blue',
					speed: 'slow',
					lighting: 'none',
					mood: defaultMood
				};
			}

			// Tóxico / Veneno / Selva Alienígena / Ácido / Radiación / Pantano
			if (/(t[oó]xic|veneno|pantano|selva|alien|alien[ií]gena|mutaci[oó]n|espora|qu[ií]mic|[aá]cido|radiaci[oó]n)/.test(lower)) {
				return {
					effect: lower.includes('selva') || lower.includes('espora') ? 'alien-forest' : 'toxic-rain',
					color: 'toxic-green',
					speed: 'normal',
					lighting: 'none',
					mood: defaultMood
				};
			}

			// Ciberespacio / Matriz / Código / Hack / Digital / Red / IA
			if (/(ciber|matriz|matrix|c[oó]digo|hacker|digital|servidor|terminal|red\b|protocolo|ia\b|algoritmo|interfaz|firewall)/.test(lower)) {
				return {
					effect: 'data-matrix',
					color: 'cyberpunk-neon',
					speed: 'normal',
					lighting: 'none',
					mood: defaultMood
				};
			}

			// Magia Arcana / Runas / Hechicería / Reliquias
			if (/(magi|arcano|runa|hechizo|m[ií]stic|reliquia|portal|energ[ií]a ancestral|templo|ancestral)/.test(lower)) {
				return {
					effect: 'magic-runes',
					color: 'fantasy-gold',
					speed: 'slow',
					lighting: 'eclipse-ring',
					mood: defaultMood
				};
			}

			// Sangre / Masacre / Violencia Cruda / Carmesí
			if (/(sangre|carmes[ií]|masacre|herida|desgarr|carnicer[ií]a|degoll)/.test(lower)) {
				return {
					effect: 'blood-drip',
					color: 'blood-red',
					speed: 'normal',
					lighting: 'strobe-alarm',
					mood: defaultMood
				};
			}

			// Cenizas / Páramo / Desierto / Polvo / Apocalipsis / Retirada
			if (/(ceniza|desierto|p[aá]ramo|ruinas|apocal[ií]pt|polvo|destrucci[oó]n|desolaci[oó]n|retirada)/.test(lower)) {
				return {
					effect: 'ash-storm',
					color: 'apocalyptic-rust',
					speed: 'slow',
					lighting: 'vignette-dark',
					mood: defaultMood === 'defeat' ? 'defeat' : 'rising-tension'
				};
			}

			// Espacio / Galaxia / Estelar / Naves / Hiperespacio
			if (/(espaci|galaxi|nave|estelar|hiperespacio|cosmos|estrellas|astral|orbital|warp)/.test(lower)) {
				return {
					effect: lower.includes('warp') || lower.includes('hiper') ? 'hyper-warp' : 'space-cockpit',
					color: 'deep-space-blue',
					speed: 'normal',
					lighting: 'lens-flare',
					mood: defaultMood
				};
			}

			return {
				effect: defaultMood === 'defeat' ? 'ash-storm' : 'space-cockpit',
				color: defaultMood === 'defeat' ? 'apocalyptic-rust' : 'deep-space-blue',
				speed: 'normal',
				lighting: defaultMood === 'defeat' ? 'vignette-dark' : 'none',
				mood: defaultMood
			};
		}

		try {
			const prompt = `Eres un diseñador narrativo de campañas épicas de videojuegos y experiencias inmersivas. 
El usuario, llamado "${nombre_de_usuario}", tiene un desafío de productividad en el mundo real: "${title}".
El tema estético y narrativo elegido es: "${tema}".

Tu objetivo es construir una campaña narrativa inmersiva, estrictamente secuencial y dividida exactamente en ${cantidad_de_niveles} capítulos, poniendo a ${nombre_de_usuario} como el protagonista absoluto.

REGLAS NARRATIVAS (METÁFORA Y CONTINUIDAD):
1. MISIÓN, ENEMIGO Y ARQUETIPO CLAROS: Desde el Capítulo 1, establece una amenaza y un objetivo tangible que debe lograrse paso a paso. El TIPO de misión debe adaptarse lógicamente al tema:
   - Guerra/Fantasía: Trama de CONQUISTA o COMBATE (derrotar a un enemigo o monstruo).
   - Misterio/Espionaje/Romance: Trama de SIGILO, CONEXIÓN o INTELIGENCIA (descubrir secretos, infiltrarse, superar la distancia).
   - Supervivencia/Catástrofe: Trama de RESISTENCIA (soportar el clima, escapar o construir refugio).
2. CONTINUIDAD DE PLANO SECUENCIA (IN MEDIA RES): La historia es una película de acción en plano secuencia sin cortes de cámara. A partir del Capítulo 2, TIENES ESTRICTAMENTE PROHIBIDO iniciar con resúmenes, reportes de estado (ej. "Infiltración confirmada") o saltos temporales. Debes empezar la primera palabra del capítulo exactamente en el mismo segundo de tensión física o emocional con el que terminó el capítulo anterior. 
3. PROHIBIDO USAR PLANTILLAS: No repitas estructuras. No inicies cada capítulo dirigiéndote al protagonista por su nombre como si fuera un robot. Haz que la prosa fluya de manera visceral, conectando la urgencia del final del capítulo anterior directamente con el obstáculo del nuevo capítulo.
4. METÁFORA SUTIL: NUNCA menciones explícitamente la tarea técnica ni la aplicación. No hagas analogías baratas; el esfuerzo real equivale al progreso en la historia.
5. REGLA ESTRICTA DE PUNTUACIÓN: Cada capítulo debe iniciar con un Título evocador seguido de un único punto (.). Después de ese primer punto, está ESTRICTAMENTE PROHIBIDO usar más puntos (.) en todo el texto restante del capítulo. Utiliza exclusivamente comas, punto y coma, o signos de exclamación/interrogación.
6. MOTIVACIÓN ENCUBIERTA: Al final de cada capítulo, cierra con una frase de urgencia e inspiración que empuje a ${nombre_de_usuario} a continuar.

REGLAS VISUALES Y DE COHERENCIA (CINEMÁTICA):
Asigna una atmósfera visual para cada capítulo usando EXCLUSIVAMENTE la lista de etiquetas permitidas. 
¡CRÍTICO - REGLA DE MAPEO SEMÁNTICO UNIVERSAL!: Tienes estrictamente prohibido asignar etiquetas al azar. Analiza la física, el clima, la temperatura y el entorno del capítulo que acabas de escribir y deduce lógicamente las etiquetas exactas:
- Polvo, arena, sequía o desierto: USA effect: "ash-storm" + color cálido. (NUNCA lluvia ni rayos).
- Agua, tormentas, océanos o líquidos: USA effect: "toxic-rain" o "underwater-bubbles" + color azul/frío.
- Frío extremo, hielo o invierno: USA effect: "snow-blizzard" + color hielo/blanco.
- Calor, fuego, lava o combate intenso: USA effect: "fire-battle" o "volcano-embers" + color rojo/naranja.
- Tecnología, cibernética o datos: USA effect: "data-matrix".
- Naturaleza tranquila, paz, romance diurno: USA effect: "falling-leaves", "radiant-glow" o "none".

Etiquetas permitidas (Copia exactamente el texto):
- effect: space-cockpit, hyper-warp, alien-forest, fire-battle, volcano-embers, ash-storm, toxic-rain, data-matrix, magic-runes, blood-drip, electric-storm, snow-blizzard, underwater-bubbles, nebula-dust, falling-leaves, radiant-glow, mind-waves, clear-sky, none.
- color: deep-space-blue, cyberpunk-neon, toxic-green, infernal-orange, blood-red, military-khaki, fantasy-gold, void-purple, ice-cyan, apocalyptic-rust, daylight-warm, pure-white.
- speed: static, slow, normal, fast, chaotic, pulsing.
- lighting: vignette-dark, lens-flare, strobe-alarm, candle-flicker, lightning-flash, eclipse-ring, sun-rays, none.
- mood: intro, rising-tension, boss-fight, victory, defeat.

FORMATO DE SALIDA:
Devuelve EXCLUSIVAMENTE un objeto JSON válido (sin bloques de código Markdown, sin texto extra) con esta estructura exacta:
{
  "chapters": [
    "Capítulo 1: Título. [Narrativa continua sin usar más puntos...]",
    ... (exactamente ${cantidad_de_niveles} capítulos)
  ],
  "cinematica": [
    { "effect": "...", "color": "...", "speed": "...", "lighting": "...", "mood": "..." },
    ... (exactamente ${cantidad_de_niveles} objetos)
  ],
  "defeatChapter": "Final Alternativo: Retirada Táctica. [Narra de forma épica cómo ${nombre_de_usuario} debe retirarse temporalmente, dejando un mensaje humano sobre aprender de la derrota, sin usar más puntos.]",
  "defeatCinematica": { "effect": "ash-storm", "color": "deep-space-blue", "speed": "slow", "lighting": "vignette-dark", "mood": "defeat" }
}`;
			const availableModels = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-flash-lite-latest'];
			let result;
			let lastError: any = null;

			for (const modelName of availableModels) {
				let retries = 2;
				while (retries > 0) {
					try {
						result = await ai.models.generateContent({
							model: modelName,
							contents: prompt,
							config: {
								responseMimeType: 'application/json'
							}
						});
						break;
					} catch (aiError: any) {
						lastError = aiError;
						if ((aiError.status === 503 || aiError.status === 429) && retries > 1) {
							retries--;
							await new Promise((resolve) => setTimeout(resolve, 1500));
							continue;
						}
						break;
					}
				}
				if (result?.text) {
					break;
				}
			}

			if (!result?.text) {
				throw lastError || new Error('Respuesta vacía del modelo de IA');
			}

			let rawText = result.text.trim();
			if (rawText.startsWith('```json')) {
				rawText = rawText.replace(/^```json\s*/, '').replace(/```\s*$/, '');
			} else if (rawText.startsWith('```')) {
				rawText = rawText.replace(/^```\s*/, '').replace(/```\s*$/, '');
			}

			const parsed = JSON.parse(rawText);
			chapters = Array.isArray(parsed.chapters) ? parsed.chapters : [];
			cinematicaTags = Array.isArray(parsed.cinematica) ? parsed.cinematica : [];
			defeatChapter = parsed.defeatChapter || '';
			defeatCinematica = parsed.defeatCinematica || detectCinematicaForText(defeatChapter, 'defeat');

			if (chapters.length === 0) {
				return fail(500, {
					title,
					tema,
					cantidad_de_niveles,
					message: 'No fue posible estructurar los capítulos de la historia. Por favor, inténtalo de nuevo.'
				});
			}
		} catch (aiError: any) {
			console.error('Error generando historia con IA:', aiError);
			const isSaturated = aiError?.status === 429 || aiError?.status === 503;
			return fail(isSaturated ? 503 : 500, {
				title,
				tema,
				cantidad_de_niveles,
				message: isSaturated
					? 'El servicio de IA se encuentra saturado en este momento. Por favor, inténtalo de nuevo en unos minutos.'
					: 'No se pudieron generar las historias debido a un inconveniente con el servicio de IA. Por favor, inténtalo más tarde.'
			});
		}

		// Validar y rellenar cinematicaTags para cada capítulo asegurando coincidencia temática y ambiental
		if (cinematicaTags.length !== chapters.length) {
			cinematicaTags = chapters.map((cap, idx) => {
				if (cinematicaTags[idx] && cinematicaTags[idx].effect) {
					return cinematicaTags[idx];
				}
				const mood = idx === 0 ? 'intro' : idx === chapters.length - 1 ? 'boss-fight' : 'rising-tension';
				return detectCinematicaForText(`${tema} ${cap}`, mood);
			});
		}

		if (!defeatCinematica) {
			defeatCinematica = detectCinematicaForText(defeatChapter || 'retirada', 'defeat');
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
				cinematica: cinematicaTags.map(tag => JSON.stringify(tag)),
				vista: [defeatChapter, JSON.stringify(defeatCinematica)]
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
