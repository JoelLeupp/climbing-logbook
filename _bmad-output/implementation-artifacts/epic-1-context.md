# Epic 1 Context: Account, Group, and App Shell

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

A person can scaffold into the new SvelteKit app, register (creating their own group or joining one via invite code), log in/out, and use the app in German, English, or French. This epic lays the foundation everything else builds on: the frontend rewrite, the API's error/docs contract, the shared typed contract layer between frontend and backend, the group-scoping seam, session auth, and i18n infrastructure.

## Stories

- Story 1.1: New Frontend Scaffold & Same-Origin Wiring — rebuild apps/web on SvelteKit + shadcn-svelte, wire the dev proxy to apps/api.
- Story 1.2: API Error & Docs Foundation — RFC 9457 Problem Details, one global error handler, OpenAPI/Swagger UI via zod-openapi.
- Story 1.3: Shared Contracts Package — packages/contracts with drizzle-zod-generated schemas.
- Story 1.4: Registration - Create or Join a Group — register flow, groups/group_memberships tables, invite-code handling.
- Story 1.5: Login, Logout & Session Persistence — session cookie auth, session probe, dev-login gate.
- Story 1.6: Regenerate Group Invite Code — view/regenerate a group's invite code.
- Story 1.7: Language Switching (DE/EN/FR) — Paraglide-based i18n, localized error messages.

## Requirements & Constraints

- A person can register an account and log in/out via a session cookie (FR6).
- A user can switch the UI language between German (default), English, and French at any time (FR7).
- A person registering either creates a new group (no invite code) or joins an existing group via its invite code; a group member can view/regenerate the invite code; a user belongs to exactly one group (FR8).
- Registering without an invite code creates a new group with the registrant as its only member; registering with a valid code joins that group instead; an invalid/expired code is rejected with a clear error, never a silent fallback to creating a new group; regenerating a code immediately invalidates the old one.
- A registered user stays logged in across page loads; logging out clears the session.
- Switching language updates all visible UI text, including error messages mapped from stable error codes, without losing page state.
- Self-hosted, small fixed groups (roughly 1-10 users); an instance can host multiple isolated groups side by side; one-group-per-user is a v1 constraint, not a schema limit.
- The project is built by an AI coding agent, so tooling favors official, agent-legible paths (official CLIs, official OpenAPI/i18n packages) over community starters. All tooling/dependencies must be free and open-source.

## Technical Decisions

