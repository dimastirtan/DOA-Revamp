import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { standard } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import * as yup from 'yup';
import { PUBLIC_UPLOAD_URL } from '$env/static/public';

export const POST: RequestHandler = async ({ request, locals }) => {
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
			try {
				const uploadFormData = new FormData();
				uploadFormData.append('file', file);
				uploadFormData.append('type', entry.type);
				uploadFormData.append('number', entry.number);
				uploadFormData.append('revision', entry.revision.replace(/\//g, '_'));

				const uploadUrl = PUBLIC_UPLOAD_URL || 'http://10.1.95.76/webdoa/up.php';

				// Retry logic for upload
				const uploadWithRetry = async (attempt: number = 1): Promise<Response> => {
					try {
						console.log(`Upload attempt ${attempt}, file: ${file.name} (${file.size} bytes)`);
						const res = await fetch(uploadUrl, {
							method: 'POST',
							body: uploadFormData
						});
						return res;
					} catch (error) {
						if (attempt < 3) {
							const delay = 500 * Math.pow(2, attempt - 1);
							console.log(`Upload attempt ${attempt} failed, retrying in ${delay}ms:`, error);
							await new Promise(resolve => setTimeout(resolve, delay));
							return uploadWithRetry(attempt + 1);
						}
						throw error;
					}
				};

				const uploadRes = await uploadWithRetry();
				console.log('Upload status:', uploadRes.status, 'headers:', Object.fromEntries(uploadRes.headers.entries()));
				const rawResponse = await uploadRes.clone().text();
				console.log('Raw response length:', rawResponse.length, 'content:', rawResponse.slice(0, 500) + (rawResponse.length > 500 ? '...' : ''));
				let uploadResult: any;
				try {
					uploadResult = await uploadRes.json();
				} catch (e) {
					return json(
						{
							success: false,
							error: 'Upload server returned invalid JSON. Raw response: ' + rawResponse
						},
						{ status: 500 }
					);
				}

				if (uploadResult.success) {
					nmpath = uploadResult.path.replace('/data/edm/aplikasi/catia/', '');
					if (uploadResult.is_pdf) {
						pdf = nmpath;
					}
				} else {
					return json({ success: false, error: 'File upload failed: ' + uploadResult.error }, { status: 500 });
				}
			} catch (error: any) {
				console.error('Upload fetch error:', error); // ini harusnya print di terminal
				return json({ success: false, error: 'Upload server connection error: ' + error.message }, { status: 500 });
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
		const updateData = {
			remark: 'D'
		};

		return await db
			.update(standard)
			.set(updateData)
			.where(eq(standard.no, data.e.no))
			.then(() => json({ success: true }))
			.catch((error) => {
				console.error(error);
				return json({ success: false, error: error.message }, { status: 400 });
			});
	}

	return json({ success: true });
};
