# Fitur Departemen User (sortir/filter by departemen)

Status: **SELESAI di DB lokal (`doan`)**, **belum di produksi**. Dokumen ini
cara merealisasikannya + cara pakainya.

## Ringkasan

Menambahkan kolom **`useraccounts.org`** (kode departemen) supaya daftar user di
halaman **Daftar User** bisa **disortir & difilter per departemen**. Kode
departemen disimpan **PENUH** (mis. `SE1000`, `SE2000`, `SE1300` — sengaja tidak
dipotong prefix karena tiap kode = unit berbeda).

Sumber data departemen = **export HR** `D:\Document\tmemp.csv` (kolom `C_NIK` →
`C_ORG`). Penghubung: `useraccounts.username` = NIK = `C_NIK`.

## Yang sudah dibuat

| Bagian | Detail |
| :--- | :--- |
| Kolom DB | `useraccounts.org VARCHAR(20)` (nullable) |
| Drizzle | `org` didaftarkan di `src/lib/server/db/schema.ts` (tabel `useraccounts`) |
| Isi data | `department.sql` (root) — self-contained: temp table 518 mapping NIK→kode + UPDATE join |
| Endpoint | `/-users/r` otomatis ikut mengirim `org` (pakai `select()`, tak diubah) |
| UI | `src/routes/dash/+page.svelte` drawer "Daftar User": kolom **Departemen**, header bisa diklik untuk **sort**, **dropdown filter** departemen, dan kotak **Cari** ikut mencocokkan kode |

Hasil di lokal: **211 dari 251** user dapat departemen (63 kode unik). 40 sisanya
tampil "-" (lihat catatan di bawah).

## Cara merealisasikan ke PRODUKSI

DB produksi = `standard` @ 10.1.95.76 (MySQL 5.1.71). Langkah:

1. **Deploy build aplikasi** yang memuat `schema.ts` dengan kolom `org`
   (dan UI Daftar User yang baru).
2. **Tambah kolom** (sekali): buka komentar baris ini di `department.sql` lalu
   jalankan — atau jalankan manual:
   ```sql
   ALTER TABLE useraccounts ADD COLUMN org VARCHAR(20) DEFAULT NULL;
   ```
3. **Isi data**: jalankan seluruh `department.sql` di DB `standard` (lewat tool
   DB, mis. HeidiSQL). Isinya membuat temp table 518 mapping dari CSV lalu
   meng-`UPDATE useraccounts.org`. **Idempotent** — aman dijalankan berulang.
   - Cek collation server dulu: perbandingan pakai `COLLATE latin1_general_ci`
     (menyamai collation `username`). Kalau collation di prod beda, sesuaikan.
4. **Verifikasi**:
   ```sql
   SELECT COUNT(*) FROM useraccounts WHERE org IS NOT NULL;
   SELECT org, COUNT(*) FROM useraccounts WHERE org IS NOT NULL GROUP BY org ORDER BY org;
   ```

> Tidak butuh akses ke database `dittek` di produksi — `department.sql` sudah
> berisi datanya sendiri (di-embed dari CSV).

## Kalau ada CSV HR yang lebih baru

Kasih file CSV-nya, minta regenerate `department.sql`. Aturan parsing yang harus
dijaga (mudah keliru):
- **Pad NIK ke 6 digit** — Excel membuang leading zero (`60012` → `060012`).
- **Delimiter `;`** dan ada nama multi-baris di dalam tanda kutip → wajib parser
  CSV betulan (bukan pisah per baris).
- **Simpan kode `C_ORG` penuh**, jangan dipotong.

## Catatan / batasan

- **40 user tampil "-"**: 4 username non-NIK (`admin`, `aleokristi`, `delulu`,
  `riezkiey`) + 36 NIK yang tidak ada di CSV. Sebagian adalah **NIK ganda/legacy
  untuk orang yang sama** (mis. akun `930188 achmad ibramsyah`, padahal di CSV
  orang itu ber-NIK `266044`). Ini rekonsiliasi NIK di sisi HR — di luar fitur
  ini; menampilkan "-" memang perilaku yang benar.
- **Sinkronisasi**: belum otomatis. Kalau HR pindah departemen / ada user baru,
  jalankan ulang `department.sql` (atau versi terbaru dari CSV baru).
- **Auto-isi saat buat user baru**: ditunda ("bertahan dulu"). Kalau nanti mau,
  form buat-user bisa mengambil departemen dari sumber HR berdasarkan NIK.
- **Nama departemen** (bukan kode): belum. Perlu tabel mapping kode→nama kalau
  diinginkan; sekarang tampil kode apa adanya (sesuai keputusan).

## Rencana lanjutan (belum dikerjakan)
- Semua karyawan dibuatkan akun (manager) → mekanisme filter ini langsung skalabel.
- **Laporan quiz per-departemen** (mis. departemen mana yang belum menyelesaikan
  quiz) — jadi mungkin begitu kolom `org` tersedia.
