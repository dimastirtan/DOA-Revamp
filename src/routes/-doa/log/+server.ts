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
		const page   = Math.max(1, parseInt(url.searchParams.get('page')  ?? '1'));
		const limit  = Math.min(100, Math.max(10, parseInt(url.searchParams.get('limit') ?? '50')));
		const search = (url.searchParams.get('search') ?? '').trim();
		const offset = (page - 1) * limit;

		if (search) {
			const like = `%${search}%`;

			const [dataResult, countResult] = await Promise.all([
				db.execute(sql`
					SELECT
						h.no, h.tanggal, h.username, h.nama,
						h.nmdoc, h.remark,
						h.Judul AS title,
						s.revision
					FROM history h
					LEFT JOIN (
						SELECT number, MAX(revision) AS revision
						FROM standard WHERE remark != 'D' GROUP BY number
					) s ON s.number = h.nmdoc
					WHERE (
						h.username LIKE ${like} OR
						h.nama     LIKE ${like} OR
						h.nmdoc    LIKE ${like} OR
						h.remark   LIKE ${like} OR
						h.tanggal  LIKE ${like} OR
						h.Judul    LIKE ${like}
					)
					ORDER BY h.no DESC
					LIMIT  ${limit}
					OFFSET ${offset}
				`),
				db.execute(sql`
					SELECT COUNT(*) AS total
					FROM history h
					WHERE (
						h.username LIKE ${like} OR
						h.nama     LIKE ${like} OR
						h.nmdoc    LIKE ${like} OR
						h.remark   LIKE ${like} OR
						h.tanggal  LIKE ${like} OR
						h.Judul    LIKE ${like}
					)
				`)
			]);

			const rows      = Array.isArray(dataResult)  ? dataResult[0]  : (dataResult  as any).rows ?? dataResult;
			const countRows = Array.isArray(countResult) ? countResult[0] : (countResult as any).rows ?? countResult;
			const total     = Number((countRows as any)[0]?.total ?? 0);

			return json({
				data:       Array.isArray(rows) ? rows : [],
				pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
			});

		} else {
			const [dataResult, total] = await Promise.all([
				db.execute(sql`
					SELECT
						h.no, h.tanggal, h.username, h.nama,
						h.nmdoc, h.remark,
						h.Judul AS title,
						s.revision
					FROM history h
					LEFT JOIN (
						SELECT number, MAX(revision) AS revision
						FROM standard WHERE remark != 'D' GROUP BY number
					) s ON s.number = h.nmdoc
					ORDER BY h.no DESC
					LIMIT  ${limit}
					OFFSET ${offset}
				`),
				cachedTotal !== null
					? Promise.resolve(cachedTotal)
					: db.execute(sql`SELECT COUNT(*) AS total FROM history`)
						.then((r: any) => {
							const rows  = Array.isArray(r) ? r[0] : r.rows ?? r;
							cachedTotal = Number((rows as any)[0]?.total ?? 0);
							return cachedTotal as number;
						})
			]);

			const rows = Array.isArray(dataResult) ? dataResult[0] : (dataResult as any).rows ?? dataResult;

			return json({
				data:       Array.isArray(rows) ? rows : [],
				pagination: { page, limit, total, totalPages: Math.ceil((total as number) / limit) }
			});
		}

	} catch (err: any) {
		console.error('GET /-doa/log error:', err);
		return json({ error: err.message }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const data = await request.json();
		// data.title = judul dokumen dari standard.title, disimpan permanen ke history.Judul
		// sehingga log tidak berubah walau dokumen diedit/dihapus

		const now = new Date();
		const pad = (n: number) => String(n).padStart(2, '0');
		const tanggal = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

		await db.insert(history).values({
			judul:    data.title    || '-',  // simpan title dokumen, bukan deskripsi
			username: locals.user.id,
			nama:     locals.user.configPenghasil,
			nmdoc:    data.nmdoc    || '-',
			tanggal:  tanggal
		});

		cachedTotal = null;

		return json({ success: true });
	} catch (err: any) {
		console.error('POST /-doa/log error:', err);
		return json({ error: err.message }, { status: 500 });
	}
};