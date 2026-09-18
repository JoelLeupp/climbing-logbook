---
name: 'review-group-scoping-followup'
type: architecture-review
target: 'architecture-climbing-logbook-2026-09-18/ARCHITECTURE-SPINE.md'
purpose: adversarial-followup-check
focus: [AD-15, AD-16, AD-14, AD-6, AD-7, AD-13]
created: '2026-09-18'
---

# Adversarial Follow-up Review — Group Scoping (AD-15), Audit Trail (AD-16), Map (AD-14)

Method: same as `review-divergence.md` — construct two "units one level down" that each
satisfy an AD's rule text to the letter yet ship incompatible or leaky code. This pass
targets the three ADs added since the last review, with AD-15 (group scoping) attacked
hardest since it's the highest-risk addition: it retrofits an authorization dimension
onto routes that today have none. Findings are grounded directly in the current repo
(`apps/api/src/routes/*.ts`, `apps/api/src/middleware/auth.ts`, `packages/db/src/schema.ts`,
`packages/db/src/seed.ts`) — none of AD-15/16's tables or filters exist in code yet, so
every scenario below is about what a builder implementing them for the first time would
plausibly do.

## Verdict

AD-15 states the right invariant ("never a denormalized copy," "not just authentication")
but is the one AD in this batch that names the exact risk it's most likely to reproduce:
unlike AD-16 (which self-imposes a single shared helper function), AD-15 mandates no
shared enforcement mechanism, and v1's single-group topology means a route that forgets
the group filter is **behaviorally indistinguishable from a correct one** until a second
group exists — the retrofit-on-live-data problem AD-15 exists to prevent recurs one layer
up, in route code instead of schema. AD-16's audit_log inherits the same polymorphic-FK
scoping problem AD-15 solves for media, but AD-16 never applies the fix, and the fix
AD-15 relies on (join through the live parent row) doesn't work for delete-action rows
whose parent no longer exists. AD-14 (Leaflet) is sound as written; no real technical
objection found.

---

## Finding 1 — AD-15 mandates the invariant but not the mechanism; AD-16 right next to it does, and that asymmetry is the root cause of most of what follows

**Severity: high — structural, not a one-off bug.**

