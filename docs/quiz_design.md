# Quiz Pemahaman Prosedur — Perancangan v2

Status: **SUDAH DIIMPLEMENTASI (7 Sep 2026).** Backend + 3 halaman + modal
tawaran quiz di dashboard, teruji end-to-end. Skema DB **sudah diterapkan di
produksi** `standard` @ 10.1.95.76 (lihat §10). Penyesuaian scoring: **percobaan
bebas, yang dicatat nilai tertinggi** (§7).

**PERUBAHAN PENDEKATAN (7 Sep 2026): watermark.php TIDAK jadi diubah.** Pintu
masuk quiz sekarang berupa **modal di dashboard**: saat karyawan membuka
procedure (PDF tetap terbuka di tab baru seperti biasa), muncul modal
"Apakah Anda mau menyelesaikan quiz-nya sekarang?" di tab dashboard. Modal hanya
muncul untuk procedure (pro/pro2) yang punya quiz aktif (5 soal). watermark.php
sudah dikembalikan ke aslinya. Lihat §4 & §10.

Ringkasan implementasi ada di §10. Bagian §1–§9 mendokumentasikan rancangan
dan keputusannya (§4 diperbarui untuk pendekatan modal).

---

## 1. Keputusan final (dari supervisor)

| Topik | Keputusan |
| :--- | :--- |
| Sifat | **Tidak dipaksa** — karyawan tidak dikunci; quiz bersifat sukarela tapi **dinilai** dan tercatat |
| Pintu masuk | Saat PDF watermark terbuka, **di ujung dokumen ada tombol "Mulai Quiz"** sebagai bukti membaca |
| Jumlah soal | **5 soal per procedure** (tiap procedure punya soalnya sendiri) |
| Pengacakan | Urutan soal **dan** urutan pilihan ganda diacak |
| Kelulusan | Minimal **3 dari 5** benar |
| Poin | Disimpan menjadi **atribut user** |
| Kelola soal | **UI pembuatan soal** untuk userlevel **-1 (admin)** dan **5 (controller)** |
| Cakupan | **Procedure saja** (`pro`, `pro2`) |
| Log | **Log/history quiz terpisah** dari log aktivitas yang ada |
| watermark.php | Boleh ditambah, **esensi/logika lama tidak boleh diubah** |

Perubahan besar dari v1: tidak ada lagi guard/redirect paksa di `hooks.server.ts`,
tidak ada status "onQuiz" yang mengunci user, dan pintu masuk quiz pindah dari
"redirect tab dash" menjadi "tombol di halaman terakhir PDF".

---

## 2. Fakta teknis watermark.php (hasil baca `watermark.php` di root repo)

- Output-nya **PDF mentah** (`$pdf->Output("$jdl", 'I')` → `Content-Type:
  application/pdf`), dirender oleh PDF viewer bawaan browser. **Tidak ada HTML**,
  jadi tidak bisa disisipi tombol HTML/JavaScript.
- Objek `$pdf` adalah **FPDI di atas TCPDF** (terbukti dari pemakaian
  `SetAlpha`, `StartTransform`, `Rotate`) → fitur TCPDF tersedia, termasuk
  **link/annotation di dalam PDF**. Inilah celah resminya: link di PDF bisa
  diklik dari PDF viewer browser dan membuka URL.
- Per halaman ia meng-import halaman sumber, menempel watermark
  "Uncontrolled Doc by …", lalu loop ditutup di `} //tutup looping halaman pdf`
  sebelum `Output`.
- Ia juga insert ke tabel `history` sendiri (log buka dokumen versi PHP lama).

**Kesimpulan:** cara memenuhi "tombol di ujung dokumen" = **menambahkan satu
halaman penutup** berisi tombol ber-link ke `/dash/quiz` aplikasi kita, di
antara akhir loop dan `Output`. Murni aditif — nol perubahan pada logika
watermark/history yang ada. Detail di §4.

---

## 3. Alur pengguna

### Karyawan (pendekatan FINAL: modal di dashboard)

