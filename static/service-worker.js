importScripts('https://cdnjs.cloudflare.com/ajax/libs/workbox-sw/7.3.0/workbox-sw.js');
importScripts('/sw-precache.js');

if (workbox) {
	self.__WB_DISABLE_DEV_LOGS = true;

	const immutablePaths = ['/_app/immutable'];
	const staticDestinations = ['image', 'style', 'font'];

	workbox.core.setCacheNameDetails({
		prefix: 'wasabi',
		suffix: 'v1'
	});

	// prefer the injected manifest variable if present (workbox standard)
	const precacheList = self.__PRECACHE_APP || self.__WB_MANIFEST || [];

	workbox.precaching.precacheAndRoute([
		...precacheList.map((url) => (typeof url === 'string' ? { url, revision: null } : url)),
		{ url: '/manifest.json', revision: null },
		{ url: '/site.webmanifest', revision: null }
	]);

	workbox.precaching.cleanupOutdatedCaches();

	// Cache strategies
	const staticCache = new workbox.strategies.CacheFirst({
		cacheName: 'wasabi-static',
		plugins: [
			new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
			new workbox.expiration.ExpirationPlugin({ maxAgeSeconds: 60 * 60 * 24 * 365, maxEntries: 1000 })
		]
	});

	const immutableCache = new workbox.strategies.CacheFirst({
		cacheName: 'wasabi-immutable',
		plugins: [new workbox.cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] })]
	});

	// helper: match cache by pathname (handles query strings)
	async function matchCacheByPath(request) {
		// try exact match
		let match = await caches.match(request);
		if (match) return match;
		// try matching by pathname only (strip query/hash)
		try {
			const url = new URL(request.url);
			match = await caches.match(url.pathname);
			if (match) return match;
		} catch (e) {}
		return null;
	}

	// Minimal data.json that allows SvelteKit client navigation to boot
	function createMinimalDataJson() {
		return new Response(
			JSON.stringify({
				type: 'data',
				nodes: [{ type: 'data', data: null, uses: {} }]
			}),
			{ headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' } }
		);
	}

	// __data.json: network-first but accept status < 400, fallback to cached or minimal
	workbox.routing.registerRoute(
		({ url }) => url.pathname.endsWith('/__data.json'),
		async ({ event }) => {
			try {
				const netResp = await fetch(event.request, { cache: 'no-store' });
				if (netResp && netResp.status < 400) return netResp;
			} catch (e) {
				/* network failed */
			}

			// try any cached version (strip query)
			const cached = await matchCacheByPath(event.request);
			if (cached) return cached;

			// last resort: minimal data so SvelteKit client can mount
			return createMinimalDataJson();
		}
	);

	// navigation: return whatever the network returns. only when fetch throws (network down) do root fallback.
	workbox.routing.registerRoute(
		({ request }) => request.mode === 'navigate' && request.method === 'GET',
		async ({ event }) => {
			try {
				const netResp = await fetch(event.request);
				return netResp;
			} catch (networkErr) {
				// network error: try root as SPA fallback
			}

			try {
				const rootResp = await fetch('/');
				if (rootResp && rootResp.status < 400) return rootResp;
			} catch (e) {}

			// last resort
			return new Response('<!doctype html><meta charset="utf-8"><title>Offline</title><body><h1>Offline</h1><p>Please check your internet connection.</p></body>', {
				headers: { 'Content-Type': 'text/html' }
			});
		}
	);

	// Handle immutable app files (cache-first)
	workbox.routing.registerRoute(({ url }) => immutablePaths.some((path) => url.pathname.includes(path)), immutableCache);

	// Cache static assets (images/styles/fonts) — prefer cache-first
	workbox.routing.registerRoute(({ request, url }) => {
		if (url.pathname.endsWith('/__data.json')) return false;
		if (request.mode === 'navigate') return false;
		if (immutablePaths.some((path) => url.pathname.includes(path))) return false;
		return staticDestinations.includes(request.destination);
	}, staticCache);

	// Network-first for scripts/workers/manifest (short timeout)
	workbox.routing.registerRoute(
		({ request, url }) => {
			if (url.pathname.endsWith('/__data.json')) return false;
			if (request.mode === 'navigate') return false;
			if (immutablePaths.some((path) => url.pathname.includes(path))) return false;
			return ['script', 'worker', 'manifest'].includes(request.destination);
		},
		new workbox.strategies.NetworkFirst({ networkTimeoutSeconds: 3, cacheName: 'wasabi-network-first' })
	);

	// Improved catch handler
	workbox.routing.setCatchHandler(async ({ event }) => {
		const dest = event.request.destination;
		if (dest === 'document' || event.request.mode === 'navigate') {
			return new Response('<!doctype html><meta charset="utf-8"><title>Offline</title><body><h1>Offline</h1><p>Please check your internet connection.</p></body>', {
				headers: { 'Content-Type': 'text/html' }
			});
		}

		// try to return from cache for assets (handle query string mismatches)
		const cachedAsset = await matchCacheByPath(event.request);
		if (cachedAsset) return cachedAsset;

		return Response.error();
	});

	self.skipWaiting();
	workbox.core.clientsClaim();
}