AD-16's rule text names a concrete enforcement point: "written by **a single shared
app-layer helper** called from every mutating route." AD-15's rule text, for a strictly
higher-stakes concern (cross-group data leakage vs. missing an audit row), never does
this — it states the invariant ("Every area/sector/climb read/write route filters by the
caller's group membership") but leaves *how* that filter gets applied to each of the
~24 handlers across `areas.ts`/`sectors.ts`/`climbs.ts`/`logs.ts`/`media.ts` (6 entities ×
~4 verbs) as an independent, per-route decision.

- **Builder A** (areas/sectors) adds `and(eq(climbingAreas.groupId, callerGroupId))` (or
  the equivalent join for sectors) inline in every handler.
- **Builder B** (climbs/logs), reading AD-15's rule text as descriptive of the *schema*
  relationship ("inherit scope transitively through their existing FK chain") rather than
  a per-route mandate, ships handlers that read/write correctly by id/FK but never add the
  groupId predicate — matching the *current* code exactly (`sectors.ts`, `logs.ts` above
  already select/update/delete by id alone, no ownership-adjacent filter at all beyond
  what AD-13 already required for `logs.ts`'s `userId`).

Both builders satisfy AD-15's literal rule text under a charitable reading of "inherit
... transitively" as automatic. Nothing forces Builder B's code to fail a review or a
test, because—

**This is compounded by v1 having exactly one group (Finding 2).**

**Fix direction:** give AD-15 the same treatment AD-16 gives itself: mandate one shared
query helper (e.g. a Drizzle query-builder wrapper or a `requireGroupScope`
middleware that injects the caller's `groupId` into `c.var`/context) that every
area/sector/climb/log_entry/media route is required to route its WHERE-clause
construction through — not just the descriptive invariant.

---

## Finding 2 — v1's single-group topology makes a missing group filter invisible to any test that exists today

**Severity: high — the exact "expensive migration once real rows exist" scenario AD-15 exists to prevent, recurring in route code.**

AD-15's rule explicitly says "v1 bootstraps exactly one group; every registration
auto-joins that same (only) group — v1 behavior is unchanged, only the schema and query
filters change." That's true for the *schema*. It is not true for *test coverage* of the
query filters: with exactly one group in existence, `WHERE groupId = callerGroupId` and
no filter at all produce **identical result sets** for every possible request in every
environment described anywhere in this spine (dev, AD-9's seeded test tier, CI). There is
no way — short of manually inserting a second group row, which nothing in the sprint/story
plan calls for since multi-group management is explicitly Deferred — for any automated
test to distinguish "group filter correctly implemented" from "group filter silently
omitted."

Concretely: if Builder B (Finding 1) ships `climbs.ts`/`logs.ts` with no group predicate,
every Playwright e2e test in AD-9's tier 2 passes, every manually-verified acceptance
criterion passes, and the gap ships to whatever "day two" first creates a second group —
at which point it's discovered in production, against live rows, which is precisely the
"retrofitting group scoping onto live data later (expensive migration)" AD-15's own
Prevents clause is written to rule out. AD-15 ruled out the *schema* version of that
problem and reintroduced the *route-logic* version of it.

**Fix direction:** the sprint/story plan (not this spine, but whatever consumes it) should
seed a *second* group with at least one area/sector/climb/log/media row in the AD-9 test
fixture set specifically to make a missing group filter cause a visible, reproducible test
failure — otherwise Finding 1's shared-helper fix is the only real backstop.

---

## Finding 3 — AD-15's enforcement sentence, read literally, only names area/sector/climb — not log_entries/media — and current code already treats those as auth-optional

**Severity: high — grounded directly in existing route code.**

Re-reading AD-15's Rule text closely: the *inheritance* sentence covers all four
("sectors/climbs/log_entries/media inherit scope transitively") but the *enforcement*
sentence that follows narrows to three: "Every **area/sector/climb** read/write route
filters by the caller's group membership, not just authentication." `log_entries` and
`media` are conspicuously absent from the enforcement sentence, even though they're
present in the inheritance sentence one clause earlier.

This isn't academic — it matches the current code exactly. Today, verified in
`apps/api/src/routes/logs.ts` and `media.ts`:
- `logs.get("/")` has **no auth check at all** and returns every log entry in the
  database, unfiltered, to anonymous callers.
- `media.get("/")` has **no auth check at all** and returns every media row for any
  `entityType`/`entityId` pair supplied, to anonymous callers.

A builder extending these two files under AD-15, reading the enforcement sentence
literally, can conclude log_entries/media routes are *exempt* from the group-filter
mandate (their scope is inherited "on paper" via the schema/FK chain, but no route is
actually required to query it) — while a builder on `areas.ts`/`sectors.ts`/`climbs.ts`
faithfully adds the filter. Once a second group exists, `GET /api/logs` (no filters) leaks
every other group's climbing notes/attempt counts/dates, and `GET /api/media` leaks every
other group's photo URLs for any guessable `entityType`+`entityId` pair — both while their
respective route files are, in isolation, unmodified from what AD-15 arguably permits.

**Fix direction:** rewrite the enforcement sentence to explicitly name all five
route files (areas, sectors, climbs, logs, media), matching the inheritance sentence —
don't rely on "inherit scope" to imply "routes must enforce it."

---

## Finding 4 — Media's "existing FK chain" is explicitly *not* a real FK, so AD-15's inheritance mechanism doesn't apply to it as written

**Severity: high — media is the entity most likely to ship with a silently-broken or skipped group filter.**

AD-15's rule says sectors/climbs/log_entries/media "inherit scope transitively through
their existing FK chain (sector→area, climb→sector→area) — never a denormalized copy."
But `packages/db/src/schema.ts` documents, in its own comment above the `media` table:

> `entityType`/`entityId` is a polymorphic reference (area/sector/climb/log_entry)
> instead of four near-identical media tables. **Drizzle can't enforce a FK across it**,
> so the API layer must validate `entityType` + that `entityId` exists.

There is no FK chain for media to inherit scope "through" — AD-15's own mechanism
(join up the real foreign keys to find `groupId`) requires application code to branch on
`entityType` and perform one of **four different joins** to resolve the owning group:
- `entityType = "area"` → `climbing_areas.groupId` directly.
- `entityType = "sector"` → join `sectors → climbing_areas`.
- `entityType = "climb"` → join `climbs → sectors → climbing_areas` (two hops).
- `entityType = "log_entry"` → join `log_entries → climbs → sectors → climbing_areas`
  (three hops), *and* log_entries are per-owner (AD-13), so this path also has to decide
  whether ownership alone is sufficient or group membership is still required on top.

None of this branching logic, nor the ownership-vs-group interaction for the
`log_entry`-attached case, is specified anywhere. Two builders extending `media.ts` will
plausibly diverge exactly as `review-divergence.md`'s Finding 4 already predicted for
AD-13 — AD-15 adds a second axis (group) to the same unresolved polymorphic-ownership
problem instead of resolving it.

**Fix direction:** either (a) spell out the four-way join explicitly in AD-15's text (or a
companion note) as a single shared helper (dovetails with Finding 1's fix), or (b) accept
the "unenforced FK" cost and denormalize `groupId` onto `media` directly, written once at
insert time by that same shared helper — which is a narrower, defensible exception to
"never a denormalized copy" because `media.entityId` isn't a real FK to begin with, so
there's no live-drift risk the anti-denormalization rule is protecting against here.

---

## Finding 5 — Public (unauthenticated) GET routes can't be "filtered by the caller's group membership," and AD-15 doesn't say what happens to them

**Severity: medium-high — contradicts AD-15's own "v1 behavior is unchanged" claim.**

Every GET route in the current codebase — `areas.get("/")`, `areas.get("/:id")`,
`sectors.get("/")`, `sectors.get("/:id")`, `logs.get("/")`, `media.get("/")` — has **no**
`requireAuth` middleware at all. They're intentionally public reads today (consistent
with AD-13's "shared-editable" framing extending even past authentication for reads).

AD-15's enforcement sentence requires filtering "by the caller's group membership" — but
an unauthenticated caller has no group membership to filter by. This forces one of two
outcomes AD-15 never chooses between:
- **(a)** GET routes now require authentication too (a caller needs a session to have a
  `groupId` to filter by) — a real, unstated behavior change: previously-public reads
  become 401s.
- **(b)** the single-group v1 special case is exploited to keep returning everything
  regardless of auth state (since there's only one group, "the caller's group" and "every
  row" are the same set even for a caller with none) — which satisfies "v1 behavior
  unchanged" only by never actually exercising the group-filter code path for anonymous
  requests, so whichever behavior (a) vs (b) a builder picks is untested against a second
  group exactly as in Finding 2, and the choice itself is never made explicit anywhere.

**Fix direction:** AD-15 (or the Consistency Conventions table) should state explicitly
whether v1's read endpoints stay unauthenticated-but-single-group-safe by construction, or
whether AD-15 quietly extends `requireAuth` to every GET route that didn't have it before
— this is a real, user-visible behavior change that "only the schema and query filters
change" currently denies is happening.

---

## Finding 6 — Auto-join bootstrap mechanism: unspecified lookup key, no uniqueness guarantee, and conflated with dev/test seeding

**Severity: medium-high — directly answers the prompt's "what if v1 somehow already has more than one group row" question: nothing stops it, and nothing says what happens if it does.**

AD-15's rule says "v1 bootstraps exactly one group; every registration auto-joins that
same (only) group." The *only* place in the whole spine that says how the group gets
created is the Structural Seed section's file-tree annotation: `seed.ts` "also bootstraps
the v1 default group" — not AD-15's own Rule text, and not a route.

This leaves several concrete gaps:
1. **Lookup key.** When `auth.post("/register")` (currently, per `apps/api/src/routes/auth.ts`,
   a plain insert into `users` with zero group-related code) is extended to auto-join the
   "one" group, how does it find that group's id? By a hardcoded/env-configured UUID? By
   `name = "default"` with a unique constraint? By `SELECT id FROM groups LIMIT 1` (no
   `ORDER BY`, not guaranteed stable, and silently picks an arbitrary row the instant a
   second one exists)? AD-15 specifies none of this.
2. **No uniqueness guarantee.** The `groups` table per AD-15 is just `(id, name,
   createdAt)` — nothing mandates a unique index on `name` or an `isDefault` flag that
   would make "exactly one group" a DB-enforced invariant rather than an operational
   assumption. `seed.ts`'s existing pattern for the demo *user* uses
   `onConflictDoNothing({ target: users.email })` specifically because `email` is
   `unique()` in the schema — but AD-15's `groups` table has no equivalent unique column
   for a group-bootstrap script to conflict-target against, so a second seed run (or a
   second environment's migration) with a naive `insert into groups` and no
   `onConflictDoNothing` produces a second row, silently, the first time anyone forgets
   the guard.
3. **Bootstrap vs. seeding conflated.** `seed.ts` inserts a demo user with a known
   password (`demo1234`) — not something you'd run against a real production database.
   If `seed.ts` is genuinely the *only* code path that creates the default group (as the
   Structural Seed annotation implies), a from-scratch production deploy that
   (correctly) never runs `seed.ts` has **zero group rows**, and the very first real
   registration's auto-join has nothing to join into — either it throws (FK violation
   inserting into `group_memberships`), or whatever auto-join code exists needs its own
   independent find-or-create-the-default-group logic, duplicated from (and potentially
   diverging from) `seed.ts`'s.

Once any of the above produces a second group row (a re-run seed without a conflict
target, a botched migration, or a future multi-group-management story landing half-built
ahead of schedule), a `LIMIT 1`-style auto-join lookup becomes nondeterministic — new
registrations could silently land in the *wrong* group, which is a genuine cross-group
leak (a new user auto-joined into Group B sees/can edit Group B's areas, sectors, climbs
they were never meant to have access to) introduced by the bootstrap mechanism itself, not
by a route filter bug.

**Fix direction:** name the exact bootstrap owner (a migration, not `seed.ts`, so it runs
in every environment including production first-boot); add a DB-level uniqueness
guarantee (`isDefault boolean` with a partial unique index, or a well-known fixed UUID
seeded by the migration itself) so "exactly one group" is enforced, not assumed; and make
the register route's lookup target that specific column, not `LIMIT 1`.

---

## Finding 7 — `group_memberships` is schematically many-to-many with no "active group" concept, so "the caller's group membership" is already ambiguous for the future case AD-15 claims to be future-proofing against

**Severity: medium.**

`group_memberships (userId, groupId, joinedAt)` has no uniqueness constraint mentioned
that would cap a user at one row — it's a plain many-to-many join table. AD-15's stated
purpose is explicitly to avoid "retrofitting group scoping onto live data later" when
multi-group support (management UI, inviting users to a second group) eventually lands —
per the spine's own Deferred section, this is a "when," not an "if."

But nothing in AD-15 says what "the caller's group membership" (singular, used
throughout the rule text) means once a user can belong to more than one row: union of all
groups' data, or a single "current/active" group requiring a session-level selector that
doesn't exist anywhere in this spine (no `sessions.activeGroupId`, no request header, no
UI concept)? The schema seam supports multi-membership today; the query-semantics seam
does not, and AD-15 doesn't flag this as still-open the way the Deferred section flags
multi-group *management* as open. A builder who ends up implementing real multi-group
support later has no architectural guidance at exactly the boundary this AD was written to
pre-empt.

**Fix direction:** either constrain `group_memberships` to one row per user for v1 (a
unique index on `userId`) and explicitly note that lifting it is a future migration point
AD-15 does *not* cover, or add one sentence now committing to union-vs-active-group
semantics so the eventual builder isn't guessing.

---

## Finding 8 — AD-6/AD-15 interaction: drizzle-zod will make `groupId` a client-facing required field on the insert schema, same pre-existing gap as `createdBy`, but now security-relevant

**Severity: high — a plausible direct authorization bypass, not just a style inconsistency.**

AD-6 derives `AreaInsertSchema` via `createInsertSchema(climbingAreas)` from
`packages/db/src/schema.ts`. Once AD-15 adds `climbing_areas.groupId` as a required
(`notNull()`, no default) FK column, drizzle-zod's generated insert schema will include
`groupId` as a **required field the request body must supply** — the same way it already
would for `createdBy` today (also `notNull` — wait: currently `createdBy` is *not*
`.notNull()` in the schema, but `groupId` per AD-15 is explicitly "a required `groupId`
FK"). AD-6 never states that server-derived columns must be stripped from the
request-validation variant of an entity's schema and re-injected from the session
server-side, the way the current hand-written routes already do implicitly (e.g.
`areas.post` manually builds the insert object and sets `createdBy: c.get("user")!.id`,
ignoring whatever the client sent for that field).

If AD-5's `createRoute()` wiring uses `AreaInsertSchema` directly as the request-body
schema (a literal, obvious reading of AD-6's "apps/api uses these schemas for validation
+ OpenAPI"), the OpenAPI contract now documents — and Zod validation now *requires* — the
client to submit `groupId` on every `POST /api/areas`. Two divergent, both-compliant
outcomes:
- **Builder A** validates the body against `AreaInsertSchema` as-is, then passes the
  validated `groupId` straight through to the insert (mirroring how the rest of the body
  is already passed through) — a Group-A member can now POST an arbitrary `groupId`
  belonging to Group B and create/pollute data inside a group they're not a member of:
  a direct, client-controlled cross-group write.
- **Builder B** validates against `AreaInsertSchema` for every other field but manually
  overwrites `groupId` (and `createdBy`) with session-derived values before inserting,
  matching today's `createdBy` pattern — safe, but purely by convention, not by anything
  AD-6 or AD-15 states.

Both builders satisfy AD-6's and AD-15's rule text to the letter; only one is safe.

**Fix direction:** AD-6 should state a general rule (not just for `groupId`) that any
column set by server logic rather than client input (`id`, `createdAt`, `createdBy`, and
now `groupId`) is omitted from the request-body Zod variant (`.omit({ groupId: true,
createdBy: true, ... })`) and never accepted from the client at all — this closes the gap
for `createdBy` too, which was already latent before AD-15.

---

## Finding 9 — AD-16's `audit_log` has no `groupId` and no stated read-scoping, and the join-through-parent trick AD-15 relies on structurally fails for delete-action rows

**Severity: medium — no live route reads audit_log yet (Deferred section confirms), so this is a landmine for whoever builds the viewer, not a bug today.**

AD-16's `audit_log` table is `(entityType, entityId, actorUserId, action, changes jsonb,
createdAt)` — no `groupId`, and it's polymorphic exactly like `media` (`entityType` names
`climbing_areas`/`sectors`/`climbs`; `entityId` is that row's id, with no real FK per the
ER diagram's own "polymorphic, entityType/entityId" label). AD-16 says nothing about who
may read audit_log or how a future viewer route should scope it — a real gap, since the
same architecture that requires every area/sector/climb *data* route to group-filter says
nothing about the *audit trail* of edits to that same data.

Worse, the one mechanism this spine relies on elsewhere for polymorphic scoping — join
back to the live parent row to recover its `groupId` —**cannot work for `action = "delete"`
rows**: by definition, once an area/sector/climb is deleted, there is no live parent row
left to join to. A future "view history for this area" or "site-wide activity feed" route
built by joining `audit_log.entityId` back to `climbing_areas.id` to filter by group will
correctly scope create/update rows and then either drop or mis-scope every delete row for
entities that no longer exist — an availability/correctness gap at best, and a genuine
leak at worst if the mis-scoping defaults to "show it" rather than "hide it."

This also exposes a real tension AD-15 doesn't acknowledge: its blanket "never a
denormalized copy" principle is right for *live, mutable* rows (sectors/climbs, where a
copy could drift from the owning area's real group) but wrong for `audit_log`, which is
append-only and immutable — a `groupId` captured at write time here cannot drift, because
the row it's attached to never changes. Audit_log is the one place in this schema where
denormalizing `groupId` is actually the correct design, not a shortcut, and nothing says so.

**Fix direction:** add `groupId` as a normal (denormalized-by-design, write-once) column
on `audit_log`, populated by AD-16's shared audit helper at write time from whatever
group-scoped row triggered it — this is cheap now, before any audit rows exist, and
expensive to backfill later, which is exactly the migration AD-15's own Prevents clause
is otherwise so careful to avoid elsewhere.

---

## AD-14 sanity check — Leaflet direct, no Svelte wrapper: no real objection found

Checked specifically for the two risks that most commonly bite direct-Leaflet-in-a-
framework integrations:

1. **SSR crash on import** (the reason wrapper libraries like `react-leaflet` gate
   imports behind `typeof window !== 'undefined'`): Leaflet's core touches `window`/
   `navigator` at module scope, which crashes under real server-side rendering. AD-2
   pins `ssr=false` / adapter-static for the entire app — there is no server-rendering
   pass that ever executes component code, so this class of failure is structurally
   absent, not just mitigated. Confirmed low-risk as the prompt anticipated.
2. **DOM ownership / lifecycle**: Leaflet takes over the DOM subtree inside its container
   element imperatively (`L.map(el)`), which conflicts with a framework's own DOM
   reconciliation if that container is ever re-rendered by Svelte. AD-14's rule text
   already anticipates the correct mitigation — "initialized in a Svelte component's
   lifecycle" — which in Svelte 5 means `onMount` for `L.map()` init and `onDestroy` /
   `map.remove()` for cleanup (avoids duplicate-init errors on Vite HMR or SvelteKit
   client-side navigation away from and back to the map page). This is standard practice
   for any imperative DOM library and isn't specific to Leaflet or to skipping a wrapper.

No finding raised against AD-14. Two minor, non-blocking implementation notes worth
carrying into story-level detail (not spine-level, since neither changes the decision):
`leaflet.css` needs an explicit import (easy to forget, produces a visually broken but
functionally working map — misaligned tiles/markers), and `leaflet-control-geocoder`
likely has no first-party TypeScript types (community `@types` package or a local `.d.ts`
shim may be needed) — packaging detail, not architecture.

---

## Summary Table

| # | Scenario | AD(s) | Severity |
| --- | --- | --- | --- |
| 1 | AD-15 states the invariant but (unlike AD-16) mandates no shared enforcement helper | AD-15 vs AD-16 | High |
| 2 | v1's single group makes a missing group filter untestable/invisible until group #2 exists | AD-15 | High |
| 3 | Enforcement sentence literally names only area/sector/climb; logs.ts/media.ts GET routes have zero auth today | AD-15 | High |
| 4 | Media's FK chain is explicitly "unenforced" — AD-15's join-through-FK mechanism doesn't apply to media as written | AD-15 | High |
| 5 | Public (unauthenticated) GET routes can't be filtered "by the caller's group membership"; outcome unspecified | AD-15 | Medium-High |
| 6 | Group auto-join bootstrap: no specified lookup key, no DB-enforced uniqueness, conflated with dev-only seed.ts | AD-15 | Medium-High |
| 7 | group_memberships is many-to-many with no "active group" concept for the multi-group future AD-15 is built for | AD-15 | Medium |
| 8 | drizzle-zod insert schema makes groupId (and createdBy) client-settable unless explicitly omitted — cross-group write vector | AD-6 vs AD-15 | High |
| 9 | audit_log has no groupId; join-through-parent scoping fails for delete-action rows whose parent no longer exists | AD-16 vs AD-15 | Medium |
| — | Leaflet direct-use SSR/lifecycle sanity check | AD-14 | No finding |
