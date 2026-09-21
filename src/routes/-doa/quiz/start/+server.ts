import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { quizAttempt, quizQuestion, standard, useraccounts } from '$lib/server/db/schema';
import { and, desc, eq, inArray, ne, sql } from 'drizzle-orm';

const QUESTIONS_PER_QUIZ = 5;

// Fisher–Yates — dipakai untuk mengacak urutan soal dan urutan opsi.
const shuffle = <T,>(arr: T[]): T[] => {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
};

// POST /-doa/quiz/start { ndm }
// Validasi procedure + kelengkapan soal, buat (atau pakai ulang) attempt
// 'pending', lalu kirim 5 soal teracak TANPA kunci jawaban.
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const ndm = typeof body?.ndm === 'string' ? body.ndm.trim() : '';
		if (!ndm) {
			return json({ success: false, error: 'Nomor dokumen tidak valid.' }, { status: 400 });
		}

		const doc = await db.query.standard.findFirst({
			where: and(
				inArray(standard.type, ['pro', 'pro2']),
				eq(standard.number, ndm),
				ne(standard.remark, 'D')
			)
		});
		if (!doc) {
			return json(
				{ success: false, error: 'Procedure tidak ditemukan atau sudah tidak aktif.' },
				{ status: 404 }
			);
		}

		// Sudah lulus procedure ini? → kunci: tidak boleh mengerjakan lagi.
		// (Authoritative di server supaya tidak bisa di-bypass lewat URL langsung.)
		// Saat ini lock per procedure (standard_no); penanganan per-revisi menyusul
		// (lihat rancangan revisi di docs/quiz_design.md).
		const passed = await db.query.quizAttempt.findFirst({
			where: and(
				eq(quizAttempt.username, locals.user.id),
				eq(quizAttempt.standardNo, doc.no),
				eq(quizAttempt.status, 'lulus')
			),
			orderBy: desc(quizAttempt.score)
		});
		if (passed) {
			const [meP] = await db
				.select({ points: useraccounts.points })
				.from(useraccounts)
				.where(eq(useraccounts.username, locals.user.id));
			return json(
				{
					success: false,
					code: 'SUDAH_LULUS',
					error: 'Anda sudah lulus quiz procedure ini.',
					doc: { ndm: doc.number, title: doc.title, revision: doc.revision },
					bestScore: passed.score,
					passedAt: passed.finishedAt,
					totalPoints: meP?.points ?? 0
				},
				{ status: 400 }
			);
		}

		// Soal diikat ke standard.no (PK permanen), bukan nomor dokumen —
		// jadi tetap ketemu walau nomor procedure sudah pernah diubah.
		const soal = await db
			.select()
			.from(quizQuestion)
			.where(and(eq(quizQuestion.standardNo, doc.no), eq(quizQuestion.remark, 'Active')));

		if (soal.length !== QUESTIONS_PER_QUIZ) {
			return json(
				{
					success: false,
					code: 'SOAL_BELUM_LENGKAP',
					error: 'Soal untuk procedure ini belum tersedia. Hubungi admin/controller DOA.',
					doc: { ndm: doc.number, title: doc.title, revision: doc.revision }
				},
				{ status: 400 }
			);
		}

		// Pakai ulang attempt pending untuk procedure yang sama (by standard.no,
		// stabil walau nomor berubah). Hindari baris menumpuk kalau tombol di PDF
		// diklik berulang tanpa menyelesaikan.
		let attempt = await db.query.quizAttempt.findFirst({
			where: and(
				eq(quizAttempt.username, locals.user.id),
				eq(quizAttempt.standardNo, doc.no),
				eq(quizAttempt.status, 'pending')
			),
			orderBy: desc(quizAttempt.no)
		});

		if (!attempt) {
			await db.insert(quizAttempt).values({
				username: locals.user.id,
				nama: locals.user.configPenghasil,
				standardNo: doc.no,
				nmdoc: doc.number ?? ndm,    // SNAPSHOT BEKU nomor saat mengerjakan
				title: doc.title,     // SNAPSHOT BEKU — log tetap benar walau dokumen diedit
				revision: doc.revision,
				startedAt: new Date()
			});
			attempt = await db.query.quizAttempt.findFirst({
				where: and(
					eq(quizAttempt.username, locals.user.id),
					eq(quizAttempt.standardNo, doc.no),
					eq(quizAttempt.status, 'pending')
				),
				orderBy: desc(quizAttempt.no)
			});
		}

		// Skor terbaik sebelumnya (aturan poin: hanya nilai tertinggi yang dihitung),
		// dikelompokkan per procedure by standard.no supaya tetap nyambung antar rename.
		const [best] = await db
			.select({ best: sql<number>`COALESCE(MAX(${quizAttempt.score}), 0)` })
			.from(quizAttempt)
			.where(
				and(
					eq(quizAttempt.username, locals.user.id),
					eq(quizAttempt.standardNo, doc.no),
					ne(quizAttempt.status, 'pending')
				)
			);

		const [me] = await db
			.select({ points: useraccounts.points })
			.from(useraccounts)
			.where(eq(useraccounts.username, locals.user.id));

		return json({
			success: true,
			attemptNo: attempt!.no,
			doc: { ndm: doc.number, title: doc.title, revision: doc.revision },
			bestScore: Number(best?.best ?? 0),
			totalPoints: me?.points ?? 0,
			questions: shuffle(soal).map((q) => ({
				no: q.no,
				question: q.question,
				options: shuffle([
					{ key: 'A', text: q.optionA },
					{ key: 'B', text: q.optionB },
					{ key: 'C', text: q.optionC },
					{ key: 'D', text: q.optionD }
				])
			}))
		});
	} catch (err: any) {
		console.error('POST /-doa/quiz/start error:', err);
		return json({ success: false, error: err.message }, { status: 500 });
	}
};
