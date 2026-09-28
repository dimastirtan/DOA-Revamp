# Rancangan: Role Divisi + Filter Procedure per Divisi

Status: 📝 **RANCANGAN** — belum ada kode. Diperbarui **28 Sep 2026** setelah
keputusan K1–K9 (lihat §7). Model disederhanakan: **pembeda divisi = ROLE
(userlevel), `org` diabaikan**.

Terkait: [[quiz_design]] (pola `standard.no` kunci permanen),
[[pdf_secure_viewer]] (viewer & log). ([[departemen]] = fitur lain, tak dipakai
di sini setelah K7.)

---

## 1. Permintaan manager (4 poin)

1. **PDF masih bisa di-print** → matikan print (Ctrl+P) betulan.
2. **Log harus ada divisinya** → kolom divisi di Log Aktivitas.
3. **File unik per divisi** → sebagian procedure hanya boleh diakses divisi
   tertentu; sebagian dipakai 2–3 divisi; sebagian unik 1 divisi.
4. **Role divisi baru** (v1: **hanya baca procedure**):
   - userlevel **6** = Program Management
   - userlevel **7** = Manajemen Resiko
   - userlevel **8** = Human Capital
   - userlevel **9** = Direktorat Produksi
   - (menyusul ada role lain lagi — datanya sebagian sudah diupdate user.)

---

## 2. Aturan yang ada sekarang (acuan)

### 2a. Dokumen & tipe
- Semua dokumen di tabel **`standard`**, dibedakan kolom **`type`**.
  Procedure = `type='pro'` (aircraft) / `type='pro2'` (non-aircraft).
- **`standard` tak punya kolom divisi.** Kunci permanen = `standard.no`.

### 2b. Role (userlevel) sekarang — `useraccounts.userlevel`
`-1` Administrator · `1` DOA Personel · `2` Aircraft · `3` Non Aircraft ·
`5` Controller · `0` pending. Akses = fungsi dari userlevel → daftar `type`.

### 2c. Penegakan akses
- Ditegakkan **server-side** di
  [`-doa/r/+server.ts`](../src/routes/-doa/r/+server.ts) (cabang level 2/3).
- **Lubang:** proxy PDF [`-doa/pdf/+server.ts`](../src/routes/-doa/pdf/+server.ts)
  **hanya cek user login**, tak cek hak atas dokumen → dokumen bisa ditarik lewat
  URL proxy langsung. (Juga akar bug print, §6.)

### 2d. Log
- Log Aktivitas = tabel **`history`**, ditulis saat buka dokumen via
  `POST /-doa/log`. Belum ada kolom divisi.

---

## 3. Model yang diusulkan (sesudah keputusan)

### 3a. Divisi = ROLE (userlevel), bukan org  ← K7
- Identitas divisi **hanya** dari `userlevel`:
  `6`=PM, `7`=MR, `8`=HC, `9`=DP (bisa nambah lagi).
- **`org` tidak dipakai** untuk fitur ini. (Urusan data org = di luar cakupan.)
- Nambah divisi baru nanti = tambah 1 userlevel + labelnya (perubahan kecil
  di kode, karena logika akses memang per-userlevel).

### 3b. Kapabilitas role divisi (v1)
- **Hanya baca procedure.** Tidak edit, tidak tipe dokumen lain.
- Procedure diambil dari **`pro` DAN `pro2`** (K8) — yang menentukan terlihat/
  tidak adalah **mapping** (§3c), bukan aircraft/non-aircraft.
- **Quiz jalan apa adanya** (K6): kalau procedure itu punya soal → modal quiz
  muncul seperti biasa; kalau tak ada soal → tak muncul. Tak perlu perlakuan
  khusus.

### 3c. Pemetaan procedure ↔ divisi (tabel baru) — inti fitur
Tabel **`procedure_division`**, **dikunci ke `standard.no`** (tahan rename nomor
dokumen, pola sama quiz):

```
procedure_division
  no            INT  PK auto
  standard_no   INT          -- procedure (standard.no)
  division      INT          -- userlevel divisi: 6/7/8/9
  remark        VARCHAR(50) DEFAULT 'Active'   -- soft-delete 'D'
  index (standard_no), index (division)
```
- Procedure **P** terlihat oleh divisi **D** ⇔ ada baris `(P, D)`.
- **Unik 1 divisi** = 1 baris. **Dipakai 2–3 divisi** = beberapa baris (K8).
- Procedure **tanpa** baris = tak muncul untuk divisi mana pun (hanya DOA/admin
  yang lihat, seperti biasa). *Tak ada* konsep "common" otomatis — semua eksplisit
  (lebih transparan & mudah diaudit; kalau perlu "semua divisi" tinggal centang
  semua di dashboard).
