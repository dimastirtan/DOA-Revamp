import path from 'path';
import fs from 'fs';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import utwm from 'unplugin-tailwindcss-mangle/vite';
import removeConsole from 'vite-plugin-svelte-console-remover';


function precachePlugin() {
	const assetExts = ['.woff2', '.woff', '.ttf', '.otf', '.png', '.jpg', '.jpeg', '.svg', '.webp', '.ico', '.webmanifest'];
	return {
		name: 'precache-generator',
		writeBundle() {
			const files = [];

			// 1. Walk immutable assets
			const immutableDir = path.resolve('.svelte-kit/output/client/_app/immutable');
			if (fs.existsSync(immutableDir)) {
				function walkImmutable(dir: string) {
					for (const file of fs.readdirSync(dir)) {
						const fullPath = path.join(dir, file);
						const stat = fs.statSync(fullPath);
						if (stat.isDirectory()) {
							walkImmutable(fullPath);
						} else {
							files.push('/_app/immutable/' + path.relative(immutableDir, fullPath).replace(/\\/g, '/'));
						}
					}
				}
				walkImmutable(immutableDir);
			}

			// 2. Walk static assets (only images and fonts)
			const staticDir = path.resolve('static');
			if (fs.existsSync(staticDir)) {
				function walkStatic(dir: string) {
					for (const file of fs.readdirSync(dir)) {
						const fullPath = path.join(dir, file);
						const stat = fs.statSync(fullPath);
						if (stat.isDirectory()) {
							walkStatic(fullPath);
						} else {
							const relPath = path.relative(staticDir, fullPath).replace(/\\/g, '/');
							const ext = path.extname(file).toLowerCase();
							
							// Include if it's an asset extension and not a service worker file
							if (assetExts.includes(ext) && !relPath.includes('service-worker.js') && !relPath.includes('sw-precache.js')) {
								files.push('/' + relPath);
							}
						}
					}
				}
				walkStatic(staticDir);
			}

			const content = `self.__PRECACHE_APP = ${JSON.stringify(files, null, 2)};`;

			// For production build
			const clientOutputPath = path.resolve('.svelte-kit/output/client/sw-precache.js');
			if (fs.existsSync(path.dirname(clientOutputPath))) {
				fs.writeFileSync(clientOutputPath, content);
			}

			// For development/static serving
			const staticPath = path.resolve('static/sw-precache.js');
			fs.writeFileSync(staticPath, content);

			console.log(`Generated sw-precache.js with ${files.length} files`);
		}
	};
}


export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), utwm(), removeConsole(), precachePlugin()],
	ssr: {
		noExternal: true,
		external: [
			'mysql2', // CJS + native bindings
			'html-minifier', // CJS, require at top-level
			'yup', // pulls property-expr (CJS)
			'property-expr', // CJS (implicit dep of yup)
			'blueimp-md5', // UMD, global mutation
			'nodemailer', // CJS + fs/net
			'docxtemplater', // CJS
			'pizzip', // CJS
			'docx2pdf-converter' // Node-only, fs + child_process
		]
	}
});
