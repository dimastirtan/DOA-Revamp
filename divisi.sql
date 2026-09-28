-- ============================================================================
-- Fitur Role Divisi (Fase 3) — doa-revamp
-- Acuan: docs/divisi_design.md
--
-- Produksi = MySQL 5.1.71 → MyISAM / utf8 (BUKAN InnoDB/utf8mb4).
-- Jalankan di server sebelum deploy build yang mengandung fitur divisi.
-- ============================================================================

-- Userlevel divisi (TIDAK perlu perubahan skema — hanya nilai di
-- useraccounts.userlevel):
--   6 = Program Management
--   7 = Manajemen Resiko
--   8 = Human Capital
--   9 = Direktorat Produksi
-- (bisa nambah level lagi nanti; sesuaikan juga label di kode.)

-- Pemetaan procedure -> divisi (many-to-many).
-- Dikunci ke standard.no (PK PERMANEN) supaya tahan rename nomor dokumen.
-- Procedure terlihat oleh divisi X  <=>  ada baris (standard_no, X) remark<>'D'.
--   - unik 1 divisi  = 1 baris
--   - dipakai 2-3 divisi = beberapa baris
-- Soft-delete: remark='D' (konsisten pola standard/quiz).
CREATE TABLE IF NOT EXISTS procedure_division (
	no          INT          NOT NULL AUTO_INCREMENT,
	standard_no INT          NOT NULL,
	division    INT          NOT NULL,
	remark      VARCHAR(50)  NOT NULL DEFAULT 'Active',
	PRIMARY KEY (no),
	KEY idx_pd_standard (standard_no),
	KEY idx_pd_division (division)
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

-- Contoh isi (dikelola nanti via dashboard "Kelola Divisi" / Fase 4):
--   INSERT INTO procedure_division (standard_no, division) VALUES
--     (12345, 6),          -- procedure no 12345 untuk Program Management
--     (12346, 7), (12346, 9);  -- procedure no 12346 dipakai MR & DP
