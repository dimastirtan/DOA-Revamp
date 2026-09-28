import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Dashboard "Kelola Divisi" — hanya Admin(-1) & Controller(5).
// Lihat docs/divisi_design.md §4a.
export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');
	if (locals.user.userlevel !== -1 && locals.user.userlevel !== 5) redirect(302, '/dash');
	return {};
};
