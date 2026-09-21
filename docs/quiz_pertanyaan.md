# Quiz Pemahaman Prosedur — Daftar Pertanyaan Keputusan

> **[ARSIP — SUDAH DIJAWAB, 1 Sep 2026]** Keputusan supervisor sudah dicatat
> dan dirangkum di `quiz_design.md` §1 (perancangan v2). Intinya: tidak ada
> paksaan (tombol quiz di halaman terakhir PDF), 5 soal per procedure diacak
> soal+opsinya, lulus 3/5, poin jadi atribut user, UI kelola soal untuk
> userlevel -1 & 5, log quiz terpisah. File ini dipertahankan sebagai arsip;
> jangan dipakai sebagai acuan implementasi.

Untuk didiskusikan dengan supervisor sebelum backend dikerjakan.
Centang pilihan yang disepakati dan isi baris **Keputusan** — jawaban di file ini
yang akan jadi acuan implementasi. Konteks teknisnya ada di `quiz_design.md`.

Tanda ⭐ = rekomendasi dari sisi teknis. Semua rekomendasi boleh di-override;
tidak ada pilihan yang menghambat pilihan lain kecuali disebutkan.

---

## 1. Kapan karyawan wajib mengerjakan quiz?

Menentukan kapan sistem membuat "kewajiban quiz" baru saat procedure dibuka.

- [ ] **A. Sekali per revisi** ⭐ — quiz hanya muncul saat pertama kali membuka
  procedure pada revisi tersebut. Buka ulang revisi yang sama tidak ditagih;
  revisi baru terbit → wajib quiz lagi. Bukti audit "sudah membaca versi
  terbaru" tanpa mengganggu pekerjaan harian.
- [ ] **B. Setiap kali membuka** — paling ketat, tapi dokumen yang sering dibuka
  akan terus menagih quiz dan data audit penuh pengulangan.
- [ ] **C. Sekali per dokumen** — sekali selesai, tidak ditagih lagi walau
  revisi berubah. Paling ringan, nilai auditnya paling lemah.
- [ ] **D. Berkala** — diulang tiap periode (misal setahun sekali), bisa
  digabung dengan A. Perlu supervisor menentukan panjang periodenya: ______

**Keputusan:** ______________________________________________

---

## 2. Ada nilai minimum kelulusan? Konsekuensi jika gagal?

- [ ] **A. Ada minimum, wajib mengulang sampai lulus** ⭐ — misal minimal 2 dari
  3 benar; jika gagal, soal diacak ulang dan kewajiban belum lepas (karyawan
  tetap terkunci di halaman quiz). Bukti pemahaman paling kuat.
- [ ] **B. Ada minimum, gagal cukup dicatat** — selesai menjawab langsung
  melepas kewajiban; status lulus/gagal tampil di laporan untuk ditindaklanjuti
  atasan.
- [ ] **C. Tanpa minimum** — selesai menjawab = beres, skor tetap dicatat.
  Paling sederhana.

Jika A/B — ambang lulusnya berapa? (usul: 2 dari 3): ______

**Keputusan:** ______________________________________________

---

## 3. Soal quiz-nya seperti apa?

- [ ] **A. Soal umum untuk semua procedure** ⭐ — satu bank soal tentang
  document control (seperti 3 soal demo); tiap quiz mengambil N soal acak.
  Paling cepat jalan, tidak butuh konten per dokumen.
- [ ] **B. Soal spesifik per dokumen** — tiap procedure bisa punya soalnya
  sendiri (fallback ke soal umum jika belum ada). Konsekuensi: **seseorang
  harus menulis soal untuk tiap procedure** — siapa? ______
- [ ] **C. Campuran** — mulai dari soal umum (A), soal per dokumen ditambahkan
  bertahap untuk procedure yang dianggap kritikal.

**Keputusan:** ______________________________________________

---

## 4. Berapa soal per quiz?

Demo sekarang = 3 soal, tiap soal 10 poin.

- [ ] **A. 3 soal** ⭐
- [ ] **B. 5 soal**
- [ ] **C. Lainnya: ______**

**Keputusan:** ______________________________________________

---

## 5. Siapa yang mengelola bank soal, dan lewat apa?

- [ ] **A. Sementara lewat SQL (di-seed developer)** ⭐ — halaman admin
  menyusul di fase berikutnya. Scope rilis pertama paling kecil.
- [ ] **B. Langsung buat halaman admin CRUD soal** — admin/controller
  (userlevel -1/5) bisa kelola soal sendiri sejak rilis pertama. Scope
  bertambah: satu halaman UI baru + endpoint-nya.

