import { supabase } from '$lib/supabaseClient';
import { redirect } from '@sveltejs/kit';

export const load = async ({ cookies }) => {
	const userId = cookies.get('session');

	if (!userId) {
		throw redirect(303, '/auth');
	}

	// Ajusta: tabla y columna si no son exactamente "users" e "id"
	const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();

	if (error) {
		return { status: 500, error: error.message };
	}

	if (!data) {
		return { status: 404 };
	}

	return {
		user: data
	};
};
