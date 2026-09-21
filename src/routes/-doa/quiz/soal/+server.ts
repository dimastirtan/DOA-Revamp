import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { quizQuestion, standard } from '$lib/server/db/schema';
import { and, eq, inArray, like, ne, or, sql } from 'drizzle-orm';

const MAX_QUESTIONS = 5;
const CORRECT_KEYS = ['A', 'B', 'C', 'D'] as const;

// Kelola soal hanya untuk admin (-1) dan controller (5) — cek server-side,
// bukan cuma menyembunyikan tombol di UI.
const canManage = (user: { userlevel: number } | null) =>
	!!user && (user.userlevel === -1 || user.userlevel === 5);

// Procedure diidentifikasi lewat standard.no (PK permanen), BUKAN nomor dokumen,
// supaya soal tetap nempel walau nomornya diubah (docs/quiz_design.md §11).

// GET /-doa/quiz/soal?no=...       -> soal sebuah procedure LENGKAP dgn kunci (form edit)
// GET /-doa/quiz/soal?search=&page= -> daftar procedure + jumlah soal aktifnya
export const GET: RequestHandler = async ({ url, locals }) => {
	if (!canManage(locals.user)) {
		return json({ success: false, error: 'Forbidden' }, { status: 403 });
	}

	try {
		const noParam = (url.searchParams.get('no') ?? '').trim();

		if (noParam) {
			const standardNo = parseInt(noParam);
			if (!Number.isInteger(standardNo) || standardNo <= 0) {
				return json({ success: false, error: 'Parameter no tidak valid.' }, { status: 400 });
			}

			const doc = await db.query.standard.findFirst({
				where: and(
					inArray(standard.type, ['pro']),
					eq(standard.no, standardNo),
					ne(standard.remark, 'D')
				)
			});
			if (!doc) {
				return json({ success: false, error: 'Procedure tidak ditemukan.' }, { status: 404 });
			}

			const soal = await db
				.select()
				.from(quizQuestion)
				.where(and(eq(quizQuestion.standardNo, standardNo), eq(quizQuestion.remark, 'Active')))
				.orderBy(quizQuestion.no);

			return json({
				success: true,
				doc: { no: doc.no, ndm: doc.number, title: doc.title, revision: doc.revision },
				soal: soal.map((q) => ({
					no: q.no,
					question: q.question,
					a: q.optionA,
					b: q.optionB,
					c: q.optionC,
					d: q.optionD,
					correct: q.correct,
					updatedBy: q.updatedBy,
					updatedAt: q.updatedAt
				}))
			});
		}

		// ── Daftar procedure ────────────────────────────────────────────────
		const search = (url.searchParams.get('search') ?? '').trim();
		const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
		const limit = 20;
		const offset = (page - 1) * limit;

		const baseWhere = and(
			inArray(standard.type, ['pro']),
			ne(standard.remark, 'D'),
			search
				? or(like(standard.number, `%${search}%`), like(standard.title, `%${search}%`))
				: undefined
		);

		const [rows, [count]] = await Promise.all([
			db
				.select({
					no: standard.no,
					type: standard.type,
					number: standard.number,
					revision: standard.revision,
					title: standard.title
				})
				.from(standard)
				.where(baseWhere)
				.orderBy(standard.number)
				.limit(limit)
				.offset(offset),
			db.select({ total: sql<number>`COUNT(*)` }).from(standard).where(baseWhere)
		]);

		// Hitung jumlah soal aktif per procedure by standard.no (kunci stabil).
		const nos = rows.map((r) => r.no);
		const counts = nos.length
			? await db
					.select({ standardNo: quizQuestion.standardNo, n: sql<number>`COUNT(*)` })
					.from(quizQuestion)
					.where(and(inArray(quizQuestion.standardNo, nos), eq(quizQuestion.remark, 'Active')))
					.groupBy(quizQuestion.standardNo)
			: [];
		const countMap = new Map(counts.map((c) => [c.standardNo, Number(c.n)]));

		const total = Number(count?.total ?? 0);
		return json({
			success: true,
			data: rows.map((r) => ({ ...r, soalCount: countMap.get(r.no) ?? 0 })),
			pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
		});
	} catch (err: any) {
		console.error('GET /-doa/quiz/soal error:', err);
		return json({ success: false, error: err.message }, { status: 500 });
	}
};

