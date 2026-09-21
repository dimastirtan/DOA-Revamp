-- ============================================================
-- Quiz Pemahaman Prosedur — perubahan skema database
-- Acuan: docs/quiz_design.md
--
-- PENTING (produksi): jalankan file ini SEBELUM deploy build
-- aplikasi yang memuat fitur quiz, karena schema.ts baru ikut
-- membaca kolom useraccounts.points.
-- ============================================================

-- Soal quiz: atribut dari procedure.
-- KUNCI PENGHUBUNG = standard_no (primary key `standard.no` yang PERMANEN),
-- BUKAN nomor dokumen. Jadi kalau nomor procedure diubah, soal TIDAK hilang
-- (lihat docs/quiz_design.md §11). Kolom nmdoc hanya snapshot informatif nomor
-- saat soal dibuat/diedit — tidak dipakai untuk pencocokan.
-- Soal lama tidak dihapus fisik, di-set remark='D' (pola soft-delete standard).
CREATE TABLE IF NOT EXISTS quiz_question (
  no          INT AUTO_INCREMENT PRIMARY KEY,
  standard_no INT NOT NULL,                 -- ref -> standard.no (PK, tak berubah)
  nmdoc       VARCHAR(100),                 -- snapshot nomor saat dibuat (informatif)
  question    TEXT NOT NULL,
  option_a    VARCHAR(500) NOT NULL,
  option_b    VARCHAR(500) NOT NULL,
  option_c    VARCHAR(500) NOT NULL,
  option_d    VARCHAR(500) NOT NULL,
  correct     ENUM('A','B','C','D') NOT NULL,
  remark      VARCHAR(50) NOT NULL DEFAULT 'Active',
  updated_by  VARCHAR(50),
  updated_at  DATETIME,
  INDEX idx_qq_standard (standard_no)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
-- Catatan engine/charset: server produksi = MySQL 5.1.71 (tidak ada utf8mb4;
-- semua tabel existing MyISAM/latin1). Dipilih MyISAM+utf8 agar konsisten dgn
-- tabel lama (termasuk log `history`) & aman di server jadul. Feature tidak
-- butuh transaksi/FK. Naikkan ke InnoDB kelak jika perlu crash-safety.

-- Attempt = sekaligus log/history quiz terpisah (satu baris = satu pengerjaan).
-- nmdoc/title/revision di sini adalah SNAPSHOT BEKU (log tetap menampilkan nomor
-- lama walau dokumen di-rename atau dihapus). standard_no dipakai internal untuk
-- mengambil soal saat penilaian (tetap benar walau nomor berubah).
-- points = selisih poin yang DIKREDITKAN attempt ini (aturan nilai tertinggi:
-- hanya positif saat memperbaiki skor terbaik), sehingga SUM(points) per user
-- selalu = useraccounts.points.
CREATE TABLE IF NOT EXISTS quiz_attempt (
  no          INT AUTO_INCREMENT PRIMARY KEY,
  username    VARCHAR(50) NOT NULL,
  nama        VARCHAR(50),
  standard_no INT NOT NULL,                 -- ref -> standard.no (untuk ambil soal)
  nmdoc       VARCHAR(100) NOT NULL,        -- SNAPSHOT BEKU nomor dokumen
  title       VARCHAR(500),                 -- SNAPSHOT BEKU judul
  revision    VARCHAR(10),                  -- SNAPSHOT BEKU revisi
  score       INT NOT NULL DEFAULT 0,
  status      ENUM('pending','lulus','gagal') NOT NULL DEFAULT 'pending',
  points      INT NOT NULL DEFAULT 0,
  started_at  DATETIME NOT NULL,
  finished_at DATETIME NULL,
  INDEX idx_qa_user (username),
  INDEX idx_qa_standard (standard_no)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

-- Poin total sebagai atribut user (cache; sumber kebenaran = quiz_attempt,
-- bisa direkonsiliasi ulang dengan:
--   UPDATE useraccounts u SET points =
--     (SELECT COALESCE(SUM(points),0) FROM quiz_attempt qa WHERE qa.username = u.username);
-- )
ALTER TABLE useraccounts ADD COLUMN points INT NOT NULL DEFAULT 0;

-- ============================================================
-- MIGRASI (hanya jika sudah terlanjur membuat versi LAMA tabel ini yang
-- di-key nmdoc). Lewati untuk instalasi baru. Jalankan satu per satu:
--
--   ALTER TABLE quiz_question ADD COLUMN standard_no INT NOT NULL DEFAULT 0 AFTER no;
--   ALTER TABLE quiz_attempt  ADD COLUMN standard_no INT NOT NULL DEFAULT 0 AFTER nama;
--   -- backfill dari nomor dokumen saat ini (jalankan SEBELUM ada rename):
--   UPDATE quiz_question q JOIN standard s
--     ON s.number = q.nmdoc AND s.type IN ('pro','pro2') AND s.remark <> 'D'
--     SET q.standard_no = s.no WHERE q.standard_no = 0;
--   UPDATE quiz_attempt a JOIN standard s
--     ON s.number = a.nmdoc AND s.type IN ('pro','pro2')
--     SET a.standard_no = s.no WHERE a.standard_no = 0;
--   ALTER TABLE quiz_question ADD INDEX idx_qq_standard (standard_no);
--   ALTER TABLE quiz_attempt  ADD INDEX idx_qa_standard (standard_no);
--   -- (opsional) buang index nmdoc lama:
--   -- ALTER TABLE quiz_question DROP INDEX idx_qq_nmdoc;
--   -- ALTER TABLE quiz_attempt  DROP INDEX idx_qa_doc;
-- ============================================================