```
Klik tombol buka procedure di /dash
  ├─ window.open(watermark.php...) → PDF terbuka di tab baru  (alur lama, TIDAK berubah)
  └─ Di tab dashboard: cek GET /-doa/quiz/available?ndm=<number>
       └─ kalau procedure (pro/pro2) & punya 5 soal aktif → MODAL:
            "Apakah Anda mau menyelesaikan quiz-nya sekarang?"
            ├─ "Nanti Saja"        → tutup modal (tidak dipaksa)
            └─ "Kerjakan Sekarang" → /dash/quiz?ndm=<number>
                 ├─ Server: validasi ndm, ambil 5 soal (by standard_no), buat attempt 'pending'
                 ├─ Karyawan menjawab 5 soal (urutan soal & opsi diacak server)
                 └─ Submit → dinilai DI SERVER → 'lulus' (≥3) / 'gagal'
                      ├─ poin (aturan nilai tertinggi) → useraccounts.points
                      └─ halaman hasil: skor, status, poin
```

Tidak ada paksaan: menutup modal ("Nanti Saja") atau menutup PDF tanpa quiz
tidak diblokir. Ketiadaan attempt terlihat saat laporan quiz disandingkan dengan
log buka dokumen. Modal hanya muncul untuk procedure yang **sudah punya quiz**
(cek availability), jadi tidak mengganggu saat membuka dokumen tanpa soal.

Kenapa modal (bukan tombol di PDF): tidak perlu menyentuh watermark.php sama
sekali (di server PHP terpisah), identitas otomatis dari session Lucia, dan
tidak bergantung pada karyawan meng-scroll PDF sampai ujung.

Catatan sesi: `/dash/quiz` tetap di belakang `authGuard`. Karyawan membuka
procedure dari dash saat login, jadi cookie session ikut.

### Admin / Controller (userlevel -1 dan 5)

```
/dash/quiz/soal
  ├─ Cari & pilih procedure (dari tabel standard, type pro/pro2, remark != 'D')
  ├─ Form 5 slot soal: pertanyaan + opsi A–D + kunci jawaban
  ├─ Simpan → upsert ke quiz_question (validasi: tepat 5 soal aktif utk quiz bisa jalan)
  └─ Indikator per procedure: "soal lengkap (5/5)" / "belum lengkap"
```

### Auditor / atasan

```
/dash/quiz/log  (terpisah dari Log Aktivitas)
  ├─ Tabel: tanggal, NIK, nama, dokumen, judul, revisi, skor, status, poin
  ├─ Search + pagination + export XLSX  (pola sama dgn /dash/log)
  └─ Attempt 'pending' ikut tampil = "mulai quiz tapi tidak menyelesaikan"
```

---

## 4. Pintu masuk quiz: modal di dashboard (FINAL — watermark.php TIDAK diubah)

Keputusan 7 Sep 2026: rencana "tombol di halaman penutup PDF" **dibatalkan**.
watermark.php dikembalikan ke aslinya (nol perubahan). Pintu masuk quiz sekarang
sepenuhnya di dalam aplikasi:

- Saat karyawan menekan tombol buka procedure di `/dash`, alur lama tetap jalan:
  `window.open(watermark.php...)` membuka PDF di tab baru.
- Setelah itu, di tab dashboard, `bukaDoa()` memeriksa
  `GET /-doa/quiz/available?ndm=<number>`. Jika dokumen adalah procedure
  (pro/pro2) dan punya 5 soal aktif, muncul **modal**: "Apakah Anda mau
  menyelesaikan quiz-nya sekarang?" dengan tombol **Nanti Saja** / **Kerjakan
  Sekarang** (→ `/dash/quiz?ndm=<number>`).

Implementasi:
- `src/routes/-doa/quiz/available/+server.ts` — GET cek ketersediaan quiz tanpa
  efek samping (tanpa membuat attempt).
- `src/routes/dash/+page.svelte` — helper `bukaDoa(doa)` menggantikan handler
  buka dokumen yang lama (yang tadinya terduplikasi di onclick+onkeydown), plus
  markup modal `mbukakQuizPrompt`.

Kelebihan dibanding patch PDF:
- **Nol sentuhan ke watermark.php** (server PHP terpisah — tidak perlu deploy ke
  sana, tidak perlu isi host aplikasi, tidak ada halaman penutup ikut tercetak).
- Identitas dari session Lucia (bukan `kuid` di URL); URL cukup membawa `ndm`.
- Modal hanya muncul kalau quiz-nya memang ada → tidak mengganggu dokumen tanpa
  soal, dan tidak bergantung karyawan scroll PDF sampai ujung.

