import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Kelola soal hanya untuk admin (-1) dan controller (5).
export const load: PageServerLoad = async ({ locals }) => {
    const lvl = locals.user?.userlevel;
    if (lvl !== -1 && lvl !== 5) {
        redirect(302, '/dash');
    }
    return {};
};