- MyISAM/utf8 (produksi MySQL 5.1.71), tanpa FK fisik — konsisten aturan repo.
- Nama divisi untuk UI diambil dari daftar `userlevels` di kode (ditambah 6–9).
  *(Opsi kalau mau nama data-driven: tabel `division(userlevel,name)`. Belum perlu.)*

### 3d. Siapa mengisi mapping → **dashboard "Kelola Divisi"** (K3)
- Halaman baru khusus **Admin (-1) & Controller (5)**:
  daftar semua procedure + **kolom centang per divisi** (PM/MR/HC/DP).
- Centang = buat baris; hapus centang = soft-delete (`remark='D'`).
- Jadi controller bisa update filter kapan saja **tanpa** SQL manual.
- Detail alur di §4a.

---

## 4. Perubahan per bagian

### 4a. Dashboard "Kelola Divisi" (edit mapping) — Admin & Controller  ← K3/K9
- Menu baru (ikon di bar bawah, hanya untuk level -1 & 5), buka drawer/halaman
  mirip "Daftar User".
- Isi: tabel procedure (`pro`+`pro2`, `remark<>'D'`) dengan kolom: Nomor, Judul,
  Revisi, lalu **4 kolom centang** (Program Management / Manajemen Resiko /
  Human Capital / Direktorat Produksi). Ada search + pagination.
- Simpan → endpoint tulis ke `procedure_division` (buat/soft-delete baris).
- Ini yang bikin "filter"-nya **dinamis & dikelola controller**, bukan hard-code.

### 4b. Homepage per divisi (tampilan user role 6–9)  ← K1
- **Dropdown Aircraft/Non-Aircraft di bar bawah DIHILANGKAN** untuk level 6–9
  (mereka tak boleh masuk ke dua "dunia" itu). Diganti **label mati** nama
  divisinya (tak bisa ganti dunia) — analog `single=true` milik level 2/3 tapi
  tanpa opsi Aircraft/Non-Aircraft.
- User level 6–9 **langsung mendarat di daftar procedure divisinya**
  (judul mis. "Procedure — Program Management").
- Daftar = procedure yang `standard.no`-nya dipetakan ke `division = userlevel`-nya.
- Tak ada tombol Tambah / kelola / user (itu hanya untuk admin/controller).
- Buka procedure → viewer PDF aman (seperti sekarang) + quiz kalau ada soal.

**Ringkas per-role di bar bawah:**
| Role | Dropdown dunia | Menu ekstra |
| :-- | :-- | :-- |
| 6–9 (PM/MR/HC/DP) | dihilangkan → label divisi (terkunci) | — |
| -1 / 5 (Admin/Controller) | Aircraft/Non-Aircraft tetap | **+ "Kelola Divisi"** |
| 1 / 2 / 3 | tak berubah | — |

### 4c. Penegakan server-side (WAJIB, kalau tidak filter cuma kosmetik)
- **`-doa/r`**: cabang `userlevel ∈ {6,7,8,9}` → paksa `type IN ('pro','pro2')`
  **AND `standard.no IN (SELECT standard_no FROM procedure_division WHERE
  division = <userlevel user> AND remark<>'D')`**.
- **`-doa/pdf`**: sebelum fetch, untuk level 6–9 verifikasi procedure yang diminta
  memang terpetakan ke divisinya → kalau tidak `403`. (Menutup lubang §2c.)
- Divisi dihitung dari **`locals.user.userlevel`** (session) — tak dari client.

### 4d. Log + divisi  ← K5
- **DB**: `ALTER TABLE history ADD COLUMN divisi VARCHAR(30)`.
- **`POST /-doa/log`**: isi nama divisi dari **userlevel** user saat itu (mis.
  "Program Management"; untuk DOA/aircraft dll pakai label rolenya). Diambil dari
  session → **tak bisa dipalsukan**.
- **Log = record, immutable & transparan**: **tidak ada backfill**; baris lama
  tampil **"-"**. Tambah kolom Divisi di UI Log + export XLSX.

### 4e. Print benar-benar mati → §6.

### 4f. UI role
- Tambah label userlevel `6–9` di daftar `userlevels` + transform `fUsers()`
  ([`dash/+page.svelte`](../src/routes/dash/+page.svelte)).

---

