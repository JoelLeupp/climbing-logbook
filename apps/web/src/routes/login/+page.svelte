<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { apiPost, ApiError } from '$lib/api.js';
	import { session } from '$lib/session.svelte.js';
	import { AuthUser } from '@climbing-logbook/contracts';
	import type { z } from 'zod';

	type AuthUserResponse = z.infer<typeof AuthUser>;

	// Lean login form: email + password only, mirroring register's structure/markup conventions
	// (Card, same form-field styling, same inline-error/preserved-values pattern).
	let email = $state('');
	let password = $state('');

	let submitting = $state(false);
	let errorMessage = $state<string | null>(null);
	let loggedInUser = $state<AuthUserResponse | null>(null);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (submitting) return;

		submitting = true;
		errorMessage = null;
		try {
			const user = await apiPost<AuthUserResponse>('/api/auth/login', { email, password });
			// Set session.user directly from the response - no extra /me round trip.
			session.user = user;
			loggedInUser = user;
		} catch (err) {
			// Entered values are intentionally left untouched here so the user doesn't have to
			// retype anything after a failed submission.
			errorMessage =
				err instanceof ApiError ? (err.problem.detail ?? err.problem.title) : 'Something went wrong. Please try again.';
		} finally {
			submitting = false;
		}
	}
</script>

<main class="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6">
	<Card.Root class="w-full">
		<Card.Header>
			<Card.Title>Log in</Card.Title>
			<Card.Description>Log in to your climbing-logbook account.</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if loggedInUser}
				<div class="flex flex-col gap-3" aria-live="polite">
					<p class="text-sm font-medium text-emerald-600">
						Welcome back, {loggedInUser.name}. You're logged in.
					</p>
					<a href="/" class="text-sm underline underline-offset-4">Go to home</a>
				</div>
			{:else}
				<form class="flex flex-col gap-4" onsubmit={handleSubmit}>
					<div class="flex flex-col gap-1.5">
						<label for="email" class="text-sm font-medium">Email</label>
						<input
							id="email"
							type="email"
							required
							autocomplete="email"
							bind:value={email}
							class="border-input bg-background h-9 rounded-md border px-3 text-sm"
						/>
					</div>
					<div class="flex flex-col gap-1.5">
						<label for="password" class="text-sm font-medium">Password</label>
						<input
							id="password"
							type="password"
							required
							autocomplete="current-password"
							bind:value={password}
							class="border-input bg-background h-9 rounded-md border px-3 text-sm"
						/>
					</div>

					{#if errorMessage}
						<p class="text-destructive text-sm font-medium" role="alert">{errorMessage}</p>
					{/if}

					<Button type="submit" disabled={submitting}>
						{submitting ? 'Logging in...' : 'Log in'}
					</Button>

					<p class="text-muted-foreground text-sm">
						No account yet? <a href="/register" class="underline underline-offset-4">Register</a>
					</p>
				</form>
			{/if}
		</Card.Content>
	</Card.Root>
</main>
