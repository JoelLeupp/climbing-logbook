---
name: 'review-divergence'
type: architecture-review
target: 'architecture-climbing-logbook-2026-09-18/ARCHITECTURE-SPINE.md'
purpose: adversarial-divergence-check
created: '2026-09-18'
---

# Adversarial Divergence Review — climbing-logbook Architecture Spine

Method: for each AD, construct two "units one level down" (two epics/stories, or two
people/agents building different slices) that each satisfy the AD's rule text to the
letter, yet ship incompatible code. Findings are ordered roughly by blast radius.
Several are grounded directly in the current repo state (`packages/db`, `apps/api/src`),
not just hypothetically.

## Verdict

The spine is solid on the big topology decisions (SPA vs SSR, dependency direction,
error format family, ownership philosophy) but leaves several **boundary and shape
details unspecified precisely where two independent builders would each make a
different, locally-defensible choice**. The sharpest hole is a real import-cycle hazard
between AD-6 and AD-7 that can crash `apps/web`'s build; several others are contract-drift
and ownership-model gaps that will silently produce two incompatible flavors of the
"same" cross-cutting concern (errors, ownership checks, seed data, API client shape).

---

## Finding 1 — `packages/contracts` can be wired to reach the DATABASE_URL-throwing barrel, defeating AD-7's whole purpose

**Severity: high — breaks the build, not just style.**

AD-6 requires `packages/contracts` to derive schemas "from `packages/db/src/schema.ts`
via drizzle-zod." AD-7 requires `packages/db/src/client.ts` to throw at import time
without `DATABASE_URL`, specifically so `apps/web` never accidentally drags in a live DB
connection — but AD-7's text only names `client.ts` as the hazard and never says
`packages/db` must expose a *schema-only* import path separate from the barrel.

Today `packages/db/src/index.ts` is a single barrel:
```ts
export * from "./schema.js";
export * from "./hashing.js";
export { db } from "./client.js";
```
Every existing `apps/api` route already imports through this barrel, e.g.
`import { db, climbingAreas } from "@climbing-logbook/db"` (`areas.ts`, `logs.ts`,
`media.ts`).

- **Builder A** (wiring `packages/contracts`) does the obviously-consistent thing and
  imports the same way every other file in the repo does:
  `import { climbingAreas } from "@climbing-logbook/db"`. This satisfies AD-6 to the
  letter ("derived ... from packages/db/src/schema.ts via drizzle-zod").
- **Builder B**, aware of AD-7, instead does a deep/subpath import
  (`@climbing-logbook/db/src/schema.js`) specifically to dodge `client.ts`.

Both readings are compliant with AD-6's and AD-7's rule text as written. But AD-6 *also*
requires "apps/web imports these schemas for typed API responses" — so if Builder A's
version ships, then `apps/web` (via `packages/contracts`) transitively re-executes
`client.ts`'s import-time `DATABASE_URL` throw during `apps/web`'s own build/dev-server/
Vitest run, i.e. exactly the failure mode AD-7 exists to prevent, while nobody violated
AD-7's literal text (which never mentions `packages/contracts` or the barrel at all).

**Almost-but-doesn't-quite-prevent:** AD-7 ("packages/contracts exists specifically so
consumers never need to import packages/db to get types") — but it doesn't say
`packages/contracts`'s *own* implementation is forbidden from importing the live-DB
barrel, only that downstream consumers of `packages/contracts` don't need to. AD-6 never
specifies the import path `packages/contracts` must use to reach `schema.ts`.

**Fix direction:** add an AD (or tighten AD-7) mandating `packages/db` expose a
side-effect-free subpath export (e.g. `@climbing-logbook/db/schema`, wired via
`package.json` `exports`) that `packages/contracts` is required to use, and forbid
`packages/contracts` from importing the barrel or `client.ts` under any name.

---

## Finding 2 — AD-2 (cross-origin) and AD-12 (same-origin production serving) give contradictory `SameSite` cookie guidance

**Severity: high — silent auth breakage, environment-dependent.**

