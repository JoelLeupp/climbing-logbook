---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: ['_bmad-output/specs/spec-climbing-logbook/SPEC.md', '_bmad-output/specs/spec-climbing-logbook/glossary.md', '_bmad-output/planning-artifacts/architecture/architecture-climbing-logbook-2026-09-18/ARCHITECTURE-SPINE.md', '_bmad-output/planning-artifacts/ux-designs/ux-climbing-logbook-2026-09-18/DESIGN.md', '_bmad-output/planning-artifacts/ux-designs/ux-climbing-logbook-2026-09-18/EXPERIENCE.md']
---

# climbing-logbook - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for climbing-logbook, decomposing the requirements from SPEC.md (substituting for a PRD - no PRD exists for this project), the UX design contract (DESIGN.md/EXPERIENCE.md), and the Architecture Spine into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: A user can create, view, edit, and delete climbing areas - name, description, how-to-get-there, comment, personal rating, and a map location (on-site GPS, map click, or geocoder search), on a hiking/trail-aware map layer. (CAP-1)
FR2: A user can create, view, edit, and delete sectors within an area - name, description, notes, rating, optional map location. (CAP-2)
FR3: A user can create, view, edit, and delete climbs (routes or boulders) within a sector - a French/Fontainebleau grade (4a-9c+), personal rating, description, optional length, optional own map location (falls back to parent location), free-form style tags. (CAP-3)
FR4: A user can log an ascent of a climb as flash, redpoint, project, or todo, with attempt count, notes, and date; only that user can edit/delete their own log entry. (CAP-4)
FR5: A user can attach photos or videos to an area, sector, climb, or log entry; deletion follows that entity's ownership rule. (CAP-5)
FR6: A person can register an account and log in/out via a session cookie. (CAP-6)
FR7: A user can switch the UI language between German (default), English, and French at any time. (CAP-7)
FR8: A person registering either creates a new group (no invite code) or joins an existing group via its invite code; a group member can view/regenerate the invite code; a user belongs to exactly one group. (CAP-8)
FR9: Edits to a shared area/sector/climb are recorded (who, what, when) and queryable. (CAP-9)
FR10: The app can proactively suggest a nearby area using the user's on-site location, beyond map-centering. (CAP-10)
FR11: A user can search the app's own data (area/sector/climb name + difficulty) from anywhere, distinct from real-world place search. (CAP-11)
FR12: A user gets a grade-specific flash-count acknowledgment on flashing a climb, and sees hardest-send achievements on a personal stats page. (CAP-12)

### NonFunctional Requirements

NFR1: Self-hosted; each group is small and fixed (roughly 1-10 users); an instance can host multiple isolated groups side by side.
NFR2: Infra must use `postgres:18` and `cleanstart/minio` - SIX's Docker Hub org policy blocks `postgis/postgis` and `minio/minio`.
NFR3: v1 is online-only - no offline queue/sync in the frontend data layer.
NFR4: The whole project is built by an AI coding agent - tooling favors official, agent-legible paths over community/exotic alternatives.
NFR5: All tooling/dependencies must be free and open-source.

### Additional Requirements

