import type { LayoutServerLoad } from './$types';
import { supabase } from '$lib/supabaseClient';

export const load: LayoutServerLoad = async ({ locals }) => {
	let avatarUrl: string | null = null;
	const user = locals.user;
	if (user) {
		try {
			const { data: avatarFiles } = await supabase.storage.from('MGAvatars').list('', { search: user.id });
			const matched = avatarFiles?.find((f) => f.name.startsWith(user.id));
			if (matched) {
				const base = supabase.storage.from('MGAvatars').getPublicUrl(matched.name).data.publicUrl;
				avatarUrl = `${base}?v=${encodeURIComponent(matched.updated_at || '1')}`;
			}
		} catch (err) {
			console.error('Error fetching avatar in layout:', err);
		}
	}

	return {
		user: user ? { ...user, avatarUrl } : null
	};
};
