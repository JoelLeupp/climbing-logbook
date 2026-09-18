---
name: 'climbing-logbook'
status: final
created: '2026-09-18'
updated: '2026-09-18'
---

# EXPERIENCE.md — climbing-logbook

## Foundation

UI system: **shadcn-svelte**, on a **SvelteKit** static SPA frontend (`apps/web`), per ARCHITECTURE-SPINE.md AD-1/AD-3. Components are shadcn-svelte primitives (button, card, dialog, toast/sonner, tabs, toggle-group, etc.) copied in via the shadcn-svelte CLI and re-themed with this system's tokens — never restated visual values, only references. Every visual value below is a reference into `DESIGN.md`'s frontmatter using `{path.to.token}` syntax (e.g. `{colors.moss}`, `{components.grade-badge}`); this file specifies *behavior* — states, flows, interaction rules — not color/type/spacing values.

Two surfaces matter equally, not one primary and one secondary: a phone at the crag (logging, on-site creation) and a bigger screen at home (browsing, planning, bulk data entry). See **Responsive & Platform** below for how layout resolves between them.

No dark mode (see `DESIGN.md`). No push notifications or in-app notification center — not raised anywhere in discovery; do not invent one. No native app, no PWA install prompt, no offline mode — v1 is a responsive web app only (see Responsive & Platform for the full rationale).

## Information Architecture

```
Map/List (home) ──toggle──> alphabetical collapsible list of areas/sectors
  │
  ├─ click empty map point ──> create area here (CAP-1)
  ├─ click existing area marker ──> Area Page
  │                                    ├─ map docked right (default) | expanded list (map hidden)
  │                                    ├─ list mode: flat | grouped-by-sector
  │                                    ├─ sort: hardest-first (default)
  │                                    ├─ add sector (from Area Page)
  │                                    └─ click a climb row ──> Route/Climb Detail
  │                                                                ├─ gallery carousel
  │                                                                ├─ grade badge + tags
  │                                                                ├─ description / length (optional)
  │                                                                ├─ Flash / Redpoint / Project / Todo actions
  │                                                                ├─ send-history (collapsible)
  │                                                                ├─ comments
  │                                                                └─ mine vs. group visibility toggle
  └─ app-content search (global, overlay) ──> highlights/filters map + jumps to area/climb
```

Two independent search affordances exist and must not be conflated in the UI:

