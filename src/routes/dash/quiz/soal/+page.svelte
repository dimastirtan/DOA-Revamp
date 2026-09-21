<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { mainTitle } from '$lib/store';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Slot = {
		no: number | null;
		question: string;
		a: string;
		b: string;
		c: string;
		d: string;
		correct: '' | 'A' | 'B' | 'C' | 'D';
	};

	const emptySlot = (): Slot => ({ no: null, question: '', a: '', b: '', c: '', d: '', correct: '' });

	// ── List procedure (panel kiri) ───────────────────────────────────────
	let loadingList = $state(true);
	let procedures = $state<any[]>([]);
	let search = $state('');
	let pageNum = $state(1);
	let totalPages = $state(0);
	let total = $state(0);

	// ── Editor (panel kanan) ──────────────────────────────────────────────
	let loadingEditor = $state(false);
	let doc = $state<{ no: number; ndm: string; title: string; revision: string } | null>(null);
	let slots = $state<Slot[]>([]);
	let saving = $state(false);
	let banner = $state<{ type: 'ok' | 'err'; text: string } | null>(null);

	const fetchList = async () => {
		loadingList = true;
		try {
			const params = new URLSearchParams({ page: String(pageNum), search });
			const res = await fetch(`/-doa/quiz/soal?${params}`);
			if (res.status === 401) return goto('/login');
			const json = await res.json();
			if (json.success) {
				procedures = json.data ?? [];
				totalPages = json.pagination?.totalPages ?? 0;
				total = json.pagination?.total ?? 0;
			} else {
				banner = { type: 'err', text: json.error || 'Gagal memuat daftar procedure.' };
			}
		} catch (e: any) {
			banner = { type: 'err', text: e.message || 'Gagal terhubung ke server.' };
		} finally {
			loadingList = false;
		}
	};

	const openEditor = async (no: number) => {
		loadingEditor = true;
		banner = null;
		try {
			const res = await fetch(`/-doa/quiz/soal?no=${encodeURIComponent(no)}`);
			if (res.status === 401) return goto('/login');
			const json = await res.json();
			if (!json.success) {
				banner = { type: 'err', text: json.error || 'Gagal memuat soal.' };
				return;
			}
			doc = json.doc;
			slots = (json.soal ?? []).map((s: any) => ({
				no: s.no,
				question: s.question,
				a: s.a,
				b: s.b,
				c: s.c,
				d: s.d,
				correct: s.correct
			}));
			while (slots.length < 5) slots.push(emptySlot());
		} catch (e: any) {
			banner = { type: 'err', text: e.message || 'Gagal terhubung ke server.' };
		} finally {
			loadingEditor = false;
		}
	};

	const isFilled = (s: Slot) =>
		!!(s.question.trim() || s.a.trim() || s.b.trim() || s.c.trim() || s.d.trim());

	const isComplete = (s: Slot) =>
		!!(s.question.trim() && s.a.trim() && s.b.trim() && s.c.trim() && s.d.trim() && s.correct);

	let filledCount = $derived(slots.filter(isFilled).length);

	const clearSlot = (i: number) => {
		slots[i] = emptySlot();
	};

	const save = async () => {
		if (saving || !doc) return;
		banner = null;

		const filled = slots.filter(isFilled);
		for (let i = 0; i < slots.length; i++) {
			if (isFilled(slots[i]) && !isComplete(slots[i])) {
				banner = {
					type: 'err',
					text: `Soal ${i + 1} belum lengkap — isi pertanyaan, keempat opsi, dan pilih kunci jawabannya (atau kosongkan seluruh slot).`
				};
				return;
			}
		}

		saving = true;
		try {
			const res = await fetch('/-doa/quiz/soal', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					no: doc.no,
					soal: filled.map((s) => ({
						no: s.no,
						question: s.question,
						a: s.a,
						b: s.b,
						c: s.c,
						d: s.d,
						correct: s.correct
					}))
				})
			});
			if (res.status === 401) return goto('/login');
			const json = await res.json();
			if (!json.success) {
				banner = { type: 'err', text: json.error || 'Gagal menyimpan soal.' };
				return;
			}
			banner = {
				type: 'ok',
				text: json.quizAktif
					? `Tersimpan — ${json.count}/5 soal. Quiz untuk procedure ini AKTIF.`
					: `Tersimpan — ${json.count}/5 soal. Quiz belum aktif (perlu tepat 5 soal).`
			};
			// muat ulang editor (soal baru dapat `no`) + refresh badge jumlah di list
			await Promise.all([openEditor(doc.no), fetchList()]);
		} catch (e: any) {
			banner = { type: 'err', text: e.message || 'Gagal terhubung ke server.' };
		} finally {
			saving = false;
		}
	};

	onMount(() => {
		$mainTitle = 'Kelola Soal Quiz';
		fetchList();
	});