Trade-off (diterima): entry point tidak berada "di dalam PDF", jadi kalau
karyawan membuka PDF lewat jalur lain (bukan dari tombol dash) modal tidak
muncul. Untuk sekarang semua akses procedure lewat dashboard, jadi cukup.

Catatan: masalah keamanan bawaan watermark.php (query pakai variabel request
langsung) di luar scope fitur ini — dicatat di `TODO.md` sebagai temuan terpisah.

---

## 5. Skema database

### Jawaban untuk "MyISAM, nyimpen attempt di mana?"

MyISAM hanya berarti dua hal: **tidak ada foreign key** dan tidak ada transaksi.
Ia **tidak** menghalangi membuat tabel baru maupun menambah kolom
(`ALTER TABLE ... ADD COLUMN` biasa). Jadi:

- Attempt disimpan di **tabel baru `quiz_attempt`** — sekaligus menjadi
  log/history quiz terpisah yang diminta supervisor. Satu baris = satu
  pengerjaan; tidak perlu tabel log tambahan.
- Relasi ke `useraccounts`/`standard` cukup *logical reference* (kolom
  `username` / `nmdoc` + index, tanpa constraint) — pola yang sama dengan tabel
  `history` yang sudah ada.
- Tabel baru dibuat **InnoDB** (boleh berdampingan dengan tabel MyISAM di satu
  database; lebih tahan crash). Kalau kantor mensyaratkan seragam MyISAM,
  tinggal ganti `ENGINE=` — struktur tidak berubah.

### SQL (file manual — lihat §8 soal cara deploy)

```sql
-- Bank soal: 5 soal per procedure, di-keyed nomor dokumen
CREATE TABLE quiz_question (
  no         INT AUTO_INCREMENT PRIMARY KEY,
  nmdoc      VARCHAR(100) NOT NULL,          -- logical ref -> standard.number
  question   TEXT NOT NULL,
  option_a   VARCHAR(500) NOT NULL,
  option_b   VARCHAR(500) NOT NULL,
  option_c   VARCHAR(500) NOT NULL,
  option_d   VARCHAR(500) NOT NULL,
  correct    ENUM('A','B','C','D') NOT NULL, -- tidak pernah dikirim ke browser
  remark     VARCHAR(50) NOT NULL DEFAULT 'Active',  -- soft-delete, pola lama
  updated_by VARCHAR(50),                    -- NIK admin/controller terakhir
  updated_at DATETIME,
  INDEX idx_qq_nmdoc (nmdoc)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Attempt = sekaligus log/history quiz (immutable, insert + update status saja)
CREATE TABLE quiz_attempt (
  no          INT AUTO_INCREMENT PRIMARY KEY,
  username    VARCHAR(50) NOT NULL,          -- logical ref -> useraccounts.username
  nama        VARCHAR(50),                   -- snapshot Config_penghasil (pola history)
  nmdoc       VARCHAR(100) NOT NULL,
  title       VARCHAR(500),                  -- snapshot judul saat mengerjakan
  revision    VARCHAR(10),                   -- snapshot revisi saat mengerjakan
  score       INT NOT NULL DEFAULT 0,        -- jumlah benar (0–5)
  status      ENUM('pending','lulus','gagal') NOT NULL DEFAULT 'pending',
  points      INT NOT NULL DEFAULT 0,        -- poin yang diberikan attempt ini
  started_at  DATETIME NOT NULL,
  finished_at DATETIME NULL,
  INDEX idx_qa_user (username),
  INDEX idx_qa_doc  (nmdoc)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Poin sebagai atribut user (permintaan supervisor)
ALTER TABLE useraccounts ADD COLUMN points INT NOT NULL DEFAULT 0;
```

Catatan `ALTER useraccounts`: aman untuk sistem PHP lama selama insert lamanya
menyebut kolom secara eksplisit (kolom baru punya DEFAULT) — **perlu dicek
sekali** di source PHP lama sebelum dieksekusi di produksi. Sumber kebenaran
poin tetap `quiz_attempt` (bisa di-`SUM` ulang kapan pun kalau kolom cache ini
tidak sinkron — penting karena MyISAM tanpa transaksi).

Padanan Drizzle untuk `schema.ts` dibuat saat implementasi (bentuknya mengikuti
SQL di atas, pola sama dengan v1).

