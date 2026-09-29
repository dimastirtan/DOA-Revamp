import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Halaman ganti password. Harus sudah login. Kalau password sudah bukan default
// (tak wajib ganti) dan user iseng buka, tetap boleh (ubah password mandiri).
export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');
	return { mustChange: locals.user.mustChangePassword };
};
