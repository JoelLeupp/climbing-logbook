import tailwindcss from '@tailwindcss/vite';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const API_ORIGIN = 'http://localhost:8787';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) => filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// Static SPA build only - no SSR, no adapter-node (AD-2).
			adapter: adapter({ fallback: 'index.html' })
		})
	],
	server: {
		// Dev-time same-origin proxy to apps/api - the browser only ever talks
		// same-origin, apps/api's CORS middleware becomes dead-but-harmless (AD-2).
		proxy: {
			'/health': API_ORIGIN,
			'/api': API_ORIGIN
		}
	}
});