---

## 6. Endpoint API (semua di bawah `/-doa/quiz/*`, otomatis kena authGuard)

| Endpoint | Method | Akses | Fungsi |
| :--- | :--- | :--- | :--- |
| `/-doa/quiz/start` | POST `{ndm}` | semua user login | Validasi dokumen (type pro/pro2, remark != 'D', soal aktif = 5). Buat attempt `pending` (atau pakai ulang pending yang ada utk dokumen itu). Return: attempt no + 5 soal **diacak urutan soal & opsinya, tanpa kunci** |
| `/-doa/quiz/submit` | POST `{attemptNo, answers:[{questionNo, choice}]}` | pemilik attempt | Nilai di server, set `lulus`/`gagal` + `score` + `finished_at`; hitung `points` (aturan §7) dan update `useraccounts.points`. Return hasil |
| `/-doa/quiz/soal` | GET `?ndm=` / `?list=` | userlevel -1, 5 | Ambil soal per dokumen **lengkap dengan kunci** (untuk form edit), atau daftar procedure + status kelengkapan soalnya |
| `/-doa/quiz/soal` | POST `{ndm, soal[5]}` | userlevel -1, 5 | Upsert 5 soal sebuah procedure (soal lama yang dibuang di-set remark 'D', bukan delete — jejak audit). Catat `updated_by`/`updated_at` |
| `/-doa/quiz/log` | GET (paginasi, search, export) | mengikuti akses Log Aktivitas | Data `quiz_attempt` utk halaman log quiz + export XLSX |

Teknik pengacakan opsi tanpa menyimpan permutasi: kunci A–D di DB tetap; server
mengirim opsi sebagai array yang sudah diacak, tiap opsi membawa key aslinya
(`{key:'C', text:'...'}`); client mengirim balik key pilihan; server tinggal
membandingkan dengan `correct`. Kunci tidak pernah menyentuh browser.

Semua endpoint baru pakai query builder Drizzle (tanpa `sql.raw` — mengikuti
catatan TODO.md).

---

## 7. Aturan poin (FINAL — sesuai keputusan user, terimplementasi)

- Skor = jumlah benar (0–5). **Lulus = skor ≥ 3.**
- **Percobaan bebas berkali-kali; yang dicatat hanya NILAI TERTINGGI.**
  Contoh: percobaan 1 = 1/5, percobaan 2 = 2/5 → tercatat 2/5; percobaan 3 =
  1/5 → tetap 2/5.
- Implementasi tanpa perlu tabel agregat terpisah: tiap attempt menyimpan
  `points` = **selisih poin yang dikreditkan** = `max(0, skorBaru −
  skorTerbaikSebelumnya) × 10`. Jadi:
  - attempt yang memperbaiki rekor → `points` positif sebesar kenaikannya,
  - attempt yang lebih jelek / sama → `points` = 0 (poin user tidak turun),
  - `useraccounts.points` = `SUM(quiz_attempt.points)` selalu = skorTertinggi×10
    per dokumen, dijumlah lintas dokumen. Invariant ini sudah diverifikasi.
- Setiap jawaban benar = 10 poin (nilai tertinggi 5/5 → 50 poin per dokumen).
- `useraccounts.points` = akumulasi (cache); ditampilkan sebagai chip "Poin"
  di halaman quiz. Sumber kebenaran tetap `quiz_attempt` — bisa direkonsiliasi
  dengan query di komentar `quiz.sql`.
- Semua attempt (termasuk yang lebih jelek) tetap tercatat penuh di log quiz.

---

## 8. (Keputusan v1 yang dibatalkan)

Yang dari v1 **dibatalkan**: guard `hooks.server.ts`, status "onQuiz"/redirect
paksa, integrasi klik di `dash/+page.svelte` untuk memicu quiz (tidak perlu —
pintu masuknya tombol di PDF), soal umum lintas dokumen.

---

## 9. Keputusan atas sisa pertanyaan

Supervisor: "kerjakan seoptimalnya, nanti bisa di-improve." Yang diputuskan:

1. **Poin saat mengulang** → nilai tertinggi (lihat §7). ✔ diterapkan.
2. **Procedure yang soalnya belum diisi** → halaman quiz menampilkan pesan
   "soal belum tersedia" dan **tidak** membuat attempt. ✔ diterapkan
   (`code: SOAL_BELUM_LENGKAP`).
