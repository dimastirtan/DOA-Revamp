import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { useraccounts } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';
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

// ── Konfigurasi Email ───────────────────────────────────────────────────────
// SATU tempat untuk semua setting email. Mau ganti akun/server? ubah DI SINI saja.
const MAIL_HOST = '10.1.0.6';           // server SMTP
const MAIL_PORT = 25;                   // port SMTP
const MAIL_FROM = 'das@indonesian-aerospace.com'; // pengirim yang tampil (= MAIL_USER)
const MAIL_USER = 'das@indonesian-aerospace.com'; // akun login SMTP
const MAIL_PASS = 'Update123#';         // password login; kosong '' = tanpa auth
// Catatan: server mewajibkan FROM = akun yang LOGIN. auth dipakai hanya bila
// MAIL_PASS terisi (kosong → tanpa login; cocok utk relay IP tepercaya spt prod).
// Kalau nanti pindah ke Gmail:
//   MAIL_HOST='smtp.gmail.com'; MAIL_PORT=587;
//   MAIL_FROM = MAIL_USER = 'jaminankelaikan@gmail.com'; MAIL_PASS=<app password>

// TESTING: alihkan SEMUA penerima email ke alamat ini supaya tidak mengirim ke
// email orang sungguhan saat uji coba. Set '' (string kosong) untuk PRODUKSI
// (email dikirim ke penerima asli: user & responsible manager).
const TEST_EMAIL_OVERRIDE = 'das@indonesian-aerospace.com';

// Nomor form surat pernyataan (EST/Form 482). Dipakai di subject + nama file:
// "Surat Pernyataan 482-<seri> <nama>". Nomor seri dari tabel surat_counter
// (jalankan surat-counter.sql). Lihat surat-counter.sql.
const SURAT_FORM_NO = '482';

