import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { quizAttempt, useraccounts } from '$lib/server/db/schema';
import { and, desc, eq, gte, like, lte, or, sql } from 'drizzle-orm';

// GET /-doa/quiz/log — log/history quiz (terpisah dari log aktivitas).
// Admin (-1) & controller (5) melihat semua baris; user lain hanya miliknya
// sendiri (dipaksa server-side, param mine diabaikan untuk non-privileged).
// ?export=xlsx -> semua baris tanpa pagination (data mentah utk sheet di client)
export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const privileged = locals.user.userlevel === -1 || locals.user.userlevel === 5;
		const mineOnly = !privileged || url.searchParams.get('mine') === '1';

		const isExport = url.searchParams.get('export') === 'xlsx';
		const search = (url.searchParams.get('search') ?? '').trim();
		const dateFrom = (url.searchParams.get('from') ?? '').trim();
		const dateTo = (url.searchParams.get('to') ?? '').trim();
		const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
		const limit = Math.min(100, Math.max(5, parseInt(url.searchParams.get('limit') ?? '50')));
		const offset = (page - 1) * limit;

		// Rentang tanggal difilter berdasarkan waktu MULAI mengerjakan (started_at).
		const validDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
		const where = and(
			mineOnly ? eq(quizAttempt.username, locals.user.id) : undefined,
			validDate(dateFrom) ? gte(quizAttempt.startedAt, new Date(`${dateFrom}T00:00:00`)) : undefined,
			validDate(dateTo) ? lte(quizAttempt.startedAt, new Date(`${dateTo}T23:59:59`)) : undefined,
			search
				? or(
						like(quizAttempt.username, `%${search}%`),
						like(quizAttempt.nama, `%${search}%`),
						like(quizAttempt.nmdoc, `%${search}%`),
						like(quizAttempt.title, `%${search}%`)
					)
				: undefined
		);

		const baseQuery = () =>
			db
				.select({
					no: quizAttempt.no,
					username: quizAttempt.username,
					nama: quizAttempt.nama,
					nmdoc: quizAttempt.nmdoc,
					title: quizAttempt.title,
					revision: quizAttempt.revision,
					score: quizAttempt.score,
					status: quizAttempt.status,
					points: quizAttempt.points,
					startedAt: quizAttempt.startedAt,
					finishedAt: quizAttempt.finishedAt
				})
				.from(quizAttempt)
				.where(where)
				.orderBy(desc(quizAttempt.no));

		// Poin total user (untuk chip "Poin" di halaman quiz)
		const [me] = await db
			.select({ points: useraccounts.points })
			.from(useraccounts)
			.where(eq(useraccounts.username, locals.user.id));

		if (isExport) {
			const rows = await baseQuery();
			return json({ success: true, data: rows, totalPoints: me?.points ?? 0 });
		}

		const [rows, [count]] = await Promise.all([
			baseQuery().limit(limit).offset(offset),
			db.select({ total: sql<number>`COUNT(*)` }).from(quizAttempt).where(where)
		]);

		const total = Number(count?.total ?? 0);
		return json({
			success: true,
			data: rows,
			totalPoints: me?.points ?? 0,
			pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
		});
	} catch (err: any) {
		console.error('GET /-doa/quiz/log error:', err);
		return json({ success: false, error: err.message }, { status: 500 });
	}
};