- **Starter template** (impacts Epic 1 Story 1): scaffold `apps/web` fresh via the official Svelte CLI (`sv create` - SvelteKit 2, Svelte 5 runes, Tailwind 4); add components via the official shadcn-svelte CLI. No community starter, no parallel folder - reuse the `apps/web` path. (AD-3)
- Static SPA rendering, always same-origin (Vite dev-proxy in dev, single-process serving in prod); no SSR, no cross-site cookies. (AD-1, AD-2, AD-12)
- All apps/api errors are RFC 9457 `application/problem+json`; one sanctioned validation-error extension shape; one global error handler. (AD-4)
- API built on `OpenAPIHono()` + `@hono/zod-openapi` + `@hono/swagger-ui`; every route (including dev-login and multipart media upload) gets a schema. Requires bumping `hono` to `^4.10.0` and pinning `zod` to `^4.0.0`. (AD-5)
- New `packages/contracts` workspace package: one Zod schema per entity (+ `ClimbWithTags`, `AuthUser` composite shapes, + Problem Details), generated from `packages/db/src/schema.ts` via drizzle-zod. (AD-6)
- Strict dependency direction: `apps/web` must never import `@climbing-logbook/db`, even type-only; `packages/db` needs a side-effect-free `./schema` export subpath. (AD-7)
- Frontend state: plain Svelte 5 runes + exactly one hand-written API client module; no query/cache library for v1. (AD-8)
- Two-tier test strategy: Playwright network-mocked component tests + full-stack e2e (`NODE_ENV=test`, seeded via an idempotent, extended `seed.ts`). (AD-9)
- `POST /api/auth/dev-login` exists only when `NODE_ENV !== 'production'` - not registered at all in prod. (AD-10)
- i18n via Paraglide JS (DE default, EN, FR); backend never localizes. (AD-11)
- Ownership model: areas/sectors/climbs/tags/media(-on-those) shared-editable within the caller's group; log_entries and media-on-log-entries per-owner. (AD-13, amended by AD-15)
- Map: Leaflet used directly (no wrapper package) + OpenTopoMap tiles + `leaflet-control-geocoder` (Nominatim). (AD-14)
- **Group scoping seam**: new `groups`/`group_memberships` tables, required `groupId` on `climbing_areas`, a shared `requireGroupMember` helper enforced on every area/sector/climb/log_entry/media route (closing an existing gap - `logs.ts`/`media.ts` GET routes currently have no auth check at all). (AD-15)
- **Group membership**: `groups.inviteCode` (crypto-random, regenerable); register accepts optional invite code, invalid code errors rather than silently creating a group; one-group-per-user enforced app-layer only. (AD-16)
- **Containerized deployment**: multi-stage Dockerfile (builds db/contracts/api/web, slim `node:22-alpine` runtime); `docker-compose.yml` gains an `app` service; migrations run automatically on container startup; persisted uploads volume. (AD-17)
- **Audit log**: one generic `audit_log` table + shared app-layer helper called from every mutating area/sector/climb route; `groupId` denormalized snapshot for post-delete attribution. (AD-18)
- **Schema**: `climbs.difficulty` becomes a constrained enum (`4a`-`9c+`); `climbs` gains nullable `length` (route-only, enforced via a contract-layer Zod refine) and nullable `latitude`/`longitude` (falls back to parent location in the UI). (AD-19)
- **Search**: dedicated `GET /api/search` (not client-side filtering) - name substring + exact grade match, each entity join-depth-matched to its existing group-scoping pattern. (AD-20)
- **Gamification**: flash-count and achievements computed live via query (never a cached/denormalized counter); deterministic tie-break (most-recent `createdAt`) for tied hardest sends. (AD-21)
- **Geolocation suggestion**: client-side only, Haversine distance against the already-fetched group area list, no new backend endpoint. (AD-22)

### UX Design Requirements

