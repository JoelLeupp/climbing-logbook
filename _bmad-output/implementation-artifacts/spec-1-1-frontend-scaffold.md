---
title: 'Story 1.1: New Frontend Scaffold & Same-Origin Wiring'
type: 'feature'
created: '2026-09-18'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'b943a8dcc5c807bc20f6ee10dc4f21f2fba35105'
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `apps/web` is still the original Angular scaffold; architecture (AD-3) decided to replace it entirely with SvelteKit + shadcn-svelte, and nothing in the new stack exists yet, so no later Epic 1 story has anywhere to render.

**Approach:** Scaffold a fresh SvelteKit app at the same `apps/web` path via the official Svelte CLI, remove the Angular source, add base shadcn-svelte UI primitives via its own CLI, and wire a dev-time same-origin proxy to `apps/api` so a minimal shell page can call the API's health check and render the result — proving the stack is wired end-to-end.

## Boundaries & Constraints

**Always:** Scaffold via `sv create` (SvelteKit 2 / Svelte 5 runes / Tailwind 4) at the existing `apps/web` path, reusing it — never a parallel `apps/web-svelte`. Add shadcn-svelte via its own CLI (button, card, toast, toggle-group at minimum) — never hand-roll equivalents. Static SPA only: `ssr=false`, no adapter-node. Dev server proxies `/health` (and `/api`, for later stories) to `apps/api`'s dev port — browser only ever talks same-origin. Keep the workspace package name `@climbing-logbook/web` and root `npm run dev:web` / `build --workspace=apps/web` scripts working unchanged.

**Never:** No SSR, no PWA manifest/service worker, no query/cache library (AD-8 is later). No import of `@climbing-logbook/db` from apps/web, even though this story makes no data calls beyond the health check. No real feature screens (auth/group/etc.) — scaffold + health-check shell only, Stories 1.4+ build the rest.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Both dev servers up | Load `/` with `dev:web` + `dev:api` running | Shell shows API status healthy, via proxied `/health` call | N/A |
| API down | Load `/` with only `dev:web` running | Shell shows a clear "API unreachable" state | Fetch failure caught and rendered, never thrown/blank |
| Prod build | `npm run build --workspace=apps/web` | Static output emitted (adapter-static), no server bundle | N/A |

</frozen-after-approval>

## Code Map

- `apps/web/` (whole tree, ~70 files: `angular.json`, `libs/ui/*` spartan components, `src/app/pages/*`, etc.) -- entire Angular app to delete; nothing carries over.
- `apps/api/src/index.ts` -- existing `app.get("/health", ...)` mounted at the **bare** `/health` path, not under `/api/` — keep it there, this story's shell calls it as-is. Same file's `cors()` middleware (keyed on `WEB_ORIGIN`) becomes dead-but-harmless once the dev proxy exists per AD-2 — leave it, don't remove or rely on it.
- `package.json` (root) -- `workspaces: ["apps/*", "packages/*"]`; new `apps/web/package.json` must keep matching this.
- `env.example` -- `WEB_ORIGIN=http://localhost:4200`, `API_PORT=8787`. SvelteKit's dev default port (Vite, 5173) differs from Angular's old 4200 — keep Vite's default rather than forcing 4200; update `WEB_ORIGIN`'s comment to note it's now vestigial (CORS is dead code once the proxy exists).

## Tasks & Acceptance

