<script lang="ts">
	import { onMount } from 'svelte';
	import { mainTitle } from '$lib/store';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// URL viewer PDF.js + parameter keamanan (download/print dimatikan,
	// identitas watermark dari session). File diambil via proxy same-origin.
	const viewerSrc = $derived(
		`/pdfjs/web/viewer.html?file=${encodeURIComponent(data.fileUrl)}` +
			`&allowDownload=0&allowPrint=0` +
			`&userid=${encodeURIComponent(data.userid)}` +
			`&ip=${encodeURIComponent(data.ip)}` +
			`&time=${encodeURIComponent(data.time)}`
	);

	onMount(() => {
		$mainTitle = data.title;

		// Cegah cetak dari halaman induk (viewer ada di iframe). Deterrent —
		// screenshot tetap tak bisa dicegah web mana pun; watermark identitas
		// adalah kontrol akuntabilitas utamanya. Lihat docs/divisi_design.md §6.
		const origPrint = window.print;
		try {
			window.print = () => {};
		} catch {
			/* ignore */
		}
		const onKey = (e: KeyboardEvent) => {
			const k = (e.key || '').toLowerCase();
			if ((e.ctrlKey || e.metaKey) && (k === 'p' || k === 's')) {
				e.preventDefault();
				e.stopPropagation();
			}
		};
		window.addEventListener('keydown', onKey, true);

		return () => {
			try {
				window.print = origPrint;
			} catch {
				/* ignore */
			}
			window.removeEventListener('keydown', onKey, true);
		};
	});
</script>

<svelte:head>
	<!-- Print halaman ini (termasuk iframe viewer) keluar kosong. -->
	<style>
		@media print {
			body {
				display: none !important;
			}
		}
	</style>
</svelte:head>

<div class="fixed inset-0 flex flex-col bg-[#213C51]">
	<!-- Bar atas -->
	<div class="flex items-center gap-3 px-4 py-2 shrink-0">
		<p class="font-medium text-white! truncate">{data.title}</p>

	</div>

	<!-- Viewer -->
	<iframe title="PDF Viewer" src={viewerSrc} class="flex-1 w-full border-0 bg-white"></iframe>
</div>
