import { db } from '$lib/server/db';
import { users, tasks, levels } from '$lib/server/db/schema';
import { eq, and, not, inArray } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import { GoogleGenAI } from '@google/genai';
import { GEMINI_API_KEY } from '$env/static/private';
import { formatChapterForStorage } from '$lib/chapterUtils';
import { supabase } from '$lib/supabaseClient';
import { clearSessionCookie } from '$lib/server/auth';
import bcrypt from 'bcryptjs';
import type { PageServerLoad, Actions } from './$types';

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	if (!user) {
		throw redirect(303, '/auth');
	}

	// Consulta relacional directa con Drizzle
	const userRecord = await db.query.users.findFirst({
		where: eq(users.id, user.id),
		columns: {
			id: true,
			nombre_de_usuario: true,
			email: true,
			createdAt: true,
			aliados: true
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

	let avatarUrl: string | null = null;
	try {
		const { data: avatarFiles } = await supabase.storage
			.from('MGAvatars')
			.list('', { search: user.id });
		const matched = avatarFiles?.find((f) => f.name.startsWith(user.id));
		if (matched) {
			const base = supabase.storage.from('MGAvatars').getPublicUrl(matched.name)
				.data.publicUrl;
			avatarUrl = `${base}?v=${encodeURIComponent(matched.updated_at || '1')}`;
		}
	} catch (err) {
		console.error('Error al obtener avatar en dashboard:', err);
	}

	return {
		user: {
			...userRecord,
			avatarUrl
		}
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
		const milestonesRaw = formData.get('milestones') as string | null;

		let parsedMilestones: Date[] | null = null;
		if (milestonesRaw) {
			try {
				const arr = JSON.parse(milestonesRaw);
				if (Array.isArray(arr) && arr.length > 0) {
					parsedMilestones = arr.map((item: string) => new Date(item));
				}
			} catch (e) {
				console.error('Error al parsear milestones:', e);
			}
		}

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
			'Alta Fantasía y Magia': [
				'infiltración en la aguja de cristal del nigromante',
				'purificación de las raíces del árbol sagrado corrompido',
				'despertar de un coloso rúnico dormido bajo la montaña',
				'pacto arriesgado con un fénix guardián de fuego blanco',
				'travesía por un portal dimensional inestable a través de tierras feéricas'
			],
			'Mitología Griega y el Olimpo': [
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
			'Guerra Espacial de Naves': [
				'asalto aéreo a la nave nodriza invasora en la órbita de un planeta sitiado',
				'navegación a través de un cinturón de asteroides hostil bajo fuego de cazas',
				'defensa desesperada del hangar principal de la estación orbital',
				'infiltración en la base lunar fortificada para desactivar el escudo planetario',
				'salto hiperespacial crítico evadiendo una flota de cruceros estelares',
				'rescate de un piloto capturado en la superficie de un planeta helado bajo tormenta de plasma',
				'persecución a través de un campo de minas gravitacionales en la órbita de un agujero negro',
				'persecucion en naves espaciales',
				'juegos de guerra interplanetaria',
				'deportes extraterrestres',
				'carrera de vehiculos levitantes en otro planeta',
				'combate de flota espacial contra extraterrestres',
				'exploración de un planeta desconocido con condiciones extremas',
				'evacuación de un grupo de colonos en un asentamiento en el espacio',
				'politica de emergencia en un entorno espacial',
				'proteccion de instalaciones críticas',
				'terraformacion de planeta distante',
				'destrucción de una base enemiga en el espacio',
				'ataque a instalaciones enemigas espaciales en cazas espaciales'
			],
			'Cyberpunk y Neón': [
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
				'reparación contrarreloj de un transporte blindado para escapar de una horda mutante',
				'rescate de un grupo de supervivientes atrapados en un edificio colapsado tras un terremoto nuclear',
				'escape de bandidos armados en un convoy improvisado a través de un desierto post-apocalíptico',
				'búsqueda de un refugio seguro en un bosque contaminado por radiación mientras se evitan criaturas mutantes',
				'defensa de un asentamiento improvisado contra un ataque coordinado de saqueadores y mutantes',
				'destrucción de mounstruos mutantes en un laboratorio abandonado mientras se busca una cura para la radiación'
			],
			'Steampunk': [
				'abordaje aéreo entre dirigibles de vapor y engranajes en plena tormenta',
				'sabotaje al gigantesco autómata de relojería que asedia la capital',
				'carrera de locomotoras acorazadas sobre puentes colgantes de hierro',
				'infiltración en la refinería de gas flotante del barón industrial'
			],
			'Desastre Natural': [
				'evacuación contrarreloj ante la violenta erupción de un volcán ardiente',
				'rescate acuático en bote en medio de un diluvio torrencial que inunda la ciudad',
				'búsqueda y rescate de supervivientes entre los escombros tras un terremoto devastador',
				'huida frenética del deslave masivo de lodo y roca que desciende por la montaña',
				'rescate de un náufrago atrapado en un arrecife azotado por olas gigantes',
				'evacuación de un pueblo costero ante la inminente llegada de un tsunami colosal',
				'rescate de un equipo de científicos atrapados en un laboratorio subterráneo durante un terremoto',
				'evacuación de un tren atrapado en un puente colapsado durante una tormenta eléctrica',
				'rescate de un grupo de excursionistas atrapados en un cañón durante una avalancha de nieve',
				'evacuación de un hospital en una ciudad costera ante la amenaza de un huracán categoría 5',
				'rescate de un equipo de espeleólogos atrapados en una cueva inundada por lluvias torrenciales',
				'evacuación de un pueblo montañoso ante la amenaza de un alud de rocas y lodo',
				'rescate de un grupo de escaladores atrapados en un acantilado durante una tormenta de granizo',
				'evacuación de un aeropuerto internacional ante la llegada de un tornado devastador',
				'rescate de un equipo de buzos atrapados en una caverna submarina durante un huracán',
				'evacuación de un centro comercial ante la amenaza de un incendio forestal que se aproxima',
				'rescate de un grupo de turistas atrapados en un teleférico durante una tormenta eléctrica',
				'evacuación de un barrio residencial ante la amenaza de un desbordamiento de río tras lluvias intensas',
				'transporte de suministros de emergencia a una aldea aislada tras un deslizamiento de tierra',
				'rescate de un grupo de pescadores atrapados en alta mar durante una tormenta de viento y olas gigantes',
				'mantenimiento de la calma y coordinación de rescate durante un apagón masivo en una ciudad afectada por un huracán',
				'evacuación de un hospital infantil ante la amenaza de un tornado que se aproxima rápidamente',
				'rescate de un grupo de montañistas atrapados en un glaciar durante una tormenta de nieve'
			],
			'Combate de Mechas Gigantes':[
				'Combate de mechas en arena',
				'Combate con kaiyus',
				'Defensa de ciudad con mechas',
				'Infiltración en base enemiga con mechas',

			],
			'Apocalipsis Zombie': [
				'defensa desesperada de una barricada improvisada contra una turba de infectados',
				'carrera sigilosa por las azoteas de la metrópoli evitando activar a la horda',
				'búsqueda de la cepa de la cura en el laboratorio central contaminado',
				'rescate de un convoy de civiles rodeado en un túnel colapsado'
			],
			'Terror Cosmico': [
				'descifrado de inscripciones arcanas en las paredes de un templo submarino ciclópeo',
				'ritual para cerrar una brecha estelar antes de que despierte la entidad del vacío',
				'investigación de un pueblo costero sumido en una niebla antinatural y locura',
				'huida desesperada a través de ciénagas pantanosas perseguidos por cultistas cósmicos'
			],
			'Superhéroes y Cómics': [
				'desactivación de un artefacto de disrupción cuántica en la cima de un rascacielos',
				'rescate masivo de civiles en un monorriel subterráneo a punto de caer al vacío',
				'batalla aérea a máxima potencia contra el supervillano sobre los rascacielos',
				'infiltración en el búnker subterráneo del sindicato criminal intergaláctico',
				'carrera de velocistas a través de la ciudad para detener un ataque nuclear inminente',
				'rescate de un grupo de rehenes en un tren de alta velocidad controlado por un villano telequinético',
				'desactivación de un dron de vigilancia masivo que amenaza con revelar la identidad secreta del héroe',
				'batalla final en la azotea de un rascacielos mientras el villano intenta escapar en un jet propulsado por energía oscura',
				'infiltración en la base submarina del villano para recuperar un dispositivo de control mental que amenaza a la ciudad',
				'carrera contrarreloj para salvar a un grupo de científicos atrapados en un laboratorio que está a punto de explotar debido a un experimento fallido',
				'protección de la ciudad de un ataque coordinado de supervillanos que buscan robar un artefacto de energía inestable',
				'aventura de viaje en el tiempo para evitar que un villano cambie la historia y cree un futuro distópico',
				'aventura de viaje interdimensional para detener a un villano que busca fusionar dos realidades y causar caos en ambas'
			],
			'Guerra Mundial': [
				'desembarco en la playa fortificada bajo fuego cruzado de ametralladoras y morteros',
				'infiltración nocturna tras las líneas enemigas para dinamitar un radar estratégico',
				'defensa heroica de una trinchera clave soportando el bombardeo incesante',
				'rescate y evacuación de un escuadrón de reconocimiento cercado en la aldea',
				'persecución en vehículos blindados a través de un desierto minado para interceptar un convoy enemigo',
				'asalto a un búnker fortificado para recuperar información vital sobre el plan de ataque enemigo',
				'desactivación de un campo de minas en un paso montañoso para permitir el avance de las tropas aliadas',
				'protección de un puente estratégico mientras se enfrenta a un ataque aéreo coordinado del enemigo',
				'rescate de prisioneros de guerra atrapados en un tren blindado bajo fuego enemigo',
				'evacuación de un hospital de campaña mientras se enfrenta a un bombardeo aéreo y artillería enemiga',
				'defensa de un puesto avanzado en la frontera mientras se enfrenta a un ataque sorpresa de fuerzas enemigas',
				'persecución en motocicletas a través de un bosque denso para interceptar un mensajero enemigo con información crítica',
				'infiltración en un depósito de armas enemigo para sabotear su suministro antes de un ataque masivo',
				'rescate de un grupo de civiles atrapados en una ciudad sitiada mientras se enfrenta a francotiradores enemigos'
			],
			'El Salvaje Oeste': [
				'duelo al mediodía bajo el sol abrasador en la calle principal del pueblo',
				'asalto a caballo y salto al tren en marcha que transporta el cargamento de oro',
				'defensa del rancho asediado por una despiadada banda de forajidos',
				'persecución a través del cañón rocoso siguiendo el rastro del líder bandido'
			],
			'Espionaje Táctico Moderno': [
				'infiltración en la fiesta de gala de la embajada internacional con identidad falsa',
				'burlar sistemas biométricos de alta seguridad y cámaras térmicas en el búnker',
				'persecución automovilística frenética por carreteras de montaña evadiendo francotiradores',
				'extracción encubierta del maletín que contiene la lista de agentes dobles',
				'desactivación de un dispositivo explosivo en un tren de alta velocidad antes de que llegue a la ciudad',
				'interrogatorio psicológico de un informante clave en un sótano oscuro y aislado',
				'rescate de un compañero capturado en un almacén abandonado mientras se enfrenta a mercenarios armados',
				'infiltración en un laboratorio secreto para recuperar un prototipo de arma experimental antes de que caiga en manos enemigas',
				'intercepción de un mensaje de texto cifrado en un servidor de comunicaciones enemigas',
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
			'Atraco de Guante Blanco y Estafa Maestra': [
				"Infiltrarse en la gala exclusiva de un magnate corrupto para clonar sus credenciales bancarias y desviar sus fondos ocultos.",
        			"Montar una empresa ficticia para engañar a un especulador despiadado y recuperar las escrituras de un barrio marginado.",
        			"Burlar la seguridad láser de una bóveda de alta tecnología para robar pruebas incriminatorias antes de que sean destruidas.",
        			"Ejecutar un engaño a gran escala usando disfraces y tecnología para que un criminal confiese sus delitos en una transmisión en vivo."
			],
			"comedia romántica y torpeza adorable": [
				"Intentar organizar la cita perfecta sorpresa, pero una serie de malentendidos ridículos y accidentes torpes amenazan con arruinarlo todo.",
				"Tratar de impresionar a esa persona especial fingiendo ser un experto en algo, lo que desata una avalancha de mentiras blancas difíciles de sostener.",
				"Un intento bien intencionado de preparar un regalo hecho a mano termina en un desastre pegajoso, obligando a improvisar antes de que llegue la pareja."
			], 
			"comedia absurda y caos cotidiano": [
				"Un arreglo casero de cinco minutos que mágicamente desata una inundación, un incendio menor y la fuga de la mascota del vecino.",
				"Intentar borrar desesperadamente un mensaje enviado por error al jefe supremo, lo que implica infiltrarse en la oficina usando disfraces ridículos.",
					"Una cadena de favores absurdos que sale mal: para conseguir un objeto simple, hay que lidiar con personajes excéntricos de la ciudad que exigen misiones cada vez más locas."
			]
		};

		function obtenerSugerenciasTema(t: string): string[] {
			let lista = sugerenciasNarrativasPorTema[t];
			if (!lista) {
				const temaLower = (t || '').toLowerCase();
				for (const [key, l] of Object.entries(sugerenciasNarrativasPorTema)) {
					if (
						key.toLowerCase().includes(temaLower) ||
						temaLower.includes(key.toLowerCase())
					) {
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
			// Seleccionar aleatoriamente una sola sugerencia para centrar la historia en una única misión o trama
			// Ya no seleccionamos una diferencia, pasamos la lista completa para que la IA elija la diferencia más idónea para la trama en relación a la tarea
			//const indice = Math.floor(Math.random() * lista.length);
			console.log(lista);
			return lista;
		}

		// En ambos prompts la cantidad de capítulos/niveles es el valor ingresado más 1
		// para que el primer capítulo sea la introducción a la tarea, personajes y universo
		const cantidad_de_niveles = cantidad_de_niveles_raw + 1;
		const sugerenciaContexto = obtenerSugerenciasTema(tema);

		// Obtener datos del usuario (incluyendo el aliado registrado en la base de datos si existe)
		const [currentUser] = await db
			.select({
				nombre_de_usuario: users.nombre_de_usuario,
				aliados: users.aliados
			})
			.from(users)
			.where(eq(users.id, locals.user.id))
			.limit(1);

		const nombreFinal = nombre_de_usuario || currentUser?.nombre_de_usuario || 'Aventurero';
		const aliado = currentUser?.aliados?.trim() || null;

		// --- MOTORES DE PROMPTS ---
		function generarPromptProductividad(
			nombre_de_usuario: string,
			title: string,
			tema: string,
			cantidad_de_niveles: number,
			sugerencia: string[],
			aliado?: string | null
		) {
			const directivaPersonajesSoporte = aliado
				? `2. PERSONAJE DE SOPORTE (ALIADO EN LA VIDA REAL):
El usuario ha establecido a su aliado de la vida real: "${aliado}".
Es OBLIGATORIO incluir a "${aliado}" como el personaje de soporte principal y compañero clave de "${nombre_de_usuario}". Asígnale un rol de apoyo en la trama perfectamente adaptado al tema elegido ("${tema}") (por ejemplo, copiloto estelar o especialista táctico en Guerra Espacial, escudero leal en Cruzada Medieval, compañero de armas en Dinastía Samurái, etc.). Debe interactuar y dialogar activamente con "${nombre_de_usuario}", advertir peligros, colaborar codo a codo en cada reto y aportar habilidades de apoyo decisivas.`
				: `2. PERSONAJES DE SOPORTE:
Puedes incluir a 1 o más personajes de soporte secundarios (aliados leales, escuderos, inteligencias artificiales tácticas, guerreros veteranos, pilotos, mascotas o exploradores). Deben tener nombres o roles distintivos, dialogar activamente con "${nombre_de_usuario}", aportar habilidades únicas, advertir peligros y luchar hombro a hombro, enriqueciendo la historia con dinámicas colaborativas.`;

			const introCapitulo1 = aliado
				? `El Capítulo 1 (In Media Res): explica brevemente la misión los personajes el rol y caracteristicas de los personajes y el universo. Lanza al lector directamente a la acción en curso mientras explicas todo, Presenta la amenaza de inmediato a través de los sentidos del protagonista y la interacción con al menos un personaje de soporte (IA, escudero, piloto aliado) que le asista. Refleja su estado actual. el capitulo funciona como un PRÓLOGO que establece la misión y el peligro inminente, mostrando la colaboración con "${aliado}" y nos dice quienes y que son los personajes.`
				: `El Capítulo 1 (In Media Res): explica brevemente la misión los personajes el rol y características de los personajes y el universo. Lanza al lector directamente a la acción en curso mientras explicas todo, Presenta la amenaza de inmediato a través de los sentidos del protagonista y la interacción con al menos un personaje de soporte (IA, escudero, piloto aliado) que le asista. Refleja su estado actual. El capitulo funciona como un PRÓLOGO que establece la misión y el peligro inminente, mostrando la colaboración con los personajes de soporte.y nos dice quienes y que son los personajes.`;

			const capitulo1Json = aliado
				? `Capítulo 1, [Nombre descriptivo del capítulo]. Texto narrativo que inicia directamente en la acción a manera de prologo, mostrando el peligro inmediato y la interacción de apoyo con ${aliado}, usando frases cortas y puntos seguidos para marcar el ritmo.`
				: `Capítulo 1, [Nombre descriptivo del capítulo]. Texto narrativo que inicia directamente en la acción a manera de prologo, mostrando el peligro inmediato, usando frases cortas y puntos seguidos para marcar el ritmo.`;

			return `Eres un Motor Narrativo Dinámico y maestro del "Show, Don't Tell". El usuario "${nombre_de_usuario}" se enfrenta a un  desafío: "${title}". Tema de la historia: "${tema}".
La Dificultad de la misión debes establecerla segun los procesos reales de la tarea ${title}, y estructura la historia ficticia como un simil de la real" Objetivo: Generar una secuencia narrativa de exactamente ${cantidad_de_niveles} capítulos.

SUGERENCIA NARRATIVA Y MISIÓN PRINCIPAL POR TEMA:
Inspírate en esta lista y elije la opción más idónea para construir una trama temática "${tema}": "${sugerencia}" conservando siempre la relación simbólica de la tarea real ("${title}") pero manteniendo la narrativa en la ficción.
La historia es una metáfora estricta. NUNCA menciones la tarea real ("${title}"). Todo ocurre dentro de la ficción manteniendo una relacion simbólica.
La historia esta narrada en tercera persona por un narrador, no desde la perspectiva del protagonista.
Introduce cortos diálogos entre el protagonista y los personajes de soporte para enriquecer la narrativa y mostrar la interacción y colaboración en la misión.
Narra con detalles toda la secuencia de las batallas usando la sensorialidad cruda: zarpadas, golpes, vibraciones, saltos, giros, caídas, sudor, respiración entrecortada, fatiga, desgaste físico y psicológico. Describe texturas, olores, sonidos del acero o la tecnología, fatiga, desgaste físico y emociones intensas.
Narra los pensamientos y emociones del protagonista mientras ejecuta acciones de alto riesgo como durante la infiltración, el combate, la persecución o la resolución de un conflicto crítico. Refleja su tensión, miedo, ansiedad, urgencia y presión de tiempo en la narrativa.
siempre debe haber uno o varios enemigos con quién luchar y vencer

REGLAS DE ESTILO Y RITMO (CRÍTICAS):
1. RITMO CINEMATOGRÁFICO: Escribe con frases cortas y contundentes. Usa los puntos seguidos para crear tensión. Prohibidas las oraciones interminables llenas de comas.
2. SENSORIALIDAD CRUDA: No uses palabras vacías como "épico", "increíble" o "formidable". Describe el olor a ozono, el zumbido de los servomotores, el frío del metal, la vibración del suelo, el sudor o la respiración entrecortada.
3. SIN ESCALA PROPORCIONAL: Toda tarea debe ser tratada con la misma importancia narrativa, sin distinción de nivel de dificultad.

ESTRUCTURA Y REGLAS NARRATIVAS:
1. INTRODUCCIÓN Y CONTEXTO INICIAL (CAPÍTULO 1 OBLIGATORIO):
${introCapitulo1}

${directivaPersonajesSoporte}

3. CONTINUIDAD EN PLANO SECUENCIA (CAPÍTULO 2 HASTA EL PENÚLTIMO):
CAPÍTULOS INTERMEDIOS (Plano Secuencia): La acción fluye en tiempo real. Cada capítulo termina en un micro-cliffhanger o un obstáculo repentino.
LA HISTORIA DEBE MANTENERSE EN CONTINUIDAD DIRECTA, SIN SALTOS TEMPORALES. Cada capítulo debe seguir la historia y la trama y los personajes tal como finalizo el anterior y desarrollarse hacia el logro de la misión.

4. SENSORIALIDAD Y REALISMO DRAMÁTICO:
Describe texturas, olores, sonido del acero o la tecnología, fatiga, desgaste físico y emociones intensas.
Utiliza la psicologia de la tarea real (${title}) para reflejar la tensión, el miedo, la ansiedad, la urgencia y la presión de tiempo en la narrativa. Cada capítulo debe reflejar un aumento progresivo de dificultad y tensión.

5. DESENLACE ÉPICO EN EL ÚLTIMO CAPÍTULO (CAPÍTULO ${cantidad_de_niveles} OBLIGATORIO):
CAPÍTULO FINAL (Resolución): El clímax y la victoria definitiva, escalada a la proporción del desafío. La catarsis final. NUNCA lo dejes en suspenso.
Utiliza un evento dramático que simbolice la superación de la tarea real ("${title}") y la culminación de la misión. La victoria debe sentirse merecida y reflejar el aprendizaje y crecimiento del protagonista.

6. METÁFORA INQUEBRANTABLE:
NUNCA menciones la tarea real de la vida real ("${title}"). Todo debe estar 100% dramatizado y transformado dentro de la temática de ficción "${tema}" para lograr una experiencia narrativa que evoque la realidad sin revelarla directamente.

7. PUNTUACIÓN Y TÍTULOS:
Los títulos de los capítulos deben seguir el formato: "Capítulo X, [Nombre descriptivo en 2-4 palabras]."
Ejemplo de título válido: "Capítulo 1, Sistemas Críticos."
Cada capítulo DEBE comenzar con el título completo del capítulo El título DEBE terminar con un único punto (.). PROHIBIDO poner un punto inmediatamente después del número del capítulo (NUNCA escribas "Capítulo 1."). Si incluyes número de capítulo, sepáralo con coma: "Capítulo X, [Nombre descriptivo].". 
NUNCA pongas un punto justo después del número del capítulo.

REGLAS VISUALES:
Evalúa la atmósfera narrativa predominante en la historia y asigna los valores precisos.
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
    "${capitulo1Json}",
    "Capítulo 2, [Nombre descriptivo del capítulo 2]. Texto narrativo en continuidad directa, usando frases cortas y contundentes."
  ],
  "cinematica": [
    { "effect": "...", "color": "...", "speed": "...", "lighting": "...", "mood": "..." }
  ],
  "defeatChapter": "Final Alternativo: [Nombre descriptivo]. Narra crudamente cómo el protagonista es superado y forzado a una retirada táctica. ${aliado ? `Es OBLIGATORIO que ${aliado} intervenga para salvarlo del colapso, llevándolo a un lugar seguro.` : ''}",
  "defeatCinematica": { "effect": "ash-storm", "color": "apocalyptic-rust", "speed": "slow", "lighting": "vignette-dark", "mood": "defeat" }
}`;
		}

		function generarPromptTutor(
			nombre_de_usuario: string,
			title: string,
			tema: string,
			cantidad_de_niveles: number,
			sugerencia: string | string[]
		) {
			const sugerenciaTexto = Array.isArray(sugerencia) ? sugerencia.join(', ') : sugerencia;
			return `Eres un pedagogo gamificador y maestro de aventuras formativas. El usuario "${nombre_de_usuario}" quiere APRENDER esto en la vida real: "${title}". Enfoque/Tema: "${tema}".
Objetivo: Crea un TUTORIAL SECUENCIAL de exactamente ${cantidad_de_niveles} lecciones/capítulos.

SUGERENCIA NARRATIVA Y MISIÓN PRINCIPAL POR TEMA:
Inspírate en la siguiente situación o misión de aprendizaje central para la temática "${tema}":
  - "${sugerenciaTexto}"
La aventura DEBE centrarse en torno a esta única misión o trama de aprendizaje principal a lo largo de las lecciones, utilizándola para enriquecer el contexto, las pruebas y los retos pedagógicos dentro de la ambientación.

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
			? generarPromptTutor(nombreFinal, title, tema, cantidad_de_niveles, sugerenciaContexto)
			: generarPromptProductividad(
					nombreFinal,
					title,
					tema,
					cantidad_de_niveles,
					sugerenciaContexto,
					aliado
				);

		// --- SISTEMA DE ETIQUETAS DE RESERVA ---
		function detectCinematicaForText(text: string, defaultMood: string = 'rising-tension') {
			const lower = (text || '').toLowerCase();

			if (
				/(fuego|llama|ardient|infernal|volc[aá]n|lava|magma|incendio|combusti[oó]n|ceniza|explosi[oó]n|abrasad|calor|ascuas)/.test(
					lower
				)
			) {
				return {
					effect:
						lower.includes('volc') || lower.includes('ceniza')
							? 'volcano-embers'
							: 'fire-battle',
					color: 'infernal-orange',
					speed: 'normal',
					lighting: 'candle-flicker',
					mood: defaultMood === 'defeat' ? 'defeat' : 'boss-fight'
				};
			}
			if (
				/(tormenta|rayo|rel[aá]mpago|trueno|tempestad|el[eé]ctric|hurac[aá]n|cicl[oó]n|lluvia)/.test(
					lower
				)
			) {
				return {
					effect: 'electric-storm',
					color: 'deep-space-blue',
					speed: 'fast',
					lighting: 'lightning-flash',
					mood: defaultMood === 'defeat' ? 'defeat' : 'rising-tension'
				};
			}
			if (/(nieve|hielo|ventisca|glaci|polar|congelad|helad|fr[ií]o|escarcha)/.test(lower)) {
				return {
					effect: 'snow-blizzard',
					color: 'ice-cyan',
					speed: 'normal',
					lighting: 'vignette-dark',
					mood: defaultMood
				};
			}
			if (/(mar\b|oc[eé]ano|agua|submarin|abismo|profundidad|acu[aá]tic|olas)/.test(lower)) {
				return {
					effect: 'underwater-bubbles',
					color: 'deep-space-blue',
					speed: 'slow',
					lighting: 'none',
					mood: defaultMood
				};
			}
			if (
				/(t[oó]xic|veneno|pantano|selva|alien|mutaci[oó]n|espora|qu[ií]mic|[aá]cido|radiaci[oó]n)/.test(
					lower
				)
			) {
				return {
					effect:
						lower.includes('selva') || lower.includes('espora')
							? 'alien-forest'
							: 'toxic-rain',
					color: 'toxic-green',
					speed: 'normal',
					lighting: 'none',
					mood: defaultMood
				};
			}
			if (
				/(ciber|matriz|matrix|c[oó]digo|hacker|digital|servidor|terminal|red\b|protocolo|ia\b|algoritmo)/.test(
					lower
				)
			) {
				return {
					effect: 'data-matrix',
					color: 'cyberpunk-neon',
					speed: 'normal',
					lighting: 'none',
					mood: defaultMood
				};
			}
			if (/(magi|arcano|runa|hechizo|m[ií]stic|reliquia|portal|ancestral)/.test(lower)) {
				return {
					effect: 'magic-runes',
					color: 'fantasy-gold',
					speed: 'slow',
					lighting: 'eclipse-ring',
					mood: defaultMood
				};
			}
			if (/(sangre|carmes[ií]|masacre|herida|desgarr|carnicer[ií]a)/.test(lower)) {
				return {
					effect: 'blood-drip',
					color: 'blood-red',
					speed: 'normal',
					lighting: 'strobe-alarm',
					mood: defaultMood
				};
			}
			if (
				/(ceniza|desierto|p[aá]ramo|ruinas|apocal[ií]pt|polvo|destrucci[oó]n|retirada)/.test(
					lower
				)
			) {
				return {
					effect: 'ash-storm',
					color: 'apocalyptic-rust',
					speed: 'slow',
					lighting: 'vignette-dark',
					mood: defaultMood === 'defeat' ? 'defeat' : 'rising-tension'
				};
			}
			if (/(espaci|galaxi|nave|estelar|hiperespacio|cosmos|estrellas|warp)/.test(lower)) {
				return {
					effect:
						lower.includes('warp') || lower.includes('hiper')
							? 'hyper-warp'
							: 'space-cockpit',
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
							console.log(
								`Reintentando ${modelName} en ${delay}ms... (${retries} intentos restantes)`
							);
							await new Promise((resolve) => setTimeout(resolve, delay));
							continue;
						}
						break;
					}
				}
				if (result?.text) break;
			}

			if (!result?.text) {
				console.error(
					'Error final: No se pudo obtener respuesta de ningún modelo configurado.'
				);
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
			defeatChapter = parsed.defeatChapter
				? formatChapterForStorage(parsed.defeatChapter)
				: '';
			defeatCinematica =
				parsed.defeatCinematica || detectCinematicaForText(defeatChapter, 'defeat');

			if (chapters.length === 0) {
				return fail(500, {
					title,
					tema,
					cantidad_de_niveles,
					message:
						'No fue posible estructurar los capítulos de la historia. Por favor, inténtalo de nuevo.'
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
				const mood =
					idx === 0
						? 'intro'
						: idx === chapters.length - 1
							? 'boss-fight'
							: 'rising-tension';
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
					status: '0',
					milestones: parsedMilestones
				})
				.returning();

			if (!newTask) {
				return fail(500, { message: 'Error al crear la tarea' });
			}

			await db.insert(levels).values({
				taskId: newTask.id,
				content: chapters,
				cinematica: cinematicaTags.map((tag) => JSON.stringify(tag)),
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

		// Validación estricta de Time-Gating en el servidor
		if (Array.isArray(task.milestones) && task.milestones.length > 0) {
			const targetMilestone = task.milestones[currentStatus];
			if (targetMilestone) {
				const milestoneTime = new Date(targetMilestone).getTime();
				if (!isNaN(milestoneTime) && Date.now() < milestoneTime) {
					return fail(403, { message: 'El capítulo aún está bloqueado por Time-Gating' });
				}
			}
		}

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
			await db.delete(levels).where(eq(levels.taskId, taskId));

			// 2. Luego eliminar la tarea en 'tasks'
			await db
				.delete(tasks)
				.where(and(eq(tasks.id, taskId), eq(tasks.userId, locals.user.id)));

			return { success: true };
		} catch (error) {
			console.error('Error al eliminar la tarea:', error);
			return fail(500, { message: 'Error al eliminar la tarea' });
		}
	},

	updateProfile: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { message: 'No autenticado' });
		}
		const formData = await request.formData();
		const nombre_de_usuario = (formData.get('nombre_de_usuario') as string)?.trim();
		const email = (formData.get('email') as string)?.trim().toLowerCase();
		const aliadoRaw =
			(formData.get('aliado') as string) || (formData.get('aliado_nombre') as string);
		const aliadoNombre = aliadoRaw ? aliadoRaw.trim() : null;
		const password = (formData.get('password') as string)?.trim();

		if (!nombre_de_usuario || !email) {
			return fail(400, { message: 'Nombre de usuario y correo son obligatorios' });
		}

		// Validar que el correo no esté en uso por otro usuario
		const existingUser = await db
			.select({ id: users.id })
			.from(users)
			.where(and(eq(users.email, email), not(eq(users.id, locals.user.id))))
			.limit(1);

		if (existingUser.length > 0) {
			return fail(400, { message: 'El correo electrónico ya está en uso por otra cuenta' });
		}

		const updatePayload: {
			nombre_de_usuario: string;
			email: string;
			aliados: string | null;
			password?: string;
		} = {
			nombre_de_usuario,
			email,
			aliados: aliadoNombre || null
		};

		if (password) {
			if (password.length < 6) {
				return fail(400, { message: 'La contraseña debe tener un mínimo de 6 caracteres' });
			}
			updatePayload.password = await bcrypt.hash(password, 10);
		}

		try {
			await db.update(users).set(updatePayload).where(eq(users.id, locals.user.id));
			return { success: true, message: 'Perfil y ajustes guardados exitosamente' };
		} catch (error) {
			console.error('Error al actualizar perfil de usuario:', error);
			return fail(500, { message: 'Error interno al guardar los cambios' });
		}
	},

	uploadAvatar: async ({ request, locals }) => {
		if (!locals.user) {
			return fail(401, { message: 'No autenticado' });
		}
		const formData = await request.formData();
		const avatarFile = formData.get('avatar') as File;
		if (!avatarFile || !(avatarFile instanceof File) || avatarFile.size === 0) {
			return fail(400, { message: 'Debes seleccionar una imagen válida' });
		}

		if (avatarFile.size > 5 * 1024 * 1024) {
			return fail(400, { message: 'El archivo excede el tamaño máximo permitido de 5 MB' });
		}

		try {
			const buffer = Buffer.from(await avatarFile.arrayBuffer());
			const fileName = `${locals.user.id}.png`;
			const { error } = await supabase.storage.from('MGAvatars').upload(fileName, buffer, {
				contentType: avatarFile.type || 'image/png',
				upsert: true
			});

			if (error) {
				console.error('Error subiendo avatar a Supabase:', error);
				return fail(500, { message: 'No se pudo subir la imagen al bucket MGAvatars' });
			}

			return { success: true, message: 'Avatar actualizado con éxito' };
		} catch (error) {
			console.error('Error al procesar el avatar:', error);
			return fail(500, { message: 'Error al procesar la imagen' });
		}
	},

	deleteAvatar: async ({ locals }) => {
		if (!locals.user) {
			return fail(401, { message: 'No autenticado' });
		}
		try {
			await supabase.storage.from('MGAvatars').remove([`${locals.user.id}.png`]);
			return { success: true, message: 'Avatar eliminado de MGAvatars' };
		} catch (error) {
			console.error('Error al eliminar avatar:', error);
			return fail(500, { message: 'Error al eliminar avatar' });
		}
	},

	deleteAccount: async ({ locals, cookies }) => {
		if (!locals.user) {
			return fail(401, { message: 'No autenticado' });
		}

		const userId = locals.user.id;

		try {
			// 1. Obtener todas las tareas del usuario
			const userTasks = await db
				.select({ id: tasks.id })
				.from(tasks)
				.where(eq(tasks.userId, userId));

			const taskIds = userTasks.map((t) => t.id);

			// 1.1 Eliminar de la tabla 'levels' en primer lugar
			if (taskIds.length > 0) {
				await db.delete(levels).where(inArray(levels.taskId, taskIds));
			}

			// 2. Eliminar de la tabla 'tasks' en segundo lugar
			await db.delete(tasks).where(eq(tasks.userId, userId));

			// 2.1 Intentar eliminar el avatar del bucket MGAvatars si existe
			try {
				await supabase.storage.from('MGAvatars').remove([`${userId}.png`]);
			} catch (err) {
				console.error('Error al eliminar archivo del bucket MGAvatars:', err);
			}

			// 3. Eliminar de la tabla 'users' por último
			await db.delete(users).where(eq(users.id, userId));

			// 4. Limpiar cookie de sesión
			clearSessionCookie(cookies);
		} catch (error) {
			console.error('Error al eliminar la cuenta:', error);
			return fail(500, { message: 'Error al eliminar la cuenta' });
		}

		throw redirect(303, '/auth');
	}
};