**Execution:**
- [x] `apps/web/` -- delete the entire existing Angular tree -- being replaced, not extended (AD-3)
- [x] `apps/web/` -- scaffold via `sv create` (SvelteKit 2, Svelte 5, TypeScript, Tailwind 4) at this path -- AD-3
- [x] `apps/web/vite.config.ts` + `apps/web/src/routes/+layout.ts` -- `adapter-static` + `ssr=false` -- AD-2 (no separate `svelte.config.js` in this SvelteKit/vite-plugin version; adapter/ssr config lives in these two files instead — functionally equivalent, noted as an intentional deviation from the task's literal file path)
- [x] `apps/web/vite.config.ts` -- dev-server proxy: `/health` and `/api` -> `http://localhost:8787` -- AD-2
- [x] `apps/web/components.json` + shadcn-svelte CLI -- init, add `button`, `card`, `sonner` (toast), `toggle-group` -- AD-3, DESIGN.md Foundation
- [x] `apps/web/src/routes/+page.svelte` -- shell: calls `/health` on load via the proxy, renders healthy/unreachable using the new `card` component
- [x] `env.example` -- updated the `WEB_ORIGIN` comment per Code Map's note
- [x] `apps/web/package.json` -- name `@climbing-logbook/web`, `dev`/`start`/`build` scripts match root's existing invocations

**Acceptance Criteria:**
- Given the old Angular source, when scaffolding runs, then `apps/web` is rebuilt via `sv create` at the same path, Angular removed.
- Given the shadcn-svelte CLI, when primitives are needed, then they're added via the CLI, not hand-rolled.
- Given the dev server running, when a request hits `/health`, then Vite's proxy forwards it to apps/api same-origin, no CORS.
- Given the app loads in a browser, then a minimal shell renders the API health status.

## Implementation Notes

- No `svelte.config.js` exists in this SvelteKit/vite-plugin version — adapter (`adapter-static`, `fallback: 'index.html'`) and dev proxy live in `vite.config.ts`; `ssr = false` lives in `src/routes/+layout.ts`. Functionally equivalent to what the spec described, just via current tooling's actual file layout.
- shadcn-svelte CLI (v1.7.0) init/add prompts are interactive TUI now, not flag-driven — required scripting stdin keypresses to accept defaults (preset "Vega", base color "neutral"). One-time bootstrap cost, not a recurring concern.
- Theming to DESIGN.md's earthy palette was explicitly out of scope for this story (base color left at shadcn's default "neutral") — later UX-focused stories apply the real tokens.
- `vite.config.ts`'s proxy target (`http://localhost:8787`) is a hardcoded literal rather than read from `process.env.API_PORT` — acceptable for now since it's dev-only tooling config (irrelevant to the adapter-static production build) and matches `env.example`'s default exactly, but worth revisiting via `loadEnv` if the API port ever needs to vary per developer.
- Verified end-to-end in a real browser (Playwright CLI, not just code review + curl-equivalent checks): loaded `http://localhost:5173/`, confirmed the page renders "API is healthy." after the proxied `/health` call resolves. One harmless console 404 for `/favicon.ico` (sv create's default scaffold references `favicon.svg` in `app.html`; browsers additionally auto-request `/favicon.ico`) — cosmetic, not functional, not fixed in this story.

## Review Triage Log

- **false** — blind-hunter/edge-case-hunter: "all app functionality (pages/auth/map/api-client) deleted, no replacement." Verified against frozen Intent: this story is explicitly scoped to scaffold + health-check shell only; Stories 1.4+ and Epic 2 rebuild those. No bad outcome — this is the documented plan, not a regression.
- **false** — blind-hunter: components.json's `style: "vega"` / `menuColor` / `menuAccent` fields "not part of documented schema." Verified: CLI-generated (shadcn-svelte v1.7.0 `init`), and empirically resolves correctly — the build succeeded and all four components generated from this exact file.
- **false** — blind-hunter: `+layout.ts`/`vite.config.ts` citing "AD-2" is "dangling" with no architecture doc in the diff. Verified: normal practice to cite external context in comments; the architecture spine exists in the repo, just not part of this diff's scope. No bad outcome.
- **false** — blind-hunter: `dev`/`start` scripts both alias `vite dev` with "no differentiation." Verified: `start` exists specifically so root's `npm run dev:web` (`npm run start --workspace=apps/web`) keeps resolving unchanged. No bad outcome; package.json can't hold comments to document this.
- **false** — blind-hunter: mixed quote styles in `sonner.svelte`. Verified: unmodified shadcn-svelte registry template content; "fixing" it means hand-editing a generated file, which the architecture explicitly forbids (components are CLI-copied, used as-is).
- **low** — blind-hunter: stray `<meta name="text-scale" content="scale" />` in `apps/web/src/app.html`, not part of the default `sv create` template. Verified present at line 6; likely an artifact of the scripted-keypress shadcn-svelte CLI session. Trivial direct fix (delete the line). → patch.
- **low** — edge-case-hunter: `checkHealth()` in `+page.svelte` has no request-sequencing guard between `onMount` and the "Recheck" button; a slower in-flight request can overwrite state set by a newer one. Verified: real race, concrete failure scenario, trivial fix (request-id guard). → patch.
- **low** — blind-hunter: health status text has no `aria-live` region, so a screen reader never announces the loading→healthy/unreachable transition. Verified: real a11y gap given DESIGN.md/EXPERIENCE.md's consumer-grade accessibility floor; trivial fix (one attribute). → patch.
- **low** — blind-hunter: `apps/web/.npmrc` sets `engine-strict=true` but `package.json` has no `engines` field, so the setting is currently a no-op. Verified via package.json inspection (`.npmrc` itself is sandbox-blocked from direct read, but the absence of `engines` in `package.json` is confirmed). Trivial fix (add `engines` matching the architecture's pinned Node 22.x). → patch.
- **low** — blind-hunter (echoing an earlier round's finding): `apps/api/src/index.ts`'s CORS fallback still hardcodes `http://localhost:4200` even though `env.example`'s `WEB_ORIGIN` default moved to `5173`. Verified: real inconsistency, though the code path is dead-but-harmless per AD-2. Trivial fix (update the literal). → patch.
- **defer** — blind-hunter: no automated test (vitest/Playwright) covers the new `+page.svelte`; `vitest`/`jsdom` were dropped with nothing added. Real gap, but not this story's problem: AD-9's Playwright two-tier test strategy has no story in `epics.md` explicitly assigned to set it up yet — a planning-level gap, not a defect in this diff.
- **defer** — blind-hunter: no lint/format tooling (prettier/eslint) configured for the new `apps/web` stack; `.prettierrc`/`.editorconfig` were deleted with no replacement. Real gap, but no story currently owns setting this up for the new stack.

## Verification

**Commands:**
- `npm install` -- expected: installs cleanly across the workspace
- `npm run dev:web` (with `npm run dev:api` running separately) -- expected: dev server starts, `/` loads, health status reflects apps/api's real state
- `npm run build --workspace=apps/web` -- expected: static build succeeds

**Manual checks (if no CLI):**
- Stop `apps/api` and reload `/` -- shell shows "unreachable", never crashes or blanks.
