# Epic 1 Context: Account, Group, and App Shell

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

A person can scaffold into the new SvelteKit app, register (creating their own group or joining one via invite code), log in/out, and use the app in German, English, or French. This epic lays the whole foundation the rest of the app builds on: the frontend scaffold, the API's error/docs contract, the shared type layer between frontend and backend, and the group/auth model everything else is scoped by.

## Stories

- Story 1.1: New Frontend Scaffold & Same-Origin Wiring
- Story 1.2: API Error & Docs Foundation
- Story 1.3: Shared Contracts Package
- Story 1.4: Registration - Create or Join a Group
- Story 1.5: Login, Logout & Session Persistence
- Story 1.6: Regenerate Group Invite Code
- Story 1.7: Language Switching (DE/EN/FR)

## Requirements & Constraints

- A person can register and log in/out via a session cookie; a session must survive a page reload without re-authenticating (CAP-6).
- The UI language toggles between German (default), English, and French at any time, without losing in-progress form state; Problem Details error `type` values are mapped to a localized message, never shown as a raw machine identifier (CAP-7).
- Registering either creates a brand-new group (no invite code) or joins an existing one via invite code; an invalid/expired code is a clear error, never a silent fallback to creating a new group; any group member can view/regenerate the invite code, immediately invalidating the old one; a user belongs to exactly one group for v1 (CAP-8).
- Deployment target is self-hosted, small fixed groups (roughly 1-10 users), with multiple isolated groups able to coexist on one instance.
- The whole project is built by an AI coding agent and must use free/open-source, official/agent-legible tooling paths over community or exotic alternatives — this is why the frontend is scaffolded via the official Svelte CLI and shadcn-svelte CLI rather than a starter template.

## Technical Decisions

- Layered architecture: `apps/web` (SvelteKit SPA) -> `packages/contracts` (shared Zod schemas, zero DB dependency) <- `apps/api` (Hono) -> `packages/db` (Drizzle/Postgres). `apps/web` must never import `@climbing-logbook/db`, even type-only; `packages/db` exposes a side-effect-free `./schema` subpath for that purpose.
- `apps/web` is scaffolded fresh via the official Svelte CLI (`sv create`: SvelteKit 2, Svelte 5 runes, Tailwind 4) at the existing path, replacing the Angular source outright — no parallel folder, no community starter. UI primitives are added via the shadcn-svelte CLI, never hand-rolled.
- Rendering is a static SPA (no SSR), always same-origin: Vite's dev server proxies `/api/*` to `apps/api` in dev, single-process serving in prod. Session cookies stay `SameSite=Lax` everywhere; no cross-site cookie path exists.
- `apps/api` routes are built on `OpenAPIHono()` + `@hono/zod-openapi`, with `@hono/swagger-ui` mounted for docs; every route (including future dev-login/multipart routes) gets a schema. Exactly one global error handler produces every response as RFC 9457 `application/problem+json`; validation failures use one sanctioned `errors: [{path, message}]` extension shape.
- `packages/contracts` holds one Zod schema per entity plus a Problem Details schema and hand-composed `AuthUser`/`ClimbWithTags` shapes, generated from `packages/db/src/schema.ts` via drizzle-zod against the `./schema` subpath only.
- Frontend state uses plain Svelte 5 runes plus exactly one hand-written API client module for all backend calls — no query/cache library.
- Test strategy is two-tier: Playwright network-mocked component tests, plus full-stack e2e against real Postgres with `NODE_ENV=test`, seeded via an idempotent, extended `seed.ts`.
- `POST /api/auth/dev-login` (pick a seeded user, no password) is registered only when `NODE_ENV !== 'production'`, reusing the existing `NODE_ENV` check already used for the session-cookie secure flag — it does not exist at all (404) in production.
- i18n uses Paraglide JS in `apps/web` only (German default, English, French, runtime-switchable); `apps/api` never localizes — Problem Details `type` stays a stable English identifier for the frontend to map.
- New `groups` (id, name, createdAt, inviteCode) and `group_memberships` (userId, groupId, joinedAt) tables. `inviteCode` is crypto-random (`randomBytes`, same source as session tokens), never a counter or slug. Registration accepts an optional `inviteCode`: absent creates a new group; present-and-valid joins it; present-and-invalid returns a Problem Details error. One-group-per-user is enforced at the app layer only, not a DB constraint. Any group member can atomically regenerate `inviteCode`, immediately invalidating the old one.
- Current pinned versions: `hono ^4.10.0`, `zod ^4.0.0`, `@hono/zod-openapi ~1.6.x`, `drizzle-orm ^0.44.5`, `drizzle-zod 0.8.1+`, Postgres 18, SvelteKit 2, Svelte 5, Tailwind 4. Note: `drizzle-orm` was bumped up from an originally-planned `^0.36.0` during Story 1.3 — `drizzle-zod@0.8.3` needs an export `0.36.4` lacks despite its own peer-range claim, a real runtime crash caught during that story, not a type-check issue. Don't reintroduce `^0.36.0`.
- Conventions: ids are `uuid`; wire keys are camelCase (Drizzle maps to snake_case automatically); success responses are raw resource JSON with no wrapper (201 create, 204 no-body delete); ownership-scoped writes return 404 (not 403) for both "not found" and "not yours."

## UX & Interaction Patterns

- Auth/invite flow is deliberately lean: no dense settings on the way in. The register form is name/email/password plus an optional invite-code field, pre-filled when arriving via a shared invite link.
- Invalid/expired invite code renders a plain inline error on the form — never a silent fallback to creating a new group.
- Exact glossary vocabulary (`group`, `invite code`, etc.) is mirrored verbatim in all copy and code-facing labels — never a slang synonym.
- Language switcher is reachable at any time; switching re-renders all visible text on screens built so far without losing in-progress form state; defaults to German with no explicit preference set.
- No dark mode, no native app/PWA, no offline mode — out of scope everywhere, including this epic's shell.

## Cross-Story Dependencies

- Story 1.3 (contracts) generates schemas from `packages/db/src/schema.ts` and is consumed by both 1.2's API routes and 1.1's frontend client — build it before wiring real request/response validation.
- Story 1.4 introduces the `groups`/`group_memberships` tables that Story 1.5 (session/login) and Story 1.6 (invite regeneration) both build on.
- Story 1.7's language switching applies to the screens produced by 1.1/1.4/1.5/1.6 (auth, register, settings) and depends on Paraglide being wired into the Story 1.1 scaffold.
- Epic 2 depends on the `groups`/`group_memberships` tables and invite/registration flow landed here: its `requireGroupMember` helper and the `groupId` FK on `climbing_areas` build directly on this epic's group model.
