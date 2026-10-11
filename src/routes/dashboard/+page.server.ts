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
			const prompt = `Eres un diseñador narrativo de campañas épicas de videojuegos, experiencias inmersivas y tutorías gamificadas. 
El usuario, llamado "${nombre_de_usuario}", tiene un desafío de aprendizaje o productividad en el mundo real: "${title}".
El tema estético y narrativo elegido es: "${tema}".

Tu objetivo es construir una campaña narrativa, estrictamente secuencial y dividida exactamente en ${cantidad_de_niveles} capítulos, poniendo a ${nombre_de_usuario} como el protagonista absoluto.

REGLAS NARRATIVAS (METÁFORA, APRENDIZAJE Y CONTINUIDAD):
1. MISIÓN Y ARQUETIPO CLAROS: El TIPO de misión debe adaptarse lógicamente al tema:
   - Guerra/Fantasía/Acción: Trama de CONQUISTA, COMBATE o RESISTENCIA.
   - Misterio/Espionaje/Romance: Trama de SIGILO, CONEXIÓN o INTELIGENCIA.
   - Aprendizaje y Conocimiento: Trama de TUTORIAL NARRATIVO. El desafío real del usuario ("${title}") debe dividirse en ${cantidad_de_niveles} lecciones progresivas. Transforma la teoría real en mecánicas del mundo (ej. si aprende a leer, las letras son "runas sonoras" que debe pronunciar; si es programación, el código son "conjuros lógicos"). Debes ENSEÑAR el concepto real paso a paso dentro de la ficción.
2. ADAPTACIÓN DE EDAD Y TONO: Si el tema es "Aprendizaje Infantil", usa un tono de cuento de hadas, cálido, seguro y divertido (0-10 años). Si es "Adolescente", usa un tono de descubrimiento juvenil. Para el resto, usa un tono épico y urgente de videojuego.
3. CONTINUIDAD DE PLANO SECUENCIA: La historia es ininterrumpida. A partir del Capítulo 2, TIENES ESTRICTAMENTE PROHIBIDO iniciar con resúmenes o saltos temporales. Debes empezar la primera palabra exactamente en el mismo segundo de acción o descubrimiento con el que terminó el capítulo anterior. 
4. PROHIBIDO USAR PLANTILLAS: No repitas estructuras de inicio. Haz que la prosa fluya de manera visceral y conectada.
5. METÁFORA CONDICIONADA: Para productividad, no menciones la tarea real explícitamente. PARA APRENDIZAJE, sí debes integrar los pasos técnicos reales como herramientas o poderes que el protagonista debe aplicar en la historia.
6. REGLA ESTRICTA DE PUNTUACIÓN: Cada capítulo debe iniciar con un Título evocador seguido de un único punto (.). Después de ese primer punto, está ESTRICTAMENTE PROHIBIDO usar más puntos (.) en todo el texto restante del capítulo. Utiliza exclusivamente comas, punto y coma, o signos de exclamación/interrogación.
7. MOTIVACIÓN ENCUBIERTA: Al final de cada capítulo, cierra con una frase que empuje a ${nombre_de_usuario} a continuar y aplicar lo aprendido.

REGLAS VISUALES Y DE COHERENCIA (CINEMÁTICA):
Asigna una atmósfera visual usando EXCLUSIVAMENTE la lista de etiquetas permitidas. 
¡CRÍTICO - REGLA DE MAPEO SEMÁNTICO UNIVERSAL!: Analiza el clima, edad y entorno del capítulo y deduce lógicamente:
- Polvo, arena o desierto: USA effect: "ash-storm" + color cálido. (NUNCA lluvia ni rayos).
- Agua, tormentas o líquidos: USA effect: "toxic-rain" o "underwater-bubbles" + color azul/frío.
- Frío extremo, hielo: USA effect: "snow-blizzard" + color hielo/blanco.
- Calor, fuego, combate: USA effect: "fire-battle" o "volcano-embers" + color rojo/naranja.
- Tecnología o datos: USA effect: "data-matrix".
- Aprendizaje Infantil, Cuentos, Paz o Naturaleza: USA effect: "falling-leaves", "radiant-glow" o "none" + color "daylight-warm" o "pure-white".

Etiquetas permitidas (Copia exactamente el texto):
- effect: space-cockpit, hyper-warp, alien-forest, fire-battle, volcano-embers, ash-storm, toxic-rain, data-matrix, magic-runes, blood-drip, electric-storm, snow-blizzard, underwater-bubbles, nebula-dust, falling-leaves, radiant-glow, mind-waves, clear-sky, none.
- color: deep-space-blue, cyberpunk-neon, toxic-green, infernal-orange, blood-red, military-khaki, fantasy-gold, void-purple, ice-cyan, apocalyptic-rust, daylight-warm, pure-white.
- speed: static, slow, normal, fast, chaotic, pulsing.
- lighting: vignette-dark, lens-flare, strobe-alarm, candle-flicker, lightning-flash, eclipse-ring, sun-rays, none.
- mood: intro, rising-tension, boss-fight, victory, defeat.

FORMATO DE SALIDA:
Devuelve EXCLUSIVAMENTE un objeto JSON válido con esta estructura exacta:
{
  "chapters": [
    "Capítulo 1: Título. [Narrativa continua sin usar más puntos...]",
    ... (exactamente ${cantidad_de_niveles} capítulos)
  ],
  "cinematica": [
    { "effect": "...", "color": "...", "speed": "...", "lighting": "...", "mood": "..." },
    ...
  ],
  "defeatChapter": "Final Alternativo: El Descanso del Héroe. [Narra cómo ${nombre_de_usuario} debe descansar para asimilar lo aprendido, dejando un mensaje humano sobre que el aprendizaje toma tiempo, sin usar más puntos.]",
  "defeatCinematica": { "effect": "falling-leaves", "color": "daylight-warm", "speed": "slow", "lighting": "sun-rays", "mood": "defeat" }
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
