# Rancangan: PDF tidak bisa di-download (+ deterrent screen-capture)

Status: **RANCANGAN — belum dikerjakan.** Butuh keputusan (lihat akhir dokumen).

## 0. Kejujuran teknis dulu (penting)

Supaya ekspektasi tidak salah:

- **Download bisa dipersulit habis-habisan**, tapi tidak 100% mustahil selama
  dokumen boleh dilihat di browser (byte-nya toh sampai ke browser untuk
  digambar). Yang realistis: **hilangkan cara download yang gampang** (tombol
  download, klik-kanan, Ctrl+S, URL asli) dan sembunyikan sumbernya.
- **Screenshot / rekam layar TIDAK bisa dicegah oleh web app.** Tidak ada API
  browser yang mengizinkan situs memblokir screenshot/screen-record. Yang bisa
  memblokir hanya aplikasi native dengan proteksi OS (mis. Windows
  `SetWindowDisplayAffinity`, DRM Widevine L1) — itu berarti aplikasi desktop,
  di luar lingkup sekarang.
- **Jadi kontrol yang sebenarnya = watermark + akuntabilitas**, bukan pencegahan
  total. Kalau setiap halaman ber-watermark **nama + NIK + waktu** orang yang
  membuka, maka screenshot/foto pun tetap **tertandai dan bisa dilacak** ke
  pelakunya. Inilah jawaban document-control yang benar untuk "kalau bocor
  kenapa". (Sistem lama `watermark.php` sudah punya konsep ini, tapi statis &
  kurang aman — §3.)

Ringkas: kita bisa bikin **anti-download yang kuat** + **deterrent screenshot
yang serius** (bukan pencegahan mutlak).

## 1. Kondisi sekarang

`window.open('http://portalditek.../watermark.php?...')` membuka PDF di **viewer
bawaan browser** → ada tombol download, print, Ctrl+S, dan **URL asli kelihatan**
(bisa diminta ulang / dibagikan). Identitas watermark diambil dari `kuid` di URL
→ bisa dipalsukan. Praktis: **fully downloadable**.

## 2. Arsitektur yang diusulkan

### 2a. Viewer sendiri di dalam aplikasi (bukan tab PDF bawaan)
- Route baru, mis. `/dash/baca?ndm=...`, yang me-render PDF ke **`<canvas>`**
  memakai **PDF.js** (`pdfjs-dist`). Tidak ada toolbar bawaan browser → tidak ada
  tombol download/print.
- Matikan afordansi: klik-kanan (`contextmenu`), `Ctrl+S`, `Ctrl+P`, seleksi
  teks; `@media print { * { display:none } }` untuk mematahkan print.

### 2b. Proxy same-origin (sembunyikan sumber + identitas dari session)
- Endpoint SvelteKit, mis. `GET /-doa/pdf?ndm=...`, yang **di server** mengambil
  byte PDF (ber-watermark) lalu meneruskannya. Efek:
  - Karyawan **tidak pernah melihat URL asli** portalditek → tidak bisa
    dibagikan / diminta ulang mentah.
  - **Identitas dari session Lucia** (bukan `kuid` di URL) → watermark pasti
    atas nama yang benar; menutup celah pemalsuan `kuid` yang ada sekarang.
  - `Content-Disposition: inline` + header anti-cache.

### 2c. Overlay watermark dinamis per-user (deterrent screenshot)
- Di atas canvas, aplikasi menaruh **lapisan watermark berulang** (tiles
  diagonal) berisi **Nama · NIK · tanggal-jam**, semi-transparan, `pointer-events:
  none`. Karena digambar oleh aplikasi kita di sisi klien, **ikut ke setiap
  screenshot/foto layar** → bukti siapa yang membuka.
- Bisa ditambah: watermark ikut ter-embed juga di PDF (server-side, §3) supaya
  kalau byte PDF sempat terambil, tetap bertanda.

### 2d. (Opsional) blur saat tab tak fokus
- Saat `visibilitychange`/blur, tampilan di-blur — deterrent kecil untuk tool
  screenshot yang butuh window aktif. Bukan pengaman nyata, hanya gangguan.

