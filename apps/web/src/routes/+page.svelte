<script lang="ts">
	import { onMount } from 'svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { apiFetch } from '$lib/api.js';
	import { session, logout } from '$lib/session.svelte.js';

	type HealthState = 'loading' | 'healthy' | 'unreachable';

	let state = $state<HealthState>('loading');

	// Guards against onMount's initial check and a manual "Recheck" click
	// racing each other - only the response to the most recently issued
	// request is allowed to update state, so a slower stale response can
	// never overwrite a newer one.
	let latestRequestId = 0;

	// Goes through the one shared API client (lib/api.ts, AD-8) like every other apps/api call -
	// same-origin via Vite's dev-server proxy (see vite.config.ts), never a direct fetch here.
	async function checkHealth() {
		const requestId = ++latestRequestId;
		state = 'loading';
		try {
			await apiFetch<{ ok: boolean }>('/health');
			if (requestId === latestRequestId) {
				state = 'healthy';
			}
		} catch {
			// Any failure (API down, non-ok response, network error) - render the unreachable
			// state instead of letting this throw or leaving a blank page.
			if (requestId === latestRequestId) {
				state = 'unreachable';
			}
		}
	}

	onMount(() => {
		checkHealth();
	});
</script>

<main class="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6">
	<Card.Root class="w-full">
		<Card.Header>
			<Card.Title>climbing-logbook</Card.Title>
			<Card.Description>apps/web talking to apps/api via the same-origin proxy</Card.Description>
		</Card.Header>
		<Card.Content aria-live="polite">
			{#if state === 'loading'}
				<p class="text-muted-foreground text-sm">Checking API status...</p>
			{:else if state === 'healthy'}
				<p class="text-sm font-medium text-emerald-600">API is healthy.</p>
			{:else}
				<p class="text-destructive text-sm font-medium">API unreachable.</p>
			{/if}
		</Card.Content>
		<Card.Footer>
			<Button variant="outline" size="sm" onclick={checkHealth}>Recheck</Button>
		</Card.Footer>
	</Card.Root>

	<Card.Root class="w-full">
		<Card.Header>
			<Card.Title>Session</Card.Title>
		</Card.Header>
		<Card.Content aria-live="polite">
			{#if session.user}
				<p class="text-sm">Logged in as {session.user.name}</p>
			{:else}
				<div class="flex gap-3 text-sm">
					<a href="/login" class="underline underline-offset-4">Log in</a>
					<a href="/register" class="underline underline-offset-4">Register</a>
				</div>
			{/if}
		</Card.Content>
		{#if session.user}
			<Card.Footer>
				<Button variant="outline" size="sm" onclick={logout}>Log out</Button>
			</Card.Footer>
		{/if}
	</Card.Root>
</main>
