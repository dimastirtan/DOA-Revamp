<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let email = $state('');
	let org = $state(data.org || '');
	let orgLokasi = $state('');
	let mgrNama = $state('');
	let mgrNik = $state('');
	let mgrEmail = $state('');

	let tos1 = $state(false);
	let tos2 = $state(false);
	let tos3 = $state(false);

	let loading = $state(false);
	let error = $state('');

	const inputClass =
		'w-full rounded-none border border-[#000] bg-white px-3 py-3 text-base outline-none focus:border-[#213C51]';

	let valid = $derived(
		!!email &&
			!!org &&
			!!orgLokasi &&
			!!mgrNama &&
			!!mgrNik &&
			!!mgrEmail &&
			tos1 &&
			tos2 &&
			tos3
	);

	const submit = async () => {
		error = '';
		if (!valid) {
			error = 'Lengkapi semua data dan centang ketiga pernyataan.';
			return;
		}
		loading = true;
		try {
			const res = await fetch('/-users/w', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					p: {
						email,
						org,
						org_lokasi: orgLokasi,
						mgr_nama: mgrNama,
						mgr_nik: mgrNik,
						mgr_email: mgrEmail
					}
				})
			});
			const j = await res.json().catch(() => ({}));
			if (!res.ok || !j.success) {
				error = j.error || 'Gagal mengirim surat pernyataan.';
				loading = false;
				return;
			}
			await goto('/dash', { invalidateAll: true });
		} catch {
			error = 'Gagal terhubung ke server.';
			loading = false;
		}
	};

	const logout = async () => {
		await fetch('/-logout', { method: 'POST' });
		goto('/login');
	};
</script>

<div class="min-h-dvh flex items-start justify-center bg-[#213C51] p-4 py-10">
	<div class="w-full max-w-2xl bg-white p-8 flex flex-col gap-5">
		<div class="flex items-center gap-3">
			<img src="/logo.png" class="w-12" alt="Logo" />
			<div>
				<p class="text-lg font-medium">Surat Pernyataan</p>
				<p class="text-sm text-[#000]/60">
					Form permohonan akses aplikasi Design Organization. Wajib diisi sebelum melanjutkan.
				</p>
			</div>
		</div>

		<!-- Identitas (dari akun) -->
		<div class="grid grid-cols-2 gap-3">
			<div class="flex flex-col gap-1">
				<p class="text-sm font-medium">NIK</p>
				<input class="{inputClass} bg-black/5" value={data.nik} readonly />
			</div>
			<div class="flex flex-col gap-1">
				<p class="text-sm font-medium">Nama</p>
				<input class="{inputClass} bg-black/5" value={data.nama} readonly />
			</div>
		</div>

		<div class="h-px bg-black/10"></div>

		<p class="font-medium">Informasi</p>
		<div class="grid grid-cols-2 gap-3">
			<div class="flex flex-col gap-1">
				<p class="text-sm font-medium">Email</p>
				<input type="email" class={inputClass} placeholder="nama@indonesian-aerospace.com" bind:value={email} />
			</div>
			<div class="flex flex-col gap-1">
				<p class="text-sm font-medium">Kode Organisasi</p>
				<input class={inputClass} placeholder="mis. SE1300" bind:value={org} />
			</div>
			<div class="flex flex-col gap-1">
				<p class="text-sm font-medium">Lokasi Kerja</p>
				<input class={inputClass} placeholder="mis. GPT LT.5" bind:value={orgLokasi} />
			</div>
		</div>

		<p class="font-medium">Responsible Manager</p>
		<div class="grid grid-cols-3 gap-3">
			<div class="flex flex-col gap-1">
				<p class="text-sm font-medium">Nama Manager</p>
				<input class={inputClass} bind:value={mgrNama} />
			</div>
			<div class="flex flex-col gap-1">
				<p class="text-sm font-medium">NIK Manager</p>
				<input class={inputClass} bind:value={mgrNik} oninput={(e) => (e.currentTarget.value = e.currentTarget.value.replace(/[^0-9]/g, ''))} />
			</div>
			<div class="flex flex-col gap-1">
				<p class="text-sm font-medium">Email Manager</p>
				<input type="email" class={inputClass} placeholder="manager@indonesian-aerospace.com" bind:value={mgrEmail} />
			</div>
		</div>

		<div class="h-px bg-black/10"></div>

		<!-- Pernyataan -->
		<p class="font-medium">Dengan ini, saya tidak akan:</p>
		<div class="flex flex-col gap-2">
			<label class="flex items-start gap-3 border border-black/10 p-3 cursor-pointer {tos1 ? 'border-[#213C51] bg-[#213C51]/5' : ''}">
				<input type="checkbox" class="mt-1 w-4 h-4 shrink-0 accent-[#213C51]" bind:checked={tos1} />
				<span>
					<span class="text-sm font-medium block">Duplikasi Data</span>
					<span class="text-sm text-[#000]/70">Saya tidak akan menduplikat/mencetak semua/sebagian data dan informasi yang ada di website/portal.</span>
				</span>
			</label>
			<label class="flex items-start gap-3 border border-black/10 p-3 cursor-pointer {tos2 ? 'border-[#213C51] bg-[#213C51]/5' : ''}">
				<input type="checkbox" class="mt-1 w-4 h-4 shrink-0 accent-[#213C51]" bind:checked={tos2} />
				<span>
					<span class="text-sm font-medium block">Sharing Akun</span>
					<span class="text-sm text-[#000]/70">Saya tidak akan memberikan kewenangan kepada orang lain.</span>
				</span>
			</label>
			<label class="flex items-start gap-3 border border-black/10 p-3 cursor-pointer {tos3 ? 'border-[#213C51] bg-[#213C51]/5' : ''}">
				<input type="checkbox" class="mt-1 w-4 h-4 shrink-0 accent-[#213C51]" bind:checked={tos3} />
				<span>
					<span class="text-sm font-medium block">Distribusi Data</span>
					<span class="text-sm text-[#000]/70">Saya tidak mendistribusikan/membawa keluar area kerja/keluar kawasan perusahaan semua/sebagian data dan informasi yang ada di website/portal kepada pihak lain (pihak ketiga).</span>
				</span>
			</label>
		</div>

		{#if error}
			<div class="flex items-center gap-2 border border-red-400 bg-red-50 px-3 py-2.5">
				<img src="/exclamation.svg" class="w-4 h-4 shrink-0" alt="" />
				<p class="text-sm text-red-700! font-medium">{error}</p>
			</div>
		{/if}

		<button
			type="button"
			class="bg-[#213C51] py-4 flex justify-center items-center {loading || !valid ? 'opacity-60 pointer-events-none' : ''}"
			onclick={submit}
		>
			{#if loading}
				<img src="/spinner.svg?a" class="h-5 w-5" alt="" />
			{:else}
				<p class="font-medium !text-white">Kirim & Lanjut</p>
			{/if}
		</button>
		<button type="button" class="text-sm text-[#000]/50 underline mx-auto" onclick={logout}>Keluar</button>
	</div>
</div>
