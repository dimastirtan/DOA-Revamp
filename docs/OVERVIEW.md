# Ringkasan Semua Pekerjaan — doa-revamp

Dokumen "mulai dari sini". Merangkum semua yang sudah/ sedang/ akan dikerjakan,
statusnya, dan ke mana baca detail. Diperbarui 21 Sep 2026.

## Legenda status
- ✅ **SELESAI (produksi)** — sudah jalan / diterapkan di server produksi.
- 🟡 **SELESAI (lokal)** — beres & teruji di DB lokal `doan`, **belum** di produksi.
- 📝 **RANCANGAN** — baru desain, belum ada kodenya (nunggu keputusan).
- ⏳ **BELUM MULAI** — permintaan sudah masuk, belum dikerjakan.

---

## Peta cepat

| Fitur | Status | Detail |
| :--- | :--- | :--- |
| Quiz Pemahaman Prosedur (inti) | 🟡 kode selesai & teruji lokal; skema DB ✅ sudah di produksi; **build app belum dideploy** | `docs/quiz_design.md` |
| ↳ Lulus-lock (sudah lulus → terkunci) | 🟡 selesai (per-procedure) | `docs/quiz_design.md` §12a |
| ↳ Penanganan revisi + soal per revisi | 📝 rancangan | `docs/quiz_design.md` §12b |
| Departemen user (sort/filter) | 🟡 selesai lokal; **belum di produksi** | `docs/departemen.md` |
| PDF anti-download / anti-screencapture | 📝 rancangan | `docs/pdf_secure_viewer.md` |
| PDF viewer in-app (buka DOA tak lagi ke PHP) | 🟡 selesai & teruji lokal | `docs/pdf_secure_viewer.md` |
| Filter departemen user (prefix org: DT/FT/SE/TD) | 🟡 selesai lokal | `docs/departemen.md` |
| Role divisi Non-DOA + filter procedure per divisi | 📝 rancangan | `docs/divisi_design.md` |
| ↳ Log Aktivitas + kolom divisi | 📝 rancangan | `docs/divisi_design.md` §4c |
| ↳ Print PDF benar-benar dimatikan | 📝 rancangan | `docs/divisi_design.md` §6 |
| Akun massal semua karyawan + ubah password | ⏳ belum mulai | (permintaan manager terbaru) |

---

## 1. Quiz Pemahaman Prosedur 🟡/✅

**Tujuan:** bukti karyawan sudah membaca sebuah *procedure* — bukan cuma tercatat
di LOG, tapi jawab quiz. (Detail penuh: `docs/quiz_design.md`.)

**Cara kerja singkat:**
- Karyawan buka procedure di dashboard → PDF terbuka di tab baru (seperti biasa) →
  muncul **modal** "mau kerjakan quiz sekarang?" → ke `/dash/quiz`.
- 5 soal per procedure, diacak, **lulus ≥ 3/5**. Poin masuk ke user (nilai
  tertinggi yang dihitung).
- **Sudah lulus → quiz terkunci**: modal tidak muncul lagi, halaman quiz bilang
  "Anda Sudah Lulus". (Saat ini per-procedure; per-revisi masih rancangan.)
- Admin/Controller kelola soal di **`/dash/quiz/soal`**, lihat riwayat di
  **`/dash/quiz/log`** (mirip Log Aktivitas: export XLSX, filter tanggal, sort).

**Keputusan penting yang sudah diambil:**
- Pintu masuk = **modal di dashboard**, **bukan** mengubah `watermark.php`
  (file lama dikembalikan ke asli, tidak disentuh).
- Soal diikat ke **`standard.no`** (ID permanen), bukan nomor dokumen → soal tak
  hilang walau nomor procedure diubah.
- Log/attempt menyimpan **snapshot beku** (nomor/judul/revisi saat dikerjakan) →
  log tetap benar walau dokumen di-rename/hapus.

**File terkait:**
- DB: `quiz.sql` (root) — tabel `quiz_question`, `quiz_attempt`, kolom
  `useraccounts.points`. **Sudah dijalankan di produksi** (MyISAM/utf8, karena
  MySQL 5.1.71).
- Endpoint: `src/routes/-doa/quiz/{start,submit,soal,log,available}/+server.ts`
- Halaman: `src/routes/dash/quiz/{+page,soal,log}`
- Modal + `bukaDoa()`: `src/routes/dash/+page.svelte`

**Sisa:** deploy build aplikasi ke produksi (skema DB-nya sudah).

**Cara test lulus-lock:** login karyawan → kerjakan quiz sampai lulus → buka
procedure yg sama lagi → modal tak muncul; buka `/dash/quiz?ndm=<nomor>` →
tampil "Anda Sudah Lulus". Reset: `DELETE FROM quiz_attempt WHERE username='<NIK>' AND status='lulus';`