Siapa PIC konten soal (menulis & memvalidasi jawaban benar)? ______

**Keputusan:** ______________________________________________

---

## 6. Seberapa keras "kuncian" saat quiz belum selesai?

Usulan teknis: selama masih ada quiz pending, semua halaman `/dash*` dialihkan
ke halaman quiz — termasuk setelah logout lalu login lagi (kewajiban tersimpan
di database, bukan di browser).

- [ ] **A. Kunci penuh seperti usulan di atas** ⭐ — logout tetap boleh, tapi
  login berikutnya langsung mendarat di quiz.
- [ ] **B. Longgar** — hanya pengingat/banner; karyawan tetap bisa memakai
  dashboard, quiz pending tampil di laporan atasan.

Apakah admin/controller (userlevel -1 dan 5) ikut terkena kewajiban quiz,
atau dikecualikan? (usul: dikecualikan, karena mereka yang mengunggah dan
mengelola dokumen): ______

**Keputusan:** ______________________________________________

---

## 7. Poin dipakai untuk apa?

Menentukan seberapa serius perhitungan poin perlu dibangun.

- [ ] **A. Sekadar bukti audit + ditampilkan ke karyawan** ⭐ — total poin
  tampil di dashboard; auditor melihat detail per attempt di laporan.
- [ ] **B. Dipakai untuk penilaian/ranking** — misal rekap poin per divisi,
  leaderboard, atau masuk KPI. Perlu definisi periode & aturan reset: ______

**Keputusan:** ______________________________________________

---

## 8. Laporan hasil quiz untuk auditor

- [ ] **A. Halaman laporan + export XLSX seperti Log Aktivitas** ⭐ — kolom:
  tanggal, NIK, nama, dokumen, revisi, skor, poin, status (lulus/gagal/belum
  selesai). Ini yang menjawab permintaan "instrumen audit selain LOG".
- [ ] **B. Cukup data tersimpan di database dulu** — laporan dibuat belakangan.

Siapa saja yang boleh melihat laporan ini? (usul: sama seperti Log Aktivitas
sekarang): ______

**Keputusan:** ______________________________________________

---

## 9. Cakupan tipe dokumen

Saat ini yang diminta hanya **procedure** (`pro` dan `pro2`).

- [ ] **A. Procedure saja** ⭐ — implementasi tetap dibuat generik sehingga
  menambah tipe lain nanti tinggal menambah daftar, bukan menulis ulang.
- [ ] **B. Sekalian tipe lain sejak awal** — sebutkan: work instruction /
  manual / lainnya: ______

**Keputusan:** ______________________________________________

---

## 10. Batas waktu pengerjaan (timer)?

- [ ] **A. Tanpa timer** ⭐ — karyawan bisa membaca PDF sambil menjawab;
  kewajiban toh tidak bisa dihindari.
- [ ] **B. Ada timer** — durasi: ______ menit. Konsekuensi jika habis waktu
  perlu didefinisikan (dianggap gagal? ulang?): ______

**Keputusan:** ______________________________________________

---

## 11. (Teknis — untuk internal, bukan supervisor) Cara deploy tabel baru

DB produksi (`standard` @ 10.1.95.76) juga dipakai sistem PHP lama.

- [ ] **A. File SQL manual** ⭐ — developer siapkan `CREATE TABLE` + seed soal;
  dieksekusi manual di produksi (paling aman untuk DB yang dipakai bersama).
- [ ] **B. Drizzle migrate** (`db:generate` + `db:migrate`) — praktis, tapi
  drizzle-kit bisa mendeteksi perbedaan tabel-tabel lama dan menyarankan
  perubahan yang tidak diinginkan; wajib review sebelum apply.
- [ ] **C. Lokal dulu saja** — produksi diputuskan setelah demo disetujui.

**Keputusan:** ______________________________________________

---

## Ringkasan default

Jika supervisor tidak punya preferensi khusus, kombinasi ⭐ di atas adalah
rangkaian yang paling seimbang: *sekali per revisi, minimal 2/3 benar wajib
mengulang, 3 soal umum diacak dari bank yang di-seed SQL, kunci penuh dengan
pengecualian admin, poin sebagai bukti audit, laporan + export XLSX, procedure
saja, tanpa timer.* Semua jawaban tinggal dicatat di sini, lalu implementasi
backend bisa langsung dimulai mengikuti urutan langkah di `quiz_design.md` §5.