// POST /-doa/quiz/soal { no, soal: [{ no?, question, a, b, c, d, correct }] }
// (`no` = standard.no procedure). Upsert soal. Soal aktif lama yang tidak ada
// di kiriman di-set remark='D' (soft-delete, jejak audit tetap ada).
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!canManage(locals.user)) {
		return json({ success: false, error: 'Forbidden' }, { status: 403 });
	}

	try {
		const body = await request.json();
		const standardNo = Number(body?.no);
		const incoming: any[] = Array.isArray(body?.soal) ? body.soal : [];

		if (!Number.isInteger(standardNo) || standardNo <= 0) {
			return json({ success: false, error: 'Procedure tidak valid.' }, { status: 400 });
		}
		if (incoming.length > MAX_QUESTIONS) {
			return json(
				{ success: false, error: `Maksimal ${MAX_QUESTIONS} soal per procedure.` },
				{ status: 400 }
			);
		}

		const doc = await db.query.standard.findFirst({
			where: and(
				inArray(standard.type, ['pro']),
				eq(standard.no, standardNo),
				ne(standard.remark, 'D')
			)
		});
		if (!doc) {
			return json({ success: false, error: 'Procedure tidak ditemukan.' }, { status: 404 });
		}

		// Validasi isi tiap soal
		for (let i = 0; i < incoming.length; i++) {
			const s = incoming[i];
			const fields = [s?.question, s?.a, s?.b, s?.c, s?.d];
			if (fields.some((f) => typeof f !== 'string' || !f.trim())) {
				return json(
					{ success: false, error: `Soal ${i + 1}: pertanyaan dan keempat opsi wajib diisi.` },
					{ status: 400 }
				);
			}
			if (!CORRECT_KEYS.includes(s?.correct)) {
				return json(
					{ success: false, error: `Soal ${i + 1}: kunci jawaban belum dipilih.` },
					{ status: 400 }
				);
			}
		}

		const existing = await db
			.select({ no: quizQuestion.no })
			.from(quizQuestion)
			.where(and(eq(quizQuestion.standardNo, standardNo), eq(quizQuestion.remark, 'Active')));
		const existingNos = new Set(existing.map((e) => e.no));

		const now = new Date();
		const stamp = { updatedBy: locals.user!.id, updatedAt: now };
		const keptNos = new Set<number>();

		for (const s of incoming) {
			const values = {
				question: s.question.trim(),
				optionA: s.a.trim(),
				optionB: s.b.trim(),
				optionC: s.c.trim(),
				optionD: s.d.trim(),
				correct: s.correct as (typeof CORRECT_KEYS)[number],
				// nmdoc = snapshot informatif nomor saat ini (bukan kunci pencocokan)
				nmdoc: doc.number,
				...stamp
			};
			if (Number.isInteger(s.no) && existingNos.has(s.no)) {
				keptNos.add(s.no);
				await db.update(quizQuestion).set(values).where(eq(quizQuestion.no, s.no));
			} else {
				await db.insert(quizQuestion).values({ ...values, standardNo });
			}
		}

		const removed = [...existingNos].filter((no) => !keptNos.has(no));
		if (removed.length) {
			await db
				.update(quizQuestion)
				.set({ remark: 'D', ...stamp })
				.where(inArray(quizQuestion.no, removed));
		}

		return json({
			success: true,
			count: incoming.length,
			quizAktif: incoming.length === MAX_QUESTIONS
		});
	} catch (err: any) {
		console.error('POST /-doa/quiz/soal error:', err);
		return json({ success: false, error: err.message }, { status: 500 });
	}
};
