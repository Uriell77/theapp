import { pgTable, serial, integer, text, timestamp,boolean} from 'drizzle-orm/pg-core';

// Tabla de usuarios generada por generador-auth
export const users = pgTable('users', {
    id: text('id').primaryKey(),
    nombre_de_usuario: text('nombre_de_usuario').notNull(),
    email: text('email').unique().notNull(),
    password: text('password').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
});

//Tabla de Tareas
export const tasks = pgTable('tasks', {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description'),
    tema: text('tema').notNull(),
    cantidad_de_niveles: integer('cantidad_de_niveles').notNull(),
    ilustracion: text('ilustracion'),
    nivel_actual: text('status').default('pending').notNull(),
    userId: text('user_id').references(() => users.id, {onDelete:'cascade'}).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
});

//tabla de niveles
export const levels = pgTable('levels', {
    id: serial('id').primaryKey(),
    taskId: integer('task_id').references(() => tasks.id).notNull(),
    content: text('content').array().notNull(),
    cinematica: text('cinematica').array().notNull(),
    vista: boolean('vista').array().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
});