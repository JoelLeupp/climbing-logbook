---
title: 'Story 1.4: Registration - Create or Join a Group'
type: 'feature'
created: '2026-09-19'
status: 'done'
route: 'dispatch'
review_loop_iteration: 1
baseline_commit: '140de1b28dbbeac53f4d0d823fa1400fef99fec2'
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `groups`/`group_memberships` don't exist yet, `POST /api/auth/register` has no group logic at all, and `apps/web` has no register screen and no shared API client — nobody can actually create an account tied to a group yet.

**Approach:** Add the `groups`/`group_memberships` tables (AD-16), update `register` to accept an optional `inviteCode`: absent creates a new group (registrant becomes its sole member), present-and-valid joins that group, present-and-invalid returns a Problem Details error. Build the lean register form in `apps/web` and — since this is the first story that calls a real business endpoint — create the one shared API client module AD-8 requires (every future frontend story reuses it, never a second ad-hoc `fetch`). Two implementation defaults the user wouldn't notice, decided here rather than asked: (1) a new group's `name` is auto-generated (`"{registrant's name}'s Group"`) since the lean register form has no name field for the group itself; (2) after a successful register, the frontend shows a minimal "you're in" confirmation rather than navigating anywhere real — there's nowhere to navigate to yet, since Epic 2 hasn't built the map/home view. A general reactive login/session store is explicitly **not** built here — that's Story 1.5's stated scope ("Login, Logout & Session Persistence"); this story only needs the one-shot register call to succeed.

## Boundaries & Constraints

**Always:** `groups.inviteCode` is generated with `randomBytes` (same crypto-random source as session tokens in `lib/session.ts`), never a counter/slug. An invalid/expired invite code is a `400` Problem Details error — never a silent fallback to creating a new group. One group per user for v1 is enforced at the app layer only (no DB unique constraint on `group_memberships.userId`) — lifting it later is an app-code change, not a migration. The register form is lean: email, name, password, one optional invite-code field — no group-name field, no dense settings. The new shared API client module is the *only* place `apps/web` calls `fetch` against `apps/api` from now on.

**Never:** Do not build a general session/login reactive store, protected-route guarding, or a logout flow — Story 1.5 owns all of that. Do not add the `climbing_areas.groupId` FK or `requireGroupMember` — Story 2.1 owns that. Do not touch `login`/`logout`/`me` beyond what's needed to keep them compiling against the schema change.

**Amended post-review (human-confirmed):** `register`'s response *does* include the new group's invite code when a new group was created (never when joining an existing one via a valid code — the caller already has that code) — via a new `RegisterResponse = AuthUser.extend({ groupInviteCode: z.string().optional() })` schema in `packages/contracts`. The confirmation screen displays it. This replaces the original "no response-shape change, defer entirely to Story 1.6" boundary, which review found left a group creator with no way to find or share their own code. Story 1.6 remains the place to view/regenerate the code *later*, from settings.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Register, no invite code | `{ email, name, password }` | `201`, new group created, registrant is its sole member | N/A |
| Register, valid invite code | `{ email, name, password, inviteCode }` matching an existing group | `201`, registrant joins that group, no new group created | N/A |
| Register, invalid invite code | `{ ..., inviteCode: "does-not-exist" }` | `400` Problem Details | Clear `detail` message, no group created |
| Register, duplicate email (existing behavior) | Email already registered | `409` Problem Details (unchanged from today) | N/A |
| Frontend: register succeeds | Form submitted with valid data | Minimal confirmation shown, session cookie set (existing `register` behavior) | N/A |
| Frontend: register fails (any reason) | Form submitted, API returns 4xx | Inline error shown from the Problem Details `detail`, form data preserved | N/A |

</frozen-after-approval>

## Code Map

