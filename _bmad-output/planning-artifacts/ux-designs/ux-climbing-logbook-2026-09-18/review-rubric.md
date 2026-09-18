# Spine Pair Validation — DESIGN.md + EXPERIENCE.md (climbing-logbook, 2026-09-18)

Reviewed as the downstream contract for architecture/story-dev consumers. Sources cross-checked: `.memlog.md`, `.working/*.html` (5 direction mockups), `_bmad-output/specs/spec-climbing-logbook/{SPEC.md,glossary.md}`, `ARCHITECTURE-SPINE.md`, and the two worked examples (`design-example-shadcn.md`, `experience-example-shadcn.md`).

Severity = downstream impact (would a consumer build the wrong thing, or have to stop and ask), not fix effort.

---

## Pass 1 — Mechanical Coverage

### 1. Flow coverage — **THIN**

EXPERIENCE.md has exactly 2 Key Flows (Flow 1 — at the crag/mobile, 8 steps; Flow 2 — at home/desktop, 7 steps), both correctly matching the memlog's two documented journeys (memlog lines 20–24, 24). Both have a named protagonist (Joel) and numbered steps.

Misses:
- **No explicit climax beat marker in either flow.** The worked example (`experience-example-shadcn.md`) marks the turning point explicitly (`**Climax:**` at Flow 1 step 5, Flow 2 step 5). EXPERIENCE.md's Flow 1 steps 5–6 (Flash tap → toast) and Flow 2 step 6 (group toggle reveals others' data) are the implicit climaxes but are never called out as such — a story-dev consumer has to infer which beat matters most.
- **No failure path in either flow.** The worked example ends each flow with an explicit `Failure: ...` line. Neither Flow 1 nor Flow 2 in EXPERIENCE.md (lines 121–140) states what happens when a step fails — most materially, Flow 1's climax (tapping Flash at the crag) is exactly the moment SPEC.md's online-only constraint (no offline queue, `_bmad-output/specs/spec-climbing-logbook/SPEC.md` Constraints) is most likely to bite, and it's undocumented. See State coverage #4 below — same root gap.
- **No Key Flow for the Auth/invite journey.** It's a distinct IA surface (EXPERIENCE.md line 53) with real state complexity (valid/invalid invite code) and the memlog explicitly calls out wanting a strong first impression (memlog line 18: "lean and simple, good first impression"). It gets an IA paragraph and two State Patterns bullets but no walked flow. Minor — memlog frames it as a decision, not a "journey," so this is a softer miss than the two above.

### 2. Token completeness — **ADEQUATE**

Every token defined in DESIGN.md's YAML frontmatter (colors, typography, rounded, spacing, components) is used at least once, and every `{path.to.token}` reference found in the prose of both DESIGN.md and EXPERIENCE.md resolves to a token actually defined in the frontmatter. No dangling references found. All color tokens carry hex values — none missing. `rounded.DEFAULT` is defined but never referenced in prose (trivial, unused-token nit, not a break).