3. **Host aplikasi untuk link di PDF** → **tidak relevan lagi** — pintu masuk
   pindah ke modal di dashboard (§4), watermark.php tidak diubah.
4. **Halaman penutup ikut tercetak** → tidak ada lagi (tidak ada patch PDF).
5. **PIC pengisian soal awal** → di luar scope kode; admin/controller mengisi
   lewat halaman Kelola Soal.

---

## 10. Status implementasi & langkah deploy

### Yang sudah dibuat & teruji

| Bagian | File |
| :--- | :--- |
| SQL skema | `quiz.sql` (root) — 2 tabel **MyISAM/utf8** + `ALTER useraccounts ADD points` (server produksi MySQL 5.1.71 — lihat §5) |
| Drizzle schema | `src/lib/server/db/schema.ts` — `quizQuestion`, `quizAttempt`, `useraccounts.points` |
| Endpoint start | `src/routes/-doa/quiz/start/+server.ts` |
| Endpoint submit | `src/routes/-doa/quiz/submit/+server.ts` |
| Endpoint kelola soal | `src/routes/-doa/quiz/soal/+server.ts` (GET list/detail by `no`, POST upsert) |
| Endpoint log | `src/routes/-doa/quiz/log/+server.ts` (paginasi, search, `from`/`to`, export) |
| Endpoint cek quiz | `src/routes/-doa/quiz/available/+server.ts` (GET, untuk modal dash) |
| Halaman quiz karyawan | `src/routes/dash/quiz/+page.svelte` |
| Halaman kelola soal | `src/routes/dash/quiz/soal/+page.svelte` (+ guard) — layout master-detail |
| Halaman log quiz | `src/routes/dash/quiz/log/+page.svelte` (+ guard admin/controller) — setara Log Aktivitas (export rentang tanggal, sort, dll) |
| Tombol Kelola Soal di dash | `src/routes/dash/+page.svelte` (ikon note, khusus roleEditDoa) |
| **Modal tawaran quiz** | `src/routes/dash/+page.svelte` — `bukaDoa()` + modal `mbukakQuizPrompt` (§4) |
| watermark.php | **kembali ke asli** (tidak diubah) |

Hasil uji end-to-end (data test dibersihkan):
- Admin membuat 5 soal → procedure "5/5 soal, quiz aktif". ✔
- **Buka procedure → PDF terbuka + modal quiz muncul → "Kerjakan Sekarang" →
  `/dash/quiz?ndm=...` memuat soal.** ✔ (modal hanya untuk procedure yg punya quiz)
- Karyawan start → 5 soal teracak, opsi teracak, kunci tidak bocor. ✔
- Aturan nilai tertinggi: 0→(+0), 4→(+40), 0→(+0, tak turun), 5→(+10) → total 50;
  `useraccounts.points == SUM(quiz_attempt.points)`. ✔
- Soal diikat `standard_no` → rename nomor procedure TIDAK menghilangkan soal;
  log tetap beku (§11). ✔
- Guard kelola soal & log quiz: userlevel selain -1/5 di-redirect + endpoint 403. ✔
- Log quiz setara Log Aktivitas: export semua/rentang, sort kolom. ✔

### Status deploy produksi

1. **Skema DB — SUDAH diterapkan** di `standard` @ 10.1.95.76 (7 Sep 2026):
   `quiz_question`, `quiz_attempt` (MyISAM/utf8), `useraccounts.points` (258 user
   utuh, sudah di-backup user sebelumnya).
2. **Deploy build aplikasi** — dilakukan user saat siap (koneksi `index.ts` sudah
   diarahkan ke produksi).
3. **watermark.php — tidak perlu disentuh** (pendekatan modal).
4. Admin/controller mengisi soal per procedure lewat menu Kelola Soal.

### Catatan teknis penting

- Kolom Drizzle di tabel baru **wajib diberi nama eksplisit** (mis.
  `int("no")`, bukan `int()`). Inferensi nama dari key gagal di jalur SSR/ESM
  Vite proyek ini (menghasilkan kolom `undefined` saat query) — sudah
  diperbaiki, tapi jangan diulang saat menambah kolom lain.
