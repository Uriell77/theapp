import { pgTable, serial, integer, text, timestamp } from 'drizzle-orm/pg-core';

// Tabla de usuarios generada por generador-auth
export const users = pgTable('users', {
    id: text('id').primaryKey(),
    nombre_de_usuario: text('nombre_de_usuario').notNull(),
    email: text('email').unique().notNull(),
    password: text('password').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
});
