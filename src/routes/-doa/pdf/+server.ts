import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { standard } from '$lib/server/db/schema';
import { sql } from 'drizzle-orm';
import fs from 'node:fs/promises';
import nodePath from 'node:path';
import { env } from '$env/dynamic/private';

// GET /-doa/pdf?nmpath=..&form=0|1&pdf=..&dl=0|1
// Proxy same-origin: server mengambil dokumen lalu meneruskannya ke viewer/unduhan.
//
// SUMBER DOKUMEN (pasca-migrasi — diatur lewat env, bisa ganti tanpa rebuild):
//   DOC_ROOT : path MOUNT lokal yang berisi folder WES/... (mis. hasil mount
//              //10.1.95.116/Data ke /mnt/doa-docs). Dicoba PERTAMA bila diset.
//   DOC_BASE : base HTTP fallback (default http://10.1.95.76/webdoa) — Form masih
//              dilayani di sini; juga menangkap file yang baru diupload.
//
// watermark.php SUDAH TIDAK DIPAKAI (rusak pasca-migrasi, dan tidak perlu):
// identitas di-watermark CLIENT-SIDE oleh doa-secure.js di viewer (pakai
// userid/ip/time dari session). Procedure diambil mentah seperti Form.
const DOC_ROOT = env.DOC_ROOT ?? '';
const BASE = env.DOC_BASE ?? 'http://10.1.95.76/webdoa';

const CT: Record<string, string> = {
	pdf: 'application/pdf',
	doc: 'application/msword',
	docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
};
const extOf = (p: string) => (p.match(/\.([a-z0-9]+)(?:[?#].*)?$/i)?.[1] || '').toLowerCase();

// Ambil bytes dokumen dari path relatif (mis. "WES/DOA/Procedure/x.pdf").
// Coba DOC_ROOT (disk) dulu lalu DOC_BASE (HTTP). Sertakan varian folder
// FORM -> FORM_ (share baru memakai 'FORM_'). Tolak path-traversal.
async function fetchDoc(rel: string): Promise<Buffer | null> {
	const clean = rel.replace(/^\/+/, '').trim();
	if (!clean || clean.includes('..')) return null; // guard traversal

	const variants = [clean];
	if (/(^|\/)FORM\//i.test(clean)) variants.push(clean.replace(/(^|\/)FORM\//i, '$1FORM_/'));

	if (DOC_ROOT) {
		const root = nodePath.resolve(DOC_ROOT);
		for (const v of variants) {
			try {
				const full = nodePath.resolve(root, v);
				if (full !== root && !full.startsWith(root + nodePath.sep)) continue; // tetap di dalam root
				return await fs.readFile(full);
			} catch {
				/* coba varian / sumber berikutnya */
			}
		}
	}
	for (const v of variants) {
		try {
			const u = `${BASE}/${v.split('/').map(encodeURIComponent).join('/')}`;
			const res = await fetch(u, { signal: AbortSignal.timeout(30000) });
			if (res.ok) return Buffer.from(await res.arrayBuffer());
		} catch {
			/* coba varian berikutnya */
		}
	}
	return null;
}

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) return new Response('Unauthorized', { status: 401 });

	const nmpath = url.searchParams.get('nmpath') ?? '';
	const isForm = url.searchParams.get('form') === '1';
	const pdf = url.searchParams.get('pdf') ?? '';
	const forceDownload = url.searchParams.get('dl') === '1';

	if (!nmpath && !pdf) return new Response('Dokumen tidak valid.', { status: 400 });

	// Otorisasi divisi (userlevel 6-9): hanya procedure (pro/pro2) yang dipetakan
	// ke divisinya. Menutup akses via URL yang di-tamper. Lihat docs/divisi_design.md §4c.
	const lvl = locals.user.userlevel;
	if (typeof lvl === 'number' && lvl >= 6) {
		const allowed = await db
			.select({ no: standard.no })
			.from(standard)
			.where(
				sql`${standard.nmpath} = ${nmpath} AND ${standard.type} IN ('pro', 'pro2') AND ${standard.no} IN (SELECT standard_no FROM procedure_division WHERE division = ${lvl} AND remark <> 'D')`
			)
			.limit(1);
		if (allowed.length === 0) return new Response('Akses ditolak untuk divisi Anda.', { status: 403 });
	}

	// FORM → utamakan kolom pdf (Word editable) lalu nmpath. Non-form (procedure)
	// → nmpath dulu. Semua diambil MENTAH (tanpa watermark.php).
	const candidates = (isForm ? [pdf, nmpath] : [nmpath, pdf])
		.map((p) => (p || '').replace(/^\/+/, '').trim())
		.filter((p, i, a) => p.length > 0 && a.indexOf(p) === i);

	for (const ref of candidates) {
		const buf = await fetchDoc(ref);
		if (!buf) continue;
		const ext = extOf(ref);
		const contentType = CT[ext] || 'application/octet-stream';
		// Form (dl=1) atau file non-PDF → unduh (attachment). Procedure PDF → inline
		// (viewer menimpa watermark identitas lewat doa-secure.js).
		const asDownload = isForm && (forceDownload || ext !== 'pdf');
		const filename = (ref.split('/').pop() || 'dokumen').trim().replace(/["\\]/g, '');
		return new Response(new Uint8Array(buf), {
			headers: {
				'Content-Type': contentType,
				'Content-Disposition': asDownload ? `attachment; filename="${filename}"` : 'inline',
				'Cache-Control': 'no-store'
			}
		});
	}
	return new Response('Dokumen tidak ditemukan di server.', { status: 404 });
};