- **App-content search** (new capability, not yet in SPEC.md's 9) — a search bar overlaying the map, available from anywhere, searching *this app's own data*: area/sector/climb name and difficulty. Results either highlight matching markers on the map or filter it down to matches only.
- **Geocoder place-search** (AD-14, `leaflet-control-geocoder` / Nominatim) — finds a *real-world* location (a village, region, address) to pan the map to, used when creating an area somewhere not yet on the map. This is a map tool, not a data search, and lives inside the area-creation flow, not the global search bar.

**Map click semantics** (resolves CAP-1's earlier ambiguity): clicking an empty point on the map opens area creation at that location. Clicking an existing area marker opens that area's Area Page — sectors are added from there, and climbs are added from a sector's own detail view. There is no direct "click to add a climb" from the top-level map; the hierarchy (area → sector → climb) is always walked in order.

**Area Page** layout: the map is docked to the right by default; a panel-expand control collapses/hides the map so the area+sector+climb list fills the width instead (useful on a narrower desktop window, or when scanning a long list). Mock: [`mockups/key-area-page.html`](mockups/key-area-page.html). The climb list has two modes — **flat** (every route/boulder in the area, no grouping) and **grouped-by-sector** (each row carries a small sector label) — user-switchable, not two separate pages. Default sort is **hardest-difficulty-first**; user can re-sort.

**Route/Climb Detail** shows, top to bottom: photo/video gallery carousel, title + grade badge, tag chips, optional description and optional length, Flash/Redpoint/Project/Todo actions, send-history (collapsible when long), comments. Mock: [`mockups/key-climb-detail.html`](mockups/key-climb-detail.html) (canonical state, flash-count toast, write-error/retry state) — mock illustrates, this file and DESIGN.md govern; the two never conflict, but if a future edit makes them appear to, the spines win. A group-vs-mine visibility toggle scopes both media and "who's flashed this" to either the current user only or the whole group — group members' activity appears only once this toggle is consciously set to the "group" position (see **State Patterns**).

**Personal Stats Page**: Achievements (biggest flashes/redpoints — hardest grades sent), sends-by-grade breakdown (count per grade bucket, using the same seven-tier grade grouping as the badge, see `DESIGN.md` → Colors), an open-projects section, and a bucket-list/todo section. Mock: [`mockups/key-stats-page.html`](mockups/key-stats-page.html). This is the personal-log-browsing surface, filterable by status (all sends = flash+redpoint, flashes only, projects, todos).

**Auth/invite flow**: register or log in, no dense settings on the way in. Registering either creates a brand-new group (no invite code entered) or joins one via a pasted/visited invite code (context pre-filled from the link) — standard invite-link pattern, first impression stays lean.

## Voice and Tone

Source vocabulary is mirrored verbatim everywhere in copy and code-facing labels — **area, sector, climb, route, boulder, flash, redpoint, project, todo, group, invite code**. Never substitute synonyms ("crag" for area, "problem" for boulder, "send" as a status label instead of flash/redpoint) even where climbing slang would be natural — the whole product is built around these exact terms matching the schema and the glossary.

Tone follows the typographic split in `DESIGN.md`: prose (names, descriptions, empty states, invite copy) is warm but plain — a small group of friends' app, not a corporate product, so copy can be direct and a little informal ("Flashed 6a+ ×5" rather than "Achievement unlocked!"). Anything rendered in mono (grades, stats, log rows, the flash-count toast) reads factual and terse, like a logbook entry, not a marketing moment — no exclamation-heavy copy inside mono-set elements.

## Component Patterns

- **View toggle** (map ↔ list) — a persistent, always-visible control (shadcn-svelte `toggle-group` or tabs) over the home view; switches between the Leaflet map and an alphabetically-sorted, collapsible list of areas/sectors on one scrollable page. Same underlying data, two renderings — switching never refetches data or loses scroll/selection state. Used at shadcn-svelte defaults, no bespoke visual spec (see `DESIGN.md` → Components).
- **Area creation always has a non-map path.** Map-tap-to-create (an empty point → create-area affordance) is the fast path, but a persistent **"Add area"** action (reachable from the list view and the app-content search bar's empty/no-results state) opens the same creation form directly — name, then location via the geocoder search-and-confirm step or manual coordinate entry, no map tap required. This exists because area *browsing* already has a non-map fallback (the list view) while creation didn't — precisely the wrong gap given the primary use case is a phone, in sun, with cold or chalky hands, where a precise map tap is the hardest possible input.
- **App-content search bar** — overlays the map (and is reachable from the list view too), debounced-as-typed, matches against area/sector/climb name and difficulty. On the map view, matches highlight (e.g. marker emphasis) or filter (non-matches dim/hide) — user's existing map pan/zoom is preserved, not reset. Used at shadcn-svelte defaults, no bespoke visual spec (see `DESIGN.md` → Components).
- **Area Page split layout** — desktop: fixed-width list pane (left) + map pane (right, docked, `{components.panel-recessed}`), collapse control hides the map and the list pane grows to fill. Mobile: map is not docked at all by default (see Responsive & Platform) — list-first, map reachable via the same view toggle used at the top level.
- **List mode toggle** (flat / grouped-by-sector) and **sort control** (hardest-first default, user-changeable) sit together above the climb list, not buried in a menu. Used at shadcn-svelte defaults, no bespoke visual spec (see `DESIGN.md` → Components).
- **Stat strip** — `{components.stat-strip}` (DESIGN.md → Components). Static, non-interactive display, not a filter or control. A cell is omitted entirely — not shown as zero or blank — when its underlying value doesn't exist (e.g. no length recorded for a boulder).
- **Gallery carousel** — horizontal scroll/swipe, sits above the title block on the Climb Detail view (see `DESIGN.md` → Components). Drag-and-drop or file-picker upload is the v1 mechanism (desktop drag-and-drop onto the carousel area, or a tap-to-pick file input on mobile where OS drag-and-drop isn't natural). On-site camera capture (tap to open the device camera directly, not just the file picker) is **explicitly deferred, not v1** — do not build a camera-specific capture control now; the file-picker path already lets a mobile user pick a just-taken photo, which covers the crag use case adequately for v1.
- **Grade badge, tag chips, action buttons** — see `DESIGN.md` → Components for anatomy; behaviorally, Flash and Redpoint both write a dated log entry immediately on tap. Redpoint additionally opens a lightweight attempt-count prompt before committing (a single numeric field, not a full form) — Flash needs no such prompt since a flash is by definition attempt #1. Tag chips are **static display only in v1** — not clickable, not a filter control; tapping one does nothing. (Filtering climbs by style tag is a reasonable future enhancement, not built now.)
- **Log-entry creation for Project / Todo** — lower-commitment than Flash/Redpoint: marking a climb "project" or "todo" does not require a date/attempt-count prompt the way Redpoint does; it's closer to a toggle/flag than a logged event, reflecting that these track *intent to attempt* rather than a completed send. A project's attempt history accumulates over time as separate log entries against it; a todo has none until it's attempted.
- **Comments** — plain threaded/flat comment list under send-history on the Climb Detail view; comments and photos can be added to a specific log entry after the fact (not just at creation time). Same per-owner rule as log entries (see State Patterns → Permission-denied): a comment's edit/delete controls are visible only to its own author.
- **Group-vs-mine toggle** — a two-state control (shadcn-svelte `toggle-group`, e.g. "Mine" / "Group") scoping both the media gallery and the "flashed by" list on Climb Detail. Defaults to whichever state makes sense for the entry surface (e.g. "Group" when browsing at home to see everyone's trip photos; "Mine" is not force-defaulted globally) — this is a per-view convenience toggle, not a permissions boundary; both states show data the user already has access to as a group member. Used at shadcn-svelte defaults, no bespoke visual spec (see `DESIGN.md` → Components).
- **Stats page tiles** — Achievements, sends-by-grade, open-projects, bucket-list render as distinct card sections (`{components.card}`) on one scrollable personal stats page, not separate tabs — consistent with the "one scrollable page" pattern already used for the area/sector list.

## State Patterns

- **Log status**: `flash` | `redpoint` | `project` | `todo` (existing `logStatusValues`). Flash/redpoint rows in a send-history list are visually distinct (moss/sent-styling) from project/todo entries. Filtering personal log browsing by status uses these four values directly, plus a convenience "sends" filter meaning flash+redpoint combined.
- **Send-history collapse**: when a climb has many log entries (heavy group traffic on a popular route), the log-table defaults to collapsed, showing a handful of the most recent rows, with an expand control — never a silently truncated list with no way to see the rest.
- **Group vs. mine** (see Component Patterns for what each state scopes and its default): view-local per page visit, not a persisted global preference, unless later found worth remembering.
- **Map click target states** (see Information Architecture for the base rule): empty point shows a temporary marker + "create area here" prompt before committing. No third "ambiguous click" state — the map never asks "did you mean to create or open?"
- **Empty states**: no photos yet on a climb → gallery area shows a plain drag-and-drop invite, not a placeholder image. No sends yet on a climb → send-history area shows a short plain-language empty note, not a fabricated "0 entries" table header. No areas yet (first login) → home view opens straight to the map at a reasonable default zoom with a clear "click the map, or search, to add your first area" affordance.
- **Auth/invite states**: valid invite code → prefilled group context on the register form; invalid/expired code → a clear inline error, never a silent fallback to creating a brand-new group (matches AD-16's server behavior — the UI must surface that failure plainly, not swallow it).
- **Loading (read)**: every data-fetching surface (map/list home, area page, route/climb detail, personal stats page) shows a lightweight skeleton matching that surface's card shapes while loading — never a blocking full-page spinner. One consistent skeleton treatment app-wide, not a bespoke one per surface.
- **Error (read)**: a failed fetch/read renders an inline, retry-capable error message in place of the content that failed to load — the same visual treatment as the write-failure toast below, applied to reads. Never a blank surface with no explanation.
- **Error (write) — the crag-connectivity case**: SPEC.md is deliberately online-only for v1 (no local queue/sync), and Flash/Redpoint at the crag is exactly where a write is most likely to fail on poor signal. A failed Flash/Redpoint (or any other write) shows an inline error banner/toast with a **Retry** button; everything already entered (grade, attempt count, notes, date) is preserved, never lost, and retry resubmits the same data rather than restarting the form. No local queue or background sync — retry is a manual, explicit action.
- **Permission-denied (log entries and comments)**: edit/delete affordances on a log entry or comment are rendered **only for its own owner** — another user's row (visible when the "group" toggle is on) is plainly read-only, with no edit/delete control shown at all. Never a visible-but-disabled button; the control simply isn't there, so it never looks broken.

## Interaction Primitives

- **Map click** (see Information Architecture for the full rule): no separate "add" button floats over the map to duplicate it.
- **Toggle, not navigation**, for: map/list view, flat/grouped list mode, mine/group scope, sort order. These are all state flips over the same page/data, never a route change that could lose scroll position or trigger a full reload.
- **Drag-and-drop** is the primary desktop media-upload gesture; a standard `<input type="file">` picker is the fallback/mobile-equivalent — both feed the same upload pipeline, no separate code paths in the UI beyond the input affordance itself.
- **Instant-commit actions**: Flash writes its log entry the instant it's tapped (no confirmation dialog) — the point is frictionless in-the-moment logging at the crag. Redpoint is a two-step tap → attempt-count → commit, the minimum friction that still captures the one piece of data (attempts) that differs.
- **Search-as-you-type**: both the app-content search bar and the geocoder input filter or suggest results live as the user types, debounced, never requiring an explicit submit.

## Accessibility Floor

Consumer-grade stakes were chosen explicitly for this project despite its small-group/hobby scope — this is a real floor, not aspirational:

- **Grade badges are never color-only.** The grade text label (e.g. "6a+") is always rendered inside the badge alongside its tier color; a colorblind user (or a greyscale screenshot) can always read the grade from text alone. This text label is the actual accessibility guarantee — see `DESIGN.md` → Colors: the tier palette's hue/lightness spacing is a best-effort scan aid only, not a validated colorblindness pass (tiers 3/4 in particular are close enough to warrant a real simulator check at implementation time).
- **Touch targets meet ~44px minimum everywhere an element is tappable**, as a blanket rule, not a fixed list — Flash/Redpoint buttons, map markers, list rows, every toggle control (view, list-mode/sort, group-vs-mine), and gallery-carousel controls all included. This is a phone-first logging surface used one-handed at a crag, often in imperfect light or with cold hands; any interactive element added later inherits this floor by default; it doesn't need to be re-stated per control.
- **Color contrast**: body text and all interactive labels meet WCAG AA; `{colors.ink-soft}` and `{colors.line}` carry extra margin for outdoor glare specifically, and every grade-tier badge pairing was checked against the 4.5:1 small-text bar — see `DESIGN.md` → Colors for the specific tier values and the tier-4/tier-7 fixes that came out of that check.
- **Images need alt text / captions**: gallery photos and videos carry their existing caption/tag metadata as accessible text, not decorative-only images.
- **Forms are labeled**, not placeholder-only (area/climb creation forms, invite-code entry, attempt-count prompt) — standard shadcn-svelte form-field labeling, not a shortcut around it.
- **Keyboard/focus**: shadcn-svelte's built-in focus-visible and keyboard-navigable primitives (dialog, toggle-group, tabs) are used as-is rather than replaced with custom unlabeled click targets — the map itself is the one inherently mouse/touch-first surface, standard for a Leaflet map.
- Explicitly **not** in scope because never raised in discovery: screen-reader-first map interaction beyond standard Leaflet behavior, RTL layout, reduced-motion mode. Don't invent these; revisit only if raised later.

## Responsive & Platform

Multi-surface is load-bearing, not an afterthought: the same product is used mobile-first at the crag (logging sends, checking what's nearby) and desktop-capable at home (browsing photos, planning trips, bulk-adding sectors/climbs). This resolves to a **responsive web app, mobile-first for logging interactions, desktop-capable for browsing/planning** — not a phone-primary app with a cut-down desktop view, and not a desktop-primary app retrofitted to mobile.

- **Phone (primary logging surface)**: single-column layout throughout. Area Page shows the climb list by default with the map reached via the same view-toggle pattern used at the top level (not docked side-by-side — there isn't width for that). Gallery carousel, action buttons, and the flash-count toast are all designed mobile-first (see mockup reference geometry) and scale up rather than being redesigned for desktop.
- **Desktop/bigger screen (primary planning/browsing surface)**: two-pane Area Page (list + docked map side-by-side), wider gallery carousels showing more items at once, and the personal stats page laid out as a multi-column card grid rather than a stacked single column.
- **Breakpoint**: a single breakpoint separating "phone" (single-column, map-via-toggle) from "everything wider" (two-pane where applicable) is sufficient — no dedicated tablet-specific layout is called for anywhere in discovery; don't build one speculatively.
- **Geolocation** (browser Geolocation API, AD-1) is used for on-site GPS capture when creating/editing an area or sector — a capability that only meaningfully fires on the phone surface, though the control itself doesn't need to be hidden on desktop (a desktop browser can still report a location, just a less useful one for this app's purpose).
- **No native app, no PWA install prompt, no offline mode** — explicitly out of scope for v1 (SPEC.md non-goals, AD-1). The responsive web app is the only artifact; don't design around an app-store icon, splash screen, or offline queue state.

## Key Flows

Protagonist for both flows: **Joel**.

### Flow 1 — At the crag (mobile)

1. Joel is climbing at Céüse and wants to log a route that isn't in the app yet. He opens the app on his phone.
2. The app either auto-suggests the area he's near (geolocation-based "you're near Céüse" suggestion — see **Open Items** below; this is new scope beyond centering the map) or he searches for it via app-content search.
3. He opens the area, selects the sector he's physically at ("Berger"), taps **Add new route**.
4. He enters: name, difficulty (French grade, e.g. "6a+"), optional tags (overhang, pockets, …), optional description, optional length.
5. Back on the new route's detail view, he taps **Flash** the moment he sends it clean on his first try — the log entry is written instantly, dated today, no confirmation dialog.
6. **Climax:** the flash-count toast appears — "Flashed 6a+ ×5" — a quick, factual acknowledgment, not a fanfare (see Component Patterns → Flash-count toast).
7. Afterward, still at the crag or later that evening, he can add a photo (drag-and-drop/file-picker) or a comment to that log entry.
8. For a route he wants to come back for but doesn't send today, he instead marks it **project** (if he's actively working it) or **todo** (if he's just spotted it for later) — both lower-commitment than tapping Flash/Redpoint, no attempt-count prompt required.

**Failure:** step 5's write fails (poor signal at the crag — the scenario that SPEC.md's online-only v1 constraint makes most likely right here). Joel sees an inline error with a **Retry** button; the grade/attempt data he entered is untouched, and tapping Retry resubmits the same log entry rather than making him start over (see State Patterns → Error (write)).

### Flow 2 — At home (desktop, planning)

1. Joel is planning a weekend boulder trip to Magic Wood. He opens the app on his laptop.
2. Magic Wood doesn't exist in the app yet, so he uses the geocoder place-search (AD-14, distinct from app-content search) to locate it on the map, then clicks the empty point to create the area there.
3. He adds the sector he'll visit within that new area.
4. He pre-adds boulders he's already scouted (from photos/guidebooks) into that sector ahead of the trip — each either pinned to its own exact location if he knows it, or falling back to display at the parent sector/area's location if he doesn't.
5. On the Area Page, the map sits docked to the right by default while he works through the sector+climb list on the left; he can collapse it to fill the screen with the list while doing bulk entry, then bring it back to check locations visually.
6. **Climax:** browsing the same area at home, he switches the group-vs-mine toggle on a climb to "group" and sees photos other group members added from past trips, and who else in the group has already flashed a given boulder before he gets there — the moment the shared logbook actually pays off as a group artifact, not just his own.
7. On his Personal Stats page, he checks his open-projects and bucket-list sections to decide what to prioritize on the trip, and glances at his sends-by-grade breakdown out of curiosity.

**Failure:** at step 2, the geocoder can't find "Magic Wood" (typo, or a name it doesn't recognize). Joel sees a plain "no results" state, not a silent empty map — he can retype, or pan/zoom the map manually and click the point directly instead (the map-click path never depends on the geocoder succeeding first).

### Flow 3 — Auth/invite, first open

1. Joel's friend sends him a group invite link. He opens it on his phone.
2. The register form opens with the invite code already filled in from the link — lean, no dense settings, just name/email/password plus the pre-filled code.
3. **Climax:** he submits, and lands directly in the group's shared view — the areas his friends already created are immediately visible, no empty first-run state to get past.

**Failure:** the invite code turns out to be invalid or already regenerated by the time he submits. He sees a clear inline error on the form (see State Patterns → Auth/invite states) — never a silent fallback that quietly creates him a brand-new, empty group instead of the one he meant to join.

## Open Items — Feeds Back to Spec, Not Pure UX

The following surfaced during this UX discovery but are product/schema decisions, not purely visual/interaction ones. They are noted here so `bmad-spec` can pick them up; this file assumes they will land, but does not itself change SPEC.md/glossary.md/the DB schema.

- **[NOTE FOR UX/SPEC] Geolocation-based "near area X" auto-suggestion.** Beyond AD-14's existing map-centering use of geolocation, Flow 1 above assumes the app can proactively suggest "you're near Céüse" using the user's on-site location — this is a new capability nuance, not yet in SPEC.md's 9 capabilities.
- **[NOTE FOR UX/SPEC] New `length` field on climbs.** The route-creation flow (Flow 1, step 4) includes an optional length field that does not currently exist on `packages/db/src/schema.ts`'s `climbs` table.
- **[NOTE FOR UX/SPEC] Climbs need their own optional lat/lng.** Flow 2 (step 4) requires a climb (specifically a boulder) to optionally carry its own exact map location, falling back to its parent sector/area's location when absent. Currently only `climbing_areas` and `sectors` have a location column — `climbs` has none.
- **[NOTE FOR UX/SPEC] French-grade enum replacing free-text `difficulty` — already decided, not yet applied.** This was a genuine fork, and it's resolved: the user explicitly chose a constrained, ordered French/Fontainebleau grade scale from 4a through 9c+, used uniformly for both routes and boulders, over keeping `difficulty` free-text. What's still open is applying it — `packages/db/src/schema.ts`'s `difficulty` column is still free-text today, and SPEC.md/the architecture spine haven't been updated to reflect the enum yet. This file (and `DESIGN.md`'s grade-tier palette) already designs against the enum outcome.
- **[NOTE FOR UX/SPEC] New gamification/achievement-badge capability.** The Flash-count toast (**Component Patterns**) and the Achievements section of the Personal Stats page are new scope beyond SPEC.md's 9 capabilities.
- **[NOTE FOR UX/SPEC] New app-content-search capability.** The global search-over-app-data pattern (**Information Architecture**) is new scope beyond SPEC.md's 9 capabilities, distinct from AD-14's geocoder.
