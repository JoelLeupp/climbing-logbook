---
title: 'Story 1.3: Shared Contracts Package'
type: 'feature'
created: '2026-09-18'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: '9b096fc03ca7e2d40aeeab9b6f9e6a8d9f9234af'
context: ['{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `packages/db` is the only place entity shapes exist, and its default export barrel (`@climbing-logbook/db`) opens a live Postgres connection at import time — nothing safe exists yet for `apps/web` (or anything else) to import types from, and AD-6/AD-7 require a zero-side-effect shared contract layer.

**Approach:** Add the missing side-effect-free `@climbing-logbook/db/schema` export subpath (AD-7), then create a new `packages/contracts` workspace package whose schemas are generated from that subpath via `drizzle-zod`, plus two hand-composed shapes (`ClimbWithTags`, `AuthUser`) and a `ProblemDetails` schema matching `apps/api/src/lib/problem-details.ts`'s shape exactly. This story builds and type-checks the package correctly; it does not yet wire it into `apps/api` or `apps/web` — nothing calls a real API endpoint from the frontend yet (Story 1.1 only wired `/health`), so there is nothing to consume it until Stories 1.4+ add real request/response handling.

## Boundaries & Constraints

**Always:** `packages/db`'s new `./schema` export points only at `schema.ts` — never `client.ts`, never the default barrel. `packages/contracts` generates its base entity schemas via `drizzle-zod`'s `createSelectSchema`/`createInsertSchema` against `@climbing-logbook/db/schema` only. Entity names are singular PascalCase (`Area`, `Sector`, `Climb`, `Tag`, `LogEntry`, `Media`) per the architecture's naming convention — the select schema is the primary export per entity; each also gets an `{Entity}Insert` variant for request validation. `AuthUser` is `{ id, email, name }` only — never includes `passwordHash`, matching `auth.ts`'s existing response shapes exactly.

**Never:** No schema for `users` (raw) or `sessions` or the `climb_tags` join table — only the sanctioned `AuthUser` shape represents user data; `climbTags`'s relationship is expressed through `ClimbWithTags.tags`, not its own export. Do not wire `packages/contracts` into any `apps/api` route or `apps/web` component in this story — no existing route changes behavior. Do not touch `climbs.difficulty`'s free-text type (that's Epic 2 Story 2.5's `AD-19` migration) — this story's `Climb`/`ClimbInsert` schemas reflect today's free-text column as-is.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Import the schema-only subpath without `DATABASE_URL` set | `node`/`tsx` script does `import '@climbing-logbook/db/schema'` with no `DATABASE_URL` env var | Import succeeds, no throw | N/A |
| Import the default barrel without `DATABASE_URL` set (existing, unchanged behavior) | Same, but `import '@climbing-logbook/db'` | Throws (existing behavior, proves the contrast still holds) | N/A |
| `packages/contracts` type-checks | `tsc --noEmit` in `packages/contracts` | Passes, `AuthUser` has no `passwordHash` field, `ClimbWithTags.tags` is `Tag[]` | N/A |

</frozen-after-approval>

## Code Map

- `packages/db/package.json` -- currently `"main": "src/index.ts", "types": "src/index.ts"`, no `exports` field. Add an `exports` map: `"."` → `./src/index.ts` (unchanged, default barrel), `"./schema"` → `./src/schema.ts` (new, side-effect-free).
- `packages/db/src/schema.ts` -- read-only reference for this story; exports `users`, `sessions`, `climbingAreas`, `sectors`, `climbs`, `tags`, `climbTags`, `logEntries`, `media` tables plus `climbKindValues`/`logStatusValues`/`mediaEntityTypeValues`/`mediaKindValues` enums. No changes needed here.
- `apps/api/src/lib/problem-details.ts` -- read-only reference: `ProblemDetailsBody` shape (`type`/`title`/`status`/`detail?`/`instance?`/`errors?`) that the new `ProblemDetails` Zod schema must match field-for-field.
- `apps/api/src/routes/auth.ts` -- read-only reference: `register`/`login`/`me` currently return `{ id, email, name }` by hand — this is exactly what `AuthUser` must match.
- `apps/api/src/routes/climbs.ts` -- read-only reference for `ClimbWithTags`'s actual shape (`GET /api/climbs/:id` returns a climb plus its tags — check the current handler for the exact response structure to match, e.g. `{...climb, tags: [...]}` vs `{...climb, tags: {name}[]}`).
- New `packages/contracts/package.json`, `tsconfig.json` -- new workspace package, no build step (consumed as raw TS, same pattern as `packages/db`), depends on `drizzle-zod`, `zod` (`^4.0.0`, matching `apps/api`'s pin from Story 1.2), and `@climbing-logbook/db` (for the `./schema` subpath only).
- New `packages/contracts/src/index.ts` (or split into per-file modules re-exported from here) -- `Area`/`AreaInsert`, `Sector`/`SectorInsert`, `Climb`/`ClimbInsert`, `Tag`/`TagInsert`, `LogEntry`/`LogEntryInsert`, `Media`/`MediaInsert`, `ClimbWithTags`, `AuthUser`, `ProblemDetails`.

## Tasks & Acceptance

**Execution:**
- [ ] `packages/db/package.json` -- add the `exports` map (`.` and `./schema`) -- AD-7
- [ ] `packages/contracts/package.json` + `tsconfig.json` -- scaffold the new workspace package (picked up automatically by root's `workspaces: ["packages/*"]`) -- AD-6
- [ ] `packages/contracts/src/*` -- generate `Area`/`Sector`/`Climb`/`Tag`/`LogEntry`/`Media` (+ `Insert` variants) via `drizzle-zod` against `@climbing-logbook/db/schema` -- AD-6
- [ ] `packages/contracts/src/*` -- hand-compose `ClimbWithTags` and `AuthUser`, matching `climbs.ts`'s and `auth.ts`'s actual current response shapes -- AD-6
- [ ] `packages/contracts/src/*` -- hand-write `ProblemDetails`, matching `problem-details.ts`'s `ProblemDetailsBody` shape exactly -- AD-4/AD-6
- [ ] verify: importing `@climbing-logbook/db/schema` with no `DATABASE_URL` set does not throw; importing the default barrel still does (contrast check)

**Acceptance Criteria:**
- Given `packages/contracts` and no `DATABASE_URL` env var, when its module is imported, then no Postgres connection attempt occurs and no throw happens.
- Given `packages/contracts`'s `AuthUser` schema, when compared to `auth.ts`'s actual response bodies, then the fields match exactly (`id`, `email`, `name` — no `passwordHash`).
- Given `packages/contracts` alone, when `tsc --noEmit` runs against it, then it passes with no errors.
- Given this story's scope, then no file under `apps/api/src/routes/` or `apps/web/src/` changes behavior.

## Implementation Notes

- Corrected a real architecture assumption: ARCHITECTURE-SPINE.md's Stack table claimed `drizzle-zod 0.8.1+ (confirmed compatible with drizzle-orm ^0.36.0 ...)` - this was asserted, not actually verified, and was wrong. `drizzle-zod@0.8.3`'s compiled code calls `getViewSelectedFields`, which does not exist in `drizzle-orm@0.36.4` despite drizzle-zod's own (inaccurate) `>=0.36.0` peer-range declaration. Bumped `drizzle-orm` to `^0.44.5` across `packages/db` and `apps/api` (resolved to `0.44.7`); full regression-checked (see Verification) with no breakage. Architecture spine's Stack table updated to match.

## Spec Change Log

- **Finding:** blind-hunter (verified, high) - `packages/contracts` throws `SyntaxError: ... does not provide an export named 'getViewSelectedFields'` when imported under a strict ESM loader (plain `node`), because the installed `drizzle-orm@0.36.4` doesn't export a function `drizzle-zod@0.8.3` calls internally. `tsx` (this repo's actual dev runtime) masked it via lenient named-import handling, but this would have broken production (`node dist/index.js` per AD-17) the moment anything imports `packages/contracts`.
- **Amended:** bumped `drizzle-orm` to `^0.44.5` in `packages/db/package.json` and `apps/api/package.json` (not originally in this story's Code Map, since it wasn't known to be broken). Also corrected ARCHITECTURE-SPINE.md's Stack table entry for `drizzle-orm`/`drizzle-zod`, which had asserted compatibility that was never actually verified at runtime.
- **Known-bad state avoided:** shipping a shared contracts package that works in every dev session (via `tsx`) but crashes the moment it's imported under the stricter production runtime.
- **KEEP:** all of Story 1.3's originally-planned schema design (`Area`/`Sector`/`Climb`/`Tag`/`LogEntry`/`Media` + `Insert` variants, `ClimbWithTags`, `AuthUser`, `ProblemDetails`, the `./schema` export-subpath fix) survived unchanged - only the `drizzle-orm` version needed correcting, not the design.

## Review Triage Log

- **false** — blind-hunter: "`package-lock.json` isn't part of this diff." Verified: an artifact of excluding the lockfile from the *review* diff (noise reduction, same practice as prior stories) - it is included in the actual commit.
- **false** — blind-hunter: "no TS project-reference (`composite`/`references`) wiring between packages." Verified: speculative future concern - the monorepo doesn't use `tsc -b` anywhere, matches `packages/db`'s own existing (unreferenced) setup. No current need.
- **false** — blind-hunter: "no README for the new package." Verified: an internal workspace package, not a published library; code comments already carry the relevant rationale. Not worth the churn.
- **low** — blind-hunter + edge-case-hunter (same root cause): `AuthUser` doesn't capture that `GET /api/auth/me` returns bare `null` when there's no session. Verified at `auth.ts` line 79. → patch: added `MeResponse = AuthUser.nullable()`.
- **low** — blind-hunter: `*Insert` schemas don't strip server-controlled columns (`id`, `createdAt`, `createdBy`/`userId`/`uploadedBy`), so a future route naively validating a request body against one could let a client smuggle them through. Not exploitable today (no route uses these schemas yet), but cheap to close now before it's a landmine. → patch: added `.omit(...)` to every Insert schema.
- **low** — blind-hunter: no shared schema for `climbKindValues`/`logStatusValues`/`mediaEntityTypeValues`/`mediaKindValues`. → patch: exported `ClimbKind`/`LogStatus`/`MediaEntityType`/`MediaKind` as `z.enum(...)`.
- **low** — blind-hunter: no explicit note distinguishing `Climb` (list response) from `ClimbWithTags` (detail response). → patch: one-line clarifying comment added above `Climb`'s export.
- **high** — blind-hunter (verified independently, reproduced firsthand): `getViewSelectedFields` runtime crash under a strict ESM loader. See Implementation Notes / Spec Change Log above for the fix (drizzle-orm bump) and full regression verification.
- **defer** — verification-gap (both findings) + blind-hunter (test-coverage finding): no automated test exists for this package or the version-compatibility contract it now depends on. Reinforces the existing Story 1.1 deferred-work.md entry (AD-9/Playwright, not assigned to any story yet) rather than a new ad-hoc test framework.
- **defer** (new) — how `packages/db`/`packages/contracts` (raw TypeScript, no build step) actually get consumed by a production `node dist/index.js` process (per AD-17) is unresolved - plain Node's native ESM loader cannot resolve this package's `.js`-suffixed relative imports to their `.ts` siblings across `index.ts`'s barrel the way `tsx` does. Real gap, but it's Epic 6/Story 6.1's problem (containerized deployment), not this story's - the actual production consumption mechanism (tsx-in-prod, a build step, or something else) hasn't been decided yet.

## Verification

**Commands:**
- `npx tsc --noEmit` in `packages/contracts` -- verified: clean (exit code 0)
- `npx tsc --noEmit` in `packages/db` and `apps/api` -- verified: clean after the `drizzle-orm` bump (regression check)
- `npx drizzle-kit generate` in `packages/db` -- verified: "No schema changes, nothing to migrate" - confirms drizzle-kit still understands `schema.ts` under the bumped `drizzle-orm`
- `node --input-type=module -e "import('@climbing-logbook/db/schema')"` with no `DATABASE_URL` -- verified: no throw
- `node --input-type=module` importing `entities.ts` directly -- verified: no throw, `getViewSelectedFields` error is gone, `AreaInsert` correctly omits `id`, enums resolve correctly
- Live functional regression via `npm run dev:api` against real Postgres: `GET /health`, `GET /api/areas` (real select), `GET /api/areas/<random-uuid>` (real 404), `POST /api/auth/register` (real insert + returning) -- verified: all correct, no behavior change from the `drizzle-orm` bump; test data cleaned up afterward
- `npm install` at the repo root -- verified: `packages/contracts` picked up as a workspace, installs cleanly

**Manual checks (if no CLI):**
- Read `packages/contracts/src/index.ts` and confirmed no export re-exports the default `@climbing-logbook/db` barrel or the raw `users`/`sessions` tables.