UX-DR1: Design token system - earthy palette (bg/card/panel/ink/ink-soft/line/moss/clay), sans-serif for all prose, monospace reserved strictly for numeric/logged data (grades, stats, dates, log rows). No dark mode.
UX-DR2: Seven-tier, colorblind-aware grade-badge color system spanning 4a-9c+ (light green -> dark green -> ochre -> burnt clay -> slate blue -> heather violet -> near-black), text label always rendered regardless of tier color; every tier pairing checked against WCAG AA 4.5:1 (tier-4 and outdoor-glare tokens `ink-soft`/`line` were darkened after review to hold real margin).
UX-DR3: Component library, each with both a visual spec and a behavioral spec - Grade badge, Flash/Redpoint action buttons, Tag chip (static, not filterable in v1), Card, Photo gallery carousel (top-of-view position, drag-and-drop/file-picker upload, camera capture explicitly deferred), Stat strip (static display, omits missing values), Log-table row (zebra-striped, collapsible send-history with expand control), Flash-count toast, Area Page map/list split panel. View toggle, app-content search bar, list-mode/sort control, and group-vs-mine toggle are plain shadcn-svelte primitives at defaults - no bespoke visual spec needed.
UX-DR4: Information architecture - Map/List home view toggle (same data, two renderings); map click semantics (empty point creates an area, existing marker opens its Area Page) plus a non-map "Add area" fallback action (map-only creation was a real accessibility gap); Area Page (map docked right by default, collapsible to a full-width list, flat vs. grouped-by-sector modes, hardest-first default sort); Route/Climb Detail (gallery, grade badge, tags, optional description/length, Flash/Redpoint/Project/Todo actions, collapsible send-history, comments, mine-vs-group visibility toggle); Personal Stats Page (Achievements, sends-by-grade breakdown, open-projects, bucket-list, all as cards on one scrollable page); lean Auth/invite flow (invite code pre-filled from a shared link, no dense settings).
UX-DR5: Accessibility floor (consumer-grade, explicit product-owner choice) - grade badges never color-only; ~44px minimum touch target as a blanket rule on every interactive control; WCAG AA contrast including outdoor-glare margin; images carry alt text/captions; forms are labeled, not placeholder-only; keyboard/focus via shadcn-svelte's built-in primitives.
UX-DR6: State coverage - loading uses lightweight per-surface skeletons, never a blocking full-page spinner; read and write failures both render an inline, retry-capable error (write failures - e.g. a Flash tap at the crag with poor signal - preserve all entered data, retry resubmits rather than restarting); permission-denied is non-rendering (no edit/delete control shown at all on another user's log entry/comment, never a visible-but-disabled button); defined empty states per surface; invalid/expired invite code is a plain inline error, never a silent fallback to creating a new group.
UX-DR7: Responsive/platform - both surfaces are primary, not one primary + one cut-down: phone is single-column with the map reached via the same view toggle (not docked); desktop is a two-pane Area Page (list + docked map) and a multi-column stats-page card grid. One breakpoint only, no dedicated tablet layout. No native app, no PWA install prompt, no offline mode.
UX-DR8: Voice and tone - exact glossary vocabulary (area, sector, climb, route, boulder, flash, redpoint, project, todo, group, invite code) mirrored verbatim everywhere in copy and code-facing labels, never a climbing-slang synonym; prose is warm-but-plain, mono-set copy (grades, stats, the flash-count toast) is factual and terse.
UX-DR9: Gamification interaction - tapping Flash triggers an immediate grade-specific running-count toast (e.g. "Flashed 6a+ x5"), instant/no-confirmation, dismissing on its own; the interaction shape is fixed but its visual finality is explicitly open to future iteration.

### FR Coverage Map

FR1, FR2, FR3, FR9: Epic 2 - climbing catalog (areas/sectors/climbs) + accountability
FR4, FR5: Epic 3 - ascent logging + media
FR6, FR7, FR8: Epic 1 - account/group/app shell
FR10, FR11: Epic 4 - search/discovery
FR12: Epic 5 - gamification/stats
(none): Epic 6 - self-hosted deployment (NFR2, AD-17 - no FR directly, matches SPEC.md's Success Signal)

## Epic List

### Epic 1: Account, Group, and App Shell
A person can scaffold into the new SvelteKit app, register (creating their own group or joining one via invite code), log in/out, and use the app in German, English, or French.
**FRs covered:** FR6, FR7, FR8
**Carries:** the SvelteKit/shadcn-svelte scaffold (starter template, AD-3), the API foundation (Problem Details, OpenAPI, packages/contracts, single API client), the group-scoping seam and invite-or-create flow (AD-15/16), i18n infrastructure (AD-11), the two-tier test strategy and dev-login gate.

### Epic 2: Climbing Catalog - Areas, Sectors, Climbs & Accountability
A group member can build and browse their shared area -> sector -> climb catalog on a map (GPS capture, map-click, or place search, hiking-trail tile layer), grade climbs on the French scale, and see who changed a shared entry and when.
**FRs covered:** FR1, FR2, FR3, FR9
**Carries:** Leaflet/OpenTopoMap/geocoder (AD-14), the grade enum + length + own-location schema change (AD-19), the audit-log helper (AD-18, folded in since it hooks the same route files this epic already builds).

### Epic 3: Ascent Logging & Media
A group member can log a send (flash/redpoint/project/todo) against a climb and attach/browse photos and videos on any area, sector, climb, or log entry.
**FRs covered:** FR4, FR5

### Epic 4: Search & Nearby Discovery
A group member can search the whole catalog by name or grade from anywhere, and gets automatically pointed at the area they're standing near.
**FRs covered:** FR10, FR11
**Carries:** the dedicated search endpoint (AD-20), client-side Haversine suggestion (AD-22).

### Epic 5: Gamification & Personal Stats
A user gets a lightweight flash-count acknowledgment in the moment, and can see their personal achievements and sends-by-grade breakdown afterward.
**FRs covered:** FR12
**Carries:** live-computed gamification/achievements (AD-21).

### Epic 6: Self-Hosted Deployment
Someone standing up their own instance brings the whole stack up with one command (docker compose up -d) and it just works - matches SPEC.md's Success Signal directly.
**FRs covered:** none directly (NFR2, AD-17)

## Epic 1: Account, Group, and App Shell

A person can scaffold into the new SvelteKit app, register (creating their own group or joining one via invite code), log in/out, and use the app in German, English, or French.

### Story 1.1: New Frontend Scaffold & Same-Origin Wiring

As a developer,
I want apps/web rebuilt on SvelteKit + shadcn-svelte with the dev proxy to apps/api,
So that the app loads and can reach the API on one origin, ready to build real screens on.

**Acceptance Criteria:**

**Given** the old Angular apps/web source
**When** scaffolding runs
**Then** apps/web is rebuilt via the official Svelte CLI (`sv create`, SvelteKit 2 / Svelte 5 runes / Tailwind 4) at the same path, and the Angular source is removed

**Given** the shadcn-svelte CLI
**When** base UI primitives are needed
**Then** they are added via the CLI (button, card, toast, toggle-group at minimum), never hand-rolled

**Given** the SvelteKit dev server running
**When** a request hits `/api/health`
**Then** Vite's dev proxy forwards it to apps/api same-origin, with no CORS involved

**Given** the app loads in a browser
**Then** a minimal shell renders (e.g. a status indicator reflecting the API health check) confirming the new stack is wired end-to-end

### Story 1.2: API Error & Docs Foundation

As a developer,
I want apps/api's error handling and OpenAPI docs foundation in place,
So that every subsequent route is built on one consistent, documented contract.

**Acceptance Criteria:**

**Given** any apps/api route
**When** it errors
**Then** the response is `application/problem+json` per RFC 9457, produced by exactly one global error handler

**Given** a validation failure
**When** the response is returned
**Then** it carries the sanctioned `errors: [{path, message}]` extension shape - no route defines an alternative

**Given** apps/api is running
**When** `/api/docs` (Swagger UI) is visited
**Then** it renders the current OpenAPI spec, generated from `@hono/zod-openapi` route definitions

**Given** the required `hono`/`zod` version bump
**When** the app builds
**Then** it runs on `hono ^4.10.0` and `zod ^4.0.0` without regression

### Story 1.3: Shared Contracts Package

As a developer,
I want packages/contracts holding drizzle-zod-generated schemas,
So that apps/api and apps/web share one typed contract without apps/web ever touching packages/db.

**Acceptance Criteria:**

**Given** packages/db/src/schema.ts
**When** packages/contracts builds
**Then** it exports a Zod schema per entity (Area, Sector, Climb, Tag, LogEntry, Media) plus a Problem Details schema, generated via drizzle-zod from the side-effect-free `@climbing-logbook/db/schema` subpath - never the default barrel

**Given** `packages/db`'s package.json
**When** the schema-only subpath is added
**Then** it points only at `schema.ts`, never `client.ts`

**Given** apps/web imports a contracts type
**When** the frontend builds
**Then** no code path imports `@climbing-logbook/db` directly, in any form

**Given** `ClimbWithTags` and `AuthUser`
**When** used by apps/api or apps/web
**Then** they exist as hand-composed schemas alongside the drizzle-zod-generated ones

### Story 1.4: Registration - Create or Join a Group

As a person visiting climbing-logbook for the first time,
I want to register an account and either start my own group or join one via an invite code,
So that I have somewhere to log climbs with the right people.

**Acceptance Criteria:**

**Given** the `groups` and `group_memberships` tables don't exist yet
**When** this story lands
**Then** they're added via a Drizzle migration (the required `groupId` column on `climbing_areas` is added later, in Story 2.1, where it's first consumed)

**Given** no invite code is entered
**When** registering
**Then** a new group is created and the registrant becomes its only member

**Given** a valid invite code is entered
**When** registering
**Then** the registrant joins that group instead of creating a new one

**Given** an invalid or expired invite code
**When** registering
**Then** a clear Problem Details error is returned - never a silent fallback to creating a new group

**Given** the register form
**When** rendered
**Then** it is lean: email/name/password plus an optional invite-code field, no dense settings

### Story 1.5: Login, Logout & Session Persistence

As a registered user,
I want to log in and stay logged in across page loads, and log out cleanly,
So that I can use the app without re-authenticating constantly.

**Acceptance Criteria:**

**Given** valid credentials
**When** logging in
**Then** a session cookie is set (`SameSite=Lax`, existing `NODE_ENV`-gated secure flag) and the frontend reflects the logged-in state

**Given** a logged-in session
**When** the page reloads
**Then** the session probe (`GET /api/auth/me`) restores the logged-in state without a fresh login

**Given** a logged-in user
**When** logging out
**Then** the session is deleted server-side and the cookie is cleared

**Given** `NODE_ENV !== 'production'`
**When** `POST /api/auth/dev-login` is called
**Then** it logs in as a seeded test user
**And** given `NODE_ENV === 'production'`, that route does not exist at all (404, not a runtime rejection)

### Story 1.6: Regenerate Group Invite Code

As a group member,
I want to view and regenerate my group's invite code,
So that I can share it with a friend or revoke a leaked one.

**Acceptance Criteria:**

**Given** a logged-in group member
**When** viewing group settings
**Then** the current invite code is shown

**Given** a regenerate action
**When** triggered
**Then** a new crypto-random code atomically replaces the old one, and the old code immediately stops working

### Story 1.7: Language Switching (DE/EN/FR)

As a user,
I want to switch the UI language between German, English, and French at any time,
So that I can use the app comfortably.

**Acceptance Criteria:**

**Given** Paraglide JS wired into apps/web
**When** the app loads with no explicit preference
**Then** it defaults to German

**Given** a user picks English or French from the language switcher
**When** the UI re-renders
**Then** all visible text on screens built so far (auth/register/settings) updates without losing in-progress form state

**Given** a Problem Details error `type` value
**When** displayed to the user
**Then** the frontend maps it to a localized message rather than showing the raw machine identifier

## Epic 2: Climbing Catalog - Areas, Sectors, Climbs & Accountability

A group member can build and browse their shared area -> sector -> climb catalog on a map (GPS capture, map-click, or place search, hiking-trail tile layer), grade climbs on the French scale, and see who changed a shared entry and when.

### Story 2.1: Group-Scoped Area Access via requireGroupMember

As a group member,
I want areas scoped to my group,
So that I only ever see and edit my own group's climbing areas.

**Acceptance Criteria:**

**Given** the `groups`/`group_memberships` tables from Story 1.4
**When** this story lands
**Then** `climbing_areas` gains its required `groupId` FK via a Drizzle migration, and a shared `requireGroupMember` helper is added alongside the existing `requireAuth`

**Given** the group-scoping seam now in place
**When** any `climbing_areas` route is called
**Then** it uses `requireGroupMember` - never a one-off join

**Given** a user in group A
**When** they request an area belonging to group B
**Then** it is not returned (404, not 403)

**Given** the drizzle-zod insert schema for areas
**When** a client sends a `groupId` in the request body
**Then** it is ignored - the server always derives `groupId` from the caller's own membership

### Story 2.2: Create & View Areas on the Map

As a group member,
I want to create a climbing area on a map and see my group's areas as markers,
So that I can start building our shared catalog.

**Acceptance Criteria:**

**Given** the map view (Leaflet + OpenTopoMap tiles)
**When** it loads
**Then** the group's areas render as markers on a hiking-trail-aware layer

**Given** a click on an empty map point
**When** confirmed
**Then** a new area is created there with name, description, how-to-get-there, comment, and personal rating

**Given** the browser Geolocation API
**When** creating an area on-site
**Then** the captured GPS location can be used instead of a map click

**Given** the geocoder search bar
**When** a place name is entered
**Then** the map pans/zooms to it (Nominatim-backed), and clicking there creates the area

**Given** a user who can't precisely tap the map
**When** the "Add area" fallback action is used instead
**Then** the same creation form opens without requiring a map click

**Given** a group with no areas yet
**When** the home view opens
**Then** it shows the map at a reasonable default zoom with a clear "click the map, or search, to add your first area" affordance

### Story 2.3: Edit & Delete Areas, with Audit Logging

As a group member,
I want to edit or delete an area,
So that I can keep the catalog accurate, with a record of who changed it.

**Acceptance Criteria:**

**Given** an existing area
**When** edited
**Then** changes save and are visible to the whole group

**Given** an existing area
**When** deleted
**Then** it and its sectors/climbs cascade-delete per the existing schema FK behavior

**Given** any area edit or delete
**When** it completes
**Then** an `audit_log` row is written (entityType=area, actorUserId, action, changes, a denormalized `groupId` snapshot)

### Story 2.4: Sectors Within an Area

As a group member,
I want to create, view, edit, and delete sectors within an area,
So that I can organize climbs by where they actually are.

**Acceptance Criteria:**

**Given** an area
**When** a sector is added (name, description, notes, rating, optional map location)
**Then** it is listed under that area for the whole group

**Given** a sector edit or delete
**When** it completes
**Then** it is group-scoped (via the parent area's `groupId`, one join) and an `audit_log` row is written

### Story 2.5: Climbs with French Grades, Tags, Length & Own Location

As a group member,
I want to create, view, edit, and delete climbs within a sector - graded, tagged, with optional length and their own map pin,
So that our catalog reflects real routes and boulders accurately.

**Acceptance Criteria:**

**Given** the `climbGradeValues` enum migration
**When** `climbs.difficulty` is set
**Then** only a valid grade from `4a` through `9c+` is accepted

**Given** `kind = "boulder"`
**When** a `length` value is submitted
**Then** the contract-layer Zod refine rejects it - length is route-only

**Given** a climb with no location of its own
**When** viewed on the map
**Then** it displays at its parent sector's (or area's) location
**And** given it has its own lat/lng, it shows its own distinct pin

**Given** free-form style tags
**When** added to a climb
**Then** they are stored in the existing global `tags`/`climb_tags` tables, unscoped by group

**Given** any climb edit or delete
**When** it completes
**Then** it is group-scoped (the two-join chain through sector to area) and an `audit_log` row is written

### Story 2.6: Catalog List View & Area Page Layout

As a group member,
I want to switch between the map and an alphabetical list view, and use the Area Page's map/list split,
So that I can browse the catalog the way that suits me on any screen size.

**Acceptance Criteria:**

**Given** the home view
**When** the view toggle is used
**Then** the same area data renders as either the Leaflet map or an alphabetically-sorted, collapsible list

**Given** an Area Page on desktop
**When** opened
**Then** the map docks right by default with a collapse control, and the climb list supports flat vs. grouped-by-sector modes, sorted hardest-first by default

**Given** an Area Page on mobile (single breakpoint)
**When** opened
**Then** the map is reached via the same view toggle used at the top level, not docked side-by-side

## Epic 3: Ascent Logging & Media

A group member can log a send (flash/redpoint/project/todo) against a climb and attach/browse photos and videos on any area, sector, climb, or log entry.

### Story 3.1: Flash & Redpoint Logging

As a group member,
I want to log a flash or redpoint on a climb,
So that my sends are recorded instantly, even at the crag.

**Acceptance Criteria:**

**Given** a climb detail view
**When** "Flash" is tapped
**Then** a dated log entry (status=flash) is written instantly, owned by the current user, with no confirmation dialog

**Given** "Redpoint" is tapped
**When** the attempt-count prompt is completed
**Then** a log entry (status=redpoint, attempts=N) is written

**Given** the write fails (e.g. poor connectivity at the crag)
**When** the error surfaces
**Then** an inline, retry-capable error is shown, all entered data is preserved, and retry resubmits the same log entry rather than restarting the form

**Given** a log entry belongs to another user
**When** viewed in "group" mode
**Then** no edit/delete control renders for it at all

### Story 3.2: Projects & Todos

As a group member,
I want to flag a climb as a project I'm working or a todo I've spotted,
So that I can track intent without a full send.

**Acceptance Criteria:**

**Given** a climb
**When** flagged "project" or "todo"
**Then** a log entry is created with that status, with no attempt-count/date prompt required

**Given** an existing "project"
**When** additional attempts are logged over time
**Then** each becomes its own log entry against the same climb

**Given** personal log browsing
**When** filtered by status (flash/redpoint/project/todo, or the "sends" convenience filter meaning flash+redpoint)
**Then** only matching entries show

### Story 3.3: Send-History & Comments

As a group member,
I want to see a climb's send history and add comments to a log entry,
So that the group has a shared record of activity there.

**Acceptance Criteria:**

**Given** a climb with many log entries
**When** the detail view loads
**Then** send-history defaults to a collapsed view of the most recent rows with an expand control

**Given** a log entry
**When** a comment is added
**Then** it is visible to the group, and editable/deletable only by its own author - other users' comments render with no edit/delete control, never a disabled button

**Given** the mine-vs-group toggle
**When** set to "mine"
**Then** only the current user's log entries/comments show
**And** given set to "group", everyone's group-visible activity shows

### Story 3.4: Photo & Video Attachments

As a group member,
I want to attach photos or videos to an area, sector, climb, or log entry,
So that our catalog and trip history include real media.

**Acceptance Criteria:**

**Given** the gallery carousel on a climb detail view
**When** a file is dropped (desktop) or picked (mobile file input)
**Then** it uploads via the existing local-disk storage path and appears in the carousel

**Given** media attached to an area, sector, or climb
**When** viewed by another group member
**Then** it is visible to the whole group and any authenticated group member may delete it (shared-editable rule)
**And** given media attached to a log entry, only that log entry's owner may delete it

**Given** no photos exist yet on an entity
**When** the gallery is viewed
**Then** a plain drag-and-drop invite shows, not a placeholder image

## Epic 4: Search & Nearby Discovery

A group member can search the whole catalog by name or grade from anywhere, and gets automatically pointed at the area they're standing near.

### Story 4.1: App-Content Search

As a group member,
I want to search area/sector/climb names and grades from anywhere,
So that I can jump straight to what I'm looking for.

**Acceptance Criteria:**

**Given** the search bar overlaying the map (also reachable from the list view)
**When** a term is typed
**Then** results come from `GET /api/search`, debounced, scoped to the caller's group at the same join depth each entity's own route already uses

**Given** a grade-like term (e.g. "6a+")
**When** searched
**Then** it matches via an exact, case-normalized grade comparison in addition to the name substring match

**Given** search results
**When** shown against the map
**Then** matches highlight or filter without resetting the user's current pan/zoom

### Story 4.2: Geolocation-Based Area Suggestion

As a group member arriving at a crag,
I want the app to suggest the area I'm near,
So that I don't have to search manually on-site.

**Acceptance Criteria:**

**Given** the device reports a location within ~2km (configurable default) of a known group area
**When** the app opens
**Then** that area is suggested/opened automatically, computed client-side via Haversine distance against the already-fetched group area list

**Given** no area is within the threshold
**When** the app opens
**Then** no suggestion fires and the normal map/list view shows

**Given** this is a client-side-only feature
**Then** no new backend endpoint or server-side geo query is introduced

## Epic 5: Gamification & Personal Stats

A user gets a lightweight flash-count acknowledgment in the moment, and can see their personal achievements and sends-by-grade breakdown afterward.

### Story 5.1: Flash-Count Toast

As a user,
I want a quick acknowledgment when I flash a climb,
So that I get a small sense of progress in the moment.

**Acceptance Criteria:**

**Given** a Flash is logged
**When** the log entry commits
**Then** a toast shows a live, grade-specific flash count (e.g. "Flashed 6a+ x5"), computed via a live query against `log_entries`, dismissing on its own

**Given** this is deliberately lightweight
**Then** no cached/denormalized counter column is introduced

### Story 5.2: Personal Stats Page

As a user,
I want a personal stats page with my achievements, grade breakdown, projects, and bucket list,
So that I can see my climbing progress at a glance.

**Acceptance Criteria:**

**Given** logged sends
**When** the stats page loads
**Then** Achievements shows the hardest flash/redpoint (ties broken deterministically by most-recent `createdAt`), and a sends-by-grade section shows a count per grade tier

**Given** open projects and bucket-list climbs
**When** the stats page loads
**Then** Open Projects and Bucket List sections list them

**Given** the desktop breakpoint
**When** the stats page is viewed
**Then** sections render as a multi-column card grid
**And** given mobile, they stack single-column

## Epic 6: Self-Hosted Deployment

Someone standing up their own instance brings the whole stack up with one command and it just works.

### Story 6.1: Containerized Build & Compose

As someone self-hosting climbing-logbook,
I want to bring up the whole stack with one command,
So that deployment doesn't require manual steps.

**Acceptance Criteria:**

**Given** the multi-stage Dockerfile
**When** built
**Then** it produces a slim `node:22-alpine` image running `node dist/index.js`, serving both the API and the built SvelteKit static output

**Given** `docker-compose.yml`'s `app` service
**When** `docker compose up -d` runs
**Then** postgres and app start, `app` waits on postgres's healthcheck, and migrations run automatically before the HTTP server binds

**Given** uploaded media
**When** the container is recreated
**Then** uploads persist via a named volume, not the container's writable layer

**Given** a fresh instance with no seed data
**When** the first person registers, creates a group, adds an area/sector/climb, and a second (invited) person logs a send with a photo
**Then** the full SPEC.md success-signal scenario works end-to-end
