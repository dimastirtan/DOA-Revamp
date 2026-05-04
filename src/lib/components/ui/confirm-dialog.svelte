<script lang="ts">
	import { confirmStore } from '$lib/confirm-store';
	import { fly, fade } from 'svelte/transition';

	let isOpen = $state(false);
	let title = $state('Konfirmasi');
	let description = $state('Apakah kamu yakin?');
	let confirmText = $state('Ya');
	let cancelText = $state('Batal');
	let variant = $state('primary');

	confirmStore.subscribe((state) => {
		isOpen = state.isOpen;
		title = state.title || 'Konfirmasi';
		description = state.description || 'Apakah kamu yakin?';
		confirmText = state.confirmText || 'Ya';
		cancelText = state.cancelText || 'Batal';
		variant = state.variant || 'primary';
	});

function handleConfirm() {
    confirmStore.close(true);
}

function handleCancel() {
    confirmStore.close(false);
		}

	function handleKeydown(e: KeyboardEvent) {
		if (!isOpen) return;
		if (e.key === 'Escape') {
			handleCancel();
		}
	}

	function onBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) {
			handleCancel();
		}
	}

	function getVariantClasses(v?: string) {
		switch (v) {
			case 'danger':
				return 'bg-red-700 hover:bg-red-600 focus:ring-red-700';
			case 'warning':
				return 'bg-orange-700 hover:bg-orange-600 focus:ring-orange-700';
			case 'primary':
			default:
				return 'bg-[#213C51] hover:bg-[#213C51]/90 focus:ring-[#213C51]';
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<div
		class="fixed inset-0 z-[99999] flex items-center justify-center"
		role="dialog"
		aria-modal="true"
		in:fade={{ duration: 150 }}
		out:fade={{ duration: 150 }}
		onclick={onBackdropClick}
	>
		<div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

		<div
			class="relative bg-white shadow-xl w-full max-w-md mx-4 overflow-hidden"
			in:fly={{ y: -20, duration: 200 }}
			out:fly={{ y: -10, duration: 150 }}
		>
			<div class="bg-[#213C51] p-4 px-6">
				<h3 class="text-lg font-semibold text-white">{title}</h3>
			</div>

			<div class="p-6">
				<p class="text-sm text-gray-700 leading-relaxed">{description}</p>
			</div>

			<div class="flex p-4 pt-0 gap-3">
				<button
					type="button"
					class="flex-1 px-4 py-3 text-sm font-medium bg-[#677787] text-white hover:bg-[#677787]/90 transition-colors focus:outline-none focus:ring-2 focus:ring-[#677787]/50"
					onclick={() => { console.log('CANCEL CLICKED'); handleCancel(); }}
				>
					{cancelText}
				</button>
				<button
					type="button"
					class="flex-1 px-4 py-3 text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 {getVariantClasses(variant)}"
					onclick={() => { console.log('CONFIRM CLICKED'); handleConfirm(); }}
				>
					{confirmText}
				</button>
			</div>
		</div>
	</div>
{/if}