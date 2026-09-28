import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// Halaman viewer PDF in-app (mengganti buka watermark.php di tab portalditek).
// Identitas watermark diambil dari SESSION di server (bukan dari URL) supaya
// tak bisa dipalsukan. Lihat docs/pdf_secure_viewer.md.
export const load: PageServerLoad = async ({ locals, url, getClientAddress }) => {
	if (!locals.user) redirect(302, '/login');

	const nmpath = url.searchParams.get('nmpath') ?? '';
	const jdl = url.searchParams.get('jdl') ?? '';
	const isForm = url.searchParams.get('form') === '1';
	const pdf = url.searchParams.get('pdf') ?? '';

	// URL PDF via proxy same-origin (kuid diisi server di endpoint proxy).
	const fileParams = new URLSearchParams({
		nmpath,
		jdl,
		form: isForm ? '1' : '0',
		pdf
	});

	const pad = (n: number) => String(n).padStart(2, '0');
	const now = new Date();
	const time = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

	return {
		fileUrl: `/-doa/pdf?${fileParams.toString()}`,
		title: jdl || nmpath.split('/').pop() || 'Dokumen',
		userid: locals.user.configPenghasil || locals.user.id,
		ip: getClientAddress(),
		time
	};
};
