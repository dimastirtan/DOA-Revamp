-- ============================================================================
-- Tabel yang BELUM ada di server produksi — doa-revamp
--
-- Server produksi = MySQL 5.1.71  ->  WAJIB MyISAM + utf8
--   (BUKAN InnoDB, BUKAN utf8mb4, BUKAN utf8mb3)
--
-- Struktur lokal memakai InnoDB/utf8mb4 (artefak MySQL 8); di sini sudah
-- diadaptasi ke konvensi prod. Semua pakai CREATE TABLE IF NOT EXISTS,
-- jadi aman dijalankan ulang dan tidak menimpa tabel yang sudah ada.
--
-- Cukup jalankan file ini SEKALI di server:
--   mysql -u <user> -p <nama_db> < deploy-missing-tables.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) logs  (tabel lama/legacy — tidak dipakai fitur baru, hanya ikut dibuat
--    supaya struktur server sama dengan lokal. Log Aktivitas aplikasi memakai
--    tabel `history`, BUKAN tabel ini.)
--    Lokal: InnoDB/utf8mb4 -> diturunkan ke MyISAM/utf8.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS logs (
	logID     INT        NOT NULL AUTO_INCREMENT,
	timestamp TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
	PRIMARY KEY (logID)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

-- ----------------------------------------------------------------------------
-- 2) procedure_division  (pemetaan procedure -> divisi, fitur Role Divisi)
--    Dikunci ke standard.no. Soft-delete via remark='D'.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS procedure_division (
	no          INT          NOT NULL AUTO_INCREMENT,
	standard_no INT          NOT NULL,
	division    INT          NOT NULL,
	remark      VARCHAR(50)  NOT NULL DEFAULT 'Active',
	PRIMARY KEY (no),
	KEY idx_pd_standard (standard_no),
	KEY idx_pd_division (division)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

-- ----------------------------------------------------------------------------
-- 3) surat_counter  (counter nomor seri Surat Pernyataan: "482-<seri>")
--    Satu baris id=1 menyimpan nomor terakhir, dinaikkan atomic oleh -users/w.
--
--    CATATAN PENTING: tabel ini WAJIB punya baris id=1 agar counter jalan.
--    Tanpa baris itu, UPDATE ... WHERE id=1 tidak mengubah apa-apa dan nomor
--    seri tidak keluar. Jadi seed di bawah bukan "data" biasa — ini inisialisasi
--    yang diperlukan. INSERT IGNORE = aman, tidak menimpa kalau sudah ada.
--    Ganti 310 bila ingin mulai dari nomor lain (next = last_no + 1).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS surat_counter (
	id      INT NOT NULL PRIMARY KEY,
	last_no INT NOT NULL DEFAULT 0
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

INSERT IGNORE INTO surat_counter (id, last_no) VALUES (1, 310);
