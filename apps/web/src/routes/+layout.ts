import { refreshSession } from '$lib/session.svelte.js';

// Static SPA only - no server rendering (AD-2). See vite.config.ts for the
// matching adapter-static configuration.
export const ssr = false;

// Client-only load (ssr is false above) - populates the shared session store once at boot so
// every page can read `session.user` already resolved, instead of each page probing
// `GET /api/auth/me` itself.
export async function load() {
	await refreshSession();
}
