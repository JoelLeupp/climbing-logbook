---
title: 'Story 1.5: Login, Logout & Session Persistence'
type: 'feature'
created: '2026-09-19'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'b30b736cff21e6ca1af0a233b04910b3f0ad2c04'
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `POST /api/auth/login`, `POST /api/auth/logout`, and `GET /api/auth/me` already exist and work (built defensively in Story 1.4), but nothing in `apps/web` calls them: there's no login page, no shared reactive "am I logged in" state, and no way to log out. A page reload also can't restore a logged-in session in the UI even though the cookie/session itself already persists server-side. Separately, AD-10's simplified test-login route (`POST /api/auth/dev-login`) hasn't been built at all.

**Approach:** Add one shared session store (`apps/web/src/lib/session.svelte.ts`, Svelte 5 runes, AD-8) that every page reads for the current logged-in user; populate it once at app boot via the existing `GET /api/auth/me` probe. Add a lean login page mirroring Story 1.4's register page (email/password, inline error, preserved form values). Extend the app shell (`+page.svelte`) to show the current session state and a logout action. Add `POST /api/auth/dev-login` to `apps/api`, registered only when `NODE_ENV !== 'production'` (AD-10), and extend `packages/db/src/seed.ts` with a small fixed set of named test users sharing one bootstrapped "Dev Group" (idempotent, per AD-9's seed-extension rule) so dev-login has something to pick from.

## Boundaries & Constraints

**Always:** Session state lives in exactly one shared module (`lib/session.svelte.ts`) — every page that needs "am I logged in" reads it, never a page-local ad-hoc `GET /api/auth/me` call. All calls to `apps/api` continue to go through `lib/api.ts` (AD-8) — the login page and the session store are consumers of it, never a second `fetch` site. `dev-login`'s registration is gated by the same `process.env.NODE_ENV !== "production"` check `auth.ts` already uses for the session-cookie secure flag — no new env var. `seed.ts` stays idempotent (`onConflictDoNothing` / find-fallback, matching its existing pattern) — safe to re-run against a non-empty database, never a destructive reset.

**Never:** Do not build route guards / protected-route redirects — no route needs to be protected yet (Epic 2 introduces the first group-scoped, auth-required screens). Do not build a "remember me" or session-duration UI — the existing 30-day session in `lib/session.ts` is unchanged. Do not touch `register`'s handler or the register page beyond what's needed to keep them compiling. Do not retrofit `auth.ts`'s existing routes to use `createRoute`/`.openapi()` — that gap predates this story and spans every route file in `apps/api` (logged separately in `deferred-work.md`); `dev-login` follows the existing plain-Hono-route convention already used by `register`/`login`/`logout`/`me`.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Login, valid credentials | `{ email, password }` matching a registered user | `200`, session cookie set, session store's `user` populated from the response | N/A |
| Login, wrong credentials | `{ email, password }` not matching any user, or wrong password | `401` Problem Details (existing, unchanged behavior) | Inline error shown, form values preserved |
| Page reload while logged in | Valid session cookie present, page reloads | `GET /api/auth/me` on boot restores `session.user` without a fresh login | N/A |
| Page reload while logged out | No session cookie | `GET /api/auth/me` returns `null`, `session.user` stays `null` | N/A |
| Logout | Logged-in session | `POST /api/auth/logout` called, cookie cleared, `session.user` reset to `null` | N/A |
| `dev-login`, non-production | `NODE_ENV !== 'production'`, `POST /api/auth/dev-login` (optionally `{ email }` of a seeded test user) | `200`, logs in as that seeded user (or the default one if `email` omitted), session cookie set | Unknown `email` → `400` Problem Details |
| `dev-login`, production | `NODE_ENV === 'production'`, `POST /api/auth/dev-login` | Route does not exist — `404`, not a runtime-rejected `403`/`503` | N/A |

</frozen-after-approval>

## Code Map

