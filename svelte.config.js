import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		// Batas ukuran upload BUKAN opsi adapter (adapter-node mengabaikan
		// `bodySize`). Diatur lewat env BODY_SIZE_LIMIT saat `node build` jalan.
		adapter: adapter({
			assets: ['up.php']
		}),
		alias: {
			'@/*': './path/to/lib/*'
		},
		csrf: {
			checkOrigin: false
		},
		serviceWorker: {
			register: false
		},
		output: {
			bundleStrategy: 'split'
		}
	},

	vitePlugin: {
		inspector: false
	}
};

export default config;