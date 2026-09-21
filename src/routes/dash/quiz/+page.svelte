<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { mainTitle } from '$lib/store';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Option = { key: string; text: string };
	type Question = { no: number; question: string; options: Option[] };

	const ndm = (page.url.searchParams.get('ndm') ?? '').trim();
	let isAdmin = $derived(data.user?.userlevel === -1 || data.user?.userlevel === 5);

	let phase = $state<'loading' | 'landing' | 'unavailable' | 'passed' | 'intro' | 'quiz' | 'result'>('loading');
	let errorMsg = $state('');
	let doc = $state<{ ndm: string; title: string; revision: string } | null>(null);
	let attemptNo = $state(0);
	let questions = $state<Question[]>([]);
	let answers = $state<(string | null)[]>([]);
	let current = $state(0);
	let bestScore = $state(0);
	let totalPoints = $state(0);
	let submitting = $state(false);
	let passedAt = $state<string | null>(null);

	// hasil dari server
	let result = $state<{
		score: number;
		total: number;
		status: string;
		passingScore: number;
		pointsAdded: number;
		benarByNo: Record<number, boolean>;
	} | null>(null);

	// landing (tanpa ndm)
	let riwayat = $state<any[]>([]);

	const startQuiz = async () => {
		phase = 'loading';
		errorMsg = '';
		try {
			const res = await fetch('/-doa/quiz/start', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ndm })
			});
			if (res.status === 401) return goto('/login');
			const json = await res.json();
			if (!json.success) {
				doc = json.doc ?? null;
				// Sudah lulus → tampilkan status lulus, bukan halaman error.
				if (json.code === 'SUDAH_LULUS') {
					bestScore = json.bestScore ?? 0;
					passedAt = json.passedAt ?? null;
					totalPoints = json.totalPoints ?? totalPoints;
					phase = 'passed';
					return;
				}
				errorMsg = json.error || 'Terjadi kesalahan.';
				phase = 'unavailable';
				return;
			}
			attemptNo = json.attemptNo;
			doc = json.doc;
			bestScore = json.bestScore;
			totalPoints = json.totalPoints;
			questions = json.questions;
			answers = questions.map(() => null);
			current = 0;
			result = null;
			phase = 'intro';
		} catch (e: any) {
			errorMsg = e.message || 'Gagal terhubung ke server.';
			phase = 'unavailable';
		}
	};

	const loadLanding = async () => {
		phase = 'loading';
		try {
			const res = await fetch('/-doa/quiz/log?mine=1&limit=10');
			if (res.status === 401) return goto('/login');
			const json = await res.json();
			if (json.success) {
				riwayat = json.data ?? [];
				totalPoints = json.totalPoints ?? 0;
			}
		} catch (e) {
			console.error('load riwayat gagal:', e);
		}
		phase = 'landing';
	};

	const submitQuiz = async () => {
		if (submitting || answers.some((a) => a === null)) return;
		submitting = true;
		try {
			const res = await fetch('/-doa/quiz/submit', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					attemptNo,
					answers: questions.map((q, i) => ({ no: q.no, choice: answers[i] }))
				})
			});
			if (res.status === 401) return goto('/login');
			const json = await res.json();
			if (!json.success) {
				errorMsg = json.error || 'Gagal mengirim jawaban.';
				phase = 'unavailable';
				return;
			}
			const benarByNo: Record<number, boolean> = {};
			for (const d of json.detail ?? []) benarByNo[d.no] = d.benar;
			result = {
				score: json.score,
				total: json.total,
				status: json.status,
				passingScore: json.passingScore,
				pointsAdded: json.pointsAdded,
				benarByNo
			};
			bestScore = json.bestScore;
			totalPoints = json.totalPoints;
			phase = 'result';
		} catch (e: any) {
			errorMsg = e.message || 'Gagal terhubung ke server.';
			phase = 'unavailable';
		} finally {
			submitting = false;
		}
	};

	const next = () => {
		if (answers[current] === null) return;
		if (current < questions.length - 1) current += 1;
		else submitQuiz();
	};

	const prev = () => {
		if (current > 0) current -= 1;
	};

	const chosenText = (q: Question, i: number) =>
		q.options.find((o) => o.key === answers[i])?.text ?? '-';

	const fmtTanggal = (raw: string | null) => {
		if (!raw) return '-';
		const d = new Date(raw);
		if (isNaN(d.getTime())) return raw;
		const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
		const pad = (n: number) => String(n).padStart(2, '0');
		return `${pad(d.getDate())} ${months[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
	};

	onMount(() => {
		$mainTitle = 'Quiz';
		if (ndm) startQuiz();
		else loadLanding();
	});
</script>

<img class="fixed bottom-0 left-0 -z-50 h-1/2 invert" src="/grad.svg" alt="" />
<img class="fixed top-0 right-0 -z-50 h-1/2 -rotate-180 invert" src="/grad.svg" alt="" />

<!-- fixed inset-0: shell full-viewport supaya dokumen tidak ikut ter-scroll oleh
     konten yang scroll internal (menghindari spurious document scroll di Chromium) -->
<div class="fixed inset-0 flex flex-col pt-6 pb-4 px-6 gap-3">
	<!-- Header -->
	<div class="w-full flex items-center justify-between gap-2 flex-wrap">
		<div class="flex gap-2 items-center">
			<a href="/dash" class="flex flex-row bg-[#677787] p-2 px-3 gap-2 group">
				<img src="/minimize-white.svg?a" class="w-3 rotate-180 group-hover:rotate-0 transition-all duration-500" alt="" />
				<p class="font-medium text-white!">Kembali</p>
			</a>
			<div class="flex flex-row bg-[#213C51] p-2 px-3">
				<p class="font-medium text-white!">Quiz</p>
			</div>
			{#if isAdmin}
				<a href="/dash/quiz/soal" class="flex flex-row bg-[#fff] p-2 px-3 hover:bg-white/80 transition-colors">
					<p class="font-medium">Kelola Soal</p>
				</a>
				<a href="/dash/quiz/log" class="flex flex-row bg-[#fff] p-2 px-3 hover:bg-white/80 transition-colors">
					<p class="font-medium">Log Quiz</p>
				</a>
			{/if}
		</div>

		<div class="flex gap-2 items-center">
			<!-- Identitas -->
			<div class="w-fit bg-white/75 p-2 px-4 border-2 border-transparent">
				<p class="font-medium whitespace-nowrap overflow-hidden text-ellipsis">
					{#if data.user}
						{data.user.configPenghasil}, {data.user.id}
					{/if}
				</p>
			</div>
			<!-- Total poin user -->
			<div class="w-fit bg-[#1a6b3c] p-2 px-4">
				<p class="font-medium text-white! whitespace-nowrap">Poin: {totalPoints}</p>
			</div>
		</div>
	</div>

	<!-- Konten -->
	<div class="flex-1 flex items-start justify-center overflow-y-auto">
		<div class="w-full max-w-3xl flex flex-col gap-3 py-4">

			{#if phase === 'loading'}
				<div class="bg-white/75 p-8 flex items-center justify-center gap-3">
					<img src="/spinner.svg" class="w-5 animate-spin" alt="" />
					<p class="font-medium">Memuat quiz…</p>
				</div>

			{:else if phase === 'landing'}
				<!-- ── Tanpa ndm: penjelasan + riwayat sendiri ───────────────── -->
				<div class="bg-[#213C51] p-4 px-6">
					<h2 class="text-lg font-semibold text-white!">Quiz Pemahaman Prosedur</h2>
				</div>
				<div class="bg-white/75 p-6 flex flex-col gap-3">
					<p>
						Belum ada quiz yang dipilih. Silahkan pilih dokumen yang ingin diikuti quiz-nya, jika quiz tidak muncul silahkan hubungi Admin.
					</p>
				</div>

				{#if riwayat.length > 0}
					<div class="bg-white/75 p-6 flex flex-col gap-3">
						<p class="font-medium">Riwayat quiz Anda</p>
						<div class="overflow-x-auto">
							<table class="w-full text-sm">
								<thead>
									<tr class="text-left border-b border-black/15">
										<th class="py-2 pr-3 font-medium">Tanggal</th>
										<th class="py-2 pr-3 font-medium">Dokumen</th>
										<th class="py-2 pr-3 font-medium">Skor</th>
										<th class="py-2 pr-3 font-medium">Status</th>
										<th class="py-2 font-medium">Poin</th>
									</tr>
								</thead>
								<tbody>
									{#each riwayat as r}
										<tr class="border-b border-black/5">
											<td class="py-2 pr-3 whitespace-nowrap">{fmtTanggal(r.finishedAt ?? r.startedAt)}</td>
											<td class="py-2 pr-3">{r.nmdoc}</td>
											<td class="py-2 pr-3">{r.status === 'pending' ? '-' : `${r.score}/5`}</td>
											<td class="py-2 pr-3">
												<span class="px-2 py-0.5 text-white! text-xs {r.status === 'lulus' ? 'bg-[#1a6b3c]' : r.status === 'gagal' ? 'bg-[#9c2b2b]' : 'bg-[#677787]'}">
													{r.status === 'pending' ? 'belum selesai' : r.status}
												</span>
											</td>
											<td class="py-2">{r.status === 'pending' ? '-' : `+${r.points}`}</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					</div>
				{/if}

			{:else if phase === 'unavailable'}
				<!-- ── Error / soal belum tersedia ───────────────────────────── -->
				<div class="bg-[#213C51] p-4 px-6">
					<h2 class="text-lg font-semibold text-white!">Quiz Tidak Tersedia</h2>
				</div>
				<div class="bg-white/75 p-6 flex flex-col gap-4">
					{#if doc}
						<div class="flex flex-col gap-1">
							<p class="font-semibold text-lg">{doc.title}</p>
							<div class="flex gap-2 mt-1">
								<span class="text-sm bg-[#677787] text-white! px-2 py-0.5">{doc.ndm}</span>
								<span class="text-sm bg-[#677787] text-white! px-2 py-0.5">Rev. {doc.revision}</span>
							</div>
						</div>
					{/if}
					<p class="text-[#9c2b2b] font-medium">{errorMsg}</p>
					<a href="/dash" class="w-fit px-6 py-3 bg-[#213C51] text-white! font-medium hover:bg-[#213C51]/90 transition-colors">Kembali ke Dashboard</a>
				</div>

			{:else if phase === 'passed'}
				<!-- ── Sudah lulus — quiz terkunci ───────────────────────────── -->
				<div class="bg-[#1a6b3c] p-4 px-6">
					<h2 class="text-lg font-semibold text-white!">Anda Sudah Lulus</h2>
				</div>
				<div class="bg-white/75 p-6 flex flex-col gap-4">
					{#if doc}
						<div class="flex flex-col gap-1">
							<p class="font-semibold text-lg">{doc.title}</p>
							<div class="flex gap-2 mt-1 flex-wrap">
								<span class="text-sm bg-[#677787] text-white! px-2 py-0.5">{doc.ndm}</span>
								<span class="text-sm bg-[#677787] text-white! px-2 py-0.5">Rev. {doc.revision}</span>
								<span class="text-sm bg-[#1a6b3c] text-white! px-2 py-0.5">Nilai: {bestScore}/5</span>
							</div>
						</div>
					{/if}
					<p class="text-black/70">
						Anda sudah dinyatakan <span class="font-medium text-[#1a6b3c]">lulus</span> quiz procedure ini{#if passedAt}&nbsp;(lulus {fmtTanggal(passedAt)}){/if}, jadi quiz tidak perlu dikerjakan lagi.
					</p>
					<a href="/dash" class="w-fit px-6 py-3 bg-[#213C51] text-white! font-medium hover:bg-[#213C51]/90 transition-colors">Kembali ke Dashboard</a>
				</div>

			{:else if phase === 'intro'}
				<!-- ── Intro ─────────────────────────────────────────────────── -->
				<div class="bg-[#213C51] p-4 px-6">
					<h2 class="text-lg font-semibold text-white!">Pemahaman Prosedur</h2>
				</div>
				<div class="bg-white/75 p-6 flex flex-col gap-5">
					<div class="flex flex-col gap-1">
						<p class="text-sm text-black/60">Dokumen:</p>
						<p class="font-semibold text-lg">{doc?.title}</p>
						<div class="flex gap-2 mt-1">
							<span class="text-sm bg-[#677787] text-white! px-2 py-0.5">{doc?.ndm}</span>
							<span class="text-sm bg-[#677787] text-white! px-2 py-0.5">Rev. {doc?.revision}</span>
							{#if bestScore > 0}
								<span class="text-sm bg-[#1a6b3c] text-white! px-2 py-0.5">Nilai terbaik: {bestScore}/5</span>
							{/if}
						</div>
					</div>

					<div class="border-t border-black/10 pt-4 flex flex-col gap-2">
						<p class="font-medium">Jawab {questions.length} pertanyaan berikut sebagai bukti membaca.</p>
						<ul class="text-sm text-black/70 list-disc pl-5 flex flex-col gap-1">
							<li>Untuk dianggap sudah membaca, minimal 3 jawaban benar.</li>
							<li>Boleh diulang <span class="font-medium">sampai lulus</span>; setelah lulus quiz terkunci dan tidak bisa dikerjakan lagi.</li>
							<li>Poin mengikuti nilai tertinggi Anda. Semua percobaan tercatat di server.</li>
						</ul>
					</div>

					<button
						type="button"
						class="w-fit px-6 py-3 bg-[#1a6b3c] text-white! font-medium hover:bg-[#1a6b3c]/90 transition-colors"
						onclick={() => (phase = 'quiz')}
					>Mulai Quiz</button>
				</div>

			{:else if phase === 'quiz'}
				<!-- ── Soal ──────────────────────────────────────────────────── -->
				<div class="flex items-center justify-between">
					<div class="bg-[#213C51] p-2 px-4">
						<p class="font-medium text-white!">Soal {current + 1} dari {questions.length}</p>
					</div>
					<div class="flex gap-1.5">
						{#each questions as _, i}
							<div
								class="w-8 h-2 transition-colors {i === current
									? 'bg-[#213C51]'
									: answers[i] !== null
										? 'bg-[#1a6b3c]'
										: 'bg-black/20'}"
							></div>
						{/each}
					</div>
				</div>

				<div class="bg-white/75 p-6 flex flex-col gap-5">
					<p class="font-semibold text-lg">{questions[current].question}</p>

					<div class="flex flex-col gap-2">
						{#each questions[current].options as option, i}
							<button
								type="button"
								class="flex items-stretch text-left border transition-colors {answers[current] === option.key
									? 'bg-[#213C51] border-[#213C51]'
									: 'bg-white border-black/20 hover:border-[#213C51]/60'}"
								onclick={() => (answers[current] = option.key)}
							>
								<span
									class="flex items-center justify-center w-11 shrink-0 font-semibold {answers[current] === option.key
										? 'bg-white/15 text-white!'
										: 'bg-black/5'}"
								>{String.fromCharCode(65 + i)}</span>
								<span class="p-3 px-4 {answers[current] === option.key ? 'text-white!' : ''}">{option.text}</span>
							</button>
						{/each}
					</div>

					<div class="flex justify-between items-center border-t border-black/10 pt-4">
						<button
							type="button"
							class="px-5 py-2.5 bg-[#677787] text-white! font-medium hover:bg-[#677787]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
							disabled={current === 0 || submitting}
							onclick={prev}
						>Sebelumnya</button>

						<button
							type="button"
							class="px-5 py-2.5 font-medium text-white! transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 {current ===
							questions.length - 1
								? 'bg-[#1a6b3c] hover:bg-[#1a6b3c]/90'
								: 'bg-[#213C51] hover:bg-[#213C51]/90'}"
							disabled={answers[current] === null || submitting}
							onclick={next}
						>
							{#if submitting}
								<img src="/spinner.svg" class="w-4 animate-spin invert" alt="" />
							{/if}
							{current === questions.length - 1 ? 'Selesai' : 'Selanjutnya'}
						</button>
					</div>
				</div>

			{:else if phase === 'result' && result}
				<!-- ── Hasil ─────────────────────────────────────────────────── -->
				<div class="p-4 px-6 {result.status === 'lulus' ? 'bg-[#1a6b3c]' : 'bg-[#9c2b2b]'}">
					<h2 class="text-lg font-semibold text-white!">
						{result.status === 'lulus' ? 'Lulus' : 'Belum Lulus'} — {doc?.ndm}
					</h2>
				</div>
				<div class="bg-white/75 p-6 flex flex-col gap-6">
					<div class="flex gap-3 flex-wrap">
						<div class="flex-1 min-w-40 bg-white border border-black/10 p-4 flex flex-col gap-1">
							<p class="text-sm text-black/60">Jawaban benar</p>
							<p class="text-3xl font-semibold">{result.score} <span class="text-lg text-black/50">/ {result.total}</span></p>
							<p class="text-xs text-black/50">Minimal lulus: {result.passingScore}/{result.total}</p>
						</div>
						<div class="flex-1 min-w-40 bg-white border border-black/10 p-4 flex flex-col gap-1">
							<p class="text-sm text-black/60">Nilai terbaik Anda</p>
							<p class="text-3xl font-semibold">{bestScore} <span class="text-lg text-black/50">/ {result.total}</span></p>
							<p class="text-xs text-black/50">Yang dicatat untuk dokumen ini</p>
						</div>
						<div class="flex-1 min-w-40 bg-[#1a6b3c] p-4 flex flex-col gap-1">
							<p class="text-sm text-white/80">Poin bertambah</p>
							<p class="text-3xl font-semibold text-white!">+{result.pointsAdded}</p>
							<p class="text-xs text-white/60">Total poin: {totalPoints}</p>
						</div>
					</div>

					<div class="flex flex-col gap-3">
						<p class="font-medium">Rincian jawaban</p>
						{#each questions as q, i}
							{@const benar = result.benarByNo[q.no] === true}
							<div class="bg-white border-l-4 {benar ? 'border-[#1a6b3c]' : 'border-[#9c2b2b]'} border-y border-r border-y-black/10 border-r-black/10 p-4 flex flex-col gap-1.5">
								<div class="flex items-start justify-between gap-3">
									<p class="font-medium">{i + 1}. {q.question}</p>
									<span class="shrink-0 text-sm px-2 py-0.5 text-white! {benar ? 'bg-[#1a6b3c]' : 'bg-[#9c2b2b]'}">
										{benar ? 'Benar' : 'Salah'}
									</span>
								</div>
								<p class="text-sm text-black/70">
									Jawaban Anda: <span class="font-medium">{chosenText(q, i)}</span>
								</p>
							</div>
						{/each}
						{#if result.score < result.total}
							<p class="text-sm text-black/60">
								Kunci jawaban tidak ditampilkan — silakan baca kembali dokumennya, lalu coba lagi.
							</p>
						{/if}
					</div>

					<div class="flex gap-2 border-t border-black/10 pt-4">
						<a
							href="/dash"
							class="px-6 py-3 bg-[#213C51] text-white! font-medium hover:bg-[#213C51]/90 transition-colors"
						>Kembali ke Dashboard</a>
						{#if result.status !== 'lulus'}
							<!-- "Coba Lagi" hanya kalau belum lulus; begitu lulus quiz terkunci. -->
							<button
								type="button"
								class="px-6 py-3 bg-[#677787] text-white! font-medium hover:bg-[#677787]/90 transition-colors"
								onclick={startQuiz}
							>Coba Lagi</button>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
