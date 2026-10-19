/* Kustomisasi keamanan doa-revamp untuk PDF.js viewer.
 * - Sembunyikan tombol download & print (kecuali allowDownload/allowPrint=1).
 * - Watermark identitas berulang (Nama | IP | waktu) di tiap halaman.
 * - Halangi klik-kanan & Ctrl+S / Ctrl+P (deterrent — screenshot TETAP tak
 *   bisa dicegah di web; watermark adalah kontrol akuntabilitasnya).
 *
 * Parameter via URL viewer.html:
 *   ?file=<url>&allowDownload=0&allowPrint=0&userid=<nama>&ip=<ip>&time=<ts>
 *
 * File eksternal (bukan inline) supaya patuh CSP viewer (script-src 'self').
 */
(function () {
	const params = new URLSearchParams(self.location.search);
	const allowDownload = params.get('allowDownload') === '1';
	const allowPrint = params.get('allowPrint') === '1';

	// Matikan print saat tak diizinkan:
	// - override window.print → no-op (tombol print PDF.js ujungnya panggil ini).
	// - tandai <html> dengan .doa-noprint → @media print (doa-secure.css)
	//   mengosongkan hasil cetak walau print dipaksa dari menu browser.
	if (!allowPrint) {
		try { document.documentElement.classList.add('doa-noprint'); } catch (e) {}
		try {
			window.print = function () {};
			window.addEventListener('beforeprint', function (e) { e.preventDefault(); });
		} catch (e) {}
	}

	// Identitas untuk watermark. Idealnya diisi server saat membuat URL viewer;
	// URL ini sekadar meneruskannya ke overlay.
	window.watermarkData = {
		user: decodeURIComponent(params.get('userid') || '-'),
		ip: params.get('ip') || '-',
		time: params.get('time') || ''
	};

	const hide = (id) => {
		const el = document.getElementById(id);
		if (el) el.style.display = 'none';
	};

	document.addEventListener('DOMContentLoaded', function () {
		if (!allowDownload) {
			hide('downloadButton');
			hide('secondaryDownload');
		}
		if (!allowPrint) {
			hide('printButton');
			hide('secondaryPrint');
		}
	});

	// Deterrent klik-kanan & shortcut simpan/print. Capture phase +
	// stopImmediatePropagation supaya handler Ctrl+P milik PDF.js tak kebagian.
	document.addEventListener('contextmenu', (e) => e.preventDefault());
	document.addEventListener(
		'keydown',
		function (e) {
			const k = (e.key || '').toLowerCase();
			if ((e.ctrlKey || e.metaKey) && (k === 's' || (!allowPrint && k === 'p'))) {
				e.preventDefault();
				e.stopImmediatePropagation();
			}
		},
		true
	);

	// Watermark identitas di tiap halaman yang selesai dirender.
	function waitForApp(cb) {
		const t = setInterval(function () {
			if (window.PDFViewerApplication && window.PDFViewerApplication.eventBus) {
				clearInterval(t);
				cb(window.PDFViewerApplication);
			}
		}, 200);
	}

	waitForApp(function (app) {
		// PDF.js menimpa window.print dengan print service-nya sendiri saat init.
		// Re-assert no-op DI SINI (sesudah app siap) supaya jalur print PDF.js mati.
		if (!allowPrint) {
			try { window.print = function () {}; } catch (e) {}
		}

		const wm = window.watermarkData;
		const text = 'CONFIDENTIAL | ' + wm.user + ' | ' + wm.ip + ' | ' + wm.time;
		app.eventBus.on('pagerendered', function (event) {
			const pageDiv = event.source && event.source.div;
			if (!pageDiv || pageDiv.querySelector('.multi-watermark')) return;
			const layer = document.createElement('div');
			layer.className = 'multi-watermark';
			const rows = 20,
				cols = 20;
			for (let r = 0; r < rows; r++) {
				for (let c = 0; c < cols; c++) {
					const span = document.createElement('span');
					span.innerText = text;
					span.style.top = r * 120 + 'px';
					span.style.left = c * 400 + 'px';
					layer.appendChild(span);
				}
			}
			pageDiv.appendChild(layer);
		});
	});
})();