- `packages/db/src/schema.ts` -- add `groups` (`id` uuid pk default-random, `name` text not null, `inviteCode` text not null unique, `createdAt` timestamp) and `groupMemberships` (`userId` uuid fk->users.id, `groupId` uuid fk->groups.id, `joinedAt` timestamp; composite PK on `(userId, groupId)`, matching the existing `climbTags` composite-PK pattern). Run `npm run db:generate --workspace=packages/db` to produce the migration.
- `apps/api/src/lib/session.ts` -- read-only reference: existing `randomBytes`/`createHash` pattern for session tokens; `groups.inviteCode` generation should reuse the same `randomBytes` import style (sized shorter, e.g. 6 bytes base64url, for a shareable code).
- `apps/api/src/routes/auth.ts` -- `register` handler: add optional `inviteCode` handling (lookup-or-create-group, insert `group_memberships` row) before creating the session. `login`/`logout`/`me` are unaffected by the schema change (they don't touch groups) — leave them as-is.
- `apps/web/src/routes/+page.svelte` -- read-only reference: existing health-check shell from Story 1.1; this story adds a sibling route, doesn't modify this one.
- New `apps/web/src/lib/api.ts` -- the one shared API client module (AD-8): a small `apiFetch`/`apiPost` wrapper handling `credentials: 'include'`, JSON body serialization, and parsing a non-ok response as Problem Details (using the shape from `packages/contracts`'s `ProblemDetails` — this is the first story that actually imports from `packages/contracts`).
- New `apps/web/src/routes/register/+page.svelte` -- the register form: email/name/password/optional invite-code, submits via the new API client, shows the minimal post-success confirmation or an inline error.

## Tasks & Acceptance

**Execution:**
- [x] `packages/db/src/schema.ts` -- add `groups`/`groupMemberships` tables -- AD-16
- [x] `packages/db/` -- generate + apply the migration (`db:generate`, `db:migrate`) -- AD-16
- [x] `apps/api/src/routes/auth.ts` -- `register` accepts optional `inviteCode`: absent → create group (auto-named) + membership; present-valid → join; present-invalid → `400` Problem Details -- AD-16
- [x] `apps/web/src/lib/api.ts` -- new shared API client module (the only `fetch` call site against `apps/api` from now on) -- AD-8
- [x] `apps/web/src/routes/register/+page.svelte` -- lean register form using the new API client -- CAP-8

**Acceptance Criteria:**
- Given no invite code, when registering, then a new group is created and the registrant is its only member (verify via `group_memberships`).
- Given a valid invite code, when registering, then the registrant joins that group — no second group is created.
- Given an invalid invite code, when registering, then the response is `400` Problem Details and no group/membership is created.
- Given the register form, when submitted successfully, then a minimal confirmation renders; when it fails, then the Problem Details `detail` renders inline and the form's entered values are preserved.
- Given `apps/web`, then no component calls `fetch` against `apps/api` directly outside `lib/api.ts`.

## Implementation Notes

- `apps/web` had no runtime dependency on `packages/contracts` or `zod` before this story (only `@climbing-logbook/db` existed as a workspace dependency pattern, and only in `apps/api`/`packages/contracts`). Not called out explicitly in the Code Map, but required to consume `ProblemDetails`/`RegisterResponse` from `packages/contracts` per AD-8's "one shared API client module" - added `"@climbing-logbook/contracts": "*"` and `"zod": "^4.0.0"` to `apps/web/package.json` and ran `npm install` at the repo root to link the workspace package (resolves via the hoisted root `node_modules/@climbing-logbook/contracts` symlink, same mechanism `apps/api` already relies on for `@climbing-logbook/db`).
- `apps/web/src/lib/api.ts` exposes `apiFetch`/`apiPost` plus an `ApiError` class (carrying the parsed `ProblemDetailsBody`) so callers can read `err.problem.detail` for the user-facing message without re-parsing the response themselves. Post-review, `apiFetch` also defensively catches a JSON-parse failure on an ostensibly-2xx response and throws a clear `Error` instead of letting an opaque `SyntaxError` escape (see Review Triage Log).
- **Post-review invite-code alphabet change:** the invite code generation was changed from `randomBytes(6).toString("base64url")` to `randomInt`-driven sampling from a fixed 32-character alphabet (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`) that excludes visually-ambiguous characters (`0`/`O`, `1`/`I`/`L`), still 8 characters, still drawn from `node:crypto`. Incoming codes are `.trim().toUpperCase()`'d before lookup so a code transcribed in lowercase still matches (the stored value is always uppercase-alphabet, so this can't create a collision). See Review Triage Log for why.
- **Post-review transaction wrap:** the user-insert → group-resolve/insert → membership-insert sequence is now wrapped in `db.transaction(async (tx) => {...})`, closing the partial-failure window the original implementation accepted as a risk (a crash between the user insert and the membership insert would have left a user row with no group). The invite-code validity check still happens *before* the transaction opens, so an invalid code continues to write zero rows.
- `register`'s handler resolves the invite code (SELECT against `groups.inviteCode`) *before* the transaction, so an invalid code returns `400` with zero rows written (no dangling user, no group, no membership) - not just "no group created" as the matrix states, but stricter.
- **Post-review error-message wording:** the invalid-invite-code `400` `detail` changed from `"Invalid or expired invite code"` to `"Invalid invite code"` - invite codes never expire in this design (no expiry column, no TTL logic), so the original message asserted a mechanism that doesn't exist.
- **Post-review group-name cap:** the auto-generated group name (`` `${name}'s Group` ``) is now `.slice(0, 100)`'d to guard against an unbounded `name` input producing an oversized group name.
- **Post-review `+page.svelte` retrofit:** Story 1.1's pre-existing `fetch('/health')` call was switched to `apiFetch<{ ok: boolean }>('/health')`. The original Code Map instruction to leave it untouched predated this story's own creation of `lib/api.ts` and its AD-8 "only sanctioned fetch site" acceptance criterion; review correctly flagged the contradiction (see Review Triage Log).
- **Post-review, human-confirmed scope change:** `register`'s `201` response now conditionally includes `groupInviteCode` (via the new `RegisterResponse` contract schema) when this call created a new group, and the register page displays it with a copy-to-clipboard button on the success screen. This was not in the original Intent (which deferred all invite-code *display* to Story 1.6) - review surfaced that a group's creator otherwise has no way to learn or share their own code, the user confirmed the fix belongs here, and the frozen Intent block above was amended accordingly before implementing it.

## Review Triage Log

Three-layer parallel review (blind-hunter, edge-case-hunter, verification-gap) ran against the diff at `baseline_commit`. Dispositions:

| # | Finding | Layer | Disposition | Resolution |
|---|---------|-------|-------------|------------|
| 1 | `apps/web/src/routes/+page.svelte` still called raw `fetch('/health')`, contradicting this story's own acceptance criterion "no component calls fetch against apps/api directly outside lib/api.ts" | edge-case-hunter | **patch** | Retrofitted to `apiFetch<{ ok: boolean }>('/health')`. |
| 2 | User-insert → group-resolve/insert → membership-insert was not atomic; a crash between the user insert and the membership insert would leave a user with no group | verification-gap | **patch** | Wrapped the sequence in `db.transaction(async (tx) => {...})`. |
| 3 | Invalid-invite-code error message said "Invalid or expired invite code", but invite codes have no expiry mechanism (no TTL column, no expiry logic anywhere) | blind-hunter | **patch** | Reworded to "Invalid invite code". |
| 4 | Invite code alphabet (`base64url`) could produce visually-ambiguous characters (`0`/`O`, `1`/`I`/`l`) in a code meant to be typed/shared by hand | blind-hunter | **patch** | Switched to `randomInt`-driven sampling from a fixed unambiguous 32-char alphabet; added case-insensitive matching on lookup. |
| 5 | Auto-generated group name (`` `${name}'s Group` ``) had no length cap against an unbounded `name` input | edge-case-hunter | **patch** | Added `.slice(0, 100)`. |
| 6 | `apiFetch` would throw an opaque `SyntaxError` if a 2xx response body ever failed to parse as JSON | edge-case-hunter | **patch** | Added a `.catch()` that throws a clear, path-identifying `Error` instead. |
| 7 | A group's creator has no way to learn or share their own invite code — the original Intent deferred all code *display* to Story 1.6, but Story 1.6 only covers viewing/regenerating a code *later*, not the creator's very first opportunity to see it | verification-gap | **intent_gap → resolved** | Root cause was inside the frozen Intent, so implementation stopped and the question was routed to the human. User confirmed: show it on the register success screen now. Intent block amended (see "Amended post-review" above); `RegisterResponse` contract schema added; register page updated to display the code with a copy button. |
| 8 | Generated migration SQL file ends without a trailing newline | blind-hunter | **false** | Verified: `drizzle-kit generate`'s own output convention; every other migration file in `packages/db/drizzle/` has the same characteristic. Not a defect. |
| 9 | No automated test coverage (unit or Playwright) for the register endpoint or page | verification-gap | **defer** | Playwright itself isn't installed yet in this repo (tracked in `deferred-work.md`); adding endpoint/component tests ahead of that setup would be inconsistent with every other story so far (1.1-1.3 also shipped without automated tests). Logged as a pre-existing gap, not specific to this story. |
| 10 | Invite-code collision retry logic is absent — if `generateInviteCode()` ever produces a code that collides with an existing one, the insert throws instead of retrying | verification-gap | **defer** | The alphabet gives 32^8 (~1.1 trillion) combinations for a group count that will never exceed a handful of friend groups; the transaction wrap (finding #2) means a collision surfaces as a clean transaction failure (the whole register call fails with a 500), not silent data corruption. Acceptable given the app's actual scale; noted here rather than adding retry complexity for a practically-impossible case. |

## Verification

**Commands (post-patch, re-run against the final code):**
- `npm run db:generate --workspace=packages/db` -- verified: generated `packages/db/drizzle/0001_famous_lake.sql` (creates `groups`, `group_memberships`, FKs to `users`/`groups`) against `DATABASE_URL=postgres://climbing:climbing@localhost:5432/climbing_logbook`.
- `npm run db:migrate --workspace=packages/db` -- verified: applied cleanly against the running docker-compose Postgres.
- `npx tsc --noEmit` in `apps/api`, `packages/db`, `packages/contracts` -- verified: clean, no type errors, in each package.
- `npx svelte-check --tsconfig ./tsconfig.json` in `apps/web` -- verified: `1209 FILES 0 ERRORS 0 WARNINGS`.
- `apps/api` + `apps/web` dev servers started in the background; four register scenarios exercised via direct HTTP calls against the running API:
  - No invite code (`story14-creator@example.test`) -- `201`, response included `groupInviteCode: "FVAAMN72"`; group `"Creator One's Group"` created, registrant its sole member.
  - Valid invite code, submitted **lowercase** (`fvaamn72`, Creator's code) (`story14-joiner@example.test`) -- `201`, no `groupInviteCode` in the response (joined silently, as intended), confirming case-normalization works without weakening matching.
  - Invalid invite code (`story14-invalid@example.test`, `inviteCode: "NOTREAL1"`) -- `400` with body `{"type":"about:blank","title":"Bad Request","status":400,"detail":"Invalid invite code"}` (new wording); no user row created.
  - Duplicate email (re-registering `story14-creator@example.test`) -- `409` with the unchanged `"An account with this email already exists"` message, confirming existing-email behavior wasn't disturbed by the transaction wrap.
  - All test users/groups created above (plus the Playwright-driven browser test user below) were deleted from the dev DB afterward via a one-off cleanup script.
- `playwright-cli` driving a real browser against `http://localhost:5173/register` (proxied to the API):
  - Filled name/email/password (no invite code), submitted -- rendered `"You're in, Playwright Tester. Your account has been created."` plus the new invite-code block: `"You started a new group. Share this invite code with anyone you want to join:"`, the code `S3VSD32G` in a `<code>` element, and a "Copy" button.
  - Clicked "Copy" -- button label flipped to `"Copied!"`, confirming the `navigator.clipboard.writeText` call succeeded and `codeCopied` state updates correctly.

**Manual checks (if no CLI):**
- Inspected `groups`/`group_memberships` rows via a temporary Node script (`postgres` client) after the four register scenarios above to confirm the right group/membership state - see above.
