// The one shared "am I logged in" store (AD-8). Every page that needs session state reads this -
// never a page-local ad-hoc `GET /api/auth/me` call. Exported as a `const` object whose
// properties are mutated in place; reassigning the exported binding itself from another module is
// invalid ES-module semantics and won't compile (see spec-1-5's Design Notes).
import { apiFetch, apiPost } from './api.js';
import { MeResponse } from '@climbing-logbook/contracts';
import type { z } from 'zod';
import { toast } from 'svelte-sonner';

export type SessionUser = z.infer<typeof MeResponse>;

export const session = $state<{ user: SessionUser }>({
	user: null
});

// Called once at app boot (see +layout.ts) and after a successful login/logout would also be
// valid, though login/logout set `session.user` directly from their own response instead of
// round-tripping through this.
//
// Never lets a failure (API outage, 5xx, network error) escape: this runs from +layout.ts's
// `load()`, and an uncaught throw there would take down the entire SPA with SvelteKit's error
// boundary - the same failure class `+page.svelte`'s `checkHealth` already handles gracefully a
// few lines away. Falling back to "logged out" is the same posture already used for a missing
// session cookie.
export async function refreshSession(): Promise<void> {
	try {
		session.user = await apiFetch<SessionUser>('/api/auth/me');
	} catch {
		session.user = null;
	}
}

export async function logout(): Promise<void> {
	try {
		await apiPost('/api/auth/logout');
		session.user = null;
	} catch {
		// Server-side call failed (network/5xx) - don't clear session.user on a false success, but
		// don't leave the click looking like it did nothing either.
		toast.error('Failed to log out. Please try again.');
	}
}
