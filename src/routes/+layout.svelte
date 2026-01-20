<script lang="ts">
	import './layout.css';
	// import favicon from '$lib/assets/favicon.png';
	import '$lib/global.css';
	import { mainTitle, subTitle } from '$lib/store';
	import { onMount, tick } from 'svelte';
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	let { children } = $props();

	// Session heartbeat to detect expiration
	$effect(() => {
		if (!browser) return;

		// Don't check session on login page
		if (page.url.pathname === '/login') return;

		const checkSession = async () => {
			try {
				const res = await fetch('/-login', {
					headers: { Accept: 'application/json' }
				});
				if (res.status === 401) {
					console.log('Session expired, refreshing...');
					window.location.href = '/login';
				}
			} catch (e) {
				console.error('Failed to check session', e);
			}
		};

		// Check every 5 minutes
		const interval = setInterval(checkSession, 5 * 60 * 1000);

		// Check when window gains focus (user comes back to tab)
		const handleFocus = () => {
			checkSession();
		};

		window.addEventListener('focus', handleFocus);
		window.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'visible') {
				checkSession();
			}
		});

		return () => {
			clearInterval(interval);
			window.removeEventListener('focus', handleFocus);
		};
	});

	onMount(() => {
		if (browser && 'serviceWorker' in navigator) {
			navigator.serviceWorker.register('/service-worker.js', {
				type: 'classic',
				scope: '/'
			});
		}
	});
</script>

<svelte:head>
	{#if $mainTitle || $subTitle}
		<title>{$mainTitle} {$subTitle} – PTDI Design Organization</title>
	{:else}
		<title>PTDI Design Organization</title>
	{/if}
	<link rel="icon" type="image/png" href="favicon-96x96.png" sizes="96x96" />
	<link rel="icon" type="image/svg+xml" href="favicon.svg" />
	<link rel="shortcut icon" href="favicon.ico" />
	<link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png" />
	<link rel="manifest" href="site.webmanifest" />
</svelte:head>

{@render children()}
