import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { useraccounts } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import * as yup from 'yup';
import md5 from 'blueimp-md5';
import { registers } from '$lib/server/db/schema';
import fs from 'fs';
import PizZip from 'pizzip';
// import topdf from 'docx2pdf-converter';
import nodemailer from 'nodemailer';

export const POST: RequestHandler = async ({ request, locals }) => {
	const data = await request.json();

	try {
		if (data.e) {
			const userlevel = locals.user?.userlevel;
			if (userlevel != -1) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

			const schema = yup.object({
				username: yup.string().required(),
				userlevel: yup.number().required().oneOf([-1, 1, 2, 3, 5]),
				password: yup.string(),
				activated: yup.string().required().oneOf(['Aktif', 'Nonaktif'])
			});

			try {
				await schema.validate(data.e);
			} catch (error: any) {
				return json({ success: false, error: error.message }, { status: 400 });
			}


			if (data.d) {
				await db.delete(useraccounts).where(eq(useraccounts.username, data.e.username));
				await db.delete(registers).where(eq(registers.nik, data.e.username));
				return json({ success: true });
			} else {
				const previousUser = await db.query.useraccounts.findFirst({
					where: eq(useraccounts.username, data.e.username)
				});

				const previousUserLevel = previousUser?.userlevel;

				const updateData = data.e.password
					? {
							userlevel: data.e.userlevel,
							password: md5(data.e.password),
							activated: (data.e.activated == 'Aktif' ? 'Y' : 'N') as 'Y' | 'N'
						}
					: {
							userlevel: data.e.userlevel,
							activated: (data.e.activated == 'Aktif' ? 'Y' : 'N') as 'Y' | 'N'
						};

				await db.update(useraccounts).set(updateData).where(eq(useraccounts.username, data.e.username));

				if (previousUserLevel === 0 && data.e.userlevel !== 0) {
					const registerInfo = await db.query.registers.findFirst({
						where: eq(registers.nik, data.e.username)
					});

					if (registerInfo) {
						const transporter = nodemailer.createTransport({
							host: '10.1.0.6',
							port: 25,
							secure: false,
							tls: {
								rejectUnauthorized: false
							}
						});

						await transporter.sendMail({
							from: 'noreply@indonesian-aerospace.com',
							to: [registerInfo.email],
							subject: 'Akun Teraktivasi - PTDI Design Organization',
							html: `
								<p>Hai ${registerInfo.nama},</p>
								<p>Selamat! Akun kamu di aplikasi PTDI Design Organization telah diaktivasi.</p>
								<p>Sekarang kamu sudah bisa login menggunakan NIK dan password yang telah didaftarkan.</p>
								</br>
								<p>Terima kasih,</p>
								<p>PTDI Design Organization</p>
							`
						});
					}
				}

				return json({ success: true });
			}
		}

		if (data.r) {
			const schema = yup.object({
				nama: yup.string().required(),
				nik: yup.string().required(),
				org: yup.string().required(),
				org_lokasi: yup.string().required(),
				email: yup.string().required().email().matches(/@indonesian-aerospace\.com$/, 'Email must be @indonesian-aerospace.com'),
				password: yup.string().required(),
				mgr_nama: yup.string().required(),
				mgr_nik: yup.string().required(),
				mgr_email: yup.string().required().email().matches(/@indonesian-aerospace\.com$/, 'Email must be @indonesian-aerospace.com')
			});

			await schema.validate(data.r);

			const existingUser = await db.query.useraccounts.findFirst({
				where: eq(useraccounts.username, data.r.nik)
			});

			const existingRegister = await db.query.registers.findFirst({
				where: eq(registers.nik, data.r.nik)
			});

			if (existingUser || existingRegister) {
				return json(
					{
						success: false,
						error: 'Akun atau data diri kamu sudah terdaftar, mohon hubungi admin.'
					},
					{ status: 400 }
				);
			}

			await db.insert(useraccounts).values({
				username: data.r.nik,
				kuid: md5(data.r.nik),
				password: md5(data.r.password),
				userlevel: 0,
				configPenghasil: data.r.nama,
				activated: 'N',
				provinsi: ''
			});

			await db.insert(registers).values({
				email: data.r.email,
				nama: data.r.nama,
				nik: data.r.nik,
				org: data.r.org,
				orgLokasi: data.r.org_lokasi,
				mgrEmail: data.r.mgr_email,
				mgrNama: data.r.mgr_nama,
				mgrNik: data.r.mgr_nik
			});

			const content = fs.readFileSync('template.docx');
			const zip = new PizZip(content);

			const xmlFile = zip.file('word/document.xml');
			if (xmlFile) {
				let xml = xmlFile.asText();

				const replacements: Record<string, string> = {
					nama: data.r.nama,
					nik: data.r.nik,
					org: data.r.org,
					org_lokasi: data.r.org_lokasi,
					email: data.r.email,
					mgr_nama: data.r.mgr_nama,
					mgr_nik: data.r.mgr_nik,
					tanggal: new Intl.DateTimeFormat('id-ID', {
						weekday: 'long',
						day: 'numeric',
						month: 'long',
						year: 'numeric'
					}).format(new Date())
				};

				xml = xml.replace(/\{\{(?:(?!<w:p).)*?\}\}/g, (match) => {
					const cleanKey = match
						.replace(/<[^>]+>/g, '')
						.replace(/[\{\}]/g, '')
						.trim();
					if (replacements[cleanKey]) {
						return replacements[cleanKey];
					}
					return match;
				});

				zip.file('word/document.xml', xml);
			}

			const out = zip.generate({ type: 'nodebuffer' });
			if (!fs.existsSync('docx')) {
				fs.mkdirSync('docx', { recursive: true });
			}
			fs.writeFileSync('docx/' + data.r.nik + '.docx', out);
			// await topdf.convert('pdf/' + data.r.nik + '.docx', 'pdf/' + data.r.nik + '.pdf');
			// fs.unlinkSync('pdf/' + data.r.nik + '.docx');

			const transporter = nodemailer.createTransport({
				host: '10.1.0.6',
				port: 25,
				secure: false,
				tls: {
					rejectUnauthorized: false
				}
			});

			await transporter.sendMail({
				from: 'noreply@indonesian-aerospace.com',
				to: [data.r.mgr_email, 'das@indonesian-aerospace.com'],
				subject: 'Surat Pernyataan ' + data.r.nama + ' - ' + data.r.nik,
				attachments: [
					{
						filename: 'Surat Pernyataan ' + data.r.nama + ' - ' + data.r.nik + '.docx',
						content: fs.createReadStream('docx/' + data.r.nik + '.docx')
					}
				]
			});

			await transporter.sendMail({
				from: 'noreply@indonesian-aerospace.com',
				to: [data.r.email],
				subject: 'Surat Pernyataan ' + data.r.nama + ' - ' + data.r.nik + ' - PTDI Design Organization',
				html: `
					<p>Hai ${data.r.nama},</p>
					<p>Terimakasih telah mendaftar di aplikasi PTDI Design Organization.</p>
					</br>
					<p>Silahkan gunakan identitas berikut untuk login:</p>
					<p>NIK: <b>${data.r.nik}</b></p>
					<p>Password: <b>${data.r.password}</b></p>
					</br>
					<p>Terima kasih,</p>
					<p>PTDI Design Organization</p>
				`,
				attachments: [
					{
						filename: 'Surat Pernyataan ' + data.r.nama + ' - ' + data.r.nik + '.docx',
						content: fs.createReadStream('docx/' + data.r.nik + '.docx')
					}
				]
			});

			return json({ success: true });
		}

		return json({ success: false, error: 'Invalid request' }, { status: 400 });
	} catch (error: any) {
		console.error(error);
		return json({ success: false, error: error.message }, { status: 400 });
	}
};
