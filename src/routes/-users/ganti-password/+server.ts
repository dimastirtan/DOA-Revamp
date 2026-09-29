import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { useraccounts } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

const md5 = (s: string) => crypto.createHash('md5').update(s).digest('hex');

// Ganti password milik user yang sedang login (dipakai untuk paksa-ganti saat
// login pertama, sekaligus fitur ubah password mandiri). Lihat hooks.server.ts.
export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { newPassword, confirmPassword } = await request.json();

	if (typeof newPassword !== 'string' || newPassword.length < 6) {
		return json({ error: 'Password baru minimal 6 karakter.' }, { status: 400 });
	}
	if (newPassword !== confirmPassword) {
		return json({ error: 'Konfirmasi password tidak cocok.' }, { status: 400 });
	}
	// Tidak boleh sama dengan NIK — kalau tidak, statusnya tetap "default" dan
	// user akan terus dipaksa ganti (loop).
	if (newPassword === locals.user.id) {
		return json({ error: 'Password tidak boleh sama dengan NIK.' }, { status: 400 });
	}

	await db
		.update(useraccounts)
		.set({ password: md5(newPassword) })
		.where(eq(useraccounts.username, locals.user.id));

	return json({ success: true });
};
