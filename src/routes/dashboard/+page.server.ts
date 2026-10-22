import { db } from '$lib/server/db';
import { users, tasks, levels } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import { GoogleGenAI } from '@google/genai';
import { GEMINI_API_KEY } from '$env/static/private';
import { formatChapterForStorage } from '$lib/chapterUtils';
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
				orderBy: (tasks, { desc }) => [desc(tasks.id)],
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
		const cantidad_de_niveles_raw = parseInt(formData.get('cantidad_de_niveles') as string, 10);
		const nombre_de_usuario = (formData.get('nombredeusuario') as string)?.trim();

		if (!title || !tema || isNaN(cantidad_de_niveles_raw) || cantidad_de_niveles_raw < 1) {
			return fail(400, {
				title,
				tema,
				cantidad_de_niveles: cantidad_de_niveles_raw,
				message: 'Todos los campos son obligatorios'
			});
		}

		// --- LISTADO DE SUGERENCIAS NARRATIVAS Y FRASES DE CONTEXTO POR TEMA ---
		const sugerenciasNarrativasPorTema: Record<string, string[]> = {
			'Cruzada Medieval': [
				'cacería de un dragón milenario en su cubil de azufre',
				'rescate de la princesa o príncipe en la torre prohibida',
				'asedio a la fortaleza del señor de la guerra sombrío',
				'búsqueda y recuperación de una reliquia sagrada custodiada',
				'defensa heroica del puente levadizo ante una horda de invasores',
				'emboscada en el bosque de las brumas contra caballeros renegados'
			],
			'Magia y Fantasía': [
				'infiltración en la aguja de cristal del nigromante',
				'purificación de las raíces del árbol sagrado corrompido',
				'despertar de un coloso rúnico dormido bajo la montaña',
				'pacto arriesgado con un fénix guardián de fuego blanco',
				'travesía por un portal dimensional inestable a través de tierras feéricas'
			],
			'Odisea Mitológica Griega': [
				'cacería de la hidra venenosa en el pantano de Lerna',
				'incursión y escape del laberinto del minotauro implacable',
				'navegación sorteando el canto hipnótico de las sirenas y los escollos',
				'enfrentamiento contra el cíclope furioso en su caverna de piedra',
				'ascenso al monte de los oráculos para reclamar el favor de los dioses'
			],
			'Dinastía Samurái': [
				'duelo a muerte bajo la lluvia en el puente de los cerezos caídos',
				'infiltración silenciosa en la fortaleza del daimyō traidor',
				'defensa solitaria del paso estrecho de montaña frente a un regimiento',
				'recuperación de la katana ancestral robada por un clan rebelde',
				'desmantelamiento de una red secreta de asesinos de las sombras'
			],
			'Alquimia y Magia Arcana': [
				'transmutación del mineral prohibido en el laboratorio subterráneo',
				'contención de una fuga de éter arcano hiperreactivo que altera la realidad',
				'destilación de la piedra filosofal bajo la alineación de tres lunas',
				'combate contra una quimera alquímica mutante creada por un experimento fallido'
			],
			'Guerra Espacial': [
				'asalto aéreo a la nave nodriza invasora en la órbita de un planeta sitiado',
				'navegación a través de un cinturón de asteroides hostil bajo fuego de cazas',
				'defensa desesperada del hangar principal de la estación orbital',
				'infiltración en la base lunar fortificada para desactivar el escudo planetario',
				'salto hiperespacial crítico evadiendo una flota de cruceros estelares'
			],
			'Rebelión Cyberpunk': [
				'hackeo en tiempo real de la megatorre corporativa de telecomunicaciones',
				'persecución a alta velocidad en moto por autopistas de neón y lluvia ácida',
				'extracción encubierta de un informante clave en el bajo mundo cibernético',
				'sabotaje al núcleo de procesamiento de una inteligencia artificial opresora',
				'enfrentamiento en un callejón estrecho contra sicarios con implantes de combate'
			],
			'Supervivencia Post-Apocalíptica': [
				'búsqueda y purificación de una fuente de agua pura en el páramo tóxico',
				'cruce a pie a través de una tormenta de arena radiactiva implacable',
				'saqueo de suministros vitales en un hospital en ruinas vigilado por bestias',
				'emboscada y neutralización de una banda de saqueadores en el desfiladero',
				'reparación contrarreloj de un transporte blindado para escapar de una horda mutante'
			],
			'Mundo Steampunk': [
				'abordaje aéreo entre dirigibles de vapor y engranajes en plena tormenta',
				'sabotaje al gigantesco autómata de relojería que asedia la capital',
				'carrera de locomotoras acorazadas sobre puentes colgantes de hierro',
				'infiltración en la refinería de gas flotante del barón industrial'
			],
			'Catastrofe Natural': [
				'evacuación contrarreloj ante la violenta erupción de un volcán ardiente',
				'rescate acuático en bote en medio de un diluvio torrencial que inunda la ciudad',
				'búsqueda y rescate de supervivientes entre los escombros tras un terremoto devastador',
				'huida frenética del deslave masivo de lodo y roca que desciende por la montaña',
				'rescate de un náufrago atrapado en un arrecife azotado por olas gigantes'
			],
			'Apocalipsis Zombi': [
				'defensa desesperada de una barricada improvisada contra una turba de infectados',
				'carrera sigilosa por las azoteas de la metrópoli evitando activar a la horda',
				'búsqueda de la cepa de la cura en el laboratorio central contaminado',
				'rescate de un convoy de civiles rodeado en un túnel colapsado'
			],
			'Terror Lovecraftiano': [
				'descifrado de inscripciones arcanas en las paredes de un templo submarino ciclópeo',
				'ritual para cerrar una brecha estelar antes de que despierte la entidad del vacío',
				'investigación de un pueblo costero sumido en una niebla antinatural y locura',
				'huida desesperada a través de ciénagas pantanosas perseguidos por cultistas cósmicos'
			],
			'Superheroes': [
				'desactivación de un artefacto de disrupción cuántica en la cima de un rascacielos',
				'rescate masivo de civiles en un monorriel subterráneo a punto de caer al vacío',
				'batalla aérea a máxima potencia contra el supervillano sobre los rascacielos',
				'infiltración en el búnker subterráneo del sindicato criminal intergaláctico'
			],
			'Guerra Mundial': [
				'desembarco en la playa fortificada bajo fuego cruzado de ametralladoras y morteros',
				'infiltración nocturna tras las líneas enemigas para dinamitar un radar estratégico',
				'defensa heroica de una trinchera clave soportando el bombardeo incesante',
				'rescate y evacuación de un escuadrón de reconocimiento cercado en la aldea'
			],
			'Vaqueros y Western': [
				'duelo al mediodía bajo el sol abrasador en la calle principal del pueblo',
				'asalto a caballo y salto al tren en marcha que transporta el cargamento de oro',
				'defensa del rancho asediado por una despiadada banda de forajidos',
				'persecución a través del cañón rocoso siguiendo el rastro del líder bandido'
			],
			'Agente Secreto': [
				'infiltración en la fiesta de gala de la embajada internacional con identidad falsa',
				'burlar sistemas biométricos de alta seguridad y cámaras térmicas en el búnker',
				'persecución automovilística frenética por carreteras de montaña evadiendo francotiradores',
				'extracción encubierta del maletín que contiene la lista de agentes dobles'
			],
			'Espionaje Internacional': [
				'intercambio confidencial de microfilmes en una estación ferroviaria bajo la niebla',
				'descifrado de un canal de audio satelital en un piso franco antes de ser rastreados',
				'evasión de un cerco de contrainteligencia en un aeropuerto diplomático extranjero'
			],
			'Detective Noir': [
				'interrogatorio tenso en un callejón lluvioso iluminado por la luz titilante de un letrero',
				'persecución a pie entre sombras y vapor de alcantarillas en los muelles nocturnos',
				'descubrimiento de la pista definitiva en la caja fuerte de la mansión del magnate',
				'confrontación final con el asesino de guante blanco en el depósito portuario'
			],
			'El Gran Atraco': [
				'infiltración por conductos de aire sincronizada al segundo para evitar sensores láser',
				'perforación de la compuerta acorazada de la bóveda subterránea con taladro criogénico',
				'escape coordinado en furgonetas señuelo burlando el cerco policial en la autopista',
				'desactivación remota del sistema de alarmas mediante un pulso electromagnético'
			],
			'Romance Diurno': [
				'encuentro casual pero transformador bajo la lluvia en una pintoresca librería',
				'carrera contra el reloj en el aeropuerto para declarar el amor antes del despegue',
				'revelación de una carta secreta que aclara un doloroso malentendido del pasado',
				'baile espontáneo en el mirador iluminado con vista a la ciudad al atardecer'
			],
			'Aprendizaje Infantil': [
				'búsqueda de las gemas de colores del alfabeto en el valle de los juguetes mágicos',
				'construcción de un puente de bloques de madera para ayudar a cruzar al conejito tímido',
				'enseñar al pequeño dragón que teme al fuego a encender su primera chispita de bondad',
				'resolver las divertidas adivinanzas del búho sabio en lo alto del gran árbol de cuentos',
				'gran fiesta de estrellas y globos celebrando que todos lograron aprender la lección'
			],
			'Aprendizaje Adolescente': [
				'descifrado colaborativo del enigma científico en el laboratorio escolar tras clases',
				'competencia en el torneo interescolar de debate o robótica superando la ansiedad',
				'descubrimiento de un misterio oculto en los archivos olvidados de la academia',
				'superación de la prueba decisiva del jurado gracias al trabajo en equipo y la perseverancia'
			],
			'Aprendizaje de Habilidades': [
				'dominio de la técnica base tras múltiples intentos fallidos guiados por el instructor',
				'resolución de un error técnico crítico aplicando los principios teóricos aprendidos',
				'primer proyecto real ejecutado bajo presión con estándares de calidad profesional',
				'presentación de la obra maestra final demostrando autonomía y maestría completa'
			],
			'Conocimiento Universal': [
				'debate filosófico en la gran biblioteca clásica sobre el orden y belleza del cosmos',
				'comprensión profunda de los principios universales que rigen la materia y la vida',
				'superación de las tres pruebas dialécticas impuestas por el consejo de pensadores',
				'unificación de conceptos complejos para resolver una gran incógnita de la humanidad'
			]
		};

		function obtenerSugerenciasTema(t: string): string[] {
			let lista = sugerenciasNarrativasPorTema[t];
			if (!lista) {
				const temaLower = (t || '').toLowerCase();
				for (const [key, l] of Object.entries(sugerenciasNarrativasPorTema)) {
					if (key.toLowerCase().includes(temaLower) || temaLower.includes(key.toLowerCase())) {
						lista = l;
						break;
					}
				}
			}
			if (!lista || lista.length === 0) {
				lista = [
					'misión de alto riesgo con aliados leales',
					'carrera contra el tiempo frente a un obstáculo formidable',
					'infiltración en territorio hostil coordinando esfuerzos',
					'rescate o protección de un aliado clave'
				];
			}
			// Mezclar y seleccionar aleatoriamente un subconjunto de sugerencias para dar variedad a cada historia
			const copia = [...lista];
			for (let i = copia.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[copia[i], copia[j]] = [copia[j], copia[i]];
			}
			const cantidadAElegir = Math.min(copia.length, Math.max(2, Math.floor(Math.random() * 2) + 3));
			return copia.slice(0, cantidadAElegir);
		}

		// En ambos prompts la cantidad de capítulos/niveles es el valor ingresado más 1
		// para que el primer capítulo sea la introducción a la tarea, personajes y universo
		const cantidad_de_niveles = cantidad_de_niveles_raw + 1;
		const sugerenciasContexto = obtenerSugerenciasTema(tema);

		// --- MOTORES DE PROMPTS ---
		function generarPromptProductividad(
			nombre_de_usuario: string,
			title: string,
			tema: string,
			cantidad_de_niveles: number,
			sugerencias: string[]
		) {
			const sugerenciasFormatted = sugerencias.map((s) => `  - "${s}"`).join('\n');

			return `Eres un director de cine épico y maestro narrador. El usuario "${nombre_de_usuario}" tiene el desafío real: "${title}". Tema de la historia: "${tema}".
Objetivo: Crea una campaña de acción inmersiva de exactamente ${cantidad_de_niveles} capítulos.

SUGERENCIAS NARRATIVAS Y FRASES DE CONTEXTO POR TEMA:
Inspírate activamente en el siguiente listado de situaciones y frases de contexto para la temática "${tema}":
${sugerenciasFormatted}
Utiliza estas frases y situaciones como combustible para tejer tramas complejas, ricas, variadas y con giros dramáticos inesperados a lo largo de los capítulos.

ESTRUCTURA Y REGLAS NARRATIVAS:
1. INTRODUCCIÓN Y CONTEXTO INICIAL (CAPÍTULO 1 OBLIGATORIO):
El Capítulo 1 DEBE ser la introducción a la gran tarea/desafío. Presenta con fuerza y detalle al protagonista ("${nombre_de_usuario}"), a sus personajes de soporte o aliados, y explica vívidamente el universo de la historia: las reglas del mundo, el contexto de la narrativa, qué está en juego y cuál es la gran amenaza, fortaleza o villano supremo al que se enfrentan. Establece las bases épicas antes de que comience el avance.

2. PERSONAJES DE SOPORTE:
Puedes incluir a 1 o más personajes de soporte secundarios (aliados leales, escuderos, inteligencias artificiales tácticas, guerreros veteranos, pilotos, mascotas o exploradores). Deben tener nombres o roles distintivos, dialogar activamente con "${nombre_de_usuario}", aportar habilidades únicas, advertir peligros y luchar hombro a hombro, enriqueciendo la historia con dinámicas colaborativas.

3. CONTINUIDAD EN PLANO SECUENCIA (CAPÍTULO 2 HASTA EL PENÚLTIMO):
A partir del Capítulo 2, PROHIBIDO usar resúmenes o pausas temporales. Inicia la acción exactamente en el milisegundo donde terminó el capítulo anterior, manteniendo la adrenalina y la continuidad directa sin saltos.

4. SENSORIALIDAD Y REALISMO DRAMÁTICO:
Describe texturas, olores, sonido del acero o la tecnología, fatiga, desgaste físico y emociones intensas.

5. DESENLACE ÉPICO EN EL ÚLTIMO CAPÍTULO (CAPÍTULO ${cantidad_de_niveles} OBLIGATORIO):
El desenlace de la historia SIEMPRE DEBE ser en el último capítulo (Capítulo ${cantidad_de_niveles}). Este capítulo culminante DEBE narrar el clímax cumbre y la resolución definitiva: la confrontación final, la derrota épica del villano supremo, enemigo formidable o monstruo titánico, la conquista de la fortaleza o la salvación del reino/mundo. NUNCA dejes la historia inconclusa ni en suspenso: la victoria debe ser total, catártica y celebrada.

6. METÁFORA INQUEBRANTABLE:
NUNCA menciones la tarea real de la vida real ("${title}"). Todo debe estar 100% dramatizado y transformado dentro de la temática de ficción "${tema}".

7. PUNTUACIÓN Y TÍTULOS:
Cada capítulo DEBE comenzar con el título completo del capítulo (ejemplo: "Capítulo 1, La Infiltración." o "Capítulo 1, Asedio a la Muralla."). El título DEBE terminar con un único punto (.). PROHIBIDO poner un punto inmediatamente después del número del capítulo (NUNCA escribas "Capítulo 1."). Si incluyes número de capítulo, sepáralo con coma: "Capítulo X, [Nombre descriptivo].". PROHIBIDO usar más puntos (.) dentro del cuerpo del texto de los capítulos; usa solo comas y punto y coma para separar ideas.
utiliza inteligentemente los signos de puntuacion como coma (,) guion (-), punto y coma (;) y puntos suspensivos (...) dentro del contenido de la historia para generar sensorialidad y tensión dramática, evitando el uso de puntos (.) dentro del cuerpo del texto de los capitulos.

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
    "Capítulo 1, [Nombre descriptivo del capítulo 1]. Cuerpo del texto introductorio presentando a ${nombre_de_usuario}, sus aliados y el universo de la historia sin usar más puntos en absoluto, solo comas y punto y coma para separar ideas",
    "Capítulo 2, [Nombre descriptivo del capítulo 2]. Cuerpo del texto continuando la acción directamente sin usar puntos adicionales"
  ],
  "cinematica": [
    { "effect": "...", "color": "...", "speed": "...", "lighting": "...", "mood": "..." }
  ],
  "defeatChapter": "Final Alternativo: Retirada Táctica. Narra épicamente cómo debe retirarse",
  "defeatCinematica": { "effect": "ash-storm", "color": "apocalyptic-rust", "speed": "slow", "lighting": "vignette-dark", "mood": "defeat" }
}`;
		}

		function generarPromptTutor(
			nombre_de_usuario: string,
			title: string,
			tema: string,
			cantidad_de_niveles: number,
			sugerencias: string[]
		) {
			const sugerenciasFormatted = sugerencias.map((s) => `  - "${s}"`).join('\n');

			return `Eres un pedagogo gamificador y maestro de aventuras formativas. El usuario "${nombre_de_usuario}" quiere APRENDER esto en la vida real: "${title}". Enfoque/Tema: "${tema}".
Objetivo: Crea un TUTORIAL SECUENCIAL de exactamente ${cantidad_de_niveles} lecciones/capítulos.

SUGERENCIAS NARRATIVAS Y FRASES DE CONTEXTO POR TEMA:
Inspírate en este listado de frases y situaciones de contexto para la temática "${tema}":
${sugerenciasFormatted}
Aprovecha estas situaciones para enriquecer el contexto, las pruebas y los retos pedagógicos dentro de la ambientación.

REGLAS PEDAGÓGICAS (TUTOR GAMIFICADO):
1. INTRODUCCIÓN Y CONTEXTO INICIAL (CAPÍTULO 1 OBLIGATORIO):
El Capítulo 1 DEBE ser la introducción a la aventura de aprendizaje. Presenta al aprendiz ("${nombre_de_usuario}"), a sus personajes de soporte o mentor, y explica el universo y el contexto de por qué aprender "${title}" es una habilidad crucial y transformadora en este mundo. Establece las metas de la aventura.

2. PERSONAJES DE SOPORTE:
Puedes de forma aleatoria incluir a 1 o más personajes de soporte (un mentor sabio y paciente, una criatura guía carismática, una mascota, un autómata asistente o compañeros de estudio curiosos). Deben dialogar activamente con "${nombre_de_usuario}", hacer preguntas interesantes, demostrar ejemplos prácticos y brindar aliento durante los momentos de dificultad.

3. ENSEÑANZA REAL SECUENCIAL:
AQUÍ SÍ DEBES ENSEÑAR EL CONCEPTO REAL ("${title}"). Explica la teoría y cómo aplicarla en pasos lógicos de menor a mayor dificultad a lo largo de los capítulos, disfrazando la lección en la narrativa pero manteniendo los términos técnicos y prácticos necesarios.

4. ADAPTACIÓN DE EDAD:
Si el tema es "Aprendizaje Infantil", usa un tono cálido de cuento de hadas (0-10 años) con personajes entrañables, lenguaje alegre y metáforas tiernas. Adolescente = Misterio dinámico y retos juveniles. Universal = Maestro sabio y reflexiones profundas.

5. CONTINUIDAD EN PLANO SECUENCIA:
Inicia cada capítulo exactamente donde terminó la lección anterior, sin saltos temporales bruscos.

6. DESENLACE PEDAGÓGICO EN EL ÚLTIMO CAPÍTULO (CAPÍTULO ${cantidad_de_niveles} OBLIGATORIO):
El último capítulo DEBE ser el desenlace triunfal de la lección: la prueba de maestría final donde "${nombre_de_usuario}", con el apoyo de sus compañeros y mentor, supera el gran examen práctico o desafío cumbre, demostrando dominio total de "${title}" y celebrando el logro definitivo.

7. PUNTUACIÓN Y TÍTULOS:
Cada capítulo DEBE comenzar con el título completo descriptivo (ejemplo obligatorio: "Capítulo 1, El Despertar de las Vocales." o "Capítulo 1, El Mapa del Gran Mercado."). El punto (.) de separación DEBE ir justo después del título del capítulo y NUNCA inmediatamente después del número del capítulo (PROHIBIDO terminantemente escribir "Capítulo 1." o "Lección 1."). Si incluyes número y nombre, usa una coma: "Capítulo X, [Nombre descriptivo].". PROHIBIDO usar más puntos (.) dentro del cuerpo del texto de los capítulos; usa solo comas y punto y coma para separar ideas.

REGLAS VISUALES:
- Aprendizaje Infantil/Paz: effect: "falling-leaves", "radiant-glow" o "none" + color cálido.
- Matemáticas/Lógica: effect: "data-matrix" + color neón/cyan.
- Concentración: effect: "mind-waves" o "nebula-dust".
- Acción: effect: "ash-storm", "toxic-rain", etc.
(Usa la misma lista de etiquetas permitidas de la configuración general).

FORMATO JSON OBLIGATORIO:
{
  "chapters": [
    "Capítulo 1, [Nombre descriptivo del capítulo 1]. Cuerpo del texto introductorio presentando a ${nombre_de_usuario}, su mentor y el universo sin usar más puntos, solo comas y punto y coma para separar ideas",
    "Capítulo 2, [Nombre descriptivo del capítulo 2]. Cuerpo del texto continuando el aprendizaje sin usar puntos adicionales"
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
			'Aprendizaje Infantil',
			'Aprendizaje Adolescente',
			'Aprendizaje de Habilidades',
			'Conocimiento Universal'
		];

		const esModoAprendizaje = temasDeAprendizaje.includes(tema);
		const promptFinal = esModoAprendizaje
			? generarPromptTutor(nombre_de_usuario, title, tema, cantidad_de_niveles, sugerenciasContexto)
			: generarPromptProductividad(nombre_de_usuario, title, tema, cantidad_de_niveles, sugerenciasContexto);


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
			
			// --- CORRECCIÓN DE FORMATO Y PUNTUACIÓN (Garantiza título antes del punto y cuerpo después) ---
			chapters = Array.isArray(parsed.chapters)
				? parsed.chapters.map((cap: string) => formatChapterForStorage(cap))
				: [];

			cinematicaTags = Array.isArray(parsed.cinematica) ? parsed.cinematica : [];
			defeatChapter = parsed.defeatChapter ? formatChapterForStorage(parsed.defeatChapter) : '';
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
	},

	archiveTask: async ({ request, locals }) => {
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
			.set({ isArchived: true })
			.where(and(eq(tasks.id, taskId), eq(tasks.userId, locals.user.id)));
		return { success: true };
	},

	unarchiveTask: async ({ request, locals }) => {
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
			.set({ isArchived: false })
			.where(and(eq(tasks.id, taskId), eq(tasks.userId, locals.user.id)));
		return { success: true };
	},

	deleteTask: async ({ request, locals }) => {
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
		try {
			// 1. Eliminar primero los registros asociados en 'levels'
			await db
				.delete(levels)
				.where(eq(levels.taskId, taskId));

			// 2. Luego eliminar la tarea en 'tasks'
			await db
				.delete(tasks)
				.where(and(eq(tasks.id, taskId), eq(tasks.userId, locals.user.id)));

			return { success: true };
		} catch (error) {
			console.error('Error al eliminar la tarea:', error);
			return fail(500, { message: 'Error al eliminar la tarea' });
		}
	}
};