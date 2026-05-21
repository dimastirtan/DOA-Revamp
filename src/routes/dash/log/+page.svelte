<script lang="ts">
	import * as Table from '$lib/components/ui/table/index.js';
	import { Input } from '$lib/components/ui/input';
	import { onMount } from 'svelte';
	import { mainTitle } from '$lib/store';

	// ── State ────────────────────────────────────────────────────────────────────
	let logs        = $state<any[]>([]);
	let loading     = $state(true);
	let error       = $state('');
	let search      = $state('');
	let searchInput = $state(''); // input sementara sebelum debounce
	let page        = $state(1);
	let limit       = $state(50);
	let total       = $state(0);
	let totalPages  = $state(0);
	let sortColumn    = $state('no');
	let sortDirection = $state<'asc' | 'desc'>('desc');

	let debounceTimer: ReturnType<typeof setTimeout>;

	// ── Fetch ────────────────────────────────────────────────────────────────────
	const fetchLogs = async () => {
		loading = true;
		error   = '';
		try {
			const params = new URLSearchParams({
				page:   String(page),
				limit:  String(limit),
				search: search,
			});
			const res  = await fetch(`/-doa/log?${params}`);
			const json = await res.json();

			if (!res.ok) {
				error = json.error || `HTTP ${res.status}`;
			} else {
				logs       = json.data ?? [];
				total      = json.pagination?.total      ?? 0;
				totalPages = json.pagination?.totalPages ?? 0;
			}
		} catch (e: any) {
			error = e.message || 'Gagal terhubung ke server';
		} finally {
			loading = false;
		}
	};

	// Search dengan debounce 400ms — tidak fetch tiap ketikan
	const onSearchInput = (e: Event) => {
		searchInput = (e.target as HTMLInputElement).value;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			search = searchInput;
			page   = 1; // reset ke halaman 1 saat search berubah
			fetchLogs();
		}, 400);
	};

	const goPage = (p: number) => {
		if (p < 1 || p > totalPages || p === page) return;
		page = p;
		fetchLogs();
	};

	// Sort hanya di client (data sudah per halaman dari server)
	const handleSort = (col: string) => {
		if (sortColumn === col) {
			sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
		} else {
			sortColumn    = col;
			sortDirection = 'desc';
		}
	};

	let sortedLogs = $derived(
		[...logs].sort((a, b) => {
			if (sortColumn === 'no') return sortDirection === 'asc' ? a.no - b.no : b.no - a.no;
			const aVal = a[sortColumn] ? String(a[sortColumn]).toLowerCase() : '';
			const bVal = b[sortColumn] ? String(b[sortColumn]).toLowerCase() : '';
			if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
			if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
			return 0;
		})
	);

	// Halaman yang ditampilkan di paginator (window ±2 dari halaman aktif)
	let pageWindow = $derived.by(() => {
		const pages: number[] = [];
		const start = Math.max(1, page - 2);
		const end   = Math.min(totalPages, page + 2);
		for (let i = start; i <= end; i++) pages.push(i);
		return pages;
	});

	// ── Helpers ──────────────────────────────────────────────────────────────────
	const formatTimestamp = (raw: string | null) => {
		if (!raw) return '-';
		const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})\s(\d{2}:\d{2}:\d{2})$/);
		if (m) {
			const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
			return `${m[3]} ${months[+m[2] - 1]} ${m[1]}, ${m[4]}`;
		}
		return raw;
	};



	const badge = (r: string) => {
		const map: Record<string, { bg: string; dot: string; text: string }> = {
			BUKA:   { bg: 'bg-blue-500/10',   dot: 'bg-blue-600',   text: 'text-blue-700' },
			TAMBAH: { bg: 'bg-green-500/10',  dot: 'bg-green-600',  text: 'text-green-700' },
			EDIT:   { bg: 'bg-orange-500/10', dot: 'bg-orange-600', text: 'text-orange-700' },
			HAPUS:  { bg: 'bg-red-500/10',    dot: 'bg-red-600',    text: 'text-red-700' },
		};
		return map[r] ?? { bg: 'bg-gray-500/10', dot: 'bg-gray-600', text: 'text-gray-700' };
	};

	onMount(() => {
		$mainTitle = 'Log Aktivitas';
		fetchLogs();
	});
