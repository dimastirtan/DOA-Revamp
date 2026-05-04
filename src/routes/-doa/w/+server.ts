import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { standard } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import * as yup from 'yup';

const uploadWithRetry = async (file: File, entry: any, retries = 3) => {
	let lastError: any;

	for (let i = 0; i < retries; i++) {
		try {
			console.log(`Upload attempt ${i + 1}`);
			const buffer = Buffer.from(await file.arrayBuffer());
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
				nmpath = uploadResult.path.replace('/data/edm/aplikasi/catia/', '');
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