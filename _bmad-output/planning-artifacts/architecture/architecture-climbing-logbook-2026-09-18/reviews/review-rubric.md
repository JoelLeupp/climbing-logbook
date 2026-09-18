---
subject: ARCHITECTURE-SPINE.md (climbing-logbook-2026-09-18)
review-type: good-architecture-spine rubric
reviewer: claude (general-purpose agent)
date: 2026-09-18
---

# Rubric Review — climbing-logbook Architecture Spine

## Verdict

Solid, terse spine that faithfully renders the memlog and correctly ratifies existing brownfield
conventions (verified line-by-line against `apps/api` and `packages/db`); it has two real content
gaps (the `packages/contracts` entity list doesn't cover the two response shapes that actually
diverge from the raw DB row — auth's public User shape and Climb's `tags`-enriched shape) and one
structural-dimension gap (production build/deployment packaging is presupposed by AD-12 but never
decided or deferred), plus a couple of minor/no-issue items — nothing here rises to "unusable,"
but the two content gaps should be closed before builders start on auth and climb-detail stories.

## Findings

### 1. [Should-fix] AD-6's contract-entity list misses the two response shapes that actually diverge from the raw DB row

AD-6 says `packages/contracts` holds "one Zod schema per entity (Area, Sector, Climb, Tag,
LogEntry, Media)... generated from `packages/db/src/schema.ts` via drizzle-zod," and that
"apps/web imports them for typed API responses." Checked against the real routes:

- `GET /api/climbs/:id` (apps/api/src/routes/climbs.ts:17-28) returns `{ ...climb, tags:
  [{id,name}] }` — a composed shape with an embedded `tags` array that is *not* part of the
  `climbs` table and therefore not part of the drizzle-zod-generated `Climb` schema.
- `POST/GET /api/auth/*` (apps/api/src/routes/auth.ts) returns `{ id, email, name }` — a
  public-safe subset of the `users` table (no `passwordHash`) — but AD-6's entity list has no
  `User`/`AuthUser` schema at all, even though the `users` table exists in `packages/db/src/schema.ts`
  and auth responses are exactly the kind of typed-response payload AD-6 exists to cover.

