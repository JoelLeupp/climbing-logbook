---
name: 'review-versions'
type: architecture-review
reviews: 'architecture-climbing-logbook-2026-09-18/ARCHITECTURE-SPINE.md'
purpose: 'verify committed technology/version decisions against live web state (Sept 2026) and against actually-pinned repo versions'
created: '2026-09-18'
---

# Version & Reality-Check Review — climbing-logbook architecture spine

Method: read `ARCHITECTURE-SPINE.md` in full, read `apps/api/package.json` and
`packages/db/package.json` for ground-truth on already-pinned versions, then
web-searched/fetched npm registry metadata (peerDependencies, latest versions,
release notes) for every named technology as of 2026-09-18.

## Verdict

Most items check out as currently real and roughly correctly described, but
**one committed decision (AD-5) is verifiably broken as pinned**: `@hono/zod-openapi
~1.6.x`'s peer dependency requires `hono >=4.10.0`, while this repo's `apps/api/package.json`
pins `hono ^4.6.0` — these cannot coexist as written, unless the actual install
resolves to a much older, undocumented `@hono/zod-openapi` version. Everything
else below is either confirmed compatible, confirmed current, or flagged as a
staleness/unverifiable-assertion concern rather than a hard break.

## Findings

### 1. [HARD CONFLICT] `@hono/zod-openapi ~1.6.x` peer-requires `hono >=4.10.0`; repo pins `hono ^4.6.0`

