-- ============================================================================
-- Reset password semua user ber-NIK menjadi = NIK  (doa-revamp)
--
-- Data user hasil bulk-load password-nya salah. Set ulang: password = NIK.
-- Login memakai MD5, jadi yang disimpan = MD5(username). Setelah ini, fitur
-- "wajib ganti password saat login pertama" (hooks.server.ts) akan memaksa tiap
-- user mengganti password saat login (karena password === MD5(NIK) = default).
--
-- Akun NON-numerik (mis. 'admin') DIKECUALIKAN agar tetap bisa login.
-- MySQL 5.1 / MyISAM aman (MD5() & REGEXP didukung).
--
-- CEK dulu sebelum jalan (berapa yang akan berubah):
--   SELECT COUNT(*) FROM useraccounts WHERE username REGEXP '^[0-9]+$';
-- ============================================================================

UPDATE useraccounts
SET password = MD5(username)
WHERE username REGEXP '^[0-9]+$';
