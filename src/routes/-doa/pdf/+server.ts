import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { standard } from '$lib/server/db/schema';
import { sql } from 'drizzle-orm';

// GET /-doa/pdf?nmpath=..&jdl=..&form=0|1&pdf=..&dl=0|1
// Proxy same-origin: server mengambil dokumen dari server dokumen lalu meneruskannya.
// Tujuan:
// - PDF.js viewer butuh `file` satu origin (dan URL asli portalditek tersembunyi).
// - Identitas watermark (kuid) diambil dari SESSION, bukan dari URL → tak bisa
//   dipalsukan (watermark.php membakar "Uncontrolled Doc by <nama>" di server).
//
// Dua mode:
//   form=0 (PROCEDURE/MANUAL/dst, selalu PDF) → lewat watermark.php, inline, ber-watermark.
//   form=1 (FORM: .doc/.docx ATAU .pdf) → file mentah TANPA watermark. Form adalah
//           template untuk diisi → dengan dl=1 selalu dikirim sebagai attachment
//           (unduh) dengan nama & content-type yang benar. Dicoba kolom `pdf`
//           (file Word editable) dulu, lalu nmpath.
// Lihat docs/pdf_secure_viewer.md & docs/divisi_design.md §6.

const BASE = 'http://portalditek.indonesian-aerospace.com/webdoa';

const CT: Record<string, string> = {
	pdf: 'application/pdf',
	doc: 'application/msword',
	docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
};
const extOf = (p: string) => (p.match(/\.([a-z0-9]+)(?:[?#].*)?$/i)?.[1] || '').toLowerCase();

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return new Response('Unauthorized', { status: 401 });
	}

	const nmpath = url.searchParams.get('nmpath') ?? '';
	const jdl = url.searchParams.get('jdl') ?? '';
	const isForm = url.searchParams.get('form') === '1';
	const pdf = url.searchParams.get('pdf') ?? '';
	const forceDownload = url.searchParams.get('dl') === '1';

	if (!nmpath && !pdf) {
		return new Response('Dokumen tidak valid.', { status: 400 });
	}

	// Otorisasi divisi (userlevel 6-9): hanya boleh membuka procedure (pro/pro2)
	// yang dipetakan ke divisinya. Menutup akses via URL yang di-tamper.
	// (Divisi tidak pernah melihat Form, jadi cek ini cukup pada path watermark.)
	// Lihat docs/divisi_design.md §4c.
	const lvl = locals.user.userlevel;
	if (typeof lvl === 'number' && lvl >= 6) {
		const allowed = await db
			.select({ no: standard.no })
			.from(standard)
			.where(
				sql`${standard.nmpath} = ${nmpath} AND ${standard.type} IN ('pro', 'pro2') AND ${standard.no} IN (SELECT standard_no FROM procedure_division WHERE division = ${lvl} AND remark <> 'D')`
			)
			.limit(1);
		if (allowed.length === 0) {
			return new Response('Akses ditolak untuk divisi Anda.', { status: 403 });
		}
	}

	// ── FORM: file mentah, tanpa watermark ───────────────────────────────
	if (isForm) {
		// Kandidat berurutan: utamakan kolom `pdf` = file editable (Word), lalu
		// nmpath. EST Form menyimpan Word di …/Office/*.docx sementara versi
		// …/PDF/*.pdf SERING TIDAK ADA — jadi coba satu per satu sampai ketemu
		// file yang benar-benar ada di server.
		const candidates = [pdf, nmpath]
			.map((p) => (p || '').replace(/^\/+/, '').trim())
			.filter((p, i, a) => p.length > 0 && a.indexOf(p) === i);

		for (const ref of candidates) {
			const ext = extOf(ref);
			const upstream = `${BASE}/${ref.split('/').map(encodeURIComponent).join('/')}`;
			try {
				const controller = new AbortController();
				const timeout = setTimeout(() => controller.abort(), 30000);
				const res = await fetch(upstream, { signal: controller.signal });
				clearTimeout(timeout);
				if (!res.ok) continue; // file tak ada → coba kandidat berikutnya

				const buf = await res.arrayBuffer();
				const contentType = CT[ext] || res.headers.get('content-type') || 'application/octet-stream';
				const filename = (ref.split('/').pop() || 'dokumen').trim().replace(/["\\]/g, '');
				// Form di-set dl=1 dari klien → selalu unduh (attachment).
				const asDownload = forceDownload || ext !== 'pdf';

				return new Response(buf, {
					headers: {
						'Content-Type': contentType,
						'Content-Disposition': asDownload
							? `attachment; filename="${filename}"`
							: 'inline',
						'Cache-Control': 'no-store'
					}
				});
			} catch (err: any) {
				console.error('GET /-doa/pdf (form) kandidat gagal:', ref, '→', err?.message);
			}
		}
		return new Response('Gagal mengambil dokumen dari server.', { status: 502 });
	}

	// ── Dokumen ber-watermark (procedure, manual, dst — selalu PDF) ────────
	const upstream =
		`${BASE}/tcpdf/edm/watermark.php` +
		`?ndm=${encodeURIComponent(nmpath.split('/').pop() ?? '')}` +
		`&nmpath=${encodeURIComponent(nmpath)}` +
		`&jdl=${encodeURIComponent(jdl)}` +
		`&kuid=${encodeURIComponent(locals.user.kuid)}`;

	try {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), 30000);
		const res = await fetch(upstream, { signal: controller.signal });
		clearTimeout(timeout);
		if (!res.ok) throw new Error('upstream ' + res.status);

		const buf = await res.arrayBuffer();
		return new Response(buf, {
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': 'inline',
				'Cache-Control': 'no-store'
			}
		});
	} catch (err: any) {
		console.error('GET /-doa/pdf gagal ambil upstream:', err?.message, '\nurl:', upstream);
		// Dev fallback OPT-IN: server dokumen (portalditek) kadang tak terjangkau
		// dari mesin lokal. Dulu ini SELALU menyajikan PDF contoh saat gagal, tapi
		// itu bikin dokumen asli seolah "jadi PDF default". Sekarang hanya aktif
		// bila eksplisit di-set (DOA_PDF_DEV_SAMPLE=1) supaya kegagalan jujur.
		if (import.meta.env.DEV && process.env.DOA_PDF_DEV_SAMPLE === '1') {
			try {
				const fs = await import('node:fs/promises');
				const path = await import('node:path');
				const sample = path.resolve('static/pdfjs/web/compressed.tracemonkey-pldi-09.pdf');
				const data = await fs.readFile(sample);
				return new Response(new Uint8Array(data), {
					headers: {
						'Content-Type': 'application/pdf',
						'Content-Disposition': 'inline',
						'Cache-Control': 'no-store',
						'X-DOA-Fallback': '1'
					}
				});
			} catch {
				/* fallthrough */
			}
		}
		return new Response('Gagal mengambil PDF dari server dokumen.', { status: 502 });
	}
};