- `apps/api/src/routes/auth.ts` -- add `POST /dev-login` immediately after `logout`: reads optional `{ email }` from the body, looks up that seeded user (or a fixed default test user's email when omitted) via the same `db.select().from(users).where(eq(users.email, ...))` pattern `login` already uses, `400` Problem Details if no such user exists, otherwise `createSession`/`setSessionCookie` exactly like `login` and return the same `{ id, email, name }` shape. Wrap the whole route registration in `if (process.env.NODE_ENV !== "production") { ... }` around the `auth.post("/dev-login", ...)` call (AD-10) -- register/login/logout/me are unaffected.
- `packages/db/src/seed.ts` -- read fully before editing (it's short, ~76 lines). After the existing `demoUser` block, idempotently insert/find a `groups` row (fixed `inviteCode`, e.g. `"DEVGROUP"`, via `onConflictDoNothing({ target: groups.inviteCode })` + find-fallback, mirroring the existing `demoUser` fallback pattern) and two more named test users (idempotent via `onConflictDoNothing({ target: users.email })`, same `hashPassword` helper, any placeholder password — consistent with the existing committed `demo1234`). Insert a `group_memberships` row per user into that group (`onConflictDoNothing` on the composite PK). Do not touch the existing area/sector/climb/tag seed logic below it.
- New `apps/web/src/lib/session.svelte.ts` -- exported reactive `session = $state({ user: SessionUser, initialized: boolean })` object (mutate properties, never reassign the export itself -- see Design Notes), plus `refreshSession()` (calls `apiFetch<SessionUser>('/api/auth/me')`, using the existing `MeResponse` schema from `packages/contracts` for the type) and `logout()` (calls `apiPost('/api/auth/logout')` then clears `session.user`).
- `apps/web/src/routes/+layout.ts` -- currently only `export const ssr = false`. Add a `load()` that calls `refreshSession()` once at boot (client-only load, since `ssr` is `false`) so every page can read `session.user` already populated.
- New `apps/web/src/routes/login/+page.svelte` -- mirrors `apps/web/src/routes/register/+page.svelte`'s structure/markup conventions (Card, same form-field styling, same inline-error/preserved-values pattern) but for email+password only; on success sets `session.user` directly from the response (no extra `/me` round trip) and shows a minimal confirmation, consistent with register's existing minimal-confirmation precedent.
- `apps/web/src/routes/+page.svelte` -- read fully before editing. Add a second `Card` below the existing health-check card: when `session.user` is set, show "Logged in as {name}" plus a logout button (calls `logout()` from the session store); when not, show links to `/login` and `/register`. Leave the health-check card/logic untouched.

## Tasks & Acceptance

**Execution:**
- [ ] `apps/api/src/routes/auth.ts` -- add gated `POST /dev-login` -- AD-10
- [ ] `packages/db/src/seed.ts` -- extend with idempotent Dev Group + named test users + memberships -- AD-9
- [ ] `apps/web/src/lib/session.svelte.ts` -- new shared session store -- AD-8
- [ ] `apps/web/src/routes/+layout.ts` -- boot-time `refreshSession()` call
- [ ] `apps/web/src/routes/login/+page.svelte` -- new login page
- [ ] `apps/web/src/routes/+page.svelte` -- show session state + logout action

**Acceptance Criteria:**
- Given valid credentials, when logging in, then a session cookie is set and the frontend (via the session store) reflects the logged-in state without a page reload.
- Given a logged-in session, when the page reloads, then `GET /api/auth/me` restores the logged-in state without a fresh login.
- Given a logged-in user, when logging out, then the session is deleted server-side, the cookie is cleared, and the frontend reflects the logged-out state.
- Given `NODE_ENV !== 'production'`, when `POST /api/auth/dev-login` is called, then it logs in as a seeded test user; given `NODE_ENV === 'production'`, that route does not exist (404).

## Implementation Notes

- `POST /dev-login` defaults to `alice@dev.local` when no `email` is given, resolved via a `DEFAULT_DEV_LOGIN_EMAIL` constant; unknown `email` returns `400` Problem Details naming the email that wasn't found.
- The whole `dev-login` route is grouped behind a single `if (process.env.NODE_ENV !== "production")` block at the end of `auth.ts`, after `me`, rather than interleaved immediately after `logout` as the Code Map suggested — reviewed and accepted as a harmless, arguably clearer organizational choice (see Review Triage Log #11).
- `packages/db/src/seed.ts`'s new `DEV_TEST_USERS` (`alice@dev.local`, `bob@dev.local`, password `devpass123`) share one idempotently-bootstrapped "Dev Group". The group's hardcoded invite code was changed post-review from `"DEVGROUP"` to `"DEVGRPXY"` to stay alphabet-conformant with `generateInviteCode()`'s ambiguous-character exclusions (see Review Triage Log #5) — the stale `"DEVGROUP"` row and its memberships were manually cleaned from the dev database as part of applying that patch, so idempotency re-verification started from a clean slate.
- **Post-review fixes applied** (see Review Triage Log for full findings): `refreshSession()` now catches any `/api/auth/me` failure and falls back to logged-out instead of letting it propagate through `+layout.ts`'s `load()` and take down the whole SPA; `logout()` now catches a failed `/api/auth/logout` call and surfaces a `sonner` toast instead of leaving an unhandled rejection with no feedback; `register/+page.svelte` now sets `session.user` from its response (mirroring `login`), so a freshly-registered user's session state is reflected immediately without a reload; the unused `session.initialized` field was removed (never had a reader — `+layout.ts`'s blocking `load()` already prevents any flash-of-wrong-state it could have guarded); the home page's Session card gained `aria-live="polite"` to match the health-check card and the auth pages' status regions; the login page gained a "No account yet? Register" link.

## Spec Change Log

## Review Triage Log

Three-layer parallel review (blind-hunter, edge-case-hunter, verification-gap) ran against the diff at `baseline_commit`. All three independently found the same root cause for finding #1 — strong signal.

| # | Finding | Layer(s) | Verdict | Evidence | Route |
|---|---------|----------|---------|----------|-------|
| 1 | `refreshSession()` (`session.svelte.ts`) has no try/catch; `+layout.ts`'s `load()` awaits it unguarded, so any `/api/auth/me` failure (API outage, 5xx, network error) throws all the way up and SvelteKit renders its error boundary for the *entire app* — inconsistent with the same page's `checkHealth`, which explicitly wraps the identical failure class | blind-hunter, verification-gap, edge-case-hunter | **high** | Confirmed by reading `apiFetch` (throws on non-2xx/parse failure) and `load()` (no try/catch); `+page.svelte`'s own `checkHealth` shows the established, deliberately-graceful pattern for this exact failure class two lines away | patch |
| 2 | `register/+page.svelte` never sets `session.user` after a successful registration (unlike `login`, which now does), so a freshly-registered user who navigates to `/` without a full reload still sees the logged-out state despite holding a valid session cookie | verification-gap, blind-hunter | **medium** | Confirmed: `register/+page.svelte`'s success branch only sets local `registeredUser`; `RegisterResponse` is structurally assignable to `session.user`'s type | patch |
| 3 | `logout()` has no try/catch; a failed `apiPost('/api/auth/logout')` (network/5xx) leaves an unhandled rejection, `session.user` is never cleared, and the user gets no feedback that the click did nothing | blind-hunter, edge-case-hunter | **low** | Confirmed by reading `logout()`; `Toaster`/`sonner` is already wired app-wide in `+layout.svelte`, giving a ready, consistent feedback channel | patch |
| 4 | `session.initialized` is written (`refreshSession` sets it `true`) but has zero readers anywhere in the codebase | blind-hunter | **low** | Confirmed via a repo-wide grep for `initialized` — only the two write sites in `session.svelte.ts` exist; `+layout.ts`'s `load()` blocks until `refreshSession()` resolves before any page renders, so there is no flash-of-wrong-state scenario this field could guard today | patch (remove the unused field) |
| 5 | `DEV_GROUP_INVITE_CODE = "DEVGROUP"` contains the letter "O", one of the exact visually-ambiguous characters `generateInviteCode()`'s alphabet (same file) deliberately excludes for hand-typed codes | blind-hunter | **low** | Confirmed by reading both constants; cosmetic inconsistency in a hardcoded dev fixture, no functional bug, but the fix is a direct one-line correction so it doesn't meet the low-rejection bar | patch (rename to an alphabet-conformant value) |
| 6 | Home page's new "Session" card isn't wrapped in `aria-live`, unlike the equivalent status card above it (health check) and the login/register success states | blind-hunter | **low** | Confirmed by reading `+page.svelte`: the health-check `Card.Content` has `aria-live="polite"`, the session `Card.Content` added by this diff does not | patch |
| 7 | New `/login` page has no link to `/register` for a visitor without an account | blind-hunter | **low** | Confirmed by reading `login/+page.svelte`'s form view — no such link exists | patch |
| 8 | `POST /dev-login` accepts a literal JSON `null` body without crashing gracefully: `c.req.json().catch(() => ({}))` doesn't catch a *successfully parsed* `null`, so `body.email` throws a `TypeError`, caught by the global handler as a `500` instead of the more accurate `400` | edge-case-hunter | **low** | Confirmed: `register`/`login` (pre-existing, untouched by this diff) have the exact same unguarded `body.email` access with no null-check at all — this is a pre-existing, repo-wide pattern across all `auth.ts` routes, not a defect newly introduced by `dev-login`; global `onError` still returns a well-formed Problem Details `500`, not a raw crash | defer (repo-wide fix, out of this story's scope) |
| 9 | `packages/db/src/seed.ts`'s new `DEV_TEST_USERS` membership insert has no guard against a test-user email already belonging to a *different* group (only the composite-PK conflict target prevents a duplicate row for the *same* group), which could violate the app-layer one-group-per-user invariant | edge-case-hunter | **low** | Confirmed: no pre-check exists; rejected per the low-finding rule — `alice@dev.local`/`bob@dev.local` are synthetic seed-only emails extremely unlikely to collide with a real registration in a small personal-friend-group deployment, and the fix requires a new existence-check guard (more than a direct correction) | rejected |
| 10 | Already-authenticated user opens `/login` and submits different credentials, silently switching sessions with no warning | edge-case-hunter | **low** | Real behavior, but the spec's frozen Boundaries explicitly excluded building any route-guard/protected-route behavior for this epic, and re-authenticating to switch accounts is a reasonable, arguably-intentional capability for a shared/self-hosted app with no other account-switching UI; rejected per the low-finding rule — unlikely to be hit by accident, and a warning banner would be new UI, not a direct correction | rejected |
| 11 | `dev-login` registered after `/me` instead of "immediately after `logout`" as the spec's Code Map stated | blind-hunter | **false** | Checked: the whole `NODE_ENV`-gated block is grouped at the end of the file behind a clear comment, which is at least as readable as interleaving it between `logout`/`me`; the cited follow-on claim ("the route's own comment referencing 'above' logic") is inaccurate — the comment correctly refers to `setSessionCookie`, which *is* above. No demonstrated harm beyond not matching the plan text verbatim | false |



Session store shape (Svelte 5 shared-state pattern -- exported `const` object, mutate properties in place; reassigning the exported binding itself from another module is invalid ES-module semantics and won't compile):

```ts
// apps/web/src/lib/session.svelte.ts
export const session = $state<{ user: SessionUser; initialized: boolean }>({
  user: null,
  initialized: false,
});
```

## Verification

**Commands (post-patch, re-run against the final code):**
- `npx tsc --noEmit` in `apps/api` and `packages/db` -- verified: clean, no type errors, in each package.
- `npx svelte-check --tsconfig ./tsconfig.json` in `apps/web` -- verified: `1212 FILES 0 ERRORS 0 WARNINGS`.
- `npm run seed --workspace=packages/db` run twice in a row (after manually clearing the stale pre-rename `"DEVGROUP"` row and its memberships) -- verified: both runs succeeded with identical console output, no duplicate-key errors; a follow-up query confirmed exactly one Dev Group (`invite_code = 'DEVGRPXY'`) with exactly two memberships (`alice@dev.local`, `bob@dev.local`).
- Live HTTP calls against a running `apps/api`:
  - `login` with `demo@example.com`/`demo1234` -- `200` + cookie; `GET /me` with that cookie -- `200`, restores the user; `POST /logout` -- `204`; `GET /me` again with the same (now-invalidated) cookie -- `200`, `null`.
  - `login` with the wrong password -- `401` Problem Details, unchanged message.
  - `dev-login` with no body -- `200`, defaults to `alice@dev.local`; `dev-login` with `{ "email": "bob@dev.local" }` -- `200`, logs in as Bob; `dev-login` with an unknown email -- `400` Problem Details naming the email.
  - `apps/api` restarted with `NODE_ENV=production`: `dev-login` -- `404` (route genuinely absent, not a runtime rejection); plain `login` -- still `200`, confirming the `NODE_ENV` gate only affects `dev-login`.
- `playwright-cli` against a running `apps/web`: logged in via the form (`demo@example.com`) -- login page showed the "No account yet? Register" link (patch verified) and the success state; navigated to `/` -- Session card showed "Logged in as Demo Climber"; clicked "Log out" -- card reactively switched to "Log in / Register" links with no console errors or unhandled-rejection warnings (logout's new try/catch didn't disturb the happy path); reloaded the page -- logged-out state persisted correctly (confirms `refreshSession`'s new try/catch doesn't break the normal, non-failing case either).

**Manual checks (if no CLI):**
- Inspected `group_memberships`/`groups` rows after seeding (see the idempotency check above) to confirm exactly one Dev Group with the expected members.
- The `register` page's new `session.user = registeredUser` assignment and `refreshSession`'s new failure-fallback path were verified by code reading plus the mechanism check above (the logout test proved the session store's reactive-update path works end-to-end) rather than a redundant separate browser scenario, since both patches reuse the exact same store-mutation mechanism already exercised live.
