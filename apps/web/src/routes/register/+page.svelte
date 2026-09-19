<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { apiPost, ApiError } from '$lib/api.js';
	import { session } from '$lib/session.svelte.js';
	import { RegisterResponse as RegisterResponseSchema } from '@climbing-logbook/contracts';
	import type { z } from 'zod';

	type RegisterResponse = z.infer<typeof RegisterResponseSchema>;

	// Lean register form: email, name, password, one optional invite-code field - no group-name
	// field, no dense settings (see spec-1-4's Boundaries & Constraints).
	let email = $state('');
	let name = $state('');
	let password = $state('');
	let inviteCode = $state('');

	let submitting = $state(false);
	let errorMessage = $state<string | null>(null);
	let registeredUser = $state<RegisterResponse | null>(null);
	let codeCopied = $state(false);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (submitting) return;

		submitting = true;
		errorMessage = null;
		try {
			registeredUser = await apiPost<RegisterResponse>('/api/auth/register', {
				email,
				name,
				password,
				// Omit rather than send an empty string - an absent field means "create a new
				// group", not "look up a group with an empty invite code".
				...(inviteCode.trim() ? { inviteCode: inviteCode.trim() } : {})
			});
			// Registration also sets a real session cookie server-side - mirror login's approach so
			// the shared session store reflects it immediately, without waiting for a page reload.
			session.user = registeredUser;
		} catch (err) {
			// Entered values are intentionally left untouched here so the user doesn't have to
			// retype anything after a failed submission.
			errorMessage = err instanceof ApiError ? (err.problem.detail ?? err.problem.title) : 'Something went wrong. Please try again.';
		} finally {
			submitting = false;
		}
	}

	async function copyInviteCode(code: string) {
		await navigator.clipboard.writeText(code);
		codeCopied = true;
	}
</script>

<main class="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6">
	<Card.Root class="w-full">
		<Card.Header>
			<Card.Title>Create your account</Card.Title>
			<Card.Description>Register to start your own group, or join one with an invite code.</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if registeredUser}
				<div class="flex flex-col gap-3" aria-live="polite">
					<p class="text-sm font-medium text-emerald-600">
						You're in, {registeredUser.name}. Your account has been created.
					</p>
					{#if registeredUser.groupInviteCode}
						<div class="flex flex-col gap-1.5">
							<p class="text-sm">
								You started a new group. Share this invite code with anyone you want to join:
							</p>
							<div class="flex items-center gap-2">
								<code class="border-input bg-muted rounded-md border px-3 py-1.5 font-mono text-sm">
									{registeredUser.groupInviteCode}
								</code>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onclick={() => copyInviteCode(registeredUser!.groupInviteCode!)}
								>
									{codeCopied ? 'Copied!' : 'Copy'}
								</Button>
							</div>
						</div>
					{/if}
				</div>
			{:else}
				<form class="flex flex-col gap-4" onsubmit={handleSubmit}>
					<div class="flex flex-col gap-1.5">
						<label for="name" class="text-sm font-medium">Name</label>
						<input
							id="name"
							type="text"
							required
							autocomplete="name"
							bind:value={name}
							class="border-input bg-background h-9 rounded-md border px-3 text-sm"
						/>
					</div>
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
							minlength="8"
							autocomplete="new-password"
							bind:value={password}
							class="border-input bg-background h-9 rounded-md border px-3 text-sm"
						/>
					</div>
					<div class="flex flex-col gap-1.5">
						<label for="inviteCode" class="text-sm font-medium">Invite code (optional)</label>
						<input
							id="inviteCode"
							type="text"
							autocomplete="off"
							bind:value={inviteCode}
							placeholder="Leave empty to create a new group"
							class="border-input bg-background h-9 rounded-md border px-3 text-sm"
						/>
					</div>

					{#if errorMessage}
						<p class="text-destructive text-sm font-medium" role="alert">{errorMessage}</p>
					{/if}

					<Button type="submit" disabled={submitting}>
						{submitting ? 'Creating account...' : 'Create account'}
					</Button>
				</form>
			{/if}
		</Card.Content>
	</Card.Root>
</main>
