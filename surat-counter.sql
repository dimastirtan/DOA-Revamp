-- ============================================================================
-- Counter nomor seri Surat Pernyataan (doa-revamp)
--
-- Subject/nama file surat pernyataan: "Surat Pernyataan 482-<seri> <nama>",
-- dengan <seri> = nomor urut 4 digit (0311, 0312, ...). 482 = EST/Form 482.
--
-- Satu baris (id=1) menyimpan nomor terakhir. Endpoint -users/w menaikkannya
-- secara ATOMIC (UPDATE ... LAST_INSERT_ID(last_no+1)), aman dari balapan.
--
-- MySQL 5.1 / MyISAM.
-- Ganti nilai awal (310) jika ingin melanjutkan dari nomor tertentu:
--   next_serial = last_no + 1  (310 -> berikutnya 0311).
-- ============================================================================
CREATE TABLE IF NOT EXISTS surat_counter (
	id      INT NOT NULL PRIMARY KEY,
	last_no INT NOT NULL DEFAULT 0
) ENGINE=MyISAM DEFAULT CHARSET=utf8;

INSERT IGNORE INTO surat_counter (id, last_no) VALUES (1, 310);
