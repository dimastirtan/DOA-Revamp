import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { standard } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import * as yup from 'yup';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile, readFile, unlink, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

const execFileAsync = promisify(execFile);

// ─── Path helpers ───────────────────────────────────────────────────────
// Base path absolut yang dikembalikan up.php ($mappings).
// Dokumen catia -> /data/edm/aplikasi/catia/..., form -> /data/aplikasi/webdoa/...
const KNOWN_BASES = ['/data/edm/aplikasi/catia/', '/data/aplikasi/webdoa/'];
const toRelative = (p: string) => {
	for (const b of KNOWN_BASES) if (p.startsWith(b)) return p.slice(b.length);
	return p.replace(/^\/+/, '');
};

// ─── PDF 1.4 conversion ────────────────────────────────────────────────
// FPDI (watermark.php) hanya bisa baca PDF ≤ 1.4.
// PDF dari tools modern biasanya 1.5–2.0 → FPDI gagal → blank/error.
// Solusi: convert ke 1.4 waktu upload, sebelum kirim ke up.php.
// Pakai Ghostscript (harus diinstall di container: apk add ghostscript).
async function convertToPdf14(inputBuffer: Buffer): Promise<Buffer> {
	// Cek apakah memang PDF
	const header = inputBuffer.toString('ascii', 0, 5);
	if (header !== '%PDF-') return inputBuffer; // bukan PDF, skip

	// Cek versi — kalau sudah ≤ 1.4, skip konversi (hemat waktu)
	const versionStr = inputBuffer.toString('ascii', 5, 8); // "1.4" / "1.7" / "2.0"
	const version = parseFloat(versionStr);
	if (!isNaN(version) && version <= 1.4) {
		console.log('PDF sudah versi', versionStr, '— skip konversi');
		return inputBuffer;
	}

	console.log('PDF versi', versionStr, '— converting ke 1.4...');
	const dir = await mkdtemp(path.join(tmpdir(), 'pdf-'));
	const inPath = path.join(dir, 'in.pdf');
	const outPath = path.join(dir, 'out.pdf');

	try {
		await writeFile(inPath, inputBuffer);

		await execFileAsync('gs', [
			'-sDEVICE=pdfwrite',
			'-dCompatibilityLevel=1.4',
			'-dNOPAUSE', '-dBATCH', '-dQUIET',
			// Jangan resample/compress gambar — pertahankan kualitas asli
			'-dColorConversionStrategy=/LeaveColorUnchanged',
			'-dDownsampleMonoImages=false',
			'-dDownsampleGrayImages=false',
			'-dDownsampleColorImages=false',
			'-dAutoFilterColorImages=false',
			'-dAutoFilterGrayImages=false',
			'-dColorImageFilter=/FlateEncode',
			'-dGrayImageFilter=/FlateEncode',
			`-sOutputFile=${outPath}`,
			inPath
		], { timeout: 60000 }); // timeout 60s untuk PDF besar

		const result = await readFile(outPath);
		console.log('Konversi berhasil:', inputBuffer.length, '->', result.length, 'bytes');
		return result;
	} catch (err: any) {
		console.error('Ghostscript gagal, upload PDF asli:', err.message);
		return inputBuffer; // fallback: upload tanpa konversi
	} finally {
		await unlink(inPath).catch(() => {});
		await unlink(outPath).catch(() => {});
		// rmdir — dir kosong setelah file dihapus
		const { rmdir } = await import('node:fs/promises');
		await rmdir(dir).catch(() => {});
	}
}

