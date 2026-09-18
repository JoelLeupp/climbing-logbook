---
name: 'climbing-logbook'
status: final
created: '2026-09-18'
updated: '2026-09-18'
description: 'A private trip-journal for a small climbing group — earthy, guidebook-derived palette read through a data-forward, tabular structural register. No dark mode.'
colors:
  bg: '#F2F1EC'
  card: '#FFFFFF'
  panel: '#EDE9E1'
  ink: '#2A2E2B'
  ink-soft: '#5C5850'
  line: '#B0A896'
  moss: '#3E5C42'
  moss-tint: '#E7EDE7'
  clay: '#A65A3C'
  clay-tint: '#F3E4DC'
  grade-tier-1: '#8FA671'
  grade-tier-2: '#3E5C42'
  grade-tier-3: '#C9A227'
  grade-tier-4: '#7A3F29'
  grade-tier-5: '#3D6B8A'
  grade-tier-6: '#6B4C7A'
  grade-tier-7: '#1C1B19'
  grade-tier-7-border: '#F2F1EC'
typography:
  display:
    fontFamily: '-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: '25px'
    fontWeight: 700
    lineHeight: '1.15'
  heading:
    fontFamily: '-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: '19px'
    fontWeight: 700
    lineHeight: '1.2'
  body:
    fontFamily: '-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: '15px'
    fontWeight: 400
    lineHeight: '1.5'
  caption:
    fontFamily: '-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: '12.5px'
    fontWeight: 400
    lineHeight: '1.45'
  eyebrow:
    fontFamily: '-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
    fontSize: '11px'
    fontWeight: 600
    letterSpacing: '0.3px'
    lineHeight: '1.3'
  mono:
    fontFamily: '"Courier New", Consolas, monospace'
    fontSize: '13px'
    fontWeight: 700
    lineHeight: '1.3'
rounded:
  sm: '6px'
  md: '10px'
  lg: '16px'
  full: '9999px'
  DEFAULT: '10px'
spacing:
  '1': '4px'
  '2': '8px'
  '3': '12px'
  '4': '16px'
  '5': '20px'
  '6': '24px'
  '8': '32px'
  gutter: '20px'
  card-padding: '16px'
components:
  grade-badge:
    fontFamily: '{typography.mono.fontFamily}'
    fontWeight: '{typography.mono.fontWeight}'
    fontSize: '{typography.mono.fontSize}'
    radius: '{rounded.sm}'
    padding: '4px 10px'
    tier-1-bg: '{colors.grade-tier-1}'
    tier-1-text: '{colors.ink}'
    tier-2-bg: '{colors.grade-tier-2}'
    tier-2-text: '{colors.bg}'
    tier-3-bg: '{colors.grade-tier-3}'
    tier-3-text: '{colors.ink}'
    tier-4-bg: '{colors.grade-tier-4}'
    tier-4-text: '{colors.bg}'
    tier-5-bg: '{colors.grade-tier-5}'
    tier-5-text: '{colors.bg}'
    tier-6-bg: '{colors.grade-tier-6}'
    tier-6-text: '{colors.bg}'
    tier-7-bg: '{colors.grade-tier-7}'
    tier-7-text: '{colors.grade-tier-7-border}'
    tier-7-border: '1px solid {colors.grade-tier-7-border}'
  button-flash:
    background: '{colors.moss}'
    color: '{colors.bg}'
    radius: '{rounded.md}'
    fontFamily: '{typography.body.fontFamily}'
    fontWeight: 600
  button-redpoint:
    background: '{colors.card}'
    color: '{colors.clay}'
    border: '1.5px solid {colors.clay}'
    radius: '{rounded.md}'
    fontFamily: '{typography.body.fontFamily}'
    fontWeight: 600
  chip:
    background: '{colors.moss-tint}'
    color: '{colors.moss}'
    border: '1px solid {colors.moss}'
    radius: '{rounded.full}'
    fontFamily: '{typography.caption.fontFamily}'
  card:
    background: '{colors.card}'
    radius: '{rounded.lg}'
    border: '1px solid {colors.line}'
    padding: '{spacing.card-padding}'
  panel-recessed:
    background: '{colors.panel}'
    border: '1px solid {colors.line}'
  toast:
    background: '{colors.ink}'
    color: '{colors.bg}'
    radius: '{rounded.md}'
    fontFamily: '{typography.mono.fontFamily}'
  log-row:
    fontFamily: '{typography.mono.fontFamily}'
    fontSize: '11px'
    color: '{colors.ink-soft}'
    stripe-bg: '{colors.panel}'
    divider: '1px solid {colors.line}'
  stat-strip:
    value-fontFamily: '{typography.mono.fontFamily}'
    value-fontWeight: 700
    label-fontFamily: '{typography.eyebrow.fontFamily}'
    label-color: '{colors.ink-soft}'
    divider: '1px solid {colors.line}'