## 3. Nasib `watermark.php` (boleh diganti, JANGAN dihapus)

Sistem lama membuat watermark via TCPDF di server PHP; kodenya tua & rawan
(query pakai variabel request langsung). Dua opsi:

- **Opsi A — Bungkus (reuse), minim kerja:** proxy (§2b) memanggil `watermark.php`
  dari server kita, teruskan hasilnya. Watermark tetap dari sistem lama, tapi URL
  disembunyikan & delivery kita kontrol. Cepat, tapi masih bergantung pada PHP
  lama.
- **Opsi B — Watermark baru di aplikasi (REKOMENDASI):** stamp watermark di
  Node/SvelteKit pakai `pdf-lib` (atau Ghostscript) — nama/NIK/waktu dari session.
  Lebih aman, lepas dari PHP lama, identitas tak bisa dipalsukan.

**Tetap simpan `watermark.php`** (jangan dihapus) sebagai jalur balik. Cara:
biarkan file-nya di repo/server, dan **flag konfigurasi** (mis.
`PDF_MODE=viewer|legacy`) yang memilih pakai viewer baru atau `window.open`
lama. Jadi kalau berubah pikiran, tinggal balik flag — nol kehilangan.

## 4. Level deterrence

| | L1 (viewer canvas) | L2 (server rasterize ke gambar) |
| :--- | :--- | :--- |
| Cara | byte PDF sampai ke browser, digambar PDF.js | server ubah tiap halaman jadi gambar; browser hanya terima gambar |
| Tombol download / Ctrl+S / klik-kanan | ✅ dicegah | ✅ dicegah |
| URL asli PDF | ✅ disembunyikan | ✅ disembunyikan |
| Ambil byte PDF dari tab Network | ⚠️ masih bisa (byte PDF ada di klien) | ✅ dicegah (hanya gambar) |
| Screenshot / foto layar / rekam | ❌ tidak bisa dicegah (hanya di-watermark) | ❌ tidak bisa dicegah (hanya di-watermark) |
| Beban server | ringan | berat (rasterize A0/A3, perlu cache) |

**Rekomendasi:** **L1 + watermark dinamis (§2c) + Opsi B (§3)**. Ini menutup semua
jalur download gampang dan membuat setiap tangkapan layar tertanda identitas —
paket paling seimbang. L2 hanya kalau benar-benar ingin byte PDF tak pernah
menyentuh klien (mahal, dan screenshot tetap tak tercegah).

## 5. Dampak ke alur lain
- **Quiz**: pintu masuk quiz saat ini modal di dashboard (`bukaDoa`). Kalau PDF
  pindah ke viewer in-app, tawaran quiz bisa ditaruh **di dalam viewer**
  (lebih rapi) atau tetap di dashboard — tidak wajib berubah.
- **Departemen / lainnya**: tidak terpengaruh.

## 6. Perkiraan pekerjaan
- Dependency baru: `pdfjs-dist` (viewer), dan `pdf-lib`/Ghostscript (Opsi B).
- Endpoint proxy `/-doa/pdf`, route/komponen viewer `/dash/baca`, overlay
  watermark, flag `PDF_MODE`, ubah `bukaDoa()` mengarah ke viewer.
- Sedang–besar; dan **ekspektasi screenshot harus diluruskan** ke manager
  (tidak bisa 100%, hanya di-watermark).

## 7. Keputusan yang dibutuhkan sebelum implementasi
1. Terima kenyataan **screenshot tidak bisa dicegah** (hanya di-watermark), atau
   memang butuh sampai anti-screenshot → berarti harus **aplikasi desktop** (proyek
   terpisah besar)?
2. Watermark: **Opsi A** (bungkus watermark.php) atau **Opsi B** (watermark baru
   di aplikasi, lebih aman)?
3. **L1** cukup, atau perlu **L2** (server rasterize)?
4. Cakupan: procedure saja, atau semua dokumen (Form dll. yang sekarang buka PDF
   mentah tanpa watermark)?
