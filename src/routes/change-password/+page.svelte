<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { goto } from '$app/navigation';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let newPassword = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);
	let error = $state('');

	const inputClass =
		'text-base! shadow-none! w-full rounded-none border-[#000]! bg-[#fff] py-7! pl-11! placeholder:text-[#000]/35 focus:!border-[#000] focus:!ring-transparent focus:!ring-offset-0';

	const submit = async () => {
		error = '';
		if (newPassword.length < 6) {
			error = 'Password baru minimal 6 karakter.';
			return;
		}
		if (newPassword !== confirmPassword) {
			error = 'Konfirmasi password tidak cocok.';
			return;
		}
		loading = true;
		try {
			const res = await fetch('/-users/ganti-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ newPassword, confirmPassword })
			});
			const j = await res.json();
			if (!res.ok) {
				error = j.error || 'Gagal mengganti password.';
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

<div class="min-h-dvh flex items-center justify-center bg-[#213C51] p-4">
	<div class="w-full max-w-md bg-white p-8 flex flex-col gap-4">
		<div class="w-20 mx-auto">
			<img src="/logo.png" class="w-full" alt="Logo" />
		</div>
		<div class="text-center">
			<p class="text-lg font-medium">Ganti Password</p>
			{#if data.mustChange}
				<p class="text-sm text-[#000]/60 mt-1">
					Password kamu masih default (sama dengan NIK). Ganti dulu untuk melanjutkan.
				</p>
			{:else}
				<p class="text-sm text-[#000]/60 mt-1">Perbarui password akunmu.</p>
			{/if}
		</div>

		<div class="flex w-full flex-col gap-1">
			<p class="font-medium text-sm">Password Baru</p>
			<div class="relative w-full items-center">
				<img src="/pass.svg" class="h-5! w-5! absolute left-3 top-1/2 -translate-y-1/2" alt="" />
				<Input
					type="password"
					bind:value={newPassword}
					placeholder="Minimal 6 karakter"
					class={inputClass}
					autofocus={false}
					onkeydown={(e) => e.key === 'Enter' && submit()}
				/>
			</div>
		</div>

		<div class="flex w-full flex-col gap-1">
			<p class="font-medium text-sm">Konfirmasi Password</p>
			<div class="relative w-full items-center">
				<img src="/pass.svg" class="h-5! w-5! absolute left-3 top-1/2 -translate-y-1/2" alt="" />
				<Input
					type="password"
					bind:value={confirmPassword}
					placeholder="Ulangi password baru"
					class={inputClass}
					autofocus={false}
					onkeydown={(e) => e.key === 'Enter' && submit()}
				/>
			</div>
		</div>

		{#if error}
			<p class="text-sm text-red-600 font-medium">{error}</p>
		{/if}

		<button
			type="button"
			class="group flex w-full items-center justify-center gap-2 bg-secondary p-2 px-3 py-4 text-center cursor-pointer {loading
				? 'pointer-events-none'
				: ''}"
			onclick={submit}
		>
			{#if loading}
				<img src="/spinner.svg?a" class="h-5! w-5!" alt="" />
			{:else}
				<p class="font-medium !text-white">Simpan & Lanjut</p>
			{/if}
		</button>

		<button type="button" class="text-sm text-[#000]/50 underline mx-auto" onclick={logout}>
			Keluar
		</button>
	</div>
</div>
