import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Log Aktivitas (buka file DOA) hanya untuk Admin(-1) & Controller(5).
// Guard server-side supaya tak bisa dibuka user lain via URL langsung.
export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');
	if (locals.user.userlevel !== -1 && locals.user.userlevel !== 5) redirect(302, '/dash');
	return {};
};