// Buat surat pernyataan (isi template → PDF → simpan ke server → email manager).
// Dipakai oleh register (data.r) & first-login (data.p). Non-fatal utk email.
async function buatDanKirimSurat(info: {
	nama: string;
	nik: string;
	org: string;
	org_lokasi: string;
	email: string;
	mgr_nama: string;
	mgr_nik: string;
	mgr_email: string;
}) {
	const content = fs.readFileSync('template.docx');
	const zip = new PizZip(content);
	const xmlFile = zip.file('word/document.xml');
	if (xmlFile) {
		let xml = xmlFile.asText();
		const replacements: Record<string, string> = {
			nama: info.nama,
			nik: info.nik,
			org: info.org,
			org_lokasi: info.org_lokasi,
			email: info.email,
			mgr_nama: info.mgr_nama,
			mgr_nik: info.mgr_nik,
			tanggal: new Intl.DateTimeFormat('id-ID', {
				weekday: 'long',
				day: 'numeric',
				month: 'long',
				year: 'numeric'
			}).format(new Date())
		};
		// Lookahead hanya berhenti di tag paragraf asli (bukan <w:proofErr> dsb).
		xml = xml.replace(/\{\{(?:(?!<w:p[ >/]).)*?\}\}/gs, (match) => {
			const cleanKey = match.replace(/<[^>]+>/g, '').replace(/[\{\}]/g, '').trim();
			if (replacements[cleanKey] !== undefined) return replacements[cleanKey];
			return match;
		});
		zip.file('word/document.xml', xml);
	}

	const out = zip.generate({ type: 'nodebuffer' });
	if (!fs.existsSync('docx')) fs.mkdirSync('docx', { recursive: true });
	const docxPath = 'docx/' + info.nik + '.docx';
	fs.writeFileSync(docxPath, out);

	if (!fs.existsSync(SURAT_PERNYATAAN_DIR)) fs.mkdirSync(SURAT_PERNYATAAN_DIR, { recursive: true });
	const pdfPath = path.join(SURAT_PERNYATAAN_DIR, 'Surat Pernyataan ' + info.nama + '.pdf');
	topdf.convert(docxPath, pdfPath);
	try {
		fs.unlinkSync(docxPath);
	} catch {
		/* abaikan */
	}

	// Nomor seri atomic.
	let suratNo = '';
	try {
		const upd: any = await db.execute(
			sql`UPDATE surat_counter SET last_no = LAST_INSERT_ID(last_no + 1) WHERE id = 1`
		);
		const serial = Number(upd?.insertId ?? upd?.[0]?.insertId ?? 0);
		if (serial > 0) suratNo = SURAT_FORM_NO + '-' + String(serial).padStart(4, '0');
	} catch (e) {
		console.error('Gagal ambil nomor seri surat (lanjut tanpa nomor):', e);
	}
	const suratLabel = 'Surat Pernyataan' + (suratNo ? ' ' + suratNo : '') + ' ' + info.nama;

	try {
		const transporter = nodemailer.createTransport({
			host: MAIL_HOST,
			port: MAIL_PORT,
			secure: false,
			auth: MAIL_PASS ? { user: MAIL_USER, pass: MAIL_PASS } : undefined,
			tls: { rejectUnauthorized: false }
		});
		await transporter.sendMail({
			from: MAIL_FROM,
			to: `"${info.mgr_nama}" <${info.mgr_email}>`,
			subject: suratLabel,
			attachments: [{ filename: suratLabel + '.pdf', content: fs.createReadStream(pdfPath) }]
		});
	} catch (mailErr) {
		console.error('Email surat pernyataan gagal (diabaikan):', mailErr);
	}
}

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
							host: MAIL_HOST,
							port: MAIL_PORT,
							secure: false,
							auth: MAIL_PASS ? { user: MAIL_USER, pass: MAIL_PASS } : undefined,
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

			await buatDanKirimSurat({
				nama: data.r.nama,
				nik: data.r.nik,
				org: data.r.org,
				org_lokasi: data.r.org_lokasi,
				email: data.r.email,
				mgr_nama: data.r.mgr_nama,
				mgr_nik: data.r.mgr_nik,
				mgr_email: data.r.mgr_email
			});

			return json({ success: true });
		}

		// First-login: surat pernyataan untuk user yang SUDAH punya akun (tidak
		// membuat akun baru). NIK & nama diambil dari SESSION (tak dari form).
		if (data.p) {
			if (!locals.user) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

			const nik = locals.user.id;
			const nama = locals.user.configPenghasil || nik;

			const schema = yup.object({
				email: yup
					.string()
					.required()
					.email()
					.matches(/@indonesian-aerospace\.com$/, 'Email harus @indonesian-aerospace.com'),
				org: yup.string().required(),
				org_lokasi: yup.string().required(),
				mgr_nama: yup.string().required(),
				mgr_nik: yup.string().required(),
				mgr_email: yup
					.string()
					.required()
					.email()
					.matches(/@indonesian-aerospace\.com$/, 'Email harus @indonesian-aerospace.com')
			});
			await schema.validate(data.p);

			// registers = penanda "sudah kirim surat pernyataan".
			const sudah = await db.query.registers.findFirst({ where: eq(registers.nik, nik) });
			if (sudah) {
				return json(
					{ success: false, error: 'Surat pernyataan sudah pernah dikirim.' },
					{ status: 400 }
				);
			}

			await db.insert(registers).values({
				email: data.p.email,
				nama,
				nik,
				org: data.p.org,
				orgLokasi: data.p.org_lokasi,
				mgrEmail: data.p.mgr_email,
				mgrNama: data.p.mgr_nama,
				mgrNik: data.p.mgr_nik
			});

			await buatDanKirimSurat({
				nama,
				nik,
				org: data.p.org,
				org_lokasi: data.p.org_lokasi,
				email: data.p.email,
				mgr_nama: data.p.mgr_nama,
				mgr_nik: data.p.mgr_nik,
				mgr_email: data.p.mgr_email
			});

			return json({ success: true });
		}

		return json({ success: false, error: 'Invalid request' }, { status: 400 });
	} catch (error: any) {
		console.error(error);
		return json({ success: false, error: error.message }, { status: 400 });
	}
};
