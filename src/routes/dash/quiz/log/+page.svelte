<script lang="ts">
	import * as Table from '$lib/components/ui/table/index.js';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { mainTitle } from '$lib/store';
	import Calendar from '$lib/components/ui/calendar/calendar.svelte';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { today, getLocalTimeZone, type CalendarDate, startOfMonth, endOfMonth, startOfYear, endOfYear } from '@internationalized/date';

	// Halaman ini di-guard admin/controller di +page.server.ts (audit view penuh,
	// meniru peran Log Aktivitas). Karyawan lihat riwayat sendiri di /dash/quiz.

	// ── State ───────────────────────────────────────────────────────────────
	let logs = $state<any[]>([]);
	let loading = $state(true);
	let error = $state('');
	let search = $state('');
	let searchInput = $state('');
	let page = $state(1);
	let limit = $state(50);
	let total = $state(0);
	let totalPages = $state(0);
	let sortColumn = $state('no');
	let sortDirection = $state<'asc' | 'desc'>('desc');

	// Export state
	let showExportModal = $state(false);
	let exportLoading = $state(false);
	let exportMode = $state<'all' | 'range'>('all');
	let exportFrom = $state<CalendarDate | undefined>(undefined);
	let exportTo = $state<CalendarDate | undefined>(undefined);
	let openFromCal = $state(false);
	let openToCal = $state(false);

	let debounceTimer: ReturnType<typeof setTimeout>;

	// ── Helpers ───────────────────────────────────────────────────────────────
	const calToStr = (d: CalendarDate | undefined) =>
		d ? `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}` : '';

	const calToDisplay = (d: CalendarDate | undefined) =>
		d ? `${String(d.day).padStart(2, '0')}/${String(d.month).padStart(2, '0')}/${d.year}` : 'Pilih tanggal';

	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
	const fmtTanggal = (raw: string | null) => {
		if (!raw) return '-';
		const d = new Date(raw);
		if (isNaN(d.getTime())) return raw;
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${pad(d.getDate())} ${months[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
	};

	const setRange = (from: CalendarDate, to: CalendarDate) => {
		exportFrom = from;
		exportTo = to;
	};

	const shortcuts = () => {
		const now = today(getLocalTimeZone());
		return [
			{ label: 'Bulan ini', fn: () => setRange(startOfMonth(now), endOfMonth(now)) },
			{
				label: 'Bulan lalu',
				fn: () => {
					const prev = now.subtract({ months: 1 });
					setRange(startOfMonth(prev), endOfMonth(prev));
				}
			},
			{
				label: '3 bulan',
				fn: () => setRange(startOfMonth(now.subtract({ months: 2 })), endOfMonth(now))
			},
			{ label: 'Tahun ini', fn: () => setRange(startOfYear(now), endOfYear(now)) }
		];
	};

	const statusLabel = (s: string) => (s === 'pending' ? 'belum selesai' : s);

	// ── Fetch ───────────────────────────────────────────────────────────────
	const fetchLogs = async () => {
		loading = true;
		error = '';
		try {
			const params = new URLSearchParams({ page: String(page), limit: String(limit), search });
			const res = await fetch(`/-doa/quiz/log?${params}`);
			if (res.status === 401) return goto('/login');
			const json = await res.json();
			if (!res.ok || !json.success) {
				error = json.error || `HTTP ${res.status}`;
			} else {
				logs = json.data ?? [];
				total = json.pagination?.total ?? 0;
				totalPages = json.pagination?.totalPages ?? 0;
			}
		} catch (e: any) {
			error = e.message || 'Gagal terhubung ke server';
		} finally {
			loading = false;
		}
	};

	// ── Export ────────────────────────────────────────────────────────────────
	const doExport = async () => {
		if (exportMode === 'range' && (!exportFrom || !exportTo)) {
			alert('Mohon pilih tanggal mulai dan tanggal akhir.');
			return;
		}

		exportLoading = true;
		try {
			const XLSX = await import('https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs' as any);

			const params = new URLSearchParams({ export: 'xlsx' });
			if (exportMode === 'range' && exportFrom && exportTo) {
				params.set('from', calToStr(exportFrom));
				params.set('to', calToStr(exportTo));
			}

			const res = await fetch(`/-doa/quiz/log?${params}`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const json = await res.json();
			const rows: any[] = json.data ?? [];

			if (rows.length === 0) {
				alert('Tidak ada data pada rentang waktu yang dipilih.');
				exportLoading = false;
				return;
			}

			const wsData: any[][] = [[
				'No', 'Mulai', 'Selesai', 'Nama', 'NIK', 'Nomor Dokumen', 'Revisi', 'Judul Dokumen', 'Skor', 'Status', 'Poin'
			]];
			rows.forEach((r, i) => {
				wsData.push([
					i + 1,
					fmtTanggal(r.startedAt),
					r.finishedAt ? fmtTanggal(r.finishedAt) : '-',
					r.nama ?? '-',
					r.username ?? '-',
					r.nmdoc ?? '-',
					r.revision ?? '-',
					r.title ?? '-',
					r.status === 'pending' ? '-' : `${r.score}/5`,
					statusLabel(r.status),
					r.status === 'pending' ? 0 : r.points
				]);
			});

			const wb = XLSX.utils.book_new();
			const ws = XLSX.utils.aoa_to_sheet(wsData);
			ws['!cols'] = [{ wch: 5 }, { wch: 22 }, { wch: 22 }, { wch: 28 }, { wch: 12 }, { wch: 20 }, { wch: 8 }, { wch: 55 }, { wch: 7 }, { wch: 13 }, { wch: 6 }];
			XLSX.utils.book_append_sheet(wb, ws, 'Log Quiz');

			const dateStr = new Date().toISOString().slice(0, 10);
			const suffix = exportMode === 'range' ? `_${calToStr(exportFrom)}_sd_${calToStr(exportTo)}` : '_semua';
			XLSX.writeFile(wb, `log-quiz${suffix}_export-${dateStr}.xlsx`);

			showExportModal = false;
		} catch (e: any) {
			alert('Gagal export: ' + e.message);
		} finally {
			exportLoading = false;
		}
	};

	// ── Search debounce ─────────────────────────────────────────────────────
	const onSearchInput = (e: Event) => {
		searchInput = (e.target as HTMLInputElement).value;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			search = searchInput;
			page = 1;
			fetchLogs();
		}, 400);
	};

	const goPage = (p: number) => {
		if (p < 1 || p > totalPages || p === page) return;
		page = p;
		fetchLogs();
	};

	const handleSort = (col: string) => {
		if (sortColumn === col) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortColumn = col;
			sortDirection = 'desc';
		}
	};

	const NUMERIC = new Set(['no', 'score', 'points']);
	const DATE = new Set(['startedAt', 'finishedAt']);
	let sortedLogs = $derived(
		[...logs].sort((a, b) => {
			const dir = sortDirection === 'asc' ? 1 : -1;
			if (NUMERIC.has(sortColumn)) return (Number(a[sortColumn] ?? 0) - Number(b[sortColumn] ?? 0)) * dir;
			if (DATE.has(sortColumn)) {
				const at = a[sortColumn] ? new Date(a[sortColumn]).getTime() : 0;
				const bt = b[sortColumn] ? new Date(b[sortColumn]).getTime() : 0;
				return (at - bt) * dir;
			}
			const aVal = a[sortColumn] ? String(a[sortColumn]).toLowerCase() : '';
			const bVal = b[sortColumn] ? String(b[sortColumn]).toLowerCase() : '';
			if (aVal < bVal) return -1 * dir;
			if (aVal > bVal) return 1 * dir;
			return 0;
		})
	);

	const columns = [
		{ col: 'startedAt', label: 'Mulai', cls: 'pl-4! w-1! whitespace-nowrap' },
		{ col: 'finishedAt', label: 'Selesai', cls: 'w-1! whitespace-nowrap' },
		{ col: 'nama', label: 'Nama', cls: 'w-1! whitespace-nowrap' },
		{ col: 'username', label: 'NIK', cls: 'w-1!' },
		{ col: 'nmdoc', label: 'Dokumen', cls: 'w-1! whitespace-nowrap' },
		{ col: 'revision', label: 'Rev', cls: 'w-1!' },
		{ col: 'title', label: 'Judul', cls: '' },
		{ col: 'score', label: 'Skor', cls: 'w-1!' },
		{ col: 'status', label: 'Status', cls: 'w-1!' },
		{ col: 'points', label: 'Poin', cls: 'w-1!' }
	];

	let pageWindow = $derived.by(() => {
		const pages: number[] = [];
		const start = Math.max(1, page - 2);
		const end = Math.min(totalPages, page + 2);
		for (let i = start; i <= end; i++) pages.push(i);
		return pages;
	});

	onMount(() => {
		$mainTitle = 'Log Quiz';
		const now = today(getLocalTimeZone());
		exportFrom = startOfMonth(now);
		exportTo = endOfMonth(now);
		fetchLogs();
	});
