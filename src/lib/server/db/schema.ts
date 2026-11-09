import { pgTable, serial, integer, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Tabla de usuarios
export const users = pgTable('users', {
	id: text('id').primaryKey(),
	nombre_de_usuario: text('nombre_de_usuario').notNull(),
	email: text('email').unique().notNull(),
	password: text('password').notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	aliados: text('aliados')
});

// Tabla de Tareas
export const tasks = pgTable(
	'tasks',
	{
		id: serial('id').primaryKey(),
		title: text('title').notNull(),
		description: text('description'),
		tema: text('tema').notNull(),
		cantidad_de_niveles: integer('cantidad_de_niveles').notNull(),
		ilustracion: text('ilustracion'),
		status: text('status').default('0').notNull(),
		isArchived: boolean('is_archived').default(false).notNull(),
		userId: text('user_id')
			.references(() => users.id, { onDelete: 'cascade' })
			.notNull(),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		milestones: timestamp('milestones', { withTimezone: true }).array()
	},
	(table) => [index('tasks_user_id_idx').on(table.userId)]
);

// Tabla de Bitácora / Project Logs (Fricción Positiva)
export const projectLogs = pgTable(
	'project_logs',
	{
		id: text('id').primaryKey(),
		projectId: text('project_id'),
		taskId: integer('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
		level: integer('level').notNull(),
		logText: text('log_text').notNull(),
		mediaUrl: text('media_url'),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(table) => [index('project_logs_task_id_idx').on(table.taskId)]
);

// Tabla de niveles
export const levels = pgTable('levels', {
	id: serial('id').primaryKey(),
	taskId: integer('task_id')
		.references(() => tasks.id, { onDelete: 'cascade' })
		.notNull(),
	content: text('content').array().notNull(),
	cinematica: text('cinematica').array().notNull(),
	vista: text('vista').array().notNull(),
	createdAt: timestamp('created_at').defaultNow().notNull()
});

// Relaciones Drizzle
export const usersRelations = relations(users, ({ many }) => ({
	tasks: many(tasks)
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
	user: one(users, {
		fields: [tasks.userId],
		references: [users.id]
	}),
	levels: many(levels)
}));

export const levelsRelations = relations(levels, ({ one }) => ({
	task: one(tasks, {
		fields: [levels.taskId],
		references: [tasks.id]
	})
}));