AD-2 mandates cross-origin `credentials: include` cookie topology "same as the current
Angular SPA" — confirmed live in `apps/api/src/index.ts`'s `cors({ origin: WEB_ORIGIN,
credentials: true })`. Cross-origin cookie delivery in browsers requires
`SameSite=None; Secure`.

AD-12 mandates `apps/api` serve the built SvelteKit static output itself at `/`, "one
process, one container" — meaning in the production topology, frontend and API are
**same-origin**.

- **Builder A**, owning the session-cookie code path, sets `SameSite=None; Secure`
  everywhere, because AD-2 says the topology is cross-origin and the cookie must survive
  that in every environment.
- **Builder B**, owning the production Docker/Helm rollout per AD-12, reasons "we're
  same-origin in prod now, `SameSite=Lax` is simpler and strictly safer" and sets
  `SameSite=Lax` for the production profile.

Both are defensible readings of "same topology as the current Angular SPA" (which was
itself cross-origin in dev but might not need to be in the AD-12 production shape).
Neither AD reconciles the two, and — unlike the secure-flag / dev-login gating, which
AD-10 explicitly ties to `NODE_ENV` — nothing says `SameSite` should be
environment-conditional at all, so the two builders' code doesn't even agree on whether
this is a single constant or an env-branched value.

**Almost-but-doesn't-quite-prevent:** AD-10's `NODE_ENV` gating pattern is the obvious
template to reuse here, but it's scoped explicitly to "the session-cookie secure flag"
and "registration of dev-login" — it never mentions `SameSite`.

**Fix direction:** extend the Consistency Conventions row on cookies to pin `SameSite`
(and confirm whether AD-12's same-origin production topology changes the cross-origin
requirement at all, or whether apps/web is still expected to be served separately in
some deployments per the Deferred section's "whoever stands this up" language).

---

## Finding 3 — RFC 9457 `extensions` shape for validation errors is unspecified, and two valid wiring points exist

**Severity: medium-high — apps/web error rendering forks per route.**

AD-4 mandates `application/problem+json` with "type/title/status/detail/instance +
extensions" but never specifies the extension keys/shape for the single most common
error case: Zod validation failure. AD-5's `@hono/zod-openapi` has a default
validation-failure hook that can be overridden either **globally** via `app.onError`, or
**per-route** via a `hook` callback passed to `createRoute()` — both are legitimate
"Zod request/response schemas" usage per AD-5.

- **Builder A** (areas/sectors) wires a single global `app.onError` that catches
  `ZodError` and turns it into Problem Details with `errors: [{ path: string[], message:
  string }]`.
- **Builder B** (climbs/tags) instead passes a local `hook` to each route's
  `createRoute()` that returns Problem Details directly, shaped as `fields:
  Record<string, string>` — and because a route-level hook short-circuits before
  `onError` fires, Builder A's global handler never even sees these requests.

Both satisfy AD-4 ("type/title/status/detail/instance + extensions") and AD-5 to the
letter. `apps/web`'s error-mapping code (which AD-11 requires to map `type` → localized
message) now has to branch on two incompatible extension shapes for the same logical
error class, depending purely on which route was called.

**Almost-but-doesn't-quite-prevent:** AD-4 says "across every route" (implying one
consistent shape) but never names the extension fields or mandates a single
enforcement point (global vs per-route).

**Fix direction:** add an AD pinning the exact Problem Details extension schema for
validation errors (field, message array shape) and mandating a single enforcement
point (one global `onError`, no per-route hooks that bypass it) — this schema belongs in
`packages/contracts` per AD-6's own logic, since it's shared between both apps.

---

## Finding 4 — Media ownership model is entirely outside AD-13's scope, and the existing code already has a third, unsanctioned model

**Severity: medium-high — already latent in the codebase.**

AD-13 binds exactly `routes/areas.ts, sectors.ts, climbs.ts, tags.ts, logs.ts` and states
two models: shared-editable (no owner check) vs. per-user-owned (`eq(userId,
currentUser.id)`). `routes/media.ts` is conspicuously absent from AD-13's binds list.

Yet `apps/api/src/routes/media.ts` already enforces a **third** model on delete:
```ts
.where(and(eq(mediaTable.id, c.req.param("id")), eq(mediaTable.uploadedBy, c.get("user")!.id)))
```
— ownership keyed to `uploadedBy`, decoupled from whatever parent entity (Area/Sector/
Climb/LogEntry) the media is polymorphically attached to. This is neither
"shared-editable" (matching Area/Sector/Climb, which Media mostly documents) nor
"per-user-owned via the parent's owner" (matching LogEntry) — it's owner-of-the-upload,
a distinct axis AD-13 never names.

- **Builder A**, extending media for climbs (a shared-editable entity), "fixes" this by
  removing the `uploadedBy` check, reasoning media should inherit the shared-editable
  spirit of its climb/area/sector parents.
- **Builder B**, extending media for log entries (a per-user-owned entity), tightens/
  keeps the `uploadedBy` check, reasoning media should inherit log-entry's per-owner
  spirit — but per-owner-of-*upload*, not per-owner-of-the-*log-entry*, which is a subtly
  different rule (a friend could still upload photos to *your* log entry today and only
  they, not you, could delete them).

Nothing in AD-13 stops either reading, because media.ts isn't bound by AD-13 at all.

**Almost-but-doesn't-quite-prevent:** AD-13's stated philosophy ("small group of
friends" shared-editable except for personal log entries) clearly implies an answer, but
the rule's binds list doesn't reach the one entity (Media) that's polymorphically
attached to all the others, and the current code's actual behavior isn't any of AD-13's
two named models.

**Fix direction:** extend AD-13 (or add a companion AD) that explicitly states Media's
ownership rule — most likely "inherits the shared-editable/per-owner status of its
parent entity type," not "owner of upload" — and add `routes/media.ts` to AD-13's binds
list.

---

## Finding 5 — AD-6 only covers base (select/insert) shapes; PATCH/partial, filter, and multipart bodies are contract-drift territory

**Severity: medium.**

AD-6's rule text: "one Zod schema per entity ... Base shapes are generated ... via
`createSelectSchema`/`createInsertSchema`." It says nothing about partial/PATCH bodies
(every entity's `.patch()` handler needs one), list-endpoint query filters (`logs.ts`
already has ad hoc `climbId`/`userId` filters with no schema at all), or the
multipart/form-data body for `media.post` (file + entityType + entityId — not
expressible as a plain JSON Zod object the same way).

- **Builder A** (areas/sectors), reading AD-6's intent broadly, adds
  `AreaUpdateSchema = AreaInsertSchema.partial()` to `packages/contracts`, keeping the
  whole entity's schema surface centralized.
- **Builder B** (climbs/tags), reading AD-6's rule text narrowly — "one Zod schema per
  entity," singular, i.e. only the base shape belongs in `packages/contracts` — defines
  an ad hoc inline partial object directly inside `routes/climbs.ts`, never touching
  `packages/contracts`.

`apps/web` ends up with typed, shared update contracts for some entities and none for
others, despite both builders satisfying AD-6's literal text.

**Almost-but-doesn't-quite-prevent:** AD-6's naming convention row implies full
per-entity schema ownership lives in `packages/contracts`, but never says so for
non-base (update/filter/multipart) shapes.

**Fix direction:** extend AD-6 to state explicitly that *all* request/response shapes
per entity — including partial-update and list-filter schemas — live in
`packages/contracts`, and call out multipart media upload as the one deliberate
exception with its own documented contract.

---

## Finding 6 — Ownership-check failure mode (404-via-WHERE vs. fetch-then-403) is unpinned by AD-13

**Severity: medium.**

AD-13's rule — "update/delete require `eq(userId, currentUser.id)`" — is satisfied
equally by (a) folding the predicate into the SQL `WHERE` clause so a wrong-owner
request returns the same "0 rows" path as a truly missing row (what `logs.ts` and
`media.ts` already do: fetch-with-ownership-predicate, then `if (!entry) return 404`),
or (b) fetching by id first, then comparing `userId` in application code and returning
403 Forbidden on mismatch, 404 only if truly absent.

- **Existing code** (logs.ts, media.ts) already uses pattern (a) — wrong owner and
  missing resource are indistinguishable, both surface as 404.
- A **future builder** adding a new per-user-owned resource under the same philosophy
  might reasonably use pattern (b), arguing 403 is more RESTfully correct for "resource
  exists but you don't own it."

Both patterns satisfy AD-13's literal text; the resulting HTTP status contract
(404-always vs. 404-or-403) differs per endpoint, and AD-11's frontend error-mapping
layer has to special-case which status a given ownership violation produces per route
rather than relying on one rule.

**Almost-but-doesn't-quite-prevent:** AD-13 defines *who* must be checked, not *how the
check surfaces* as an HTTP response.

**Fix direction:** pin the failure-mode choice (recommend keeping the existing
404-via-WHERE pattern, since two routes already do it, and state it explicitly in AD-13
or the Consistency Conventions table so it's binding, not incidental).

---

## Finding 7 — `packages/db/src/seed.ts` has no idempotency/ordering contract, so two "extends seed.ts" diffs can be mutually destructive

**Severity: medium — test-environment flakiness, hard to diagnose.**

AD-9's only instruction is "seeded with a small fixed set of named test users by
extending `packages/db/src/seed.ts`." It doesn't say whether re-running seed is
idempotent (upsert-by-known-id) or destructive (truncate-then-insert), nor whether
feature-specific fixtures must be independent of each other or may depend on
insertion order.

- **Builder A** extends `seed.ts` assuming a truncate-first policy, so re-running always
  starts from a clean slate before inserting fixture climbing areas/sectors/climbs.
- **Builder B**, adding fixture log entries in a later diff, assumes `seed.ts` is
  append-only/idempotent and writes log-entry fixtures that reference Builder A's rows
  by id, expecting them to persist across re-runs.

Both "extended `seed.ts`" per AD-9's letter. Running the combined seed twice in CI
either wipes Builder B's dependent rows (if Builder A's truncate step runs first each
time and nobody re-seeds A's data in the same pass) or throws duplicate-key errors,
depending on execution order — a classic full-stack-e2e flake with no architectural rule
to point to.

**Almost-but-doesn't-quite-prevent:** AD-9 mandates *where* fixtures live, not their
idempotency contract.

**Fix direction:** state in AD-9 (or the seed.ts module itself, referenced from AD-9)
that seeding is idempotent/upsert-by-fixed-id and that all fixtures must be added to one
ordered, re-runnable seed function — not distributed across independently-assumed
truncate/append semantics.

---

## Finding 8 — `POST /api/auth/dev-login` has no shared contract at all (it's not one of AD-6's six entities)

**Severity: medium.**

AD-6's shared-contract mandate names exactly six entities (Area, Sector, Climb, Tag,
LogEntry, Media) plus Problem Details. `dev-login` isn't one of them, so nothing
requires — or even suggests — a `packages/contracts` schema for its request/response
shape, even though it's a real boundary shared by `apps/web`'s Playwright fixture and
`apps/api`.

- A **frontend test-fixture author**, following AD-9's phrasing ("named test users"),
  builds the login helper assuming the body is `{ username: "alice" }`.
- The **backend author** implementing AD-10's route picks the seeded users' primary key
  as the natural selector (matching how `requireAuth`/session code identifies users
  elsewhere) and accepts `{ userId: "<uuid>" }`.

Both comply with AD-10 ("pick a seeded user, no password") to the letter. The
full-stack e2e tier (AD-9 tier 2) breaks with a 400 at runtime, not compile time, because
AD-6 never extended shared-contract coverage to this route.

**Almost-but-doesn't-quite-prevent:** AD-10 specifies *that* the route exists and *when*
it's registered, not its wire shape; AD-6 explicitly enumerates only the six domain
entities, leaving auth/test-only routes uncovered by design.

**Fix direction:** either add a small `DevLoginRequestSchema` to `packages/contracts`
(cheapest fix, keeps AD-6's "no drift" guarantee complete) or explicitly document the
dev-login contract inline in AD-10 itself.

---

## Finding 9 — "One hand-written API client module" doesn't say whether non-JSON transport (media upload) counts, and the two readings diverge on AD-2's credentials requirement

**Severity: medium — silent, feature-scoped auth failure.**

AD-8: "Use plain Svelte 5 runes plus one hand-written API client module for v1." Every
route is JSON except `media.post`, which is `multipart/form-data`
(`c.req.parseBody()` expects a `File`).

- **Builder A** treats "one API client module" literally as one file
  (`src/lib/api/client.ts`) covering every entity, including a `uploadMedia(...)`
  function built on `FormData`, explicitly setting `credentials: 'include'` there because
  it's the same file as every other call site that already does so per AD-2.
- **Builder B**, arguing multipart upload is a fundamentally different transport concern,
  splits it into a second file `src/lib/api/media-upload.ts` with its own `fetch`
  wrapper — and, not copy-pasting from the shared module, omits `credentials: 'include'`.
  Every JSON request still authenticates; media upload silently fails to send the
  session cookie cross-origin.

AD-8's text doesn't forbid a second module for a different transport shape, so Builder
B's split passes a literal reading while quietly breaking AD-2's cross-origin
credentials contract for exactly one feature.

**Almost-but-doesn't-quite-prevent:** AD-8 pins module *count* as an anti-premature-
abstraction rule (no query-cache library yet), not a transport-shape boundary; AD-2's
`credentials: include` requirement is stated once at the topology level and never
re-anchored per client-module.

**Fix direction:** state in AD-8 (or Consistency Conventions) that the "one API client
module" covers *every* apps/api call regardless of body encoding (JSON or multipart),
and that `credentials: 'include'` is set once at a shared fetch-wrapper level, not
per-call.

---

## Finding 10 — OpenAPI component naming/registration consistency is unspecified (cosmetic but real drift)

**Severity: low — doc quality only, not a functional break.**

Neither AD-5 nor AD-6 says whether contract schemas imported into `createRoute()` must
be registered as named OpenAPI components (`schema.openapi('Area')`, producing
`#/components/schemas/Area` refs) or may be inlined anonymously.

