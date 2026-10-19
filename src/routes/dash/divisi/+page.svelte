<script lang="ts">
	import { onMount } from 'svelte';
	import { mainTitle } from '$lib/store';

	// ── State ────────────────────────────────────────────────────────────────
	let rows        = $state<any[]>([]);
	let divisiList  = $state<{ value: number; label: string }[]>([]);
	let loading     = $state(true);
	let error       = $state('');
	let saveError   = $state('');
	let search      = $state('');
	let searchInput = $state('');
	let page        = $state(1);
	let limit       = $state(50);
	let total       = $state(0);
	let totalPages  = $state(0);

	// Kode singkat divisi untuk header kolom (label penuh di tooltip).
	const CODE: Record<number, string> = { 6: 'DT', 7: 'GR', 8: 'HC', 9: 'DP', 10: 'QA' };

	let debounceTimer: ReturnType<typeof setTimeout>;

	const fetchRows = async () => {
		loading = true;
		error   = '';
		try {
			const params = new URLSearchParams({ page: String(page), limit: String(limit), search });
			const res    = await fetch(`/-doa/divisi?${params}`);
			const json   = await res.json();
			if (!res.ok) {
				error = json.error || `HTTP ${res.status}`;
			} else {
				rows       = json.data ?? [];
				divisiList = json.divisiList ?? [];
				total      = json.pagination?.total ?? 0;
				totalPages = json.pagination?.totalPages ?? 0;
			}
		} catch (e: any) {
			error = e.message || 'Gagal terhubung ke server';
		} finally {
			loading = false;
		}
	};

	const toggle = async (row: any, division: number, on: boolean) => {
		saveError = '';
		const prev: number[] = row.divisions ?? [];
		// optimistic update
		row.divisions = on ? [...prev, division] : prev.filter((d: number) => d !== division);
		try {
			const res = await fetch('/-doa/divisi', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ standardNo: row.no, division, on })
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
		} catch (e: any) {
			row.divisions = prev; // revert
			saveError = 'Gagal menyimpan perubahan. Coba lagi.';
		}
	};

	const onSearchInput = (e: Event) => {
		searchInput = (e.target as HTMLInputElement).value;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			search = searchInput;
			page   = 1;
			fetchRows();
		}, 400);
	};

	const goPage = (p: number) => {
		if (p < 1 || p > totalPages || p === page) return;
		page = p;
		fetchRows();
	};

	let pageWindow = $derived.by(() => {
		const pages: number[] = [];
		const start = Math.max(1, page - 2);
		const end   = Math.min(totalPages, page + 2);
		for (let i = start; i <= end; i++) pages.push(i);
		return pages;
	});

	onMount(() => {
		$mainTitle = 'Kelola Divisi';
		fetchRows();
	});
</script>

<div class="flex flex-col h-dvh pt-6 pb-4 px-6 gap-3">
	<!-- Header -->
	<div class="w-full flex items-center justify-between gap-2 flex-wrap">
		<div class="flex gap-2 items-center">
			<a href="/dash" class="flex flex-row bg-[#677787] p-2 px-3 gap-2 group">
				<img src="/minimize-white.svg?a" class="w-3 rotate-180 group-hover:rotate-0 transition-all duration-500" alt="" />
				<p class="font-medium text-white!">Kembali</p>
			</a>
			<div class="flex flex-row bg-[#213C51] p-2 px-3">
				<p class="font-medium text-white!">Kelola Divisi</p>
			</div>
		</div>

		<div class="flex gap-2 items-center">
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
				<p class="font-medium text-white! px-3">Procedure</p>
			</div>

			<select
				class="bg-[#677787] text-white! text-sm px-3 py-3 border-0 outline-none cursor-pointer"
				bind:value={limit}
				onchange={() => { page = 1; fetchRows(); }}
			>
				<option value={25}>25 / Page</option>
				<option value={50}>50 / Page</option>
				<option value={100}>100 / Page</option>
			</select>

			<div class="relative w-72 group h-full">
				<img src="/search-white.svg" class="absolute top-1/2 left-3 h-4! w-4! -translate-y-1/2 group-hover:rotate-90 transition-all duration-500" alt="" />
				<input
					type="text"
					placeholder="Cari nomor / judul..."
					class="bg-[#677787] w-full border-0 outline-none placeholder-white/50 pl-11 pr-4 py-3 text-sm text-white"
					value={searchInput}
					oninput={onSearchInput}
				/>
			</div>
		</div>
	</div>

	<!-- Petunjuk + error -->
	<div class="flex items-center gap-3 flex-wrap">
		<p class="text-xs opacity-60">Centang divisi yang boleh mengakses procedure. Perubahan langsung tersimpan.</p>
		{#if saveError}
			<p class="text-xs text-red-600! font-medium">{saveError}</p>
		{/if}
	</div>

	{#if error}
		<div class="bg-red-50 border border-red-200 p-3 flex gap-2 items-center">
			<p class="font-medium text-red-700! text-sm">Error:</p>
			<p class="text-sm text-red-600! font-mono">{error}</p>
		</div>
	{/if}

	<!-- Tabel -->
	<div class="flex-1 overflow-auto bg-white/50 relative">
		{#if loading}
			<div class="absolute inset-0 bg-white/60 z-30 flex items-center justify-center">
				<img src="/spinner_color.svg?a" class="h-6! w-6!" alt="" />
			</div>
		{/if}
		<table class="w-full border-collapse">
			<thead class="sticky top-0 z-20">
				<tr class="bg-[#213C51]">
					<th class="text-left text-white! font-medium py-3 px-4 whitespace-nowrap">Nomor</th>
					<th class="text-left text-white! font-medium py-3 px-4">Judul</th>
					<th class="text-left text-white! font-medium py-3 px-2 whitespace-nowrap">Rev</th>
					{#each divisiList as d (d.value)}
						<th class="text-center text-white! font-medium py-3 px-3 whitespace-nowrap" title={d.label}>
							{CODE[d.value] ?? d.value}
						</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#if !loading && error}
					<tr><td colspan={3 + divisiList.length} class="text-center py-20 opacity-40">Gagal memuat data.</td></tr>
				{:else if !loading && rows.length === 0}
					<tr><td colspan={3 + divisiList.length} class="text-center py-20 opacity-40">
						{total === 0 ? 'Belum ada procedure.' : 'Tidak ada hasil pencarian.'}
					</td></tr>
				{:else}
					{#each rows as row (row.no)}
						<tr class="border-b border-secondary/10 hover:bg-white/70 transition-colors">
							<td class="py-2.5 px-4 font-medium! whitespace-nowrap select-text!">{row.number || '-'}</td>
							<td class="py-2.5 px-4 max-w-[36vw] truncate select-text!" title={row.title || '-'}>{row.title || '-'}</td>
							<td class="py-2.5 px-2 whitespace-nowrap select-text!">{row.revision || '-'}</td>
							{#each divisiList as d (d.value)}
								<td class="py-2.5 px-3 text-center">
									<input
										type="checkbox"
										class="w-4 h-4 accent-[#213C51] cursor-pointer"
										title={d.label}
										checked={(row.divisions ?? []).includes(d.value)}
										onchange={(e) => toggle(row, d.value, e.currentTarget.checked)}
									/>
								</td>
							{/each}
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>

	<!-- Pagination -->
	{#if totalPages > 1}
		<div class="flex items-center justify-between gap-2 px-1">
			<p class="text-xs opacity-50 whitespace-nowrap border border-secondary/20 px-2 py-1 bg-white/75">
				Menampilkan {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} dari {total.toLocaleString('id')} procedure
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