- Frontend scaffold: `apps/web` is fully rebuilt in place via the official Svelte CLI (`sv create` — SvelteKit 2, Svelte 5 runes, Tailwind 4); the old Angular source is removed, no parallel folder. UI primitives are added via the official shadcn-svelte CLI (button, card, toast, toggle-group at minimum), never hand-rolled.
- Rendering/networking: static SPA (`ssr=false`), always same-origin — Vite dev-proxy to the API in dev, single-process serving in prod. Session cookies stay `SameSite=Lax` everywhere; no cross-site cookie path exists.
- API foundation: built on `OpenAPIHono()` + `createRoute()` with Zod schemas (`@hono/zod-openapi`), `@hono/swagger-ui` mounted for docs. Every route gets a schema, including the multipart media route and the dev-login route. Exactly one global error handler produces every error response as `application/problem+json` (RFC 9457); validation failures use one sanctioned extension shape, `errors: [{path, message}]`. Requires bumping `hono` to `^4.10.0` and pinning `zod` to `^4.0.0`.
- Shared contracts: new `packages/contracts` workspace holds one Zod schema per entity plus `ClimbWithTags` and `AuthUser` (public `{id, email, name}` shape, never the raw `users` row with `passwordHash`) plus a Problem Details schema. Base shapes are generated via drizzle-zod from `packages/db/src/schema.ts`; the composite shapes are hand-written. `packages/db` must expose a side-effect-free `@climbing-logbook/db/schema` subpath (exports map pointing only at `schema.ts`) — `packages/contracts`'s generation step imports only that subpath. `apps/web` must never import `@climbing-logbook/db` in any form, even type-only; the default barrel (which opens a live Postgres connection at import time) stays reachable only from `apps/api`.
- Frontend state: plain Svelte 5 runes plus exactly one hand-written API client module for v1 — no query/cache library; every request to the API goes through that one module.
- Test strategy: Playwright network-mocked component tests (zero API involvement) plus full-stack e2e against a real API + Postgres with `NODE_ENV=test`, seeded via an extended, idempotent `packages/db/src/seed.ts`.
- `POST /api/auth/dev-login` (pick a seeded user, no password) is registered on the Hono app only when `NODE_ENV !== 'production'` — it does not exist at all in prod, reusing the existing `NODE_ENV` check already used for the session-cookie secure flag.
- Group data model: new `groups` (id, name, createdAt, `inviteCode`) and `group_memberships` (userId, groupId, joinedAt) tables, added in this epic via Drizzle migration. `inviteCode` is crypto-random (`randomBytes`, same source as session tokens), never a counter/slug/guessable value, and regenerable via a single atomic UPDATE. `POST /api/auth/register` accepts an optional `inviteCode`: absent creates a new group with the registrant as sole member; present-and-valid joins it; present-and-invalid returns a Problem Details error, never a silent fallback. One-group-per-user is enforced at the app layer only, not a DB constraint. (Note: the required `groupId` FK on `climbing_areas` and the `requireGroupMember` route helper land later, in Epic 2 Story 2.1 — this epic only stands up the `groups`/`group_memberships` tables themselves.)
- i18n: `apps/web` uses Paraglide JS with German (default), English, French, runtime-switchable. The API never localizes — Problem Details `type` stays a stable English machine-readable identifier; the frontend maps known `type` values to localized messages.
- Conventions carried into this epic's routes: ids are `uuid`; wire keys are camelCase mapped automatically from snake_case columns; success responses are raw resource JSON (201 create, 204 no-body delete); error responses are always Problem Details.

## UX & Interaction Patterns

- Auth/invite flow is lean: register/login with no dense settings on the way in — just name/email/password plus an optional invite-code field.
- A shared invite link pre-fills the invite code on the register form; submitting lands the user directly in the group's shared view.
- Invalid or expired invite code renders a clear inline error on the form — never a silent fallback to creating a new group.
- Language switcher updates all visible text on screens built so far (auth/register/settings) without losing in-progress form state; defaults to German with no explicit preference set.
- A Problem Details error `type` is never shown to the user as a raw machine identifier — it's always mapped to a localized message.
- Voice and tone: exact glossary vocabulary (group, invite code, etc.) mirrored verbatim in all copy and labels; prose is warm-but-plain, never corporate or climbing-slang.

## Cross-Story Dependencies

- Story 1.1 (frontend scaffold) is a prerequisite for any later frontend work in this epic (1.4-1.7 all need the SvelteKit shell and shadcn-svelte primitives).
- Story 1.2 (error/OpenAPI foundation) underlies every API route added in 1.4-1.6 — they're built on the same global error handler and schema pattern from the start.
- Story 1.3 (contracts package) provides `AuthUser` and other shared shapes that 1.4/1.5's auth routes and frontend consume; it depends on `packages/db`'s schema existing but must not be bypassed by a direct `packages/db` import from `apps/web`.
- Story 1.4 creates the `groups`/`group_memberships` tables and the invite-or-create logic that Story 1.6 (regenerate invite code) directly builds on.
- Story 1.5 (login/session) depends on accounts existing from Story 1.4's registration flow.
- Story 1.7 (i18n) applies across whatever auth/register/settings screens 1.4-1.6 have already built.
- Epic 2's Story 2.1 depends on this epic's `groups`/`group_memberships` tables (from Story 1.4) to add the `groupId` FK to `climbing_areas` and introduce `requireGroupMember` — that enforcement work is explicitly out of scope for this epic.