---

# DESIGN.md — climbing-logbook

## Brand & Style

This is a private trip journal, not a product trying to look like one. The visual register comes from two places at once, deliberately fused rather than blended: the *material* is a guidebook you'd stuff in a chalk bag — chalky limestone backgrounds, lichen moss, weathered clay/sandstone — but the *posture* is a training log, not a scrapbook. Nothing is decorative for its own sake. Numbers (grades, attempt counts, dates, lengths) are set in monospace so they read as logged data, not as prose; everything else — names, descriptions, navigation — is a clean, modern sans-serif. [ASSUMPTION] Route/area/sector names are set in the same sans-serif as body text, not the serif used in the rock-chalk mockup — the memlog's synthesis explicitly calls for session-log's typographic register over rock-chalk's guidebook-caption feel, and serif headings would reintroduce exactly that guidebook-caption quality this design deliberately avoids.

The overall feel target (stated directly by the product owner) is smooth, fresh, simple, clean, with smooth transitions and a professional/polished finish — this is a hobby project treated at consumer-grade stakes, not a weekend hack. Photos are a first-class citizen: this app exists partly to look at trip photos later, so galleries get real visual weight, never an afterthought thumbnail strip.

No dark mode. This is explicit, not deferred — do not build a `-dark` token set or theme switcher.

## Colors

- **`{colors.bg}` (`#F2F1EC`)** — page background, chalky limestone. The default canvas everywhere; never used for text.
- **`{colors.card}` (`#FFFFFF`)** — the surface for photos, route/area cards, and any content that should read as "lifted" off the page.
- **`{colors.panel}` (`#EDE9E1`)** — recessed-panel background: the docked map, the collapsed/inactive side of a view toggle. Slightly darker than `bg` so it reads as a distinct, receded region rather than another card.
- **`{colors.ink}` (`#2A2E2B`)** — primary text. A wet-slate green-black, not a pure neutral black — ties text back into the earthy palette instead of sitting on top of it.
- **`{colors.ink-soft}` (`#5C5850`)** — secondary text: captions, metadata, timestamps, breadcrumbs, stat labels. Darkened from an earlier `#6E6A61` — the original sat at ≈4.76:1 against `{colors.bg}`, near-zero margin above the 4.5:1 AA floor, and this app's primary use case is outdoors in direct sun, where near-threshold contrast is exactly what washes out first. The darker value keeps real margin for that specific environment.
- **`{colors.line}` (`#B0A896`)** — hairlines, borders, table dividers, log-row separators, panel/tint depth cues. A dried-clay neutral, warmer than a typical UI grey. Darkened from an earlier `#C9C3B6` (which measured only ≈1.55–1.76:1 against `{colors.bg}`/`{colors.panel}`, well under the 3:1 floor for non-text UI contrast) for the same outdoor-glare reason as `ink-soft` above — a divider or panel edge that's barely visible indoors disappears outright in bright sun.
- **`{colors.moss}` (`#3E5C42`)** — primary accent. Owns the Flash action and any "sent" state (flashed/redpointed indicators in list rows, the send-history log). Also reused as grade tier 2 (see below) since 5b–5c+ already sits naturally in this hue.
- **`{colors.moss-tint}` (`#E7EDE7`)** — moss at low opacity, used only as a background behind moss content (chips, subtle "sent" row backgrounds) — never as a standalone accent.
- **`{colors.clay}` (`#A65A3C`)** — secondary accent. Owns the Redpoint action outline. Sandstone-derived, so it never competes visually with moss. Grade tier 4 is a *darkened* relative of this hue (see below), not this exact value — the outline use on a white card and the filled-badge use needed different contrast headroom.
- **`{colors.clay-tint}` (`#F3E4DC`)** — clay at low opacity, background-only, mirrors `moss-tint`'s role.