- **Shell halaman quiz pakai `fixed inset-0` (bukan `h-dvh` biasa).** Dengan
  `h-dvh` + panel yang scroll internal (`overflow-auto`), Chromium menghitung
  tinggi intrinsik konten nested-flex ke `documentElement.scrollHeight`
  sehingga seluruh dokumen ikut bisa di-scroll dan memperlihatkan area kosong
  (header hilang ke atas). `fixed inset-0` mengunci shell ke viewport dan
  menghilangkan spurious scroll itu, sementara panel dalam tetap scroll
  sendiri. Diterapkan di ketiga halaman: `dash/quiz`, `dash/quiz/soal`,
  `dash/quiz/log`.

---

## 11. Nomor dokumen (nmdoc) bisa berubah — desain kunci (update 2 Sep 2026)

Supervisor mengonfirmasi nomor procedure **bisa** diganti. Dua kebutuhan yang
kelihatan bertolak belakang, sengaja ditangani berbeda:

| | Soal (`quiz_question`) | Log/attempt (`quiz_attempt`) |
| :-- | :-- | :-- |
| Harus | **ikut** dokumen saat nomor berubah | **beku** — tetap tampil nomor lama |
| Diikat ke | `standard_no` (PK `standard.no`, permanen) | snapshot string `nmdoc` (nomor saat kejadian) |

Kenapa `standard.no`, bukan cascade rename nomor: `no` tidak pernah berubah,
jadi soal **mustahil yatim** apa pun cara nomor diubah (form DOA, SQL langsung,
sistem PHP lama). Cascade rename hanya menyelamatkan perubahan lewat satu
endpoint kita — lebih rapuh.

Konsekuensi yang benar & disengaja:
- Buka quiz pakai nomor **baru** → soal tetap ketemu (via `standard_no`).
- Buka quiz pakai nomor **lama** (mis. PDF lama yang tersimpan) → "procedure
  tidak ditemukan", karena dokumen itu memang sudah berganti nomor. Wajar
  (salinan PDF lama = uncontrolled copy).
- Log yang sudah tercatat tetap menampilkan nomor lama walau dokumen di-rename
  **atau dihapus** (`remark='D'`) — endpoint log tidak pernah JOIN ke
  `standard`. Terbukti end-to-end.
- Skor terbaik & "poin sekali per procedure" dikelompokkan per `standard_no`,
  jadi tetap nyambung antar rename.

Endpoint kelola soal (`/-doa/quiz/soal`) sekarang memakai parameter `no`
(standard.no), bukan `ndm`. Endpoint `start` tetap menerima `ndm` dari link PDF
lalu me-resolve ke `standard.no`. **Tidak perlu** menyentuh endpoint edit DOA
(`-doa/w`) — soal ikut otomatis lewat `standard_no`.

Migrasi: `quiz.sql` versi baru sudah memakai `standard_no` sejak CREATE TABLE.
Untuk instalasi lokal yang terlanjur pakai versi lama, blok ALTER + backfill ada
di bagian bawah `quiz.sql`.

---

## 12. Lulus-lock & penanganan revisi

### 12a. Lulus-lock — SUDAH DIIMPLEMENTASI (14 Sep 2026, per-procedure)

Aturan: begitu user punya attempt `lulus` untuk sebuah procedure, quiz **terkunci**
— tidak ditawarkan & tidak bisa dikerjakan lagi. (Boleh diulang hanya SELAMA belum
lulus; setelah lulus, terkunci.) Tanpa perubahan skema — cukup query status `lulus`.

Titik penegakan:
- `GET /-doa/quiz/available` → kirim `alreadyPassed`. Dash (`bukaDoa`) hanya
  memunculkan modal jika `available && !alreadyPassed`.
- `POST /-doa/quiz/start` → kalau sudah lulus, balas `code:'SUDAH_LULUS'` (+doc,
  bestScore, passedAt, totalPoints) **tanpa** membuat attempt (authoritative,
  tak bisa di-bypass lewat URL langsung).
- Halaman `/dash/quiz` → fase `passed`: panel "Anda Sudah Lulus" (skor + tanggal),
  tanpa soal. Tombol **"Coba Lagi"** disembunyikan begitu `status==='lulus'`.

Cakupan saat ini: **per procedure (`standard_no`)** — sekali lulus, terkunci
selamanya walau revisi berubah. §12b mengubah ini jadi per-revisi.

