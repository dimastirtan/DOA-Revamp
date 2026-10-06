import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { useraccounts, registers } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

// Halaman first-login: isi Surat Pernyataan (untuk user yang sudah punya akun).
// Kalau sudah pernah kirim → langsung ke /dash. NIK & nama dari session; org
// di-prefill dari useraccounts kalau ada.
export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');
	if (locals.user.userlevel === -1) redirect(302, '/dash'); // admin tak perlu

	const sudah = await db.query.registers.findFirst({ where: eq(registers.nik, locals.user.id) });
	if (sudah) redirect(302, '/dash');

	const acc = await db.query.useraccounts.findFirst({
		where: eq(useraccounts.username, locals.user.id)
	});

	return {
		nik: locals.user.id,
		nama: locals.user.configPenghasil || locals.user.id,
		org: acc?.org || ''
	};
};
