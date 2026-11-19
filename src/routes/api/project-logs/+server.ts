import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { users, tasks, levels, projectLogs } from '$lib/server/db/schema';
import { eq, and, asc, inArray, or } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { GEMINI_API_KEY } from '$env/static/private';

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

const CREDITS_MODELS = [
	'gemini-3.5-flash',
	'gemini-3.5-flash-lite',
	'gemini-3.8-flash',
	'gemini-flash-latest',
	'gemini-flash-lite-latest'
];

function isSaturationError(err: any): boolean {
	const msg = typeof err?.message === 'string' ? err.message : '';
	return (
		err?.status === 503 ||
		err?.status === 429 ||
		msg.includes('503') ||
		msg.includes('429') ||
		msg.includes('UNAVAILABLE') ||
		msg.includes('RESOURCE_EXHAUSTED')
	);
}

function buildFallbackMotivationalSpeech(
	userName: string,
	ally: string | null | undefined,
	projects: Array<{ title: string; tema: string; outcome: string }>,
	stats: { totalProjects: number; victories: number; retreats: number; active: number; totalLogs: number }
): string {
	const name = userName || 'viajero';
	const allyLine = ally ? ` junto a ${ally}` : '';

	if (projects.length === 0) {
		return `${name}, cada gran epopeya comienza antes de dar el primer paso. Hoy contemplas un lienzo en blanco listo para tus futuras hazañas${allyLine}. No temas equivocarte ni empezar de nuevo, porque tu valor y tu constancia ya laten dentro de ti. Da el primer paso, registra cada avance y confía en el camino: cada gota de esfuerzo que entregues siempre será recompensada.`;
	}

	const firstTitle = projects[0].title;
	const lastTitle = projects[projects.length - 1].title;
	const victoryPart =
		stats.victories > 0
			? `Has conquistado ${stats.victories} ${stats.victories === 1 ? 'victoria inolvidable' : 'victorias inolvidables'}, demostrando que cuando te comprometes eres imparable.`
			: `Cada paso que has dado en ${stats.totalProjects} ${stats.totalProjects === 1 ? 'misión' : 'misiones'} está forjando tu carácter para las victorias que están por llegar.`;
	const retreatPart =
		stats.retreats > 0
			? ` Incluso en tus ${stats.retreats} ${stats.retreats === 1 ? 'retirada táctica' : 'retiradas tácticas'}, no hubo derrota, sino la valentía de aprender, respirar y volver más sabio.`
			: '';
	const logsPart =
		stats.totalLogs > 0
			? ` Cada uno de tus ${stats.totalLogs} registros de desbloqueo guarda la prueba viva de tu disciplina.`
			: '';

	return `${name}, mira hacia atrás con orgullo por todo lo que has recorrido${allyLine}. Desde aquel comienzo con ${firstTitle} hasta llegar a ${lastTitle}, cada proyecto y cada desafío han puesto a prueba tu resiliencia. ${victoryPart}${retreatPart}${logsPart} Nunca subestimes el peso de tus pequeños pasos diarios, porque la constancia silenciosa construye destinos extraordinarios. Sigue adelante con la frente en alto: tu entrega, tu coraje y tu esfuerzo siempre serán recompensados.`;
}