## 5. Catatan interaksi dengan aturan lama

1. **Akses tetap 1 dimensi (userlevel)** — setelah K7, tak ada dimensi org.
   Rapi: konsisten dengan pola akses yang sudah ada, cuma nambah cabang level.
2. **Mapping** jadi dimensi data terpisah (procedure↔divisi), dikelola controller.
   Harus ditegakkan di `-doa/r` **dan** `-doa/pdf` (kalau salah satu lupa → bocor).
3. **Menutup lubang proxy PDF** (§2c) jadi wajib — sekalian benerin bug print.
4. **Quiz** tak berubah (K6) — cukup soal ada/tidak.

---

## 6. Print & "anti-screenshot" (poin 1 & K4)

**Yang PASTI bisa dibuat:**
- **Print benar-benar mati**: tangkap `Ctrl+P` di halaman induk `/dash/baca`
  *dan* di iframe; override `window.print` → no-op; matikan **print service**
  PDF.js (bukan cuma sembunyikan tombol); `@media print { body{display:none} }`
  di viewer.html **dan** `/dash/baca` → kalaupun print terpicu, hasilnya blank.
- **Download mati & URL tak bisa dibuka langsung**: otorisasi + **token sekali-
  pakai** di proxy `-doa/pdf` (terikat session+dokumen+expiry) → buka URL proxy
  di tab baru gagal. Klik-kanan/save tetap dicegah.
- **Watermark identitas** (nama|IP|waktu) tercetak di tiap halaman.

**Yang JUJUR tak bisa (perlu disampaikan ke manager):**
- **Screenshot / foto layar tak bisa diblokir oleh web apa pun.** Tombol
  PrintScreen, Snipping Tool, atau foto pakai HP jalan di level OS/hardware, di
  luar jangkauan browser. **Tidak ada** situs (Google Docs, m-banking, dll) yang
  bisa mencegahnya. Kalau benar-benar butuh cegah screenshot → harus aplikasi
  desktop/mobile ber-DRM, bukan web (di luar cakupan proyek ini).
- Karena itu strateginya: **print/download = ditutup**, **screenshot = dilacak**
  lewat watermark identitas (siapa yang buka → kalau bocor ketahuan). Watermark
  = kontrol akuntabilitas, bukan pemblokiran.

---

## 7. Status keputusan

| # | Pertanyaan | Keputusan |
| :- | :-- | :-- |
| K1 | "Non Doa" grup/role? penamaan | **Homepage per divisi** (user 6–9 mendarat langsung di procedure divisinya) + **dashboard Kelola Divisi** untuk admin/controller. Bukan tombol "Non Doa" generik. |
| K2 | 1 level vs per-divisi | **Per divisi**: userlevel 6=PM, 7=MR, 8=HC, 9=DP. |
| K3 | siapa isi mapping | **Controller & Admin** via dashboard "Kelola Divisi" (§4a). |
| K4 | print/screenshot | Print **dimatikan**; screenshot **tak bisa** diblok web → dilacak watermark (§6). |
| K5 | backfill log | **Tidak** backfill. Lama = "-". Log immutable/transparan. |
| K6 | quiz utk divisi | **Ikut mekanisme biasa** (muncul kalau ada soal). |
| K7 | pakai org? | **Tidak.** Pembeda cuma Role. |
| K8 | pro / pro2 | **Dua-duanya**; mapping many-to-many (unik / dipakai 2–3 divisi). |
| K9 | mapping itu apa | Dijelaskan di §3c & §4a (tabel pasangan procedure↔divisi). |

**Belum diputuskan:** urutan implementasi & apakah homepage divisi perlu tetap
kelihatan di bar bawah untuk admin (browsing) — menunggu arah dari user.

---

## 8. Rencana bertahap (kalau disetujui)

- **Fase 1 — Log divisi**: kecil, tak ubah akses. Aman duluan.
- **Fase 2 — Print hardening**: token proxy + matikan print + `@media print`.
  Nilai keamanan tertinggi, independen dari role divisi.
- **Fase 3 — Role divisi**: userlevel 6–9, tabel `procedure_division`, cabang
  `-doa/r`, otorisasi proxy, homepage per divisi, label userlevel.
- **Fase 4 — Dashboard Kelola Divisi**: UI admin/controller kelola mapping.
  (Bisa barengan Fase 3; sampai jadi, mapping diisi via SQL sementara.)

Urutan aman: **1 → 2 → 3 → 4**. Fase 1 & 2 beri nilai cepat tanpa nunggu apa pun.
