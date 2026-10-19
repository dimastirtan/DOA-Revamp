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
import os from 'os';
import { execFileSync } from 'child_process';
import PizZip from 'pizzip';
// @ts-ignore - paket docx2pdf-converter tak punya type declaration
import topdf from 'docx2pdf-converter';
import nodemailer from 'nodemailer';
// Env RUNTIME (adapter-node membaca process.env saat server start, BUKAN saat build).
// Ubah nilai lalu RESTART proses `node build` → berlaku tanpa build ulang.
import { env } from '$env/dynamic/private';

// ── Konfigurasi (dibaca dari ENVIRONMENT saat RUNTIME) ───────────────────────
// Semua di bawah bisa di-override lewat environment variable TANPA build ulang.
// Nilai setelah '??' = default kalau env TIDAK diset (= nilai lama, biar tetap
// jalan apa adanya). Cara ganti saat sudah running: ubah env (mis. file .env)
// lalu RESTART proses `node build`. Penting utk MAIL_PASS yang suka dipaksa ganti.
// Lihat .env.example.

// Folder tujuan penyimpanan PDF surat pernyataan (UNC Windows / path Linux).
const SURAT_PERNYATAAN_DIR =
	env.SURAT_PERNYATAAN_DIR ??
	"/data/surat-pernyataan";

// ── Email ──
const MAIL_HOST = env.MAIL_HOST ?? '10.1.0.6';            // server SMTP
const MAIL_PORT = Number(env.MAIL_PORT ?? 25);            // port SMTP
const MAIL_FROM = env.MAIL_FROM ?? 'das@indonesian-aerospace.com'; // pengirim tampil (= MAIL_USER)
const MAIL_USER = env.MAIL_USER ?? 'das@indonesian-aerospace.com'; // akun login SMTP
const MAIL_PASS = env.MAIL_PASS ?? 'Update123#';          // password login; '' = tanpa auth
// Server mewajibkan FROM = akun yang LOGIN. auth dipakai hanya bila MAIL_PASS terisi
// (kosong → tanpa login; cocok utk relay IP tepercaya spt prod).
// Pindah ke Gmail: MAIL_HOST=smtp.gmail.com, MAIL_PORT=587,
//   MAIL_FROM=MAIL_USER=<akun>@gmail.com, MAIL_PASS=<app password>.

// TESTING: alihkan SEMUA penerima email ke alamat ini supaya tak mengirim ke
// email orang sungguhan saat uji coba. Set KOSONG (TEST_EMAIL_OVERRIDE= di env)
// untuk PRODUKSI → email dikirim ke penerima asli (user & responsible manager).
const TEST_EMAIL_OVERRIDE = env.TEST_EMAIL_OVERRIDE ?? 'das@indonesian-aerospace.com';

// Nomor form surat pernyataan (EST/Form 482). Dipakai di subject + nama file:
// "Surat Pernyataan 482-<seri> <nama>". Nomor seri dari tabel surat_counter.
const SURAT_FORM_NO = env.SURAT_FORM_NO ?? '482';

// Konversi docx → PDF, lintas platform:
//  - Windows (dev): Microsoft Word via paket docx2pdf-converter.
//  - Linux/Mac (server Ubuntu): LibreOffice headless LANGSUNG (cukup paket
//    `libreoffice`, TANPA unoconv). Pakai profil LibreOffice sementara supaya
//    tak bentrok dgn instance lain & tak bergantung pada $HOME user service.
//    Override lokasi binary lewat env SOFFICE_BIN bila perlu.
function convertDocxToPdf(docxPath: string, pdfPath: string) {
	if (process.platform === 'win32') {
		topdf.convert(docxPath, pdfPath);
		return;
	}
	const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'surat-pdf-'));
	const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'lo-profile-'));
	try {
		execFileSync(
			process.env.SOFFICE_BIN || 'soffice',
			[
				'--headless',
				'--nologo',
				'--norestore',
				'-env:UserInstallation=file://' + profile,
				'--convert-to',
				'pdf',
				'--outdir',
				outDir,
				docxPath
			],
			{ stdio: 'ignore', timeout: 120000 }
		);
		const produced = path.join(outDir, path.basename(docxPath).replace(/\.docx?$/i, '.pdf'));
		// copy (bukan rename): temp → share bisa beda filesystem (EXDEV).
		fs.copyFileSync(produced, pdfPath);
	} finally {
		fs.rmSync(outDir, { recursive: true, force: true });
		fs.rmSync(profile, { recursive: true, force: true });
	}
}

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
	// Default relatif (butuh WorkingDirectory=root project). Override absolut via env
	// SURAT_TEMPLATE kalau service dijalankan dari direktori lain.
	const content = fs.readFileSync(env.SURAT_TEMPLATE ?? 'template.docx');
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
	// Temp docx di OS temp dir (bukan folder relatif) → tak bergantung CWD,
	// aman di service Linux, dan auto-bersih.
	const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'surat-docx-'));
	const docxPath = path.join(tmpDir, info.nik + '.docx');
	fs.writeFileSync(docxPath, out);

	if (!fs.existsSync(SURAT_PERNYATAAN_DIR)) fs.mkdirSync(SURAT_PERNYATAAN_DIR, { recursive: true });
	const pdfPath = path.join(SURAT_PERNYATAAN_DIR, 'Surat Pernyataan ' + info.nama + '.pdf');
	convertDocxToPdf(docxPath, pdfPath);
	try {
		fs.rmSync(tmpDir, { recursive: true, force: true });
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
				userlevel: yup.number().required().oneOf([-1, 0, 1, 2, 3, 5, 6, 7, 8, 9, 10]),
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