async function generateMotivationalSpeech(
	userName: string,
	ally: string | null | undefined,
	creditsProjects: Array<{
		order: number;
		title: string;
		tema: string;
		statusLabel: string;
		outcome: string;
		logs: Array<{ level: number; log_text: string }>;
	}>,
	stats: { totalProjects: number; victories: number; retreats: number; active: number; totalLogs: number }
): Promise<string> {
	const fallback = buildFallbackMotivationalSpeech(userName, ally, creditsProjects, stats);
	if (!GEMINI_API_KEY) return fallback;

	const projectSummary = creditsProjects
		.map((p) => {
			const logExcerpts = p.logs
				.slice(0, 4)
				.map((l) => `Cap.${l.level + 1}: "${l.log_text.slice(0, 120)}"`)
				.join(' | ');
			return `${p.order}. "${p.title}" [Temática: ${p.tema}] - Estado: ${p.statusLabel}${logExcerpts ? ` | Bitácora: ${logExcerpts}` : ''}`;
		})
		.join('\n');

	const prompt = `Eres la voz cálida, épica y profundamente emotiva de los créditos finales de una película sobre la vida real de "${userName}"${ally ? ` (acompañado por su aliado "${ally}")` : ''}.

DATOS REALES DE SU TRAYECTORIA (del primer proyecto al último):
- Total de proyectos: ${stats.totalProjects}
- Logros / Victorias completadas: ${stats.victories}
- Proyectos activos en curso: ${stats.active}
- Abandonos / Retiradas tácticas: ${stats.retreats}
- Registros de esfuerzo en bitácora: ${stats.totalLogs}

HISTORIAL CRONOLÓGICO DE PROYECTOS:
${projectSummary || 'Aún no ha iniciado su primer proyecto.'}

OBJETIVO:
Escribe un discurso motivacional conmovedor en español dirigido directamente en segunda persona ("tú") a ${userName} para que suene narrado en voz alta mientras ruedan los créditos de su actividad.
REGLAS ESTRICTAS:
1. Menciona con naturalidad títulos o temáticas reales de su viaje (desde el primero hasta el último si hay varios), sus logros y también dignifica sus abandonos/retiradas como muestra de resiliencia, valentía y aprendizaje.
2. Resalta su resiliencia, valor y el esfuerzo aplicado en cada tarea, transmitiendo con emoción que ningún esfuerzo se pierde y que su dedicación siempre será recompensada.
3. Extensión: entre 125 y 175 palabras en un solo flujo continuo de 2 o 3 párrafos breves.
4. Texto limpio para narración por voz (TTS): SIN markdown, SIN asteriscos, SIN viñetas, SIN emojis ni comillas innecesarias. Devuelve únicamente el texto del discurso.`;

	for (const modelName of CREDITS_MODELS) {
		try {
			const result = await ai.models.generateContent({
				model: modelName,
				contents: prompt
			});
			const clean = result?.text?.replace(/[*_#`~]/g, '').trim();
			if (clean) return clean;
		} catch (err: any) {
			const msg = typeof err?.message === 'string' ? err.message : '';
			const isNotFound = err?.status === 404 || msg.includes('404') || msg.includes('NOT_FOUND');
			if (isNotFound || isSaturationError(err)) {
				continue;
			}
			console.warn(`[Credits Speech] Error en ${modelName}:`, msg);
		}
	}

	return fallback;
}

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		throw error(401, 'No autenticado');
	}

	try {
		const mode = url.searchParams.get('mode');
		const taskIdParam = url.searchParams.get('taskId');

		if (mode === 'credits') {
			const [userRow] = await db
				.select({
					id: users.id,
					nombre_de_usuario: users.nombre_de_usuario,
					aliados: users.aliados,
					createdAt: users.createdAt
				})
				.from(users)
				.where(eq(users.id, locals.user.id))
				.limit(1);

			const userTasks = await db
				.select()
				.from(tasks)
				.where(eq(tasks.userId, locals.user.id))
				.orderBy(asc(tasks.id));

			const taskIds = userTasks.map((t) => t.id);
			const taskIdStrings = taskIds.map(String);

			const [taskLevels, logRows] =
				taskIds.length > 0
					? await Promise.all([
							db
								.select({ id: levels.id, taskId: levels.taskId })
								.from(levels)
								.where(inArray(levels.taskId, taskIds)),
							db
								.select()
								.from(projectLogs)
								.where(
									or(
										inArray(projectLogs.taskId, taskIds),
										inArray(projectLogs.projectId, taskIdStrings)
									)
								)
								.orderBy(asc(projectLogs.level), asc(projectLogs.createdAt))
						])
					: [[], []];

			const taskMap = new Map(userTasks.map((t) => [t.id, t]));
			const logsByTask = new Map<number, any[]>();
			const normalizedLogs = logRows.map((row) => {
				const resolvedTaskId =
					row.taskId ?? (row.projectId ? parseInt(row.projectId, 10) : null);
				const taskInfo =
					resolvedTaskId !== null && !isNaN(resolvedTaskId)
						? taskMap.get(resolvedTaskId)
						: undefined;

				const normalized = {
					id: row.id,
					task_id: resolvedTaskId,
					project_id:
						row.projectId ?? (resolvedTaskId !== null ? String(resolvedTaskId) : null),
					level: row.level,
					log_text: row.logText,
					media_url: row.mediaUrl,
					created_at:
						row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
					tasks: taskInfo ? { title: taskInfo.title, tema: taskInfo.tema } : null
				};

				if (resolvedTaskId !== null && !isNaN(resolvedTaskId)) {
					const bucket = logsByTask.get(resolvedTaskId) ?? [];
					bucket.push(normalized);
					logsByTask.set(resolvedTaskId, bucket);
				}

				return normalized;
			});

			const levelsCountByTask = new Map<number, number>();
			for (const lvl of taskLevels) {
				levelsCountByTask.set(lvl.taskId, (levelsCountByTask.get(lvl.taskId) ?? 0) + 1);
			}

			let victories = 0;
			let retreats = 0;
			let active = 0;

			const creditsProjects = userTasks.map((t, index) => {
				const statusNum = parseInt(String(t.status), 10);
				const maxLevels = Number(t.cantidad_de_niveles) || 1;
				const isRetreat = statusNum === -1;
				const isVictory = !isRetreat && statusNum >= maxLevels - 1;
				const outcome = isVictory ? 'victory' : isRetreat ? 'retreat' : 'active';
				const statusLabel = isVictory
					? 'Victoria Lograda'
					: isRetreat
						? 'Retirada Táctica'
						: 'Misión en Curso';

				if (isVictory) victories++;
				else if (isRetreat) retreats++;
				else active++;

				const projectLogEntries = (logsByTask.get(t.id) ?? []).sort(
					(a, b) => Number(a.level) - Number(b.level)
				);

				return {
					order: index + 1,
					id: t.id,
					title: t.title,
					tema: t.tema,
					cantidad_de_niveles: maxLevels,
					status: t.status,
					isArchived: t.isArchived,
					createdAt: t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
					outcome,
					statusLabel,
					levelsCount: levelsCountByTask.get(t.id) ?? maxLevels,
					logs: projectLogEntries
				};
			});

			const stats = {
				totalProjects: creditsProjects.length,
				victories,
				retreats,
				active,
				totalLogs: normalizedLogs.length,
				totalPhotos: normalizedLogs.filter((l) => Boolean(l.media_url)).length
			};

			const userName = userRow?.nombre_de_usuario || locals.user.nombre_de_usuario || 'Héroe';
			const ally = userRow?.aliados || null;
			const motivationalSpeech = await generateMotivationalSpeech(
				userName,
				ally,
				creditsProjects,
				stats
			);

			return json({
				userProfile: {
					nombre_de_usuario: userName,
					aliados: ally,
					createdAt:
						userRow?.createdAt instanceof Date
							? userRow.createdAt.toISOString()
							: userRow?.createdAt ?? null
				},
				creditsProjects,
				stats,
				motivationalSpeech,
				logs: normalizedLogs
			});
		}

		const userTasks = await db
			.select({ id: tasks.id, title: tasks.title, tema: tasks.tema })
			.from(tasks)
			.where(eq(tasks.userId, locals.user.id));

		if (userTasks.length === 0) {
			return json({ logs: [] });
		}

		let targetTasks = userTasks;
		if (taskIdParam !== null) {
			const requestedId = parseInt(taskIdParam, 10);
			if (isNaN(requestedId)) {
				throw error(400, 'taskId inválido');
			}
			targetTasks = userTasks.filter((t) => t.id === requestedId);
			if (targetTasks.length === 0) {
				return json({ logs: [] });
			}
		}

		const taskMap = new Map(targetTasks.map((t) => [t.id, t]));
		const targetIds = targetTasks.map((t) => t.id);
		const targetIdStrings = targetIds.map(String);

		const rows = await db
			.select()
			.from(projectLogs)
			.where(
				or(
					inArray(projectLogs.taskId, targetIds),
					inArray(projectLogs.projectId, targetIdStrings)
				)
			)
			.orderBy(asc(projectLogs.level), asc(projectLogs.createdAt));

		const logs = rows.map((row) => {
			const resolvedTaskId =
				row.taskId ?? (row.projectId ? parseInt(row.projectId, 10) : null);
			const taskInfo =
				resolvedTaskId !== null && !isNaN(resolvedTaskId)
					? taskMap.get(resolvedTaskId)
					: undefined;

			return {
				id: row.id,
				task_id: resolvedTaskId,
				project_id: row.projectId ?? (resolvedTaskId !== null ? String(resolvedTaskId) : null),
				level: row.level,
				log_text: row.logText,
				media_url: row.mediaUrl,
				created_at:
					row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
				tasks: taskInfo ? { title: taskInfo.title, tema: taskInfo.tema } : null
			};
		});

		return json({ logs });
	} catch (err: any) {
		console.error('Error al obtener bitácoras de desbloqueo:', err);
		if (err.status) throw err;
		throw error(500, err.message || 'Error interno al consultar project_logs');
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		throw error(401, 'No autenticado');
	}

	try {
		const body = await request.json();
		const { taskId, projectId, level, logText, mediaUrl } = body;

		const targetId = parseInt(String(taskId || projectId), 10);
		const levelNum = parseInt(String(level), 10);

		if (isNaN(targetId) || isNaN(levelNum) || !logText || logText.trim().length < 50) {
			throw error(400, 'Datos incompletos o texto menor a 50 caracteres');
		}

		// Verificar pertenencia de la tarea
		const [task] = await db
			.select()
			.from(tasks)
			.where(and(eq(tasks.id, targetId), eq(tasks.userId, locals.user.id)));

		if (!task) {
			throw error(404, 'Proyecto no encontrado');
		}

		// 1. Insertar en project_logs
		const logId = randomUUID();
		await db.insert(projectLogs).values({
			id: logId,
			taskId: task.id,
			projectId: String(task.id),
			level: levelNum,
			logText: logText.trim(),
			mediaUrl: mediaUrl || null,
			createdAt: new Date()
		});

		// 2. Actualizar milestones en tasks (reemplazar la fecha bloqueada del nivel por la actual)
		const now = new Date();
		let updatedMilestones: Date[] = [];
		if (Array.isArray(task.milestones) && task.milestones.length > 0) {
			updatedMilestones = [...task.milestones];
			if (levelNum < updatedMilestones.length) {
				updatedMilestones[levelNum] = now;
			} else {
				updatedMilestones.push(now);
			}
		} else {
			updatedMilestones = [now];
		}

		await db
			.update(tasks)
			.set({ milestones: updatedMilestones })
			.where(eq(tasks.id, task.id));

		return json({
			success: true,
			milestones: updatedMilestones.map((d) => (d instanceof Date ? d.toISOString() : d))
		});
	} catch (err: any) {
		console.error('Error al registrar bitácora:', err);
		if (err.status) throw err;
		throw error(500, err.message || 'Error interno al registrar la bitácora');
	}
};