### Grade badge tiers

Grade badges are the one place color carries real meaning (difficulty tier), so the palette had to be extended to seven tiers across the full French/Fontainebleau range (4a → 9c+) while (a) staying inside the same earthy/muted family as the rest of the palette — no neon accents bolted onto an otherwise natural palette — and (b) staying distinguishable for colorblind users. The grade **text label is always rendered inside the badge** regardless of tier color; color is a scanning aid, never the only signal. That redundancy is the actual accessibility mechanism here — the hue choices below are a secondary, best-effort layer on top of it.

| Tier | Grades | Color | Token |
|---|---|---|---|
| 1 | 4a–5a+ | light green `#8FA671` | `{colors.grade-tier-1}` |
| 2 | 5b–5c+ | dark green `#3E5C42` (= `{colors.moss}`) | `{colors.grade-tier-2}` |
| 3 | 6a–6b | ochre/mustard yellow `#C9A227` | `{colors.grade-tier-3}` |
| 4 | 6b+–6c+ | burnt clay orange `#7A3F29` (darkened from `{colors.clay}`, see below) | `{colors.grade-tier-4}` |
| 5 | 7a–7b | slate blue `#3D6B8A` | `{colors.grade-tier-5}` |
| 6 | 7b+–7c+ | heather violet `#6B4C7A` | `{colors.grade-tier-6}` |
| 7 | 8a–9c+ | near-black `#1C1B19` | `{colors.grade-tier-7}` |

[ASSUMPTION] Tiers 1, 3, 5, and 6 needed brand-new hex values not present in either mockup (only tiers 2 and 4 were originally covered by moss/clay; tier 4 was later darkened off clay for contrast, see below). I chose a muted sage green, a dulled mustard ochre, a weathered slate blue, and a muted heather violet — each pulled toward the same low-saturation, natural-material register as moss/clay rather than a saturated "UI accent wheel" color. Lightness also steps unevenly across the seven tiers, which helps but is **not a validated colorblindness guarantee** — an adversarial accessibility pass flagged tier 3 (ochre) and tier 4 (burnt clay) as the most plausible adjacent-hue confusion under red-green colorblindness, and tiers 4/5 and 5/6 as close enough in lightness that a greyscale render doesn't cleanly separate every tier either. The hue/lightness system is a **best-effort secondary scan aid**, not a certified pass — the text label inside every badge is the actual, load-bearing accessibility mechanism, not this palette. Verify tiers 3/4 specifically with a real color-blindness simulator at implementation time; if they read as confusable in practice, re-space them rather than trusting this palette as final.

Tier 7 (8a–9c+, near-black `#1C1B19`) is paired with a light text/border color, `{colors.grade-tier-7-border}` (`#F2F1EC` — the page background tone), so the badge stays legible and doesn't collapse visually into dark UI chrome (e.g. the toast, which is also near-ink).

Tier 4 (6b+–6c+) is deliberately darker than the raw `{colors.clay}` accent (`#7A3F29` vs. `#A65A3C`): the original clay-background/light-text pairing measured ≈4.48:1, marginally under the 4.5:1 WCAG AA bar for the badge's 13px bold mono text (below the "large text" size threshold, so 4.5:1 applies, not 3:1). The darkened value restores real margin. This was caught by review, not designed in from the start — treat any grade-tier contrast pairing as needing an actual contrast-checker pass at implementation, not just the qualitative reasoning here.

## Typography

Two families, used with a strict division of labor:

