import type { LayoutServerLoad } from './$types';
import { supabase } from '$lib/supabaseClient';

export const load: LayoutServerLoad = async ({ locals }) => {
	let avatarUrl: string | null = null;
	let avatarGridUrl: string | null = null;
	const user = locals.user;
	if (user) {
		try {
			const { data: avatarFiles } = await supabase.storage
				.from('MGAvatars')
				.list('', { search: user.id });
			const matchedSingle = avatarFiles?.find(
				(f) => f.name.startsWith(user.id) && !f.name.includes('_grid')
			);
			const matchedGrid = avatarFiles?.find(
				(f) => f.name === `${user.id}_grid.png` || (f.name.startsWith(user.id) && f.name.includes('_grid'))
			);

			if (matchedGrid) {
				const gridBase = supabase.storage.from('MGAvatars').getPublicUrl(matchedGrid.name)
					.data.publicUrl;
				avatarGridUrl = `${gridBase}?v=${encodeURIComponent(matchedGrid.updated_at || '1')}`;
			}
			if (matchedSingle) {
				const singleBase = supabase.storage.from('MGAvatars').getPublicUrl(matchedSingle.name)
					.data.publicUrl;
				avatarUrl = `${singleBase}?v=${encodeURIComponent(matchedSingle.updated_at || '1')}`;
			} else if (avatarGridUrl) {
				avatarUrl = avatarGridUrl;
			}
		} catch (err) {
			console.error('Error fetching avatar in layout:', err);
		}
	}

	return {
		user: user
			? { ...user, avatarUrl, avatarGridUrl, isAvatarGrid: Boolean(avatarGridUrl) }
			: null
	};
};