### 12b. Penanganan revisi procedure + soal — RANCANGAN (belum dikerjakan)

**Fakta model data (penting):** revisi procedure = **update baris `standard` yang
sama di tempat** (endpoint `-doa/w` meng-`update ... where standard.no`, field
`revision` berubah). Jadi `standard.no` PERMANEN lintas revisi, dan
`quiz_question` + `quiz_attempt` (di-key `standard_no`) otomatis tetap menempel.
Itulah "penghubung"-nya: **semua bergantung pada `standard.no` yang tidak berubah**;
dimensi revisi ditambahkan lewat field `revision`.

Tujuan: saat procedure naik revisi (isi dokumen berubah), karyawan yang sudah
lulus revisi lama **wajib mengerjakan lagi** untuk revisi baru, dan admin bisa
menyiapkan soal untuk revisi baru.

**Langkah 1 — Lock & skor jadi per (standard_no + revisi).** `quiz_attempt` sudah
menyimpan snapshot `revision`, jadi **tanpa perubahan skema**:
- `available`/`start`: cek lulus ditambah filter `revision = <standard.revision saat ini>`.
  Efek: begitu revisi naik, tidak ada attempt lulus yang cocok utk revisi baru →
  quiz ditawarkan lagi. Attempt lama tetap di log (bukti lulus revisi lama).
- `bestScore` (start) & `prevBest`/`pointsAdded` (submit): tambah filter revisi
  yang sama → tiap revisi jadi konteks skor baru (poin bisa diperoleh lagi utk
  membaca versi baru). *Keputusan:* setuju poin bertambah lagi per revisi? (usul: ya.)

**Langkah 2 — Soal per revisi (dua opsi):**

- **Q1 (minimal, tanpa skema baru):** soal tetap di-key `standard_no` saja; saat
  revisi, admin meng-edit/ganti 5 soal di Kelola Soal (soal lama otomatis jadi
  `remark='D'`). Kekurangan: tidak ada penanda eksplisit "set soal ini untuk
  revisi mana"; tidak bisa mendeteksi "soal belum diperbarui utk revisi baru".

- **Q2 (REKOMENDASI):** tambah kolom `revision` di `quiz_question` → soal milik
  (`standard_no`, `revision`). `available`/`start` butuh 5 soal aktif untuk
  **revisi yang berlaku sekarang**. Konsekuensi yang bagus:
  - Saat revisi naik, revisi baru **belum punya soal** → quiz tidak ditawarkan
    dulu (tidak nge-nag utk revisi sepele). Re-quiz baru terbuka **setelah admin
    menerbitkan soal revisi baru** (opsional fitur "salin soal dari revisi
    sebelumnya" sebagai titik awal). Jadi re-quiz ter-*gate* oleh aksi admin.
  - Riwayat soal per revisi terjaga & auditable.
  - Perlu: migrasi (ALTER + backfill `revision` = revisi standard saat ini untuk
    soal yang ada), dan Kelola Soal jadi sadar-revisi.

**Rekomendasi:** Langkah 1 (lock/poin per revisi, tanpa skema) + **Q2** untuk soal.
Kombinasi ini membuat re-quiz otomatis-tapi-terkendali: revisi naik → admin siapkan
soal revisi baru → karyawan otomatis diminta mengerjakan lagi; yang belum siap
soalnya tidak nge-nag.

**Keputusan yang dibutuhkan sebelum implementasi:** (1) poin diperoleh lagi tiap
revisi? (2) Q1 atau Q2 untuk soal? (3) saat revisi naik & soal belum disiapkan,
apakah quiz "hilang sementara" sampai admin siapkan (perilaku Q2) itu OK?

---

## Lampiran: file terkait

- `watermark.php` (root repo) — salinan dari server portalditek, **kembali ke
  asli / tidak diubah** (pintu masuk quiz pindah ke modal dashboard, §4).
- `quiz.sql` (root repo) — skema DB (MyISAM/utf8); **sudah diterapkan di produksi**.
- `department.sql` (root repo) — kolom `useraccounts.org` + backfill dari
  `dittek.tmemp`; **baru di lokal**, jalankan di produksi saat siap.
- `docs/quiz_pertanyaan.md` — kuesioner v1; arsip keputusan.
