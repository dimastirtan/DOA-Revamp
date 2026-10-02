import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { useraccounts } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import * as yup from 'yup';
import md5 from 'blueimp-md5';
import { registers } from '$lib/server/db/schema';
import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
// @ts-ignore - paket docx2pdf-converter tak punya type declaration
import topdf from 'docx2pdf-converter';
import nodemailer from 'nodemailer';

// TODO (diisi user): folder tujuan di server untuk menyimpan PDF surat pernyataan.
// Mis. '\\\\server\\share\\surat' (UNC Windows) atau '/var/doa/surat' (Linux).
// Default lokal 'surat_pernyataan' (relatif ke folder kerja aplikasi).
const SURAT_PERNYATAAN_DIR = "\\\\172.16.0.102\\customizing\\SE000\\SE1000\\SE1300\\19. Surat Pernyataan Portal DOA";

// Pengirim email. 'noreply@...' DITOLAK mail server ("User unknown in virtual
// mailbox table") karena bukan mailbox nyata → pakai mailbox yang ADA.
const MAIL_FROM = 'das@indonesian-aerospace.com';

// TESTING: alihkan SEMUA penerima email ke alamat ini supaya tidak mengirim ke
// email orang sungguhan saat uji coba. Set '' (string kosong) untuk PRODUKSI
// (email dikirim ke penerima asli: user & responsible manager).
const TEST_EMAIL_OVERRIDE = 'das@indonesian-aerospace.com';

export const POST: RequestHandler = async ({ request, locals }) => {
	const data = await request.json();

	try {
		if (data.e) {
			const userlevel = locals.user?.userlevel;
			if (userlevel != -1) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

			const schema = yup.object({
				username: yup.string().required(),
				// 0 = pending aktivasi; 6-9 = role divisi. Harus ikut, kalau tidak
				// admin tak bisa edit user divisi / pending (bug saat review).
				userlevel: yup.number().required().oneOf([-1, 0, 1, 2, 3, 5, 6, 7, 8, 9]),
				password: yup.string(),
				// 'Aktivasi' = label status user pending → diperlakukan sama seperti 'N'.
				activated: yup.string().required().oneOf(['Aktif', 'Nonaktif', 'Aktivasi'])
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
							from: MAIL_FROM,
							to: [TEST_EMAIL_OVERRIDE || registerInfo.email],
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

				// Lookahead HANYA berhenti di tag paragraf asli (<w:p> / <w:p ...),
				// BUKAN <w:proofErr>/<w:pPr> dsb yang juga diawali "<w:p". Sebelumnya
				// pakai (?!<w:p) → placeholder yang dibungkus <w:proofErr> (nik,
				// org_lokasi, tanggal, mgr_*) tak ikut keganti. Flag s utk jaga-jaga
				// kalau placeholder membentang antar baris.
				xml = xml.replace(/\{\{(?:(?!<w:p[ >/]).)*?\}\}/gs, (match) => {
					const cleanKey = match
						.replace(/<[^>]+>/g, '')
						.replace(/[\{\}]/g, '')
						.trim();
					if (replacements[cleanKey] !== undefined) {
						return replacements[cleanKey];
					}
					return match;
				});

				zip.file('word/document.xml', xml);
			}

			const out = zip.generate({ type: 'nodebuffer' });

			// Simpan docx sementara → konversi ke PDF → taruh di folder SERVER →
			// hapus docx. Surat pernyataan kini DISIMPAN KE SERVER, bukan lagi
			// dikirim via email ke admin + manager.
			if (!fs.existsSync('docx')) fs.mkdirSync('docx', { recursive: true });
			const docxPath = 'docx/' + data.r.nik + '.docx';
			fs.writeFileSync(docxPath, out);

			if (!fs.existsSync(SURAT_PERNYATAAN_DIR)) {
				fs.mkdirSync(SURAT_PERNYATAAN_DIR, { recursive: true });
			}
			const pdfPath = path.join(SURAT_PERNYATAAN_DIR, data.r.nik + '.pdf');
			// Konversi butuh Word (Windows) / unoconv+LibreOffice (Linux) di server.
			topdf.convert(docxPath, pdfPath);
			try {
				fs.unlinkSync(docxPath);
			} catch {
				/* abaikan */
			}

			// Email info login ke user (lampiran PDF). Non-fatal: registrasi tetap
			// sukses walau mail server tak terjangkau.
			try {
				const transporter = nodemailer.createTransport({
					host: '10.1.0.6',
					port: 25,
					secure: false,
					tls: {
						rejectUnauthorized: false
					}
				});

				await transporter.sendMail({
					from: MAIL_FROM,
					to: [TEST_EMAIL_OVERRIDE || data.r.email],
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
							filename: 'Surat Pernyataan ' + data.r.nama + ' - ' + data.r.nik + '.pdf',
							content: fs.createReadStream(pdfPath)
						}
					]
				});
			} catch (mailErr) {
				console.error('Email user gagal (diabaikan):', mailErr);
			}

			// Kirim PDF surat pernyataan ke email Responsible Manager (non-fatal).
			// Tanpa kredensial — password hanya dikirim ke user ybs.
			try {
				const transporterMgr = nodemailer.createTransport({
					host: '10.1.0.6',
					port: 25,
					secure: false,
					tls: {
						rejectUnauthorized: false
					}
				});

				await transporterMgr.sendMail({
					from: MAIL_FROM,
					to: [TEST_EMAIL_OVERRIDE || data.r.mgr_email],
					subject: 'Surat Pernyataan ' + data.r.nama + ' - ' + data.r.nik,
					html: `
						<p>Hai ${data.r.mgr_nama},</p>
						<p>Terlampir Surat Pernyataan dari <b>${data.r.nama}</b> (NIK ${data.r.nik}) yang Anda setujui sebagai Responsible Manager.</p>
						</br>
						<p>Terima kasih,</p>
						<p>PTDI Design Organization</p>
					`,
					attachments: [
						{
							filename: 'Surat Pernyataan ' + data.r.nama + ' - ' + data.r.nik + '.pdf',
							content: fs.createReadStream(pdfPath)
						}
					]
				});
			} catch (mailErr) {
				console.error('Email manager gagal (diabaikan):', mailErr);
			}

			return json({ success: true });
		}

		return json({ success: false, error: 'Invalid request' }, { status: 400 });
	} catch (error: any) {
		console.error(error);
		return json({ success: false, error: error.message }, { status: 400 });
	}
};
