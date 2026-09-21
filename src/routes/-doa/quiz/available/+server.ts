import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { quizAttempt, quizQuestion, standard } from '$lib/server/db/schema';
import { and, eq, inArray, ne, sql } from 'drizzle-orm';

const QUESTIONS_PER_QUIZ = 5;

// GET /-doa/quiz/available?ndm=<nomor dokumen>
// Cek ringan (TANPA efek samping / tanpa membuat attempt): apakah procedure ini
// punya quiz aktif (pro/pro2, tidak dihapus, dan tepat 5 soal aktif).
// Dipakai dash untuk memutuskan apakah menampilkan modal tawaran quiz.
export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const ndm = (url.searchParams.get('ndm') ?? '').trim();
		if (!ndm) {
			return json({ success: true, available: false });
		}

		const doc = await db.query.standard.findFirst({
			where: and(
				inArray(standard.type, ['pro', 'pro2']),
				eq(standard.number, ndm),
				ne(standard.remark, 'D')
			)
		});
		if (!doc) {
			return json({ success: true, available: false });
		}

		const [cnt] = await db
			.select({ n: sql<number>`COUNT(*)` })
			.from(quizQuestion)
			.where(and(eq(quizQuestion.standardNo, doc.no), eq(quizQuestion.remark, 'Active')));

		const available = Number(cnt?.n ?? 0) === QUESTIONS_PER_QUIZ;

		// Sudah lulus? (per procedure/standard_no). Kalau ya, modal tak perlu muncul lagi.
		// Catatan: saat ini lock per procedure; penanganan per-revisi menyusul
		// (lihat rancangan revisi di docs/quiz_design.md).
		const passed = await db.query.quizAttempt.findFirst({
			where: and(
				eq(quizAttempt.username, locals.user.id),
				eq(quizAttempt.standardNo, doc.no),
				eq(quizAttempt.status, 'lulus')
			)
		});

		return json({
			success: true,
			available,
			alreadyPassed: !!passed,
			doc: { ndm: doc.number, title: doc.title, revision: doc.revision }
		});
	} catch (err: any) {
		console.error('GET /-doa/quiz/available error:', err);
		// Jangan ganggu alur buka dokumen kalau cek gagal — anggap tidak ada quiz.
		return json({ success: true, available: false });
	}
};
