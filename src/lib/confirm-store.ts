import { writable } from 'svelte/store';

export interface ConfirmConfig {
	title?: string;
	description?: string;
	confirmText?: string;
	cancelText?: string;
	variant?: 'danger' | 'primary' | 'warning';
}

interface ConfirmState extends ConfirmConfig {
	isOpen: boolean;
	resolve: ((value: boolean) => void) | null;
}

function createConfirmStore() {
	const { subscribe, update } = writable<ConfirmState>({
		isOpen: false,
		title: 'Konfirmasi',
		description: 'Apakah kamu yakin?',
		confirmText: 'Ya',
		cancelText: 'Batal',
		variant: 'primary',
		resolve: null
	});

	function confirm(config: ConfirmConfig = {}): Promise<boolean> {
		return new Promise((resolve) => {
			update((state) => ({
				...state,
				...config,
				isOpen: true,
				resolve
			}));
		});
	}

	function close(value: boolean) {
		console.log('close called with value:', value);
		update((state) => {
			console.log('current resolve:', state.resolve);
			if (state.resolve) {
				state.resolve(value);
			}
			return {
				...state,
				isOpen: false,
				resolve: null
			};
		});
	}

	// Dipanggil saat drawer tutup — batalkan dialog tanpa resolve apapun ke caller
	function dismiss() {
		update((state) => {
			if (state.resolve) {
				state.resolve(false);
			}
			return {
				...state,
				isOpen: false,
				resolve: null
			};
		});
	}

	return {
		subscribe,
		confirm,
		close,
		dismiss
	};
}

export const confirmStore = createConfirmStore();