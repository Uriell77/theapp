import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { tasks, projectLogs } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

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
