import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { history } from '$lib/server/db/schema';
import { sql } from 'drizzle-orm';

let cachedTotal: number | null = null;

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const isExport = url.searchParams.get('export') === 'xlsx';
		const dateFrom = (url.searchParams.get('from') ?? '').trim();
		const dateTo   = (url.searchParams.get('to')   ?? '').trim();
		const page     = Math.max(1, parseInt(url.searchParams.get('page')  ?? '1'));
		const limit    = Math.min(100, Math.max(10, parseInt(url.searchParams.get('limit') ?? '50')));
		const search   = (url.searchParams.get('search') ?? '').trim();
		const offset   = (page - 1) * limit;

		const BASE = `
			SELECT
				h.no,
				h.tanggal,
				h.username,
				h.nama,
				h.nmdoc,
				h.Judul  AS title,
				h.remark AS revision
			FROM history h
		`;

		// ── Export: semua data, tanpa pagination ──────────────────────────────
		if (isExport) {
			let rows: any[];

			if (dateFrom && dateTo) {
				const fromTs = dateFrom + ' 00:00:00';
				const toTs   = dateTo   + ' 23:59:59';
				const result = await db.execute(
					sql.raw(`${BASE} WHERE h.tanggal >= '${fromTs}' AND h.tanggal <= '${toTs}' ORDER BY h.no DESC`)
				);
				rows = Array.isArray(result) ? (result[0] as any[]) : ((result as any).rows ?? []);
			} else {
				const result = await db.execute(
					sql.raw(`${BASE} ORDER BY h.no DESC`)
				);
				rows = Array.isArray(result) ? (result[0] as any[]) : ((result as any).rows ?? []);
			}

			return json({ data: rows });
		}

		// ── Normal paginated GET ──────────────────────────────────────────────
		if (search) {
			const like = search.replace(/'/g, "''"); // escape single quote

			const [dataResult, countResult] = await Promise.all([
				db.execute(sql.raw(`
					${BASE}
					WHERE (
						h.username LIKE '%${like}%' OR
						h.nama     LIKE '%${like}%' OR
						h.nmdoc    LIKE '%${like}%' OR
						h.remark   LIKE '%${like}%' OR
						h.tanggal  LIKE '%${like}%' OR
						h.Judul    LIKE '%${like}%'
					)
					ORDER BY h.no DESC
					LIMIT ${limit} OFFSET ${offset}
				`)),
				db.execute(sql.raw(`
					SELECT COUNT(*) AS total FROM history h
					WHERE (
						h.username LIKE '%${like}%' OR
						h.nama     LIKE '%${like}%' OR
						h.nmdoc    LIKE '%${like}%' OR
						h.remark   LIKE '%${like}%' OR
						h.tanggal  LIKE '%${like}%' OR
						h.Judul    LIKE '%${like}%'
					)
				`))
			]);

			const rows      = Array.isArray(dataResult)  ? (dataResult[0]  as any[]) : ((dataResult  as any).rows ?? []);
			const countRows = Array.isArray(countResult) ? (countResult[0] as any[]) : ((countResult as any).rows ?? []);
			const total     = Number(countRows[0]?.total ?? 0);

			return json({
				data:       rows,
				pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
			});
		}

		// No search
		const [dataResult, total] = await Promise.all([
			db.execute(sql.raw(`${BASE} ORDER BY h.no DESC LIMIT ${limit} OFFSET ${offset}`)),
			cachedTotal !== null
				? Promise.resolve(cachedTotal)
				: db.execute(sql.raw(`SELECT COUNT(*) AS total FROM history`))
					.then((r: any) => {
						const rows  = Array.isArray(r) ? r[0] : r.rows ?? r;
						cachedTotal = Number((rows as any[])[0]?.total ?? 0);
						return cachedTotal as number;
					})
		]);

		const rows = Array.isArray(dataResult) ? (dataResult[0] as any[]) : ((dataResult as any).rows ?? []);

		return json({
			data:       rows,
			pagination: { page, limit, total, totalPages: Math.ceil((total as number) / limit) }
		});

	} catch (err: any) {
		console.error('GET /-doa/log error:', err);
		return json({ error: err.message }, { status: 500 });
	}
};

// INSERT ONLY — log immutable, hanya mencatat siapa yang membuka/mengunduh file
export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const data = await request.json();

		const now     = new Date();
		const pad     = (n: number) => String(n).padStart(2, '0');
		const tanggal = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

		await db.insert(history).values({
			judul:    data.title || '-',   // snapshot judul saat file dibuka
			username: locals.user.id,
			nama:     locals.user.configPenghasil,
			nmdoc:    data.nmdoc  || '-',
			tanggal:  tanggal,
			remark:   data.rev    || '-',  // snapshot revisi saat file dibuka
		});

		cachedTotal = null;

		return json({ success: true });
	} catch (err: any) {
		console.error('POST /-doa/log error:', err);
		return json({ error: err.message }, { status: 500 });
	}
};