</script>

<img class="fixed bottom-0 left-0 -z-50 h-1/2 invert" src="/grad.svg" alt="" />
<img class="fixed top-0 right-0 -z-50 h-1/2 -rotate-180 invert" src="/grad.svg" alt="" />

<!-- fixed inset-0: shell full-viewport supaya dokumen tidak ikut ter-scroll oleh
     konten panel yang scroll internal (menghindari spurious document scroll di Chromium) -->
<div class="fixed inset-0 flex flex-col pt-6 pb-4 px-6 gap-3">
	<!-- Header -->
	<div class="w-full flex items-center justify-between gap-2 flex-wrap">
		<div class="flex gap-2 items-center">
			<a href="/dash" class="flex flex-row bg-[#677787] p-2 px-3 gap-2 group">
				<img src="/minimize-white.svg?a" class="w-3 rotate-180 group-hover:rotate-0 transition-all duration-500" alt="" />
				<p class="font-medium text-white!">Kembali</p>
			</a>
			<div class="flex flex-row bg-[#213C51] p-2 px-3">
				<p class="font-medium text-white!">Kelola Soal Quiz</p>
			</div>
			<a href="/dash/quiz/log" class="flex flex-row bg-[#fff] p-2 px-3 hover:bg-white/80 transition-colors">
				<p class="font-medium">Log Quiz</p>
			</a>
		</div>

		<div class="w-fit bg-white/75 p-2 px-4 border-2 border-transparent">
			<p class="font-medium whitespace-nowrap overflow-hidden text-ellipsis">
				{#if data.user}
					{data.user.configPenghasil}, {data.user.id}
				{/if}
			</p>
		</div>
	</div>

	{#if banner}
		<div class="w-full p-2 px-4 {banner.type === 'ok' ? 'bg-[#1a6b3c]/10 border border-[#1a6b3c]/40' : 'bg-[#9c2b2b]/10 border border-[#9c2b2b]/40'}">
			<p class="text-sm font-medium {banner.type === 'ok' ? 'text-[#1a6b3c]' : 'text-[#9c2b2b]'}">{banner.text}</p>
		</div>
	{/if}

	<!-- ── Dua panel: kiri list procedure, kanan editor soal ─────────────── -->
	<div class="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
		<div class="flex flex-col lg:flex-row gap-3 lg:h-full">

			<!-- Panel kiri: daftar procedure -->
			<div class="w-full lg:w-96 shrink-0 flex flex-col gap-2 lg:min-h-0 lg:h-full">
				<div class="bg-white/75 p-3 flex flex-col gap-2 shrink-0">
					<div class="flex gap-2">
						<input
							type="text"
							placeholder="Cari nomor / judul procedure…"
							class="flex-1 min-w-0 border border-black/20 bg-white p-2 px-3 focus:outline-none focus:border-[#213C51]"
							bind:value={search}
							onkeydown={(e) => {
								if (e.key === 'Enter') {
									pageNum = 1;
									fetchList();
								}
							}}
						/>
						<button
							type="button"
							class="px-4 py-2 bg-[#213C51] text-white! font-medium hover:bg-[#213C51]/90 transition-colors"
							onclick={() => {
								pageNum = 1;
								fetchList();
							}}
						>Cari</button>
					</div>
					<p class="text-xs text-black/60">{total} procedure — quiz aktif jika soalnya tepat 5.</p>
				</div>

				<div class="flex-1 lg:min-h-0 lg:overflow-y-auto flex flex-col gap-2 max-h-72 overflow-y-auto lg:max-h-none">
					{#if loadingList}
						<div class="bg-white/75 p-6 flex items-center justify-center gap-3">
							<img src="/spinner.svg" class="w-5 animate-spin" alt="" />
							<p class="font-medium">Memuat…</p>
						</div>
					{:else}
						{#each procedures as p}
							<button
								type="button"
								class="p-3 px-4 flex items-center justify-between gap-3 text-left transition-colors border-l-4 {doc?.no === p.no
									? 'bg-[#213C51] border-[#213C51]'
									: 'bg-white/75 hover:bg-white border-transparent'}"
								onclick={() => openEditor(p.no)}
							>
								<div class="flex flex-col gap-0.5 min-w-0">
									<p class="font-medium truncate {doc?.no === p.no ? 'text-white!' : ''}">{p.title}</p>
									<p class="text-sm {doc?.no === p.no ? 'text-white/70' : 'text-black/60'}">{p.number} — Rev. {p.revision}</p>
								</div>
								<span
									class="shrink-0 text-xs px-2 py-1 text-white! {p.soalCount === 5
										? 'bg-[#1a6b3c]'
										: p.soalCount > 0
											? 'bg-[#b07d2a]'
											: doc?.no === p.no
												? 'bg-white/20'
												: 'bg-[#677787]'}"
								>{p.soalCount}/5</span>
							</button>
						{:else}
							<div class="bg-white/75 p-5">
								<p class="text-black/60 text-sm">Tidak ada procedure yang cocok.</p>
							</div>
						{/each}
					{/if}
				</div>

				{#if totalPages > 1}
					<div class="flex items-center justify-between gap-2 shrink-0">
						<button
							type="button"
							class="flex-1 px-3 py-2 bg-[#677787] text-white! text-sm font-medium disabled:opacity-40"
							disabled={pageNum <= 1 || loadingList}
							onclick={() => {
								pageNum -= 1;
								fetchList();
							}}
						>Sebelumnya</button>
						<p class="text-sm font-medium whitespace-nowrap">{pageNum}/{totalPages}</p>
						<button
							type="button"
							class="flex-1 px-3 py-2 bg-[#677787] text-white! text-sm font-medium disabled:opacity-40"
							disabled={pageNum >= totalPages || loadingList}
							onclick={() => {
								pageNum += 1;
								fetchList();
							}}
						>Selanjutnya</button>
					</div>
				{/if}
			</div>

			<!-- Panel kanan: editor soal procedure terpilih -->
			<div class="flex-1 lg:min-h-0 lg:overflow-y-auto flex flex-col gap-3">
				{#if loadingEditor}
					<div class="bg-white/75 p-8 flex items-center justify-center gap-3">
						<img src="/spinner.svg" class="w-5 animate-spin" alt="" />
						<p class="font-medium">Memuat soal…</p>
					</div>
				{:else if !doc}
					<div class="bg-white/75 p-10 flex flex-col items-center justify-center gap-3 lg:h-full">
						<img src="/note.svg" class="w-10 opacity-40" alt="" />
						<p class="font-medium text-black/60">Pilih procedure di sebelah kiri untuk mengelola soalnya.</p>
						<p class="text-sm text-black/45 text-center max-w-sm">
							Setiap procedure memiliki 5 soal sebagai atributnya. Quiz baru bisa
							dikerjakan karyawan setelah kelima soalnya terisi.
						</p>
					</div>
				{:else}
					<div class="bg-[#213C51] p-4 px-6 flex items-center justify-between gap-3 flex-wrap shrink-0">
						<div class="min-w-0">
							<h2 class="text-lg font-semibold text-white! truncate">{doc.title}</h2>
							<p class="text-sm text-white/70">{doc.ndm} — Rev. {doc.revision}</p>
						</div>
						<span class="shrink-0 text-sm px-2 py-1 {filledCount === 5 ? 'bg-[#1a6b3c]' : 'bg-white/20'} text-white!">
							{filledCount}/5 soal terisi
						</span>
					</div>

					{#each slots as slot, i}
						<div class="bg-white/75 p-5 flex flex-col gap-3">
							<div class="flex items-center justify-between">
								<p class="font-semibold">Soal {i + 1}</p>
								{#if isFilled(slot)}
									<button
										type="button"
										class="text-sm px-3 py-1 bg-[#9c2b2b] text-white! hover:bg-[#9c2b2b]/90 transition-colors"
										onclick={() => clearSlot(i)}
									>Kosongkan</button>
								{/if}
							</div>

							<textarea
								rows="2"
								placeholder="Tulis pertanyaan…"
								class="w-full border border-black/20 bg-white p-2 px-3 focus:outline-none focus:border-[#213C51] resize-y"
								bind:value={slot.question}
							></textarea>

							<div class="flex flex-col gap-2">
								{#each ['A', 'B', 'C', 'D'] as key}
									<div class="flex items-stretch gap-2">
										<label
											class="flex items-center gap-2 px-3 shrink-0 border cursor-pointer transition-colors {slot.correct === key
												? 'bg-[#1a6b3c] border-[#1a6b3c]'
												: 'bg-white border-black/20 hover:border-[#1a6b3c]/60'}"
											title="Tandai sebagai kunci jawaban"
										>
											<input
												type="radio"
												class="sr-only"
												name={`correct-${i}`}
												value={key}
												checked={slot.correct === key}
												onchange={() => (slot.correct = key as Slot['correct'])}
											/>
											<span class="font-semibold {slot.correct === key ? 'text-white!' : ''}">{key}</span>
										</label>
										{#if key === 'A'}
											<input type="text" placeholder="Opsi A" class="flex-1 border border-black/20 bg-white p-2 px-3 focus:outline-none focus:border-[#213C51]" bind:value={slot.a} />
										{:else if key === 'B'}
											<input type="text" placeholder="Opsi B" class="flex-1 border border-black/20 bg-white p-2 px-3 focus:outline-none focus:border-[#213C51]" bind:value={slot.b} />
										{:else if key === 'C'}
											<input type="text" placeholder="Opsi C" class="flex-1 border border-black/20 bg-white p-2 px-3 focus:outline-none focus:border-[#213C51]" bind:value={slot.c} />
										{:else}
											<input type="text" placeholder="Opsi D" class="flex-1 border border-black/20 bg-white p-2 px-3 focus:outline-none focus:border-[#213C51]" bind:value={slot.d} />
										{/if}
									</div>
								{/each}
							</div>
							<p class="text-xs text-black/50">Klik huruf di kiri opsi untuk menandai kunci jawaban{slot.correct ? ` — kunci saat ini: ${slot.correct}` : ''}.</p>
						</div>
					{/each}

					<div class="flex justify-end shrink-0 pb-1">
						<button
							type="button"
							class="px-6 py-3 bg-[#1a6b3c] text-white! font-medium hover:bg-[#1a6b3c]/90 transition-colors disabled:opacity-50 flex items-center gap-2"
							disabled={saving}
							onclick={save}
						>
							{#if saving}
								<img src="/spinner.svg" class="w-4 animate-spin invert" alt="" />
							{/if}
							Simpan Soal
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