- **Sans-serif** (`{typography.body.fontFamily}` and its relatives `display`/`heading`/`caption`/`eyebrow`) carries all prose: names (area, sector, climb), descriptions, navigation, buttons, chips, toasts. This is the clean, modern register inherited from the session-log direction, deliberately replacing rock-chalk's serif route-name treatment.
- **Monospace** (`{typography.mono}`, `"Courier New"` — kept literally, matching the session-log mockup's choice) is reserved *exclusively* for numeric/logged data: grade badges, the stat strip (length, bolts/attempts, first-log year), send-history log-table rows (date · status · user), and any other tabular figure. If it's a name or a sentence, it's sans. If it's a number or a grade code, it's mono. This split is what gives the app its "field notebook" data-forward feel without going fully utilitarian.

Type roles:

- `{typography.display}` — 25px/700, sans. Route/area/climb title on detail views.
- `{typography.heading}` — 19px/700, sans. Section headers, area-page `<h1>`.
- `{typography.body}` — 15px/400, sans. Default running text, descriptions, list-row names.
- `{typography.caption}` — 12.5px/400, sans. Secondary/meta text, breadcrumbs, descriptions in tighter contexts.
- `{typography.eyebrow}` — 11px/600 with letter-spacing, sans, set in `{colors.ink-soft}`. Small-caps-style labels: sector-group labels in the grouped list mode, stat-strip labels ("length", "attempts").
- `{typography.mono}` — 13px/700, `"Courier New"`. Grade badges, log-table rows, stat-strip values.

## Layout & Spacing

Spacing follows a small linear scale (`{spacing.1}`–`{spacing.8}`, 4px→32px) plus two named tokens: `{spacing.gutter}` (20px, the standard horizontal page/card padding on mobile) and `{spacing.card-padding}` (16px, internal card padding). Mobile screens use the 20px gutter consistently for anything that touches the screen edge (app bar, title block, action bar); desktop panels use the same scale but tighten list rows to 16px vertical rhythm so more of the route list is visible without scrolling, matching the density of the session-log reference over rock-chalk's airier guidebook spacing.

Desktop area-page layout is a two-pane split: a fixed-width list/detail pane on the left (~340–380px) and a flexible map pane on the right, docked by default (see Components → Area page map/list split). There is no dedicated tablet breakpoint; the two-pane layout and the single-column mobile layout are the only two layout modes (see EXPERIENCE.md → Responsive & Platform for the breakpoint and collapse behavior).

## Elevation & Depth

Depth is used sparingly and only to separate floating/transient elements from the page, not to simulate a layered UI chrome:

- Cards (`{components.card}`) sit on `{colors.bg}` with a 1px `{colors.line}` border rather than a shadow — flat-but-bordered, consistent with the paper/guidebook material.
- The flash-count toast and any modal/popover use a soft drop shadow to read as transiently floating above the page (they appear and dismiss; nothing else on the page does).
- The recessed map/panel background (`{colors.panel}`) is a *tonal* depth cue, not a shadow: it reads as "behind" the foreground list purely through being a shade darker than `{colors.bg}`.

## Shapes

[ASSUMPTION] Neither reference mockup's shape language transfers cleanly — rock-chalk uses large, soft radii (guidebook-paper softness) while session-log is deliberately hard-edged (utilitarian, almost zero radius). Since the product owner's explicit brief calls for "smooth" and "polished" over "utilitarian," I chose a moderate, restrained rounding scale rather than either extreme: `{rounded.sm}` (6px) for small tight elements (grade badges, log-row chips), `{rounded.md}` (10px) for buttons and standard cards, `{rounded.lg}` (16px) for large surfaces (photo gallery cards, the area-page map panel), and `{rounded.full}` for pill-shaped chips/tags. Nothing uses session-log's sharp 0px corners, and nothing uses rock-chalk's most exaggerated radii (e.g. 46px phone chrome) outside of chrome that isn't actually part of the product UI.

## Components

- **Grade badge** — `{components.grade-badge}`. Fixed-width-ish pill/rounded-rect, mono numerals, background per tier table above, `{rounded.sm}` corners. Used identically in route detail titleblocks, flat/grouped route list rows, and search results.
- **Flash / Redpoint action buttons** — `{components.button-flash}` / `{components.button-redpoint}`. Equal-width pair anchored at the bottom of the route detail view (mobile) or beside the title (desktop). Flash is filled `{colors.moss}`; Redpoint is an outlined `{colors.clay}` button on `{colors.card}` — visually secondary to Flash without implying it's a lesser send, just a different logging flow (Redpoint additionally prompts for attempt count before committing the log entry).
- **Tag chip** — `{components.chip}`. Pill-shaped, moss-tinted, used for climb style tags (overhang, crimpy, technical, …) under the title block.
- **Card** — `{components.card}`. The base surface for route-list rows, gallery items, and stat tiles.
- **Photo gallery carousel** — horizontally-scrolling row of photo cards at the top of the route detail view (above the title block), `{rounded.lg}` corners, each with a small caption tag overlay when the photo/video has one. This position and treatment is taken from the session-log direction, not rock-chalk's scattered-polaroid or single-hero-image treatments.
- **Stat strip** — `{components.stat-strip}`. A row of 3–4 equal-width cells (e.g. length, bolts, attempts, first-log year) separated by `{colors.line}` vertical dividers; mono numeral value over an eyebrow-styled label.
- **Log-table row** — `{components.log-row}`. Zebra-striped (alternating `{colors.panel}` background), mono type, one row per log entry: date · status (flash/redpoint/attempt) · user. Collapsible when the list is long (see EXPERIENCE.md).
- **Flash-count toast** — `{components.toast}`. Ink-background, light-text, mono numerals for the count. Appears immediately after tapping Flash; dismisses on its own. Exact visual treatment intentionally left open for iteration (see EXPERIENCE.md → Component Patterns → Flash-count toast) — this token only fixes the base color/shape/type, not the final animation or copy.
- **Area page map/list split** — the docked-map-right desktop layout, its expand/collapse control, and the flat-vs-grouped-by-sector list toggle are behavioral more than visual; see EXPERIENCE.md → Component Patterns → Area Page split layout for the full spec. Visually, the docked map sits in a `{components.panel-recessed}` surface with no border radius break at the pane seam (a straight `{colors.line}` divider), while the list pane behind it is plain `{colors.bg}`.
- **Used at shadcn-svelte defaults, unthemed beyond global token application** — the following have no bespoke visual spec of their own because none is needed: the map/list **view toggle**, the **app-content search bar**, the **list-mode/sort control**, and the **group-vs-mine toggle**. All four are plain shadcn-svelte primitives (`toggle-group`, `input`/`command`, `select` or `toggle-group`, `toggle-group`) picking up `{colors}`/`{typography}`/`{rounded}` automatically through the shared theme — this line exists so a consumer doesn't mistake their absence above for an oversight.

## Do's and Don'ts

- **Do** always render the grade text label on a grade badge — never rely on the tier color alone.
- **Do** keep monospace strictly for numeric/logged data (grades, stats, dates, log rows). **Don't** set route/area/sector names, descriptions, or button labels in monospace — that would blur the data/prose distinction the whole system depends on.
- **Do** keep the Flash and Redpoint buttons visually distinct in weight (filled vs. outlined) — they're both "sends," not a primary/disabled pair, but Flash is the more common, faster-tap action.
- **Don't** introduce serif type anywhere in the product UI — the guidebook-serif treatment was deliberately dropped in favor of session-log's structural register.
- **Don't** add a dark theme, a theme toggle, or dark-mode-only tokens.
- **Don't** carry over rock-chalk's guidebook content blocks (approach notes, crux/beta narrative sections) — only its color palette survives into this system.
- **Don't** use drop shadows on standard cards/list rows; reserve shadow for genuinely transient/floating elements (toast, modal).
- **Don't** introduce a new accent hue outside the palette above for any future feature (e.g. badges, alerts) without extending this token set deliberately — the earthy, low-saturation family is the point.
