import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			assets: ['up.php'],
			bodySize: 5 * 1024 * 1024 // 5MB
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