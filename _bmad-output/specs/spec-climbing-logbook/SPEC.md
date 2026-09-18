---
id: SPEC-climbing-logbook
companions: ['glossary.md', '../../planning-artifacts/architecture/architecture-climbing-logbook-2026-09-18/ARCHITECTURE-SPINE.md', '../../planning-artifacts/ux-designs/ux-climbing-logbook-2026-09-18/DESIGN.md', '../../planning-artifacts/ux-designs/ux-climbing-logbook-2026-09-18/EXPERIENCE.md']
sources: ['../../../README.md', '../../brainstorming/brainstorm-frontend-stack-2026-09-18/brainstorm-intent.md']
---

> **Canonical contract.** This SPEC and the files in `companions:` are the complete, preservation-validated contract for what to build, test, and validate. Source documents listed in frontmatter are for traceability — consult them only if you need narrative rationale or prose color this contract intentionally omits.

# climbing-logbook v1

## Why

A vision to realize: a private, self-hosted trip journal for a small group of climbing friends — organized the way an actual trip is organized (area → sector → climb → ascent) — as a deliberate alternative to public crowd-sourced crag databases (thecrag, 27crags, Mountain Project) and gym tick-lists, neither of which fit a private group that doesn't want a community database or to hand its data to a platform.

## Capabilities

- **CAP-1**
  - **intent:** A user can create, view, edit, and delete climbing areas — name, description, how-to-get-there, comment, personal rating, and a map location, set via on-site GPS capture, clicking a point on the map, or searching a place name and locating to it. The map shows a hiking/trail-aware layer to help judge how to reach an area.
  - **success:** A user creates an area either by capturing their on-site GPS location, clicking the map, or searching a place name, and it appears as a marker on the map (with trails visible) for other users in the same group.
- **CAP-2**
  - **intent:** A user can create, view, edit, and delete sectors within an area — name, description, notes, rating, optional map location.
  - **success:** A sector created under an area is listed under that area and visible to other users.
- **CAP-3**
  - **intent:** A user can create, view, edit, and delete climbs (routes or boulders) within a sector — a difficulty grade from a constrained, ordered French/Fontainebleau scale (4a through 9c+, used uniformly for routes and boulders), personal rating, description, optional length, optional own map location (falling back to the parent sector/area's location when unset), and free-form style tags.
  - **success:** A climb created under a sector displays its grade and tags when viewed; a climb with its own location shows a separate pin from its parent sector/area.
- **CAP-4**
  - **intent:** A user can log an ascent of a climb as flash, redpoint, project, or todo, with attempt count, notes, and date.
  - **success:** A logged ascent appears in that user's log for the climb; only that user can edit or delete it.
- **CAP-5**
  - **intent:** A user can attach photos or videos to an area, sector, climb, or log entry.
  - **success:** An uploaded photo/video is retrievable and displayed against the entity it was attached to; who may delete it follows that entity's ownership rule (shared-editable for area/sector/climb, per-owner for log entry).
- **CAP-6**
  - **intent:** A person can register an account and log in/out via a session cookie to use the app.
  - **success:** A registered user logs in, stays logged in across page loads, and logging out clears the session.
- **CAP-7**
  - **intent:** A user can switch the UI language between German (default), English, and French at any time.
  - **success:** Switching language changes all visible UI text, including error messages mapped from stable error codes, without losing page state.
- **CAP-8**
  - **intent:** A person registering an account either creates a brand-new group (becoming its only member) or joins an existing group via that group's invite code. A group member can view and regenerate their group's invite code. A user belongs to exactly one group for v1.
  - **success:** Registering without an invite code creates a new group with that user as its only member; registering with a valid invite code joins that group instead; an invalid invite code is rejected with a clear error rather than silently creating a new group; a member regenerating the invite code immediately invalidates the old one.
- **CAP-9**
  - **intent:** Edits to a shared area, sector, or climb are recorded — who changed what, and when.
  - **success:** After a user edits or deletes an area/sector/climb, a queryable record exists showing which user made that change and what changed.
- **CAP-10**
  - **intent:** The app can proactively suggest a nearby area using the user's on-site location, beyond just centering the map on it.
  - **success:** Opening the app near a known area suggests or opens that area automatically, without the user having to search manually.
- **CAP-11**
  - **intent:** A user can search across the app's own data — area/sector/climb name and difficulty — from anywhere, distinct from the geocoder's real-world place search used to locate the map.
  - **success:** Searching highlights or filters matching areas/sectors/climbs without resetting the user's current map pan/zoom.
- **CAP-12**
  - **intent:** A user gets lightweight positive feedback (a grade-specific flash count) when flashing a climb, and can see their biggest achievements (hardest flashes/redpoints) on a personal stats page.
  - **success:** Flashing a climb shows a running count of flashes at that exact grade; the stats page surfaces the user's hardest sends as achievements.

## Constraints

- Self-hosted; each group is small and fixed (roughly 1–10 users) — not a public service. Multiple groups can and do exist side by side on one instance (CAP-8), each isolated from the others; a user belongs to exactly one.
- SIX's Docker Hub org-wide Registry Access Management policy blocks the `postgis/postgis` and `minio/minio` images. Infra must use `postgres:18` and `cleanstart/minio` instead.
- v1 is online-only by decision — no local queue/sync for offline use. Rules out a local-first sync engine in the frontend data layer.
- The whole project is implemented by an AI coding agent, not hand-coded. Stack/tooling choices favor official, well-documented, agent-legible paths (official CLIs, official OpenAPI/i18n packages) over community starters or exotic alternatives, even when the latter are marginally more featureful.
- All tooling and dependencies must be free and open-source — already ruled out a Firebase-auth-bundled Svelte starter template during architecture in favor of the official one.

## Non-goals

- Public/crowd-sourced climbing database features — route democracy, public search, community moderation. The explicit opposite of what this app is.
- A native mobile app, app-store distribution, or a PWA-as-native shell, for v1.
- Offline-first support (local queue-and-sync while offline), for v1 — deferred, not rejected.
- Pagination or advanced filtering beyond simple equality query-param filters, for v1.
- Backend-side localization or `Accept-Language` handling — all UI language lives in the frontend.
- A user belonging to more than one group at once, or switching between groups — CAP-8 gives every user exactly one group for v1, by choice, not by schema limit.
- A UI to browse or display the audit trail (CAP-9) — the data is captured and queryable, not yet surfaced in the product.

## Success signal

From a fresh self-hosted deploy, one friend registers without an invite code (creating a new group) and shares its invite code with a second friend, who registers with that code and joins the same group. The first adds an area, sector, and climb with a GPS-captured location; the second logs an ascent of that climb with a photo attached — both see each other's areas, sectors, climbs, logs, and photos (because they're in the same group), navigable in German, English, or French.

## Assumptions

- "Small group of friends" is assumed to mean roughly 1–10 users per group — the scale that makes the shared-editable-within-a-group ownership model (any group member can edit any area/sector/climb in that group) reasonable rather than risky. Not explicitly sized by the user beyond "1-10."
- CAP-9's audit trail is assumed to cover only areas/sectors/climbs (the shared-editable entities, where accountability for someone else's edit actually matters) — not log_entries, media, or tags, which are already per-owner or low-stakes. Not explicitly scoped by the user beyond "everything should be versioned."

