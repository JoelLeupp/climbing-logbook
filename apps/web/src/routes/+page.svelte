<script lang="ts">
	import { onMount } from 'svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';

	type HealthState = 'loading' | 'healthy' | 'unreachable';

	let state = $state<HealthState>('loading');

	// Guards against onMount's initial check and a manual "Recheck" click
	// racing each other - only the response to the most recently issued
	// request is allowed to update state, so a slower stale response can
	// never overwrite a newer one.
	let latestRequestId = 0;

	// Same-origin call: Vite's dev-server proxy forwards /health to apps/api
	// (see vite.config.ts) so there's never a cross-origin request here.
	async function checkHealth() {
		const requestId = ++latestRequestId;
		state = 'loading';
		try {
			const response = await fetch('/health');
			if (requestId === latestRequestId) {
				state = response.ok ? 'healthy' : 'unreachable';
			}
		} catch {
			// Fetch failure (API down, network error, etc.) - render the
			// unreachable state instead of letting this throw or leaving a
			// blank page.
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
</main>