---

## 2. Departemen user (sortir/filter) 🟡

**Tujuan:** daftar user bisa disortir & difilter per departemen.

- Kolom baru **`useraccounts.org`** = kode departemen (mis. `SE1000`), disimpan
  **penuh** (SE1000 ≠ SE2000). Sumber: export HR `D:\Document\tmemp.csv`.
- Di halaman **Daftar User**: kolom **Departemen**, bisa **sort** (klik header),
  **dropdown filter**, dan search ikut mencocokkan.
- Lokal: **211/251** user dapat departemen; sisanya "-" (NIK tak ada di CSV /
  username non-NIK — urusan rekonsiliasi HR).

**Sisa:** jalankan `department.sql` di produksi (buka komentar `ALTER` sekali).
Detail + langkah: `docs/departemen.md`.

---

## 3. RANCANGAN (belum ada kodenya)

### 3a. PDF anti-download 📝 — `docs/pdf_secure_viewer.md`
Intinya jujur: **download bisa dipersulit habis, tapi screenshot TIDAK bisa
dicegah web app** — kontrol sebenarnya = watermark identitas (Nama·NIK·waktu) di
tiap tampilan. Usulan: viewer PDF sendiri (PDF.js) + proxy (sembunyikan URL) +
matikan download/print + overlay watermark. `watermark.php` boleh diganti tapi
**jangan dihapus** (pakai flag `PDF_MODE=viewer|legacy` untuk jalur balik).

### 3b. Penanganan revisi quiz 📝 — `docs/quiz_design.md` §12b
Saat procedure naik revisi, karyawan yg sudah lulus revisi lama sebaiknya
**mengerjakan lagi**. Karena revisi = update baris `standard` yang sama, cukup
ubah cek lulus jadi **per-(procedure+revisi)** (tanpa skema baru), dan soal
di-tag per revisi (rekomendasi: tambah kolom `revision` di `quiz_question`).
Masih butuh keputusan (poin per revisi? Q1/Q2?).

---

## 4. BELUM MULAI — permintaan manager terbaru ⏳

**Buatkan akun untuk semua karyawan Dittek** (dari `tmemp`) dengan **password
default**, + fitur **ubah password**.

Sudah dicek dulu: **user level** yang ada di web (lihat tabel di bawah). Untuk
akun massal, kemungkinan besar diberi level **`1` (DOA Personel)** dengan
`activated='Y'` (kalau `0`/`N` mereka tak bisa login). Rancangan detail menyusul
kalau kamu minta.

### Referensi User Level (hasil cek kode)
| Level | Nama | Bisa apa |
| :--- | :--- | :--- |
| **-1** | Administrator | Semua, termasuk **kelola user** (khusus -1) |
| **1** | DOA Personel | User biasa, lihat semua dokumen. **Mayoritas akun.** |
| **2** | PMO/PPC | Hanya lihat subset dokumen **aircraft** |
| **3** | Non Aircraft | Hanya lihat subset dokumen **non-aircraft** |
| **5** | Controller | Edit dokumen + kelola soal/log quiz (seperti admin, **tanpa** kelola user) |
| **0** | *(belum aktivasi)* | Dari registrasi; **tidak bisa login** sampai admin ubah levelnya. Tak ada di dropdown. |

Login butuh: level ≠ 0 **dan** `activated='Y'`.

---

## Catatan lingkungan (biar tidak bingung)
- **DB lokal** = `doan` (MySQL di 127.0.0.1). **DB produksi** = `standard` @
  10.1.95.76 (MySQL **5.1.71** — jadul: MyISAM, tak ada utf8mb4/InnoDB baru).
- `src/lib/server/db/index.ts` = tempat ganti koneksi. **Sekarang menunjuk lokal**
  (`doan`) untuk dev; balik ke blok produksi saat mau deploy.
- Saat test, buat user test di **lokal** saja, jangan tulis data test ke produksi.

## Semua file dokumentasi
| File | Isi |
| :--- | :--- |
| `docs/OVERVIEW.md` | **(ini)** peta semua pekerjaan |
| `docs/quiz_design.md` | desain lengkap fitur quiz (+ lulus-lock §12a, revisi §12b) |
| `docs/quiz_pertanyaan.md` | arsip kuesioner keputusan awal quiz |
| `docs/departemen.md` | fitur departemen + langkah realisasi produksi |
| `docs/pdf_secure_viewer.md` | rancangan PDF anti-download |
| `docs/storage_logic.md` | struktur penyimpanan dokumen DOA (lama) |
| `quiz.sql` / `department.sql` | skrip DB (root) |
| `watermark.php` | salinan referensi (tidak diubah) |
