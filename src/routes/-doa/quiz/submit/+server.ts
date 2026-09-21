import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { quizAttempt, quizQuestion, useraccounts } from '$lib/server/db/schema';
import { and, eq, ne, sql } from 'drizzle-orm';

const PASSING_SCORE = 3;      // lulus minimal 3/5 (keputusan supervisor)
const POINTS_PER_CORRECT = 10;

// POST /-doa/quiz/submit { attemptNo, answers: [{ no, choice }] }
// Penilaian SELALU di server. Aturan poin "nilai tertinggi": poin yang
// dikreditkan = selisih (skor baru - skor terbaik sebelumnya) x 10, tidak
// pernah negatif — mengulang dengan hasil lebih jelek tidak mengurangi poin.
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		const attemptNo = Number(body?.attemptNo);
		const answers: { no: number; choice: string }[] = Array.isArray(body?.answers)
			? body.answers
			: [];

		if (!Number.isInteger(attemptNo) || attemptNo <= 0) {
			return json({ success: false, error: 'Attempt tidak valid.' }, { status: 400 });
		}

		const attempt = await db.query.quizAttempt.findFirst({
			where: eq(quizAttempt.no, attemptNo)
		});
		if (!attempt || attempt.username !== locals.user.id) {
			return json({ success: false, error: 'Attempt tidak ditemukan.' }, { status: 404 });
		}
		if (attempt.status !== 'pending') {
			return json(
				{ success: false, error: 'Attempt ini sudah dinilai. Mulai quiz baru untuk mengulang.' },
				{ status: 400 }
			);
		}

		const soal = await db
			.select()
			.from(quizQuestion)
			.where(and(eq(quizQuestion.standardNo, attempt.standardNo), eq(quizQuestion.remark, 'Active')));

		// Satu jawaban per soal; kunci dibandingkan di sini, tidak pernah ke client
		const chosen = new Map<number, string>();
		for (const a of answers) {
			if (Number.isInteger(a?.no) && typeof a?.choice === 'string') {
				chosen.set(a.no, a.choice.toUpperCase());
			}
		}
		const detail = soal.map((q) => ({ no: q.no, benar: chosen.get(q.no) === q.correct }));
		const score = detail.filter((d) => d.benar).length;
		const status = score >= PASSING_SCORE ? 'lulus' : 'gagal';

		// Skor terbaik SEBELUM attempt ini
		const [prev] = await db
			.select({ best: sql<number>`COALESCE(MAX(${quizAttempt.score}), 0)` })
			.from(quizAttempt)
			.where(
				and(
					eq(quizAttempt.username, attempt.username),
					eq(quizAttempt.standardNo, attempt.standardNo),
					ne(quizAttempt.status, 'pending')
				)
			);
		const prevBest = Number(prev?.best ?? 0);
		const pointsAdded = Math.max(0, score - prevBest) * POINTS_PER_CORRECT;

		await db
			.update(quizAttempt)
			.set({ score, status, points: pointsAdded, finishedAt: new Date() })
			.where(eq(quizAttempt.no, attempt.no));

		if (pointsAdded > 0) {
			await db
				.update(useraccounts)
				.set({ points: sql`${useraccounts.points} + ${pointsAdded}` })
				.where(eq(useraccounts.username, attempt.username));
		}

		const [me] = await db
			.select({ points: useraccounts.points })
			.from(useraccounts)
			.where(eq(useraccounts.username, attempt.username));

		return json({
			success: true,
			score,
			total: soal.length,
			status,
			passingScore: PASSING_SCORE,
			pointsAdded,
			bestScore: Math.max(prevBest, score),
			totalPoints: me?.points ?? 0,
			detail // hanya benar/salah per soal — kunci jawaban tidak dikirim
		});
	} catch (err: any) {
		console.error('POST /-doa/quiz/submit error:', err);
		return json({ success: false, error: err.message }, { status: 500 });
	}
};