</script>

<img class="fixed bottom-0 left-0 -z-50 h-1/2 invert" src="/grad.svg" alt="" />
<img class="fixed top-0 right-0 -z-50 h-1/2 -rotate-180 invert" src="/grad.svg" alt="" />

<div class="flex flex-col h-dvh pt-6 pb-4 px-6 gap-3">

	<!-- ── Header ─────────────────────────────────────────────────────────────── -->
	<div class="w-full flex items-center justify-between gap-2 flex-wrap">
		<div class="flex gap-2 items-center">
			<a href="/dash" class="flex flex-row bg-[#677787] p-2 px-3 gap-2 group">
				<img src="/minimize-white.svg?a" class="w-3 rotate-180 group-hover:rotate-0 transition-all duration-500" alt="" />
				<p class="font-medium text-white!">Kembali</p>
			</a>
			<div class="flex flex-row bg-[#213C51] p-2 px-3">
				<p class="font-medium text-white!">Log Aktivitas</p>
			</div>
		</div>

		<div class="flex gap-2 items-center">
			<!-- Total counter -->
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

			<!-- Limit selector -->
			<select
				class="bg-[#677787] text-white! text-sm px-3 py-3 border-0 outline-none cursor-pointer"
				bind:value={limit}
				onchange={() => { page = 1; fetchLogs(); }}
			>
				<option value={25}>25 / Page</option>
				<option value={50}>50 / Page</option>
				<option value={100}>100 / Page</option>
			</select>

			<!-- Search -->
			<div class="relative w-72 group h-full">
				<img src="/search-white.svg" class="absolute top-1/2 left-3 h-4! w-4! -translate-y-1/2 group-hover:rotate-90 transition-all duration-500" alt="" />
				<input
					type="text"
					placeholder="Cari nama, NIK, nomor..."
					class="bg-[#677787] w-full border-0 outline-none placeholder-white/50 pl-11 pr-4 py-3 text-sm text-white"
					value={searchInput}
					oninput={onSearchInput}
				/>
			</div>
		</div>
	</div>

	<!-- ── Error ──────────────────────────────────────────────────────────────── -->
	{#if error}
		<div class="bg-red-50 border border-red-200 p-3 flex gap-2 items-center">
			<p class="font-medium text-red-700 text-sm">Error:</p>
			<p class="text-sm text-red-600 font-mono">{error}</p>
		</div>
	{/if}

	<!-- ── Tabel ──────────────────────────────────────────────────────────────── -->
	<div class="flex-1 overflow-hidden bg-white/50 relative">
		<!-- Loading overlay — tidak sembunyikan tabel lama saat ganti halaman -->
		{#if loading}
			<div class="absolute inset-0 bg-white/60 z-30 flex items-center justify-center">
				<img src="/spinner_color.svg?a" class="h-6! w-6!" alt="" />
			</div>
		{/if}

		<div class="log-scroll">
			<Table.Root>
				<Table.Header>
					<Table.Row class="bg-[#213C51]! sticky! top-0! z-20!">
						{#each [
							{ col: 'tanggal',  label: 'Timestamp',  cls: 'pl-4! w-1! whitespace-nowrap' },
							{ col: 'nama',     label: 'Nama',       cls: 'w-1! whitespace-nowrap' },
							{ col: 'username', label: 'NIK',        cls: 'w-1!' },
							{ col: 'nmdoc',    label: 'Nomor File', cls: 'w-1! whitespace-nowrap' },
							{ col: 'revision', label: 'Rev',        cls: 'w-1!' },
							{ col: 'title',    label: 'Judul Dokumen',  cls: '' },
						] as col (col.col)}
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
							<Table.Cell colspan={7} class="text-center py-20 opacity-40">Gagal memuat data.</Table.Cell>
						</Table.Row>
					{:else if !loading && sortedLogs.length === 0}
						<Table.Row>
							<Table.Cell colspan={7} class="text-center py-20 opacity-40">
								{total === 0 ? 'Belum ada log.' : 'Tidak ada hasil pencarian.'}
							</Table.Cell>
						</Table.Row>
					{:else}
						{#each sortedLogs as log, i (String(log.no) + '-' + i)}
							{@const b = badge(log.remark)}
							<Table.Row class="border-0! hover:bg-white! hover:scale-[100.1%]! transition-all!">
								<Table.Cell class="font-mono text-xs! pl-4! w-1! whitespace-nowrap select-text!">
									{formatTimestamp(log.tanggal)}
								</Table.Cell>
								<Table.Cell class="w-1! whitespace-nowrap select-text!">{log.nama || '-'}</Table.Cell>
								<Table.Cell class="w-1! select-text!">{log.username || '-'}</Table.Cell>
								<Table.Cell class="w-1! font-medium! select-text!" title={log.title || ''}>{log.nmdoc || '-'}</Table.Cell>
								<Table.Cell class="w-1! select-text!">{log.revision || '-'}</Table.Cell>
								<Table.Cell class="max-w-[28vw] truncate select-text!" title={log.title || '-'}>{log.title || '-'}</Table.Cell>
							</Table.Row>
						{/each}
					{/if}
				</Table.Body>
			</Table.Root>
		</div>
	</div>

	<!-- ── Pagination ─────────────────────────────────────────────────────────── -->
	{#if totalPages > 1}
		<div class="flex items-center justify-between gap-2 px-1">
			<!-- Info -->
			<p class="text-xs opacity-50 whitespace-nowrap border border-secondary/20 px-2 py-1 bg-white/75">
				Menampilkan {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} dari {total.toLocaleString('id')} log
			</p>

			<!-- Navigasi -->
			<div class="flex gap-1 items-center">
				<!-- First -->
				<button
					class="px-2 py-1 text-xs bg-white/75 border border-secondary/20 disabled:opacity-30 hover:bg-secondary hover:text-white transition-colors"
					disabled={page === 1}
					onclick={() => goPage(1)}
				>«</button>

				<!-- Prev -->
				<button
					class="px-2 py-1 text-xs bg-white/75 border border-secondary/20 disabled:opacity-30 hover:bg-secondary hover:text-white transition-colors"
					disabled={page === 1}
					onclick={() => goPage(page - 1)}
				>‹</button>

				<!-- Window halaman ±2 -->
				{#each pageWindow as p (p)}
					<button
						class="px-3 py-1 text-xs border transition-colors {p === page
							? 'bg-[#213C51] text-white border-[#213C51]'
							: 'bg-white/75 border-secondary/20 hover:bg-secondary hover:text-white'}"
						onclick={() => goPage(p)}
					>{p}</button>
				{/each}

				<!-- Next -->
				<button
					class="px-2 py-1 text-xs bg-white/75 border border-secondary/20 disabled:opacity-30 hover:bg-secondary hover:text-white transition-colors"
					disabled={page === totalPages}
					onclick={() => goPage(page + 1)}
				>›</button>

				<!-- Last -->
				<button
					class="px-2 py-1 text-xs bg-white/75 border border-secondary/20 disabled:opacity-30 hover:bg-secondary hover:text-white transition-colors"
					disabled={page === totalPages}
					onclick={() => goPage(totalPages)}
				>»</button>
			</div>
		</div>
	{/if}

</div>

<style>
	.log-scroll {
		max-height: 100vh;
		overflow-y: auto;
	}
</style>