</script>

<!-- Background -->
<img class="fixed bottom-0 left-0 -z-50 h-1/2 invert" src="/grad.svg" alt="" />
<img class="fixed top-0 right-0 -z-50 h-1/2 -rotate-180 invert" src="/grad.svg" alt="" />

<!-- ── Export Modal ───────────────────────────────────────────────────────── -->
{#if showExportModal}
	<div
		class="fixed inset-0 z-[99999] flex items-center justify-center"
		role="dialog"
		aria-modal="true"
		onclick={(e) => { if (e.target === e.currentTarget) showExportModal = false; }}
	>
		<div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

		<div class="relative bg-white shadow-xl w-full max-w-sm mx-4 overflow-visible">
			<div class="bg-[#213C51] p-4 px-6">
				<h3 class="text-lg font-semibold text-white">Export Log Quiz ke XLSX</h3>
			</div>

			<div class="p-6 flex flex-col gap-5">
				<div class="flex flex-col gap-2">
					<p class="text-sm font-medium">Pilih Data</p>
					<div class="flex gap-2">
						<button
							type="button"
							class="flex-1 py-2.5 text-sm border transition-colors {exportMode === 'all'
								? 'bg-[#213C51] text-white border-[#213C51]'
								: 'bg-white border-black/20 hover:border-black/40'}"
							onclick={() => (exportMode = 'all')}
						>Semua Data</button>
						<button
							type="button"
							class="flex-1 py-2.5 text-sm border transition-colors {exportMode === 'range'
								? 'bg-[#213C51] text-white border-[#213C51]'
								: 'bg-white border-black/20 hover:border-black/40'}"
							onclick={() => (exportMode = 'range')}
						>Rentang Waktu</button>
					</div>
				</div>

				{#if exportMode === 'range'}
					<div class="flex flex-col gap-3">
						<div class="flex gap-1 flex-wrap">
							{#each shortcuts() as s (s.label)}
								<button
									type="button"
									class="text-xs px-2.5 py-1.5 border border-black/20 bg-white hover:bg-black/5 transition-colors focus:ring-2 focus:ring-blue-500"
									onclick={s.fn}
								>{s.label}</button>
							{/each}
						</div>

						<div class="flex flex-col gap-1">
							<p class="text-sm font-medium">Dari Tanggal</p>
							<Popover.Root bind:open={openFromCal}>
								<Popover.Trigger>
									{#snippet child({ props })}
										<button type="button" {...props} class="border border-[#000] w-full flex items-center px-3 py-3 bg-white text-sm text-left">
											<img src="/date.svg?f" class="w-4 mr-3 opacity-60" alt="" />
											{calToDisplay(exportFrom)}
										</button>
									{/snippet}
								</Popover.Trigger>
								<Popover.Content class="rounded-none! shadow-none! bg-white! border! border-[#000]! p-2! z-[999999]! w-auto!">
									<Calendar type="single" bind:value={exportFrom} captionLayout="dropdown" locale="id" onValueChange={() => (openFromCal = false)} />
								</Popover.Content>
							</Popover.Root>
						</div>

						<div class="flex flex-col gap-1">
							<p class="text-sm font-medium">Sampai Tanggal</p>
							<Popover.Root bind:open={openToCal}>
								<Popover.Trigger>
									{#snippet child({ props })}
										<button type="button" {...props} class="border border-[#000] w-full flex items-center px-3 py-3 bg-white text-sm text-left">
											<img src="/date valid.svg" class="w-4 mr-3 opacity-60" alt="" />
											{calToDisplay(exportTo)}
										</button>
									{/snippet}
								</Popover.Trigger>
								<Popover.Content class="rounded-none! shadow-none! bg-white! border! border-[#000]! p-2! z-[999999]! w-auto!">
									<Calendar type="single" bind:value={exportTo} captionLayout="dropdown" locale="id" onValueChange={() => (openToCal = false)} />
								</Popover.Content>
							</Popover.Root>
						</div>
					</div>
				{/if}
			</div>

			<div class="flex p-4 pt-0 gap-3">
				<button
					type="button"
					class="flex-1 px-4 py-3 text-sm font-medium bg-[#677787] text-white hover:bg-[#677787]/90 transition-colors"
					onclick={() => (showExportModal = false)}
				>Batal</button>
				<button
					type="button"
					class="flex-1 px-4 py-3 text-sm font-medium bg-[#1a6b3c] text-white hover:bg-[#1a6b3c]/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
					onclick={doExport}
					disabled={exportLoading}
				>
					{#if exportLoading}
						<img src="/spinner.svg?a" class="h-4! w-4!" alt="" />
						<span>Mengekspor...</span>
					{:else}
						<span>Download XLSX</span>
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- ── Main layout ────────────────────────────────────────────────────────── -->
<div class="fixed inset-0 flex flex-col pt-6 pb-4 px-6 gap-3">

	<!-- Header -->
	<div class="w-full flex items-center justify-between gap-2 flex-wrap">
		<div class="flex gap-2 items-center">
			<a href="/dash" class="flex flex-row bg-[#677787] p-2 px-3 gap-2 group">
				<img src="/minimize-white.svg?a" class="w-3 rotate-180 group-hover:rotate-0 transition-all duration-500" alt="" />
				<p class="font-medium text-white!">Kembali</p>
			</a>
			<div class="flex flex-row bg-[#213C51] p-2 px-3">
				<p class="font-medium text-white!">Log Quiz</p>
			</div>
			<a href="/dash/quiz/soal" class="flex flex-row bg-[#fff] p-2 px-3 hover:bg-white/80 transition-colors">
				<p class="font-medium">Kelola Soal</p>
			</a>
		</div>

		<div class="flex gap-2 items-center">
			<button
				type="button"
				class="flex flex-row bg-[#1a6b3c] items-center gap-2 px-3 py-2"
				onclick={() => (showExportModal = true)}
			>
				<img src="/download.svg" class="w-4 invert" alt="" />
				<p class="font-medium text-white! text-sm py-1">Export XLSX</p>
			</button>

			<div class="flex flex-row bg-[#677787] items-center">
				<div class="bg-secondary px-3 py-2">
					<p class="text-white! min-w-6 min-h-6 flex items-center justify-center font-mono text-sm">
						{#if loading}
							<img src="/spinner.svg?a" class="h-3.5! w-3.5!" alt="" />
						{:else}
							{total.toLocaleString('id')}
						{/if}
					</p>
				</div>
				<p class="font-medium text-white! px-3">Total</p>
			</div>

			<select
				class="bg-[#677787] text-white! text-sm px-3 py-3 border-0 outline-none cursor-pointer"
				bind:value={limit}
				onchange={() => { page = 1; fetchLogs(); }}
			>
				<option value={25}>25 / Page</option>
				<option value={50}>50 / Page</option>
				<option value={100}>100 / Page</option>
			</select>

			<div class="relative w-72 group h-full">
				<img src="/search-white.svg" class="absolute top-1/2 left-3 h-4! w-4! -translate-y-1/2 group-hover:rotate-90 transition-all duration-500" alt="" />
				<input
					type="text"
					placeholder="Cari nama, NIK, dokumen..."
					class="bg-[#677787] w-full border-0 outline-none placeholder-white/50 pl-11 pr-4 py-3 text-sm text-white"
					value={searchInput}
					oninput={onSearchInput}
				/>
			</div>
		</div>
	</div>

	{#if error}
		<div class="bg-red-50 border border-red-200 p-3 flex gap-2 items-center">
			<p class="font-medium text-red-700 text-sm">Error:</p>
			<p class="text-sm text-red-600 font-mono">{error}</p>
		</div>
	{/if}

	<!-- Tabel -->
	<div class="flex-1 min-h-0 overflow-hidden bg-white/50 relative">
		{#if loading}
			<div class="absolute inset-0 bg-white/60 z-30 flex items-center justify-center">
				<img src="/spinner_color.svg?a" class="h-6! w-6!" alt="" />
			</div>
		{/if}

		<div class="h-full overflow-y-auto">
			<Table.Root>
				<Table.Header>
					<Table.Row class="bg-[#213C51]! sticky! top-0! z-20!">
						{#each columns as col (col.col)}
							<Table.Head class="py-4! cursor-pointer {col.cls}" onclick={() => handleSort(col.col)}>
								<div class="flex items-center gap-2">
									<p class="text-white!">{col.label}</p>
									{#if sortColumn === col.col}
										<img src="/down-white.svg" class="w-3 transition-all {sortDirection === 'asc' ? '' : 'rotate-180'}" alt="" />
									{/if}
								</div>
							</Table.Head>
						{/each}
					</Table.Row>
				</Table.Header>

				<Table.Body>
					{#if !loading && error}
						<Table.Row>
							<Table.Cell colspan={columns.length} class="text-center py-20 opacity-40">Gagal memuat data.</Table.Cell>
						</Table.Row>
					{:else if !loading && sortedLogs.length === 0}
						<Table.Row>
							<Table.Cell colspan={columns.length} class="text-center py-20 opacity-40">
								{total === 0 ? 'Belum ada log quiz.' : 'Tidak ada hasil pencarian.'}
							</Table.Cell>
						</Table.Row>
					{:else}
						{#each sortedLogs as log, i (String(log.no) + '-' + i)}
							<Table.Row class="border-0! hover:bg-white! transition-all!">
								<Table.Cell class="font-mono text-xs! pl-4! w-1! whitespace-nowrap select-text!">{fmtTanggal(log.startedAt)}</Table.Cell>
								<Table.Cell class="font-mono text-xs! w-1! whitespace-nowrap select-text!">{log.finishedAt ? fmtTanggal(log.finishedAt) : '-'}</Table.Cell>
								<Table.Cell class="w-1! whitespace-nowrap select-text!">{log.nama || '-'}</Table.Cell>
								<Table.Cell class="w-1! select-text!">{log.username || '-'}</Table.Cell>
								<Table.Cell class="w-1! font-medium! select-text!">{log.nmdoc || '-'}</Table.Cell>
								<Table.Cell class="w-1! select-text!">{log.revision || '-'}</Table.Cell>
								<Table.Cell class="max-w-[22vw] truncate select-text!" title={log.title || '-'}>{log.title || '-'}</Table.Cell>
								<Table.Cell class="w-1! whitespace-nowrap select-text!">{log.status === 'pending' ? '-' : `${log.score}/5`}</Table.Cell>
								<Table.Cell class="w-1!">
									<span class="px-2 py-0.5 text-white! text-xs whitespace-nowrap {log.status === 'lulus' ? 'bg-[#1a6b3c]' : log.status === 'gagal' ? 'bg-[#9c2b2b]' : 'bg-[#677787]'}">
										{statusLabel(log.status)}
									</span>
								</Table.Cell>
								<Table.Cell class="w-1! select-text!">{log.status === 'pending' ? '-' : `+${log.points}`}</Table.Cell>
							</Table.Row>
						{/each}
					{/if}
				</Table.Body>
			</Table.Root>
		</div>
	</div>

	<!-- Pagination -->
	{#if totalPages > 1}
		<div class="flex items-center justify-between gap-2 px-1">
			<p class="text-xs opacity-50 whitespace-nowrap border border-secondary/20 px-2 py-1 bg-white/75">
				Menampilkan {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} dari {total.toLocaleString('id')} log
			</p>
			<div class="flex gap-1 items-center">
				<button class="px-2 py-1 text-xs bg-white/75 border border-secondary/20 disabled:opacity-30 hover:bg-secondary hover:text-white transition-colors" disabled={page === 1} onclick={() => goPage(1)}>«</button>
				<button class="px-2 py-1 text-xs bg-white/75 border border-secondary/20 disabled:opacity-30 hover:bg-secondary hover:text-white transition-colors" disabled={page === 1} onclick={() => goPage(page - 1)}>‹</button>
				{#each pageWindow as p (p)}
					<button
						class="px-3 py-1 text-xs border transition-colors {p === page
							? 'bg-[#213C51] text-white border-[#213C51]'
							: 'bg-white/75 border-secondary/20 hover:bg-secondary hover:text-white'}"
						onclick={() => goPage(p)}
					>{p}</button>
				{/each}
				<button class="px-2 py-1 text-xs bg-white/75 border border-secondary/20 disabled:opacity-30 hover:bg-secondary hover:text-white transition-colors" disabled={page === totalPages} onclick={() => goPage(page + 1)}>›</button>
				<button class="px-2 py-1 text-xs bg-white/75 border border-secondary/20 disabled:opacity-30 hover:bg-secondary hover:text-white transition-colors" disabled={page === totalPages} onclick={() => goPage(totalPages)}>»</button>
			</div>
		</div>
	{/if}

</div>
