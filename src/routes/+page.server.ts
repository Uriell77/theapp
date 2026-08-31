import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Consulta directa con Drizzle (PostgreSQL TCP, sin fetch HTTP en SSR)
	const publicUsers = await db
		.select({
			id: users.id,
			nombre_de_usuario: users.nombre_de_usuario,
			createdAt: users.createdAt
		})
		.from(users);

	return {
		users: publicUsers ?? []
	};
};
