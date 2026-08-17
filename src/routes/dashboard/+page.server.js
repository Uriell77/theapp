import { supabase } from '$lib/supabaseClient';
import { redirect } from '@sveltejs/kit';

export const load = async ({ cookies }) => {
	const userId = cookies.get('session');

	if (!userId) {
		throw redirect(303, '/auth');
	}

	// Consulta anidada: trae el usuario, sus tareas, y los niveles de cada tarea
	const { data, error } = await supabase
		.from('users')
		.select(`
			*,
			tasks (
				*,
				levels (
					*
				)
			)
		`)
		.eq('id', userId)
		.maybeSingle();

	if (error) {
		console.error('Error fetching data:', error);
		return { status: 500, error: error.message };
	}

	if (!data) {
		return { status: 404 };
	}

	return {
		user: data
	};
};