- **Builder A** registers named components for every entity schema used in routes they
  own.
- **Builder B** inlines the same imported schemas without `.openapi()` naming in the
  routes they own.

The generated Swagger UI/OpenAPI JSON ends up with some entities as reusable named
components and others as anonymous inline schemas, purely as a function of who wrote
which route file — both satisfy AD-5's "Zod request/response schemas ... Swagger UI
mounted."

**Almost-but-doesn't-quite-prevent:** AD-5 mandates the *mechanism* (zod-openapi +
Swagger UI), not a naming/registration convention for the schemas it renders.

**Fix direction:** low priority; if the generated docs matter to consumers, add a
one-line convention that every entity schema from `packages/contracts` is registered
under its PascalCase entity name.

---

## Summary Table

| # | Scenario | Colliding ADs | Severity |
| --- | --- | --- | --- |
| 1 | contracts→db barrel import triggers DATABASE_URL throw in apps/web build | AD-6 vs AD-7 | High |
| 2 | SameSite cookie: cross-origin (AD-2) vs same-origin prod serving (AD-12) | AD-2 vs AD-12 | High |
| 3 | Validation-error Problem Details extension shape: array vs map, global vs per-route hook | AD-4 vs AD-5 | Medium-High |
| 4 | Media ownership: shared vs per-owner vs uploader-owned (already latent in code) | AD-13 (scope gap) | Medium-High |
| 5 | PATCH/filter/multipart schemas not covered by AD-6's "base shape" rule | AD-6 (scope gap) | Medium |
| 6 | Ownership violation surfaces as 404 vs 403 depending on implementation pattern | AD-13 (underspecified) | Medium |
| 7 | seed.ts idempotency/ordering contract absent, two extensions mutually destructive | AD-9 (scope gap) | Medium |
| 8 | dev-login request shape (`username` vs `userId`) has no shared contract | AD-6 vs AD-10 | Medium |
| 9 | Second API client module for multipart drops `credentials: include` | AD-8 vs AD-2 | Medium |
| 10 | OpenAPI component naming/registration inconsistency | AD-5/AD-6 (scope gap) | Low |