// ─── Upload with retry ─────────────────────────────────────────────────
const uploadWithRetry = async (file: File, entry: any, retries = 3) => {
	let lastError: any;

	for (let i = 0; i < retries; i++) {
		try {
			console.log(`Upload attempt ${i + 1}`);
			let buffer = Buffer.from(await file.arrayBuffer());

			// Convert PDF ke versi 1.4 supaya kompatibel dgn FPDI/watermark.php
			if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
				buffer = await convertToPdf14(buffer);
			}

			const blob = new Blob([buffer], { type: file.type || 'application/octet-stream' });

			const uploadFormData = new FormData();
			uploadFormData.append('type', entry.type);
			uploadFormData.append('number', entry.number);
			uploadFormData.append('revision', entry.revision.replace(/\//g, '_'));
			uploadFormData.append('file', blob, file.name);

			const controller = new AbortController();
			const timeout = setTimeout(() => controller.abort(), 30000);

			const uploadRes = await fetch('http://10.1.95.76/webdoa/up.php', {
				method: 'POST',
				body: uploadFormData,
				signal: controller.signal
			});

			clearTimeout(timeout);

			const rawResponse = await uploadRes.text();
			console.log(`Attempt ${i + 1} raw response:`, rawResponse);

			let uploadResult: any;
			try {
				uploadResult = JSON.parse(rawResponse);
			} catch (e) {
				throw new Error('Upload server returned invalid JSON: ' + rawResponse);
			}

			if (uploadResult.success) {
				return uploadResult;
			} else {
				throw new Error('Upload failed: ' + uploadResult.error);
			}
		} catch (err: any) {
			lastError = err;
			console.warn(`Attempt ${i + 1} failed:`, err.message);
			if (i < retries - 1) {
				await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
			}
		}
	}

	throw lastError;
};

// ─── POST handler ───────────────────────────────────────────────────────
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		let data: any;
		let file: File | null = null;

		const contentType = request.headers.get('content-type');
		if (contentType?.includes('multipart/form-data')) {
			const formData = await request.formData();
			data = JSON.parse(formData.get('data') as string);
			file = formData.get('file') as File;
		} else {
			data = await request.json();
		}

		console.log(data);

		if (data.d && data.e) {
			return await db
				.update(standard)
				.set({ remark: 'D' })
				.where(eq(standard.no, data.e.no))
				.then(() => json({ success: true }))
				.catch((error) => {
					console.error(error);
					return json({ success: false, error: error.message }, { status: 400 });
				});
		}

		const entry = data.e || data.i;

		if (entry) {
			const schema = yup.object({
				type: yup.string().required(),
				number: yup.string().required(),
				revision: yup.string().required(),
				title: yup.string().required()
			});

			try {
				await schema.validate(entry);
			} catch (error: any) {
				return json({ success: false, error: error.message }, { status: 400 });
			}

			if (data.i) {
				const existing = await db.query.standard.findFirst({
					where: and(eq(standard.type, entry.type), eq(standard.number, entry.number))
				});
				if (existing) {
					return json({ success: false, error: 'Data yang kamu masukkan sudah ada!' }, { status: 400 });
				}
			}

			let nmpath = entry.nmpath;
			let pdf = entry.pdf;

			if (file) {
				const uploadResult = await uploadWithRetry(file, entry);
				// up.php bisa balikin base catia ATAU webdoa (untuk form).
				// toRelative() menangani keduanya.
				nmpath = toRelative(uploadResult.path);
				if (uploadResult.is_pdf) {
					pdf = nmpath;
				}
			}

			const standardData: any = {
				type: entry.type,
				number: entry.number,
				revision: entry.revision,
				title: entry.title,
				nmpath: nmpath,
				remark: 'Active',
				pdf: pdf
			};

			if (entry.date) {
				standardData.date = `${entry.date.year}-${String(entry.date.month).padStart(2, '0')}-${String(entry.date.day).padStart(2, '0')}`;
			} else {
				standardData.date = null;
			}

			if (entry.date2) {
				standardData.date2 = `${entry.date2.year}-${String(entry.date2.month).padStart(2, '0')}-${String(entry.date2.day).padStart(2, '0')}`;
			} else {
				standardData.date2 = '1970-01-01';
			}

			if (entry.type === 'Form') {
				standardData.nmpath = pdf;
			}

			if (data.i) {
				standardData.panel = '';
				standardData.nik = locals.user?.id || '';
				standardData.nama = locals.user?.configPenghasil || '';

				return await db
					.insert(standard)
					.values(standardData)
					.then(() => json({ success: true }))
					.catch((error) => {
						console.error(error);
						return json({ success: false, error: error.message }, { status: 400 });
					});
			} else if (data.e) {
				return await db
					.update(standard)
					.set(standardData)
					.where(eq(standard.no, entry.no))
					.then(() => json({ success: true }))
					.catch((error) => {
						console.error(error);
						return json({ success: false, error: error.message }, { status: 400 });
					});
			}
		}

		if (data.d) {
			return await db
				.update(standard)
				.set({ remark: 'D' })
				.where(eq(standard.no, data.e.no))
				.then(() => json({ success: true }))
				.catch((error) => {
					console.error(error);
					return json({ success: false, error: error.message }, { status: 400 });
				});
		}

		return json({ success: true });

	} catch (err: any) {
		console.error('TOP LEVEL ERROR:', err);
		return json({
			success: false,
			error: err.message,
			stack: err.stack
		}, { status: 500 });
	}
};