Miss:
- **Contrast targets are stated for only one grade-tier pairing.** Accessibility Floor (EXPERIENCE.md line 101) and the tier-7 callout (DESIGN.md line 181) explicitly assert/verify contrast for the near-black tier-7 badge against its light border/text token. Tiers 1–6 get only a qualitative claim ("lightness-stepped... colorblind-aware," DESIGN.md line 179) with no stated ratio. I hand-computed WCAG contrast for each tier's badge text/background pair as documented (tier text color per the tier table in DESIGN.md lines 169–177, paired with `ink` or `bg` per the `components.grade-badge` tier-text tokens):
  - Tier 1 (`#8FA671` bg / `ink` text): ≈5.2:1 — passes AA.
  - Tier 2 (`#3E5C42` bg / `bg` text): ≈6.6:1 — passes AA.
  - Tier 3 (`#C9A227` bg / `ink` text): ≈5.7:1 — passes AA.
  - **Tier 4 (`#A65A3C` bg / `bg` text): ≈4.48:1 — sits right at/marginally under the 4.5:1 AA threshold for normal-size text.** Grade badges render at 13px bold mono, which is below the "large text" size threshold (18.66px bold), so 4.5:1 is the applicable bar, not 3:1.
  - Tier 5 (`#3D6B8A` bg / `bg` text): ≈5.1:1 — passes AA, but closer to the line than tiers 1–3.
  - Tier 6 (`#6B4C7A` bg / `bg` text): ≈6.3:1 — passes AA.
  - Tier 7: ≈15.2:1 — passes comfortably (matches the doc's own claim).
  These are manual approximations, not a validator-grade check, but tier 4 is close enough to the line that it should have been verified and stated explicitly rather than resting on the general "colorblind-aware" narrative — especially since the doc's own accessibility floor treats color contrast as "a real floor, not aspirational" (EXPERIENCE.md line 97).

### 3. Component coverage — **THIN**

Cross-referencing DESIGN.md → Components against EXPERIENCE.md → Component Patterns:

Covered both ways (visual spec in DESIGN.md + real behavioral rules in EXPERIENCE.md, not one-word descriptions): Grade badge, Flash/Redpoint action buttons, Photo gallery carousel, Flash-count toast, Area page map/list split (`panel-recessed`), Log-table row (behavior lives under **State Patterns** rather than **Component Patterns** — substance is present, just filed under a different heading than the rubric's target section).

Misses:
- **Stat strip** (`{components.stat-strip}`, DESIGN.md line 224) has a full visual spec but **zero counterpart anywhere in EXPERIENCE.md's Component Patterns** — not even a one-line behavioral note (e.g., is it ever interactive/filterable, or purely static display?). Every other DESIGN.md component gets at least a pointer; this one gets none.
- **Tag chip**: DESIGN.md gives it a full visual row; EXPERIENCE.md's counterpart (line 68, "Grade badge, tag chips, action buttons — see DESIGN.md → Components for anatomy") gives it no behavior of its own (is a tag chip ever clickable, e.g. to filter by style tag? Unstated) — thin, not absent.
- **Comments**: named as its own Component Patterns bullet (EXPERIENCE.md line 70) but has no DESIGN.md visual row at all, and its own behavioral spec is thin (no edit/delete/permission rules — contrast with the per-user log-entry ownership rule that AD-13 encodes at the architecture layer).
- **View toggle, App-content search bar, List mode/sort control, Group-vs-mine toggle**: all four are named, behaviorally specified Component Patterns entries in EXPERIENCE.md, but **none has a DESIGN.md visual-spec row**. DESIGN.md's Foundation statement (EXPERIENCE.md line 12) says shadcn-svelte primitives are "re-themed with this system's tokens — never restated visual values, only references," implying every themed component should trace to a token, but DESIGN.md never states which shadcn primitives are deliberately left at shadcn defaults vs. which are customized. The Drift worked example makes this an explicit contract line ("Drift uses the following shadcn components as-is, unchanged: Button, Card, Dialog..." — `design-example-shadcn.md` line 93); climbing-logbook's DESIGN.md has no equivalent list, so a consumer can't tell whether the visual silence on these four controls is deliberate inheritance or an oversight.

### 4. State coverage — **THIN**

Walked each IA surface against empty/loading/error/focus/permission-denied:

| Surface | Empty | Loading | Error | Focus | Permission-denied |
|---|---|---|---|---|---|
| Map/List home | ✓ (EXPERIENCE.md line 80, "no areas yet") | ✗ not stated | ✗ not stated | partial (search-as-you-type only) | n/a |
| Area Page | ✗ no empty-sector/empty-climb-list state stated | ✗ not stated | ✗ not stated | ✓ map click-target states (line 79) | n/a |
| Route/Climb Detail | ✓✓ (line 80, photos & send-history both covered) | ✗ not stated | **✗ not stated — see below** | partial (general only) | **✗ missing — see below** |
| Personal Stats Page | ✗ not stated (new user with zero logs — what renders?) | ✗ not stated | ✗ not stated | n/a | n/a |
| Auth/invite | n/a | ✗ not stated (submit-in-progress) | ✓ invite-code only; ✗ general login/register failure (bad password, duplicate email) not stated | ✓ generic (labeled forms) | n/a |

The two misses worth flagging individually:
- **No failure state for a failed Flash/Redpoint write.** Interaction Primitives (line 88) frames Flash as "instant-commit... the point is frictionless in-the-moment logging at the crag" — precisely the scenario (remote crag, poor signal) where SPEC.md's online-only constraint (no local queue/sync) makes a failed write most likely. Nothing in State Patterns, Interaction Primitives, or Flow 1 says what the UI does if that write fails. This is the single highest-impact gap in the document: it's a scenario the spine's own narrative repeatedly foregrounds (Flow 1's whole premise) and never resolves.
- **No permission-denied state for another user's log entry.** AD-13 (ARCHITECTURE-SPINE.md) explicitly makes `log_entries` per-user-owned (update/delete requires `eq(userId, currentUser.id)`), and Climb Detail's "group" toggle deliberately surfaces other users' send-history rows (EXPERIENCE.md line 78). Nothing states whether/how the UI hides or disables edit/delete affordances on someone else's row. A story-dev consumer implementing this screen has no spec to follow for that interaction and must invent it or ask.

Empty states are the one state category consistently and explicitly handled (home, climb detail); loading and error are close to entirely absent across all five surfaces, and the two structural permission/failure gaps above are the most consequential specific misses.

### 5. Visual reference coverage — **STRONG**

`.working/` contains exactly the 5 direction mockups the memlog records as rendered: `direction-rock-chalk.html`, `direction-alpine-minimal.html`, `direction-session-log.html`, `direction-golden-hour.html`, `direction-vertical-grid.html` (memlog line 31) — file list matches 1:1.

Both DESIGN.md and EXPERIENCE.md correctly and repeatedly cite **rock-chalk** (palette source) and **session-log** (structural/typographic source) as the two synthesis inputs, consistent with the memlog's synthesis decision (memlog line 32): DESIGN.md lines 146, 187, 188, 201, 215, 223, 236; matches the "rock-chalk palette + session-log structure, not rock-chalk's guidebook content blocks" decision exactly, including the explicit carve-out against rock-chalk's approach-notes/crux-beta content blocks (Do's and Don'ts, line 236) and against its scattered-polaroid/hero-image photo treatment (line 223).

Grepped both spine files for the three rejected directions (`alpine-minimal`, `golden-hour`, `vertical-grid`) — **zero matches** in DESIGN.md or EXPERIENCE.md. They appear only in `.memlog.md`, where recording that they were rendered and rejected is expected. Clean citation discipline — no leakage of rejected-direction content into the contract.

---

## Pass 2 — Judgment

### 6. Bloat & overspecification — **ADEQUATE**

Both files are denser than the worked examples (DESIGN.md 239 lines vs. Drift's ~110; EXPERIENCE.md 152 lines vs. Drift's ~134), but the domain genuinely carries more surface area (7 grade tiers with individual accessibility rationale, two load-bearing device surfaces, map/list duality, an explicit Open Items appendix) — the extra length tracks real decisions, not padding. The `[ASSUMPTION]` callouts are load-bearing (they explain deviations the user later signed off on per memlog line 34), not filler.

One recurring stylistic tic: the rock-chalk-vs-session-log comparison is re-litigated in nearly every DESIGN.md section (Brand & Style, Typography, Layout & Spacing, Shapes, Components, Do's and Don'ts) — five-plus separate call-backs to the same two mockups. Each instance ties a specific token to a specific rationale, so it's not empty repetition, but it reads as slightly over-justified relative to the worked example's tighter "Drift inherits X, brand-overrides Y" framing. Not severe.

### 7. Inheritance discipline — **STRONG**

Component names are used identically across DESIGN.md and EXPERIENCE.md (Grade badge, Flash/Redpoint buttons, Tag chip(s), Gallery carousel, Area Page split layout, Flash-count toast) — no drift in naming. Every `{path.to.token}` reference in EXPERIENCE.md resolves to a DESIGN.md-defined token by name (verified in #2 above).

Glossary terms (area/sector/climb/route/boulder/flash/redpoint/project/todo/group/invite code) are used consistently with `glossary.md` and Voice and Tone explicitly locks this down as a non-negotiable rule (EXPERIENCE.md line 57). One disclosed, deliberate exception: the spine designs against a French-grade **enum** (4a–9c+) throughout (grade-tier palette, Personal Stats grouping), while `glossary.md`'s "Difficulty" entry still describes free-text grading ("grading systems differ between routes and boulders, so it is not a constrained enum" — glossary.md line 8). This is a real, current mismatch between the spine and the glossary, but it's explicitly flagged as an open, already-decided-but-not-yet-applied item in EXPERIENCE.md's Open Items section (line 149) — a transparent forward-reference, not an unflagged defect. Also minor: `glossary.md` itself never defines "invite code" as a term even though it's used as schema-adjacent vocabulary in SPEC.md CAP-8/AD-16 and in EXPERIENCE.md's fixed-vocabulary list — a gap in the glossary, not in the spine pair.

### 8. Shape fit — **STRONG**

DESIGN.md's sections run in exactly the canonical order: Brand & Style, Colors, Typography, Layout & Spacing, Elevation & Depth, Shapes, Components, Do's and Don'ts. No omissions, no reordering.

EXPERIENCE.md contains all required sections (Foundation, IA, Voice and Tone, Component Patterns, State Patterns, Interaction Primitives, Accessibility Floor, Key Flows) plus Responsive & Platform, in an order that mostly tracks the worked example. One deviation: the invented **Gamification** section is inserted between Interaction Primitives and Accessibility Floor (EXPERIENCE.md lines 91–93), breaking the Interaction-Primitives→Accessibility-Floor adjacency the worked example keeps intact. Minor ordering nit, not a structural break.

Does Gamification earn its own top-level section? Content is a single paragraph — thin relative to a dedicated H2. The justification for breaking it out (rather than folding it into a Component Patterns bullet on the toast) is traceability: it's explicitly tied to an Open Item requiring spec sign-off (a new capability beyond SPEC.md's 9), so isolating it for visibility to a `bmad-spec` reader is defensible. Judgment: **earns its place, but marginally** — it could be merged into Component Patterns without losing information.

---

## Summary Table

| # | Category | Verdict |
|---|---|---|
| 1 | Flow coverage | Thin |
| 2 | Token completeness | Adequate |
| 3 | Component coverage | Thin |
| 4 | State coverage | Thin |
| 5 | Visual reference coverage | Strong |
| 6 | Bloat & overspecification | Adequate |
| 7 | Inheritance discipline | Strong |
| 8 | Shape fit | Strong |

## Findings by Severity

- **Critical (2):** no failure/offline-error path for a Flash/Redpoint write at the crag (the flow's own climax scenario); no permission-denied state for another user's log entry despite AD-13's explicit per-user ownership rule.
- **Major (5):** systemic loading/error state gaps across home, area page, and stats page; no climax marker or failure path documented in either Key Flow; four Component Patterns entries (view toggle, search bar, list-mode/sort control, group-vs-mine toggle) with no DESIGN.md visual counterpart and no "inherits shadcn defaults" contract statement to explain the silence; unverified/borderline grade-tier-4 badge contrast (~4.48:1, at the AA line); stat-strip component with zero EXPERIENCE.md behavioral counterpart.
- **Minor (5):** no dedicated Key Flow for Auth/invite; glossary.md doesn't define "invite code" as a term; Gamification section placement/thinness; repetitive rock-chalk-vs-session-log motif across DESIGN.md; thin Comments and Tag-chip behavioral specs.

## Overall Verdict

**Adequate, with thin spots.** The spine pair has a strong, well-cited visual foundation (tokens all resolve, canonical section shapes intact, correct and clean sourcing from the two winning mockups) and a coherent brand/behavior narrative. But a downstream consumer building from this contract alone would hit real gaps exactly where it matters most: no guidance for a failed write at the crag (the flow's central scenario), no rule for another user's log entry, systemically absent loading/error states, and a handful of named UI controls with no visual specification or explicit "inherits defaults" statement to fall back on. None of these are unfixable, but all would currently require the consumer to stop and ask rather than source-extract cleanly.