- Verified directly from the npm registry: `@hono/zod-openapi@1.6.3` (current
  latest, matches the spine's `~1.6.x` pin) has
  `peerDependencies: { "zod": "^4.0.0", "hono": ">=4.10.0" }`.
- `apps/api/package.json` (read directly) pins `"hono": "^4.6.0"`, and the
  spine's Stack table repeats this as an "existing pin, keeping."
- This is a genuine, current incompatibility, not a training-data artifact:
  earlier `@hono/zod-openapi` 0.12–0.15 releases peer-required only
  `hono >=4.3.6`; the requirement was raised to `>=4.10.0` in a later release
  (bundled `@hono/zod-validator` now references a 4-argument
  `MiddlewareHandler` type introduced in Hono v4.10.0).
- Consequence: adopting AD-5 as written will either fail peer-dependency
  resolution (npm) or silently install a mismatched/older `@hono/zod-openapi`
  that doesn't have the OpenAPI features assumed elsewhere in the spine.
  Since `hono` is otherwise unremarkable to bump (current npm latest is
  `4.13.8`, well past `4.10.0`), the fix is straightforward: bump the `hono`
  pin to `^4.10.0` or later (or `^4.13.0` to track latest) as part of adopting
  AD-5, rather than leaving it as an untouched "existing pin."
- Related, same package: `@hono/zod-openapi` peer-requires `zod ^4.0.0`. The
  spine names no zod version anywhere (Stack table has no `zod` row at all,
  despite Zod schemas being central to AD-4/AD-5/AD-6/AD-11). `drizzle-zod`
  (below) is compatible with zod v4, so there's no cross-library conflict —
  but the spine should still pin zod explicitly; right now it's an unstated
  assumption.

### 2. [CONFIRMED COMPATIBLE] `drizzle-zod` vs. pinned `drizzle-orm ^0.36.0`

- Verified from npm registry: `drizzle-zod@0.8.3` (latest; spine says
  "0.8.1+", which holds) has `peerDependencies: { "zod": "^3.25.0 || ^4.0.0",
  "drizzle-orm": ">=0.36.0" }`. The repo's pinned `drizzle-orm ^0.36.0`
  satisfies this exactly at the floor. No conflict, but it's a tight floor —
  worth noting drizzle-orm's actual current latest is `0.45.2`, so the repo
  is ~9 minor versions behind (pre-existing, not introduced by this spine,
  but the spine should know it's not "recent," just "still satisfies the
  peer range").

### 3. [CONFIRMED COMPATIBLE] `@hono/swagger-ui` vs. pinned `hono ^4.6.0`

- Verified from npm registry: `@hono/swagger-ui@0.6.1` (latest) has
  `peerDependencies: { "hono": ">=4.0.0" }` — no conflict with the existing
  `^4.6.0` pin, unlike `@hono/zod-openapi` above. The spine's "latest
  (unpinned at authoring)" note is accurate and fine to leave unpinned, but
  should record 0.6.1 as the resolved version once installed.

### 4. [CONFIRMED, BUT SUPERSEDED SOON] SvelteKit 2 / Svelte 5 runes

- Svelte 5 (runes) is confirmed stable since October 2024, at `5.56.x`+ as of
  mid-2026, and is the recommended default for new projects — the spine's
  characterization is accurate.
- SvelteKit 2 is confirmed the current stable major (patch line ~2.70.x as of
  September 2026) and is still what `sv create` scaffolds by default — AD-3's
  choice is currently correct.
- However: **SvelteKit 3 entered Release Candidate in September 2026** (the
  exact month this spine was authored), with a stable release "in the near
  future." SvelteKit 3 will require Node ≥22.17, TypeScript ≥6, Svelte
  ≥5.56.4, Vite ≥8.0.12 — none of which are captured anywhere in the spine
  (spine pins TypeScript `^5.6.0`, which is below SvelteKit 3's future floor).
  This isn't a defect in AD-3 today, but it is a near-term landmine: if the
  build described in this spine takes more than a few weeks, `sv create` may
  start scaffolding SvelteKit 3 by default, or a contributor may run
  `sv migrate sveltekit-3` unprompted. The spine should explicitly pin
  "SvelteKit 2.x, not 3" as a decision with a reason, not just state "2" as if
  no newer major existed.

### 5. [CONFIRMED CURRENT] Tailwind CSS v4, Svelte CLI (`sv create`), shadcn-svelte CLI

- Tailwind CSS v4 is confirmed the actively developed current major (latest
  ~4.3.x as of mid-2026), matches the spine.
- `sv create` (package `sv`, merged from `create-svelte` + `svelte-add`) is
  confirmed the current official scaffolding tool, with built-in add-ons for
  Tailwind, Drizzle, Playwright, i18n, etc. — matches AD-3's description.
- `shadcn-svelte` CLI is confirmed actively maintained (v1.7.0+ as of
  mid-2026), explicitly "Svelte 5 ready" and runes-native, and has **not**
  been merged/renamed into a unified `shadcn` package (checked specifically —
  found no evidence of consolidation, unlike some other shadcn ecosystem
  unification that happened elsewhere in Feb 2026 for Radix packages only).
  AD-3's description holds.

### 6. [CONFIRMED CURRENT / NO CONCERN] RFC 9457, Paraglide JS, Playwright

- RFC 9457 "Problem Details for HTTP APIs" is confirmed a published IETF
  Standards Track RFC (July 2023) that formally obsoletes RFC 7807; wire
  format/media type (`application/problem+json`) is unchanged from 7807. AD-4
  is on solid, verifiable ground — this is the one decision in the spine most
  clearly not just "asserted from training data," since it's checkable
  against a stable, dated spec.
- Paraglide JS (`@inlang/paraglide-js`, v2) is confirmed to be the officially
  recommended i18n approach for SvelteKit (has a dedicated `sv` CLI add-on),
  compiler-based/tree-shakable, actively maintained. AD-11 holds. Spine leaves
  it "latest (unpinned)" which is reasonable but means the resolved version
  should be recorded post-install.
- Playwright is confirmed actively released (latest `1.63.0`, September 2026)
  and is the obvious, still-current choice for AD-9's two-tier test strategy.
  No concerns.

### 7. [UNVERIFIABLE / NOT CROSS-CHECKED IN SPINE] `@hono/node-server ^1.13.0`, `drizzle-kit ^0.28.0`

- Not new decisions (both are pre-existing pins the spine says it's keeping),
  but flagged because the task asked to check existing pins against newly
  added libraries, and because the version gaps are large enough to be worth
  the architects' awareness even though no direct incompatibility was found:
  - `@hono/node-server` has moved to a new major line (`2.1.1` latest) while
    the repo is on `^1.13.0` — a full major behind. This directly underlies
    AD-12 (static file serving via `@hono/node-server`'s static middleware),
    so it's not purely incidental to the new decisions. No confirmed breaking
    incompatibility was found for the v1 static-serving API used at `^1.13.0`
    with `hono ^4.6.0`, but this pairing was not independently regression-
    tested here — treat as "not contradicted by search," not "proven safe."
  - `drizzle-kit` latest is `0.31.10` vs. the repo's pinned `^0.28.0`; the
    spine's own claim that "`drizzle-orm 0.36.0` requires at least
    `drizzle-kit 0.27.0`" is consistent with what was found, so `^0.28.0`
    clears the floor — but this is a released-together pairing check, not
    independent confirmation that `0.28.x` has no now-fixed bugs relevant to
    Postgres 18 (the docker-compose pin) that a newer `drizzle-kit` patch
    might have addressed. Could not verify either way.

## Summary Table

| Item | Verified current? | Compatible with repo's pinned deps? |
| --- | --- | --- |
| SvelteKit 2 | Yes (current stable; v3 RC looming) | N/A |
| Svelte 5 runes | Yes, stable/mature | N/A |
| Tailwind CSS v4 | Yes, actively developed | N/A |
| Svelte CLI (`sv create`) | Yes, current official tool | N/A |
| shadcn-svelte CLI | Yes, actively maintained, not merged away | N/A |
| `@hono/zod-openapi` ~1.6.x | Yes, version exists | **No — needs `hono >=4.10.0`, repo pins `^4.6.0`** |
| `@hono/swagger-ui` | Yes | Yes (`hono >=4.0.0` peer) |
| `drizzle-zod` 0.8.1+ | Yes | Yes (`drizzle-orm >=0.36.0` peer, satisfied) |
| RFC 9457 | Yes, published stable IETF standard | N/A |
| Paraglide JS | Yes, officially recommended for SvelteKit | N/A |
| Playwright | Yes, actively released | N/A |
