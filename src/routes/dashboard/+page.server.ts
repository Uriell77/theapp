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

	// Consulta relacional directa con Drizzle
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

		// --- MOTORES DE PROMPTS ---
		function generarPromptProductividad(nombre_de_usuario: string, title: string, tema: string, cantidad_de_niveles: number) {
			return `Eres un director de cine épico. El usuario "${nombre_de_usuario}" tiene el desafío real: "${title}". Tema: "${tema}".
Objetivo: Crea una campaña de acción inmersiva de exactamente ${cantidad_de_niveles} capítulos.

REGLAS NARRATIVAS (METÁFORA Y CONTINUIDAD):
1. MISIÓN: Adapta el objetivo al tema (Combate, Sigilo, o Supervivencia).
2. PLANO SECUENCIA (IN MEDIA RES): A partir del Cap 2, PROHIBIDO usar resúmenes. Inicia la acción en el milisegundo donde terminó el capítulo anterior. 
3. SENSORIALIDAD: Describe olores, texturas y desgaste físico.
4. METÁFORA INQUEBRANTABLE: NUNCA menciones la tarea real ("${title}"). Todo debe estar disfrazado bajo la temática.
5. PUNTUACIÓN: El título del capítulo DEBE terminar con un punto (.). PROHIBIDO usar más puntos (.) dentro del cuerpo del texto de los capítulos. Usa solo comas y punto y coma para separar ideas.

REGLAS VISUALES:
Analiza el clima de tu texto y asigna:
- Polvo/Desierto: effect: "ash-storm" + color cálido.
- Agua/Tormentas: effect: "toxic-rain" o "underwater-bubbles" + azul/frío.
- Frío/Hielo: effect: "snow-blizzard" + hielo/blanco.
- Calor/Fuego: effect: "fire-battle" o "volcano-embers" + rojo/naranja.
- Tecnología/Datos: effect: "data-matrix".
- Paz/Romance/Naturaleza: effect: "falling-leaves", "radiant-glow" o "none".

Etiquetas permitidas: effect (space-cockpit, hyper-warp, alien-forest, fire-battle, volcano-embers, ash-storm, toxic-rain, data-matrix, magic-runes, blood-drip, electric-storm, snow-blizzard, underwater-bubbles, nebula-dust, falling-leaves, radiant-glow, mind-waves, clear-sky, none), color (deep-space-blue, cyberpunk-neon, toxic-green, infernal-orange, blood-red, military-khaki, fantasy-gold, void-purple, ice-cyan, apocalyptic-rust, daylight-warm, pure-white), speed (static, slow, normal, fast, chaotic, pulsing), lighting (vignette-dark, lens-flare, strobe-alarm, candle-flicker, lightning-flash, eclipse-ring, sun-rays, none), mood (intro, rising-tension, boss-fight, victory, defeat).

FORMATO JSON OBLIGATORIO:
{
  "chapters": [
    "Título del Capítulo 1. Cuerpo del texto del capítulo sin usar más puntos en absoluto, solo comas y punto y coma para separar ideas",
    "Título del Capítulo 2. Cuerpo del texto continuando la acción directamente sin usar puntos adicionales"
  ],
  "cinematica": [
    { "effect": "...", "color": "...", "speed": "...", "lighting": "...", "mood": "..." }
  ],
  "defeatChapter": "Final Alternativo: Retirada Táctica. Narra épicamente cómo debe retirarse",
  "defeatCinematica": { "effect": "ash-storm", "color": "apocalyptic-rust", "speed": "slow", "lighting": "vignette-dark", "mood": "defeat" }
}`;
		}

		function generarPromptTutor(nombre_de_usuario: string, title: string, tema: string, cantidad_de_niveles: number) {
			return `Eres un pedagogo gamificador. El usuario "${nombre_de_usuario}" quiere APRENDER esto en la vida real: "${title}". Enfoque: "${tema}".
Objetivo: Crea un TUTORIAL SECUENCIAL de exactamente ${cantidad_de_niveles} lecciones/capítulos.

REGLAS PEDAGÓGICAS (TUTOR GAMIFICADO):
1. ENSEÑANZA REAL: AQUÍ SÍ DEBES ENSEÑAR EL CONCEPTO REAL ("${title}"). Explica la teoría y cómo aplicarla en ${cantidad_de_niveles} pasos lógicos de menor a mayor dificultad.
2. ENVOLTORIO NARRATIVO: Disfraza la lección dentro del mundo ficticio, pero manteniendo los términos técnicos de lo que aprende.
3. ADAPTACIÓN DE EDAD: Si el tema es "Aprendizaje Infantil", usa un tono cálido de cuento de hadas (0-10 años). Adolescente = Misterio dinámico. Universal = Maestro sabio.
4. PLANO SECUENCIA: Inicia cada capítulo exactamente donde terminó la lección anterior.
5. PUNTUACIÓN: El título del capítulo DEBE terminar con un punto (.). PROHIBIDO usar más puntos (.) dentro del cuerpo del texto de los capítulos. Usa solo comas y punto y coma para separar ideas.

REGLAS VISUALES:
- Aprendizaje Infantil/Paz: effect: "falling-leaves", "radiant-glow" o "none" + color cálido.
- Matemáticas/Lógica: effect: "data-matrix" + color neón/cyan.
- Concentración: effect: "mind-waves" o "nebula-dust".
- Acción: effect: "ash-storm", "toxic-rain", etc.
(Usa la misma lista de etiquetas permitidas de la configuración general).

FORMATO JSON OBLIGATORIO:
{
  "chapters": [
    "Título de la Lección 1. Cuerpo del texto explicando el primer paso sin usar más puntos, solo comas y punto y coma para separar ideas",
    "Título de la Lección 2. Cuerpo del texto continuando el aprendizaje sin usar puntos adicionales"
  ],
  "cinematica": [
    { "effect": "...", "color": "...", "speed": "...", "lighting": "...", "mood": "..." }
  ],
  "defeatChapter": "Final Alternativo: El Descanso. Narra que el aprendizaje toma tiempo",
  "defeatCinematica": { "effect": "falling-leaves", "color": "daylight-warm", "speed": "slow", "lighting": "sun-rays", "mood": "defeat" }
}`;
		}

		// --- ENRUTAMIENTO Y SELECCIÓN DEL PROMPT ---
		const temasDeAprendizaje = [
			"Aprendizaje Infantil",
			"Aprendizaje Adolescente",
			"Aprendizaje de Habilidades",
			"Conocimiento Universal"
		];

		const esModoAprendizaje = temasDeAprendizaje.includes(tema);
		const promptFinal = esModoAprendizaje
			? generarPromptTutor(nombre_de_usuario, title, tema, cantidad_de_niveles)
			: generarPromptProductividad(nombre_de_usuario, title, tema, cantidad_de_niveles);


		// --- SISTEMA DE ETIQUETAS DE RESERVA ---
		function detectCinematicaForText(text: string, defaultMood: string = 'rising-tension') {
			const lower = (text || '').toLowerCase();

			if (/(fuego|llama|ardient|infernal|volc[aá]n|lava|magma|incendio|combusti[oó]n|ceniza|explosi[oó]n|abrasad|calor|ascuas)/.test(lower)) {
				return { effect: lower.includes('volc') || lower.includes('ceniza') ? 'volcano-embers' : 'fire-battle', color: 'infernal-orange', speed: 'normal', lighting: 'candle-flicker', mood: defaultMood === 'defeat' ? 'defeat' : 'boss-fight' };
			}
			if (/(tormenta|rayo|rel[aá]mpago|trueno|tempestad|el[eé]ctric|hurac[aá]n|cicl[oó]n|lluvia)/.test(lower)) {
				return { effect: 'electric-storm', color: 'deep-space-blue', speed: 'fast', lighting: 'lightning-flash', mood: defaultMood === 'defeat' ? 'defeat' : 'rising-tension' };
			}
			if (/(nieve|hielo|ventisca|glaci|polar|congelad|helad|fr[ií]o|escarcha)/.test(lower)) {
				return { effect: 'snow-blizzard', color: 'ice-cyan', speed: 'normal', lighting: 'vignette-dark', mood: defaultMood };
			}
			if (/(mar\b|oc[eé]ano|agua|submarin|abismo|profundidad|acu[aá]tic|olas)/.test(lower)) {
				return { effect: 'underwater-bubbles', color: 'deep-space-blue', speed: 'slow', lighting: 'none', mood: defaultMood };
			}
			if (/(t[oó]xic|veneno|pantano|selva|alien|mutaci[oó]n|espora|qu[ií]mic|[aá]cido|radiaci[oó]n)/.test(lower)) {
				return { effect: lower.includes('selva') || lower.includes('espora') ? 'alien-forest' : 'toxic-rain', color: 'toxic-green', speed: 'normal', lighting: 'none', mood: defaultMood };
			}
			if (/(ciber|matriz|matrix|c[oó]digo|hacker|digital|servidor|terminal|red\b|protocolo|ia\b|algoritmo)/.test(lower)) {
				return { effect: 'data-matrix', color: 'cyberpunk-neon', speed: 'normal', lighting: 'none', mood: defaultMood };
			}
			if (/(magi|arcano|runa|hechizo|m[ií]stic|reliquia|portal|ancestral)/.test(lower)) {
				return { effect: 'magic-runes', color: 'fantasy-gold', speed: 'slow', lighting: 'eclipse-ring', mood: defaultMood };
			}
			if (/(sangre|carmes[ií]|masacre|herida|desgarr|carnicer[ií]a)/.test(lower)) {
				return { effect: 'blood-drip', color: 'blood-red', speed: 'normal', lighting: 'strobe-alarm', mood: defaultMood };
			}
			if (/(ceniza|desierto|p[aá]ramo|ruinas|apocal[ií]pt|polvo|destrucci[oó]n|retirada)/.test(lower)) {
				return { effect: 'ash-storm', color: 'apocalyptic-rust', speed: 'slow', lighting: 'vignette-dark', mood: defaultMood === 'defeat' ? 'defeat' : 'rising-tension' };
			}
			if (/(espaci|galaxi|nave|estelar|hiperespacio|cosmos|estrellas|warp)/.test(lower)) {
				return { effect: lower.includes('warp') || lower.includes('hiper') ? 'hyper-warp' : 'space-cockpit', color: 'deep-space-blue', speed: 'normal', lighting: 'lens-flare', mood: defaultMood };
			}
			return { effect: defaultMood === 'defeat' ? 'ash-storm' : 'space-cockpit', color: defaultMood === 'defeat' ? 'apocalyptic-rust' : 'deep-space-blue', speed: 'normal', lighting: defaultMood === 'defeat' ? 'vignette-dark' : 'none', mood: defaultMood };
		}

		let chapters: string[] = [];
		let cinematicaTags: any[] = [];
		let defeatChapter = '';
		let defeatCinematica: any = null;

		try {
			const prompt = promptFinal;
			
// --- INICIO DE REEMPLAZO ---
			// Priorizamos los modelos que confirmamos tienen cuota disponible actualmente.
			const availableModels = [
				'gemini-3.5-flash',
				'gemini-3.5-flash-lite',
				'gemini-flash-latest',
				'gemini-3.8-flash',
				'gemini-1.5-flash'
			];
			let result;
			let lastError: any = null;

			for (const modelName of availableModels) {
				let retries = 2;
				while (retries > 0) {
					try {
						console.log(`Intentando generar narrativa con el modelo: ${modelName}...`);
						result = await ai.models.generateContent({
							model: modelName,
							contents: prompt,
							config: {
								responseMimeType: 'application/json'
							}
						});
						
						if (result?.text) {
							console.log(`¡Éxito usando ${modelName}!`);
							break;
						}
					} catch (aiError: any) {
						lastError = aiError;
						console.warn(`[Aviso] El modelo ${modelName} falló:`, aiError.message);
						
						// Si es un error 404 (Not Found), pasamos al siguiente modelo inmediatamente
						if (aiError.status === 404) {
							break;
						}

						// Solo reintentar si el servidor de Google está saturado (429 o 503)
						if ((aiError.status === 503 || aiError.status === 429) && retries > 1) {
							retries--;
							const delay = 2000 * (3 - retries); // Exponencial simple
							console.log(`Reintentando ${modelName} en ${delay}ms... (${retries} intentos restantes)`);
							await new Promise((resolve) => setTimeout(resolve, delay));
							continue;
						}
						break; 
					}
				}
				if (result?.text) break;
			}

			if (!result?.text) {
				console.error('Error final: No se pudo obtener respuesta de ningún modelo configurado.');
				throw lastError || new Error('Respuesta vacía del modelo de IA');
			}
			// --- FIN DE REEMPLAZO ---

			let rawText = result.text.trim();
			if (rawText.startsWith('```json')) {
				rawText = rawText.replace(/^```json\s*/, '').replace(/```\s*$/, '');
			} else if (rawText.startsWith('```')) {
				rawText = rawText.replace(/^```\s*/, '').replace(/```\s*$/, '');
			}

			const parsed = JSON.parse(rawText);
			
			// --- CORRECCIÓN DE PUNTUACIÓN (Evita que el frontend falle) ---
			chapters = Array.isArray(parsed.chapters) ? parsed.chapters.map((cap: string) => {
				// 1. Si la IA usó ":" o "-" en vez de un punto para el título, lo reparamos
				let fixedCap = cap.replace(/^([^:\.\-]+)(:|-)\s*/, "$1. ");
				// 2. Asegurar que solo exista el primer punto y cambiar los demás por comas
				let parts = fixedCap.split('.');
				if (parts.length > 2) {
					let titulo = parts.shift();
					let cuerpo = parts.join(',').replace(/\./g, ','); 
					return `${titulo}. ${cuerpo.trim()}`;
				}
				return fixedCap;
			}) : [];

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

		// Validar y rellenar cinematicaTags para cada capítulo
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

		// --- INSERCIÓN EN BASE DE DATOS ---
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