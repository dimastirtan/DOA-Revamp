import type { RequestHandler } from './$types';

// GET /-doa/pdf?nmpath=..&jdl=..&form=0|1&pdf=..
// Proxy same-origin: server mengambil PDF dari server dokumen (watermark.php untuk
// dokumen ber-watermark, atau file mentah untuk Form) lalu meneruskannya. Tujuan:
// - PDF.js viewer butuh `file` satu origin (dan URL asli portalditek tersembunyi).
// - Identitas watermark (kuid) diambil dari SESSION, bukan dari URL → tak bisa
//   dipalsukan (watermark.php membakar "Uncontrolled Doc by <nama>" di server).
// Lihat docs/pdf_secure_viewer.md.

const BASE = 'http://portalditek.indonesian-aerospace.com/webdoa';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) {
		return new Response('Unauthorized', { status: 401 });
	}

	const nmpath = url.searchParams.get('nmpath') ?? '';
	const jdl = url.searchParams.get('jdl') ?? '';
	const isForm = url.searchParams.get('form') === '1';
	const pdf = url.searchParams.get('pdf') ?? '';

	if (!nmpath && !pdf) {
		return new Response('Dokumen tidak valid.', { status: 400 });
	}

	// Bangun URL upstream (kuid dari session).
	const upstream = isForm
		? `${BASE}/${pdf || nmpath}`
		: `${BASE}/tcpdf/edm/watermark.php` +
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
		// Dev fallback: server dokumen (portalditek) biasanya tak kejangkau dari
		// mesin lokal. Supaya alur viewer tetap bisa dites, sajikan PDF contoh.
		if (import.meta.env.DEV) {
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
