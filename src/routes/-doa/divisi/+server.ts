import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { standard, procedureDivision } from '$lib/server/db/schema';
import { and, eq, ne, inArray, sql } from 'drizzle-orm';

// Kelola mapping procedure -> divisi (Fase 4). Hanya Admin(-1) & Controller(5).
// Lihat docs/divisi_design.md §4a.
const DIVISI_LIST = [
	{ value: 6, label: 'Program Management' },
	{ value: 7, label: 'Manajemen Resiko' },
	{ value: 8, label: 'Human Capital' },
	{ value: 9, label: 'Direktorat Produksi' }
];

const canManage = (lvl: unknown) => lvl === -1 || lvl === 5;

// GET: daftar procedure (pro+pro2) + divisi yang sudah dipetakan. Paginated + search.
export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	if (!canManage(locals.user.userlevel)) return json({ error: 'Forbidden' }, { status: 403 });

	const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
	const limit = Math.min(100, Math.max(10, parseInt(url.searchParams.get('limit') ?? '50')));
	const search = (url.searchParams.get('search') ?? '').trim();
	const offset = (page - 1) * limit;

	const conds = [
		sql`${standard.type} IN ('pro', 'pro2')`,
		sql`(${standard.remark} IS NULL OR ${standard.remark} <> 'D')`
	];
	if (search) {
		const like = `%${search}%`;
		conds.push(
			sql`(${standard.number} LIKE ${like} OR ${standard.title} LIKE ${like} OR ${standard.no} LIKE ${like})`
		);
	}
	const where = sql.join(conds, sql` AND `);

	const [rows, cnt] = await Promise.all([
		db
			.select({
				no: standard.no,
				number: standard.number,
				title: standard.title,
				revision: standard.revision,
				type: standard.type
			})
			.from(standard)
			.where(where)
			.orderBy(standard.number)
			.limit(limit)
			.offset(offset),
		db.select({ c: sql<number>`count(*)` }).from(standard).where(where)
	]);

	// Ambil mapping utk halaman ini.
	const nos = rows.map((r) => r.no);
	const mapByNo: Record<number, number[]> = {};
	if (nos.length) {
		const maps = await db
			.select({ standardNo: procedureDivision.standardNo, division: procedureDivision.division })
			.from(procedureDivision)
			.where(and(inArray(procedureDivision.standardNo, nos), ne(procedureDivision.remark, 'D')));
		for (const m of maps) (mapByNo[m.standardNo] ??= []).push(m.division);
	}
	const data = rows.map((r) => ({ ...r, divisions: mapByNo[r.no] ?? [] }));

	const total = Number(cnt[0]?.c ?? 0);
	return json({
		data,
		divisiList: DIVISI_LIST,
		pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
	});
};

// POST: toggle satu mapping. Body { standardNo, division, on }.
export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) return json({ error: 'Unauthorized' }, { status: 401 });
	if (!canManage(locals.user.userlevel)) return json({ error: 'Forbidden' }, { status: 403 });

	const body = await request.json();
	const standardNo = Number(body.standardNo);
	const division = Number(body.division);
	const on = !!body.on;

	if (!Number.isInteger(standardNo) || !DIVISI_LIST.some((d) => d.value === division)) {
		return json({ error: 'Data tidak valid.' }, { status: 400 });
	}

	const existing = await db
		.select()
		.from(procedureDivision)
		.where(and(eq(procedureDivision.standardNo, standardNo), eq(procedureDivision.division, division)));

	if (on) {
		const active = existing.find((r) => r.remark !== 'D');
		if (!active) {
			const dead = existing.find((r) => r.remark === 'D');
			if (dead) {
				await db
					.update(procedureDivision)
					.set({ remark: 'Active' })
					.where(eq(procedureDivision.no, dead.no));
			} else {
				await db.insert(procedureDivision).values({ standardNo, division, remark: 'Active' });
			}
		}
	} else {
		await db
			.update(procedureDivision)
			.set({ remark: 'D' })
			.where(
				and(
					eq(procedureDivision.standardNo, standardNo),
					eq(procedureDivision.division, division),
					ne(procedureDivision.remark, 'D')
				)
			);
	}

	return json({ success: true, standardNo, division, on });
};