This is the actual divergence point AD-6 is supposed to prevent ("apps/web and apps/api
independently duplicating or drifting on entity shapes") and it's precisely where it's missing:
whoever builds the climb-detail page and whoever builds the login/session UI will each have to
invent an ad-hoc type for these two responses, because the stated contract package doesn't cover
them. Fix: either add `ClimbWithTags`/`AuthUser` (or equivalent) to the AD-6 entity list, or add a
one-line rule for how composed/enriched or credential-stripped response shapes are represented in
`packages/contracts` (e.g., "entity schema `.omit()`/`.extend()` composition, not hand-duplicated
types").

### 2. [Should-fix] Deployment/build-packaging dimension is presupposed by AD-12 but never decided or deferred

AD-12 states apps/api "serves the built SvelteKit static output directly... One process, one
container" — this presupposes a production container image exists, but nothing in the spine
decides *how* that image gets built (no Dockerfile in the repo today; `docker-compose.yml` only
provisions `postgres` and `minio`, not the app itself), how/where it's published, or how
migrations run against a deployed instance. TLS termination is explicitly called out and deferred
("a hosting-environment decision for whoever stands this up... revisit when someone actually
deploys it") — the same treatment isn't given to the build/packaging story despite AD-12 leaning
on containerization as a settled fact. This is exactly the "operational/environmental envelope"
dimension the rubric flags: it should be decided (e.g., "add a multi-stage Dockerfile, decided in
a future cycle") or explicitly moved into Deferred next to TLS with the same one-line treatment,
not left implicit inside an unrelated AD's rule.

### 3. [Minor / no action required] Media upload contract (multipart) isn't mentioned under AD-5/AD-6

`POST /api/media` uses `c.req.parseBody()` multipart form data (file + entityType + entityId),
not JSON — AD-5 (zod-openapi) and AD-6 (contracts) are framed around JSON entity schemas and don't
explicitly say how the multipart upload endpoint is documented/typed. In practice this is a single
existing endpoint with an established wire shape already visible in code, so it's low-risk as a
cross-build divergence point — flagging only as a nice-to-have (e.g., one clause noting multipart
routes use `@hono/zod-openapi`'s form-data request bodies too), not a blocking gap.

### 4. [No finding] Named tech versions check out as current, not stale training-data guesses

Spot-checked against live sources (Sept 2026): `@hono/zod-openapi` latest is 1.6.3 (spine says
`~1.6.x`) ✓; `drizzle-zod` latest is 0.8.3 (spine says `0.8.1+`) ✓; Paraglide JS is confirmed as
SvelteKit's actively-maintained, officially-recommended i18n integration ✓; SvelteKit 2 is still
the current stable major as of Sept 2026 (SvelteKit 3 is RC-stage, not yet released — pinning to
the stable 2.x line rather than an RC is the right call, not staleness) ✓; Tailwind 4 +
shadcn-svelte's Tailwind-v4-compatible CLI setup is confirmed current ✓. The unpinned entries
(`@hono/swagger-ui`, shadcn-svelte, Paraglide JS, Playwright — "latest") are honestly flagged as
unpinned rather than asserted with a fabricated version number, which is the right way to handle
authoring-time currency for CLI-installed/source-copied tooling.

### 5. [No finding] Brownfield ratification checked and confirmed accurate

Traced every "[ADOPTED]"/existing-convention claim against the real code and found no
contradictions: `areas.ts`/`sectors.ts` genuinely have no per-owner check while `logs.ts` genuinely
gates update/delete on `eq(userId, currentUser.id)` (AD-13); `auth.ts` genuinely gates the
session-cookie `secure` flag on `NODE_ENV === "production"`, the exact check AD-10 says
`dev-login`'s registration will reuse; `packages/db/src/client.ts` genuinely throws at import time
without `DATABASE_URL` (AD-7); current error responses genuinely are `{error: string}` with
raw-JSON success envelopes and 201/204 (AD-4 and the Consistency Conventions table); `docker-compose.yml`
genuinely runs `postgres:18` and an unused `minio` per the Structural Seed's note. The spine is not
inventing conventions where real ones already exist.

### 6. [No finding] Deferred items are safe deferrals

TLS termination and pagination/advanced filtering are both correctly scoped as things that can't
cause two independently-built units to diverge in a way that matters at this project's scale (no
in-app component depends on either being decided now). No hidden landmines there.

## Checklist Scorecard

| Item | Verdict |
| --- | --- |
| Fixes real divergence points, misses none | Mostly — two concrete misses (Finding 1) |
| Every AD's Rule is enforceable | Yes — all 13 ADs are concretely checkable against code/config, not vague |
| Nothing under Deferred lets units diverge harmfully | Yes |
| Named tech is verified-current | Yes (spot-checked, see Finding 4) |
| Ratifies rather than contradicts brownfield code | Yes (verified, see Finding 5) |
| Every structural dimension decided/deferred/open | No — deployment/build packaging silent (Finding 2) |
| No template placeholders/empty sections | Yes — clean |
| Stays terse | Yes |

## Files Referenced

- `C:\Develop\climbing-logbook\_bmad-output\planning-artifacts\architecture\architecture-climbing-logbook-2026-09-18\ARCHITECTURE-SPINE.md`
- `C:\Develop\climbing-logbook\_bmad-output\planning-artifacts\architecture\architecture-climbing-logbook-2026-09-18\.memlog.md`
- `C:\Develop\climbing-logbook\apps\api\src\routes\climbs.ts`
- `C:\Develop\climbing-logbook\apps\api\src\routes\auth.ts`
- `C:\Develop\climbing-logbook\apps\api\src\routes\logs.ts`
- `C:\Develop\climbing-logbook\apps\api\src\routes\areas.ts`
- `C:\Develop\climbing-logbook\apps\api\src\routes\media.ts`
- `C:\Develop\climbing-logbook\apps\api\src\middleware\auth.ts`
- `C:\Develop\climbing-logbook\apps\api\src\lib\storage.ts`
- `C:\Develop\climbing-logbook\apps\api\src\lib\session.ts`
- `C:\Develop\climbing-logbook\apps\api\src\index.ts`
- `C:\Develop\climbing-logbook\packages\db\src\schema.ts`
- `C:\Develop\climbing-logbook\packages\db\src\client.ts`
- `C:\Develop\climbing-logbook\packages\db\src\seed.ts`
- `C:\Develop\climbing-logbook\docker-compose.yml`
- `C:\Develop\climbing-logbook\env.example`
- `C:\Develop\climbing-logbook\README.md`
