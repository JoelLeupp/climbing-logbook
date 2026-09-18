# Accessibility Review — climbing-logbook UX (DESIGN.md / EXPERIENCE.md, 2026-09-18)

Scope: consumer-grade accessibility rigor, as explicitly chosen by the product owner for this hobby app. Reviewed adversarially against WCAG 2.x AA-equivalent expectations and the stated crag-use context (bright sun, cold/chalky hands, one-handed phone use). Enterprise/regulated-grade requirements (WCAG AAA, RTL, screen-reader-first map interaction) are explicitly out of scope and not invented here.

All contrast figures below are calculated WCAG relative-luminance contrast ratios from the exact hex values in `DESIGN.md`'s frontmatter, not estimates.

---

## 1. Grade-badge color-tier system

**Verdict: the text-redundancy mitigation is sound and sufficient as a hard accessibility guarantee — but two specific, checkable claims in DESIGN.md do not hold up, and one tier has a marginal contrast failure.**

### 1a. Tier 4 background/text contrast is a real (if marginal) AA failure

DESIGN.md's Accessibility Floor claims "all interactive labels meet WCAG AA contrast" and specifically calls out tier 7 (near-black) as needing a light-text override to avoid a contrast failure. It does not check the other tiers. Calculated contrast of each badge's background against its assigned text color:

| Tier | Grades | BG | Text | Contrast | AA (4.5:1, normal text) |
|---|---|---|---|---|---|
| 1 | 4a–5a+ | `#8FA671` | ink `#2A2E2B` | 5.16:1 | Pass |
| 2 | 5b–5c+ | `#3E5C42` | bg `#F2F1EC` | 6.60:1 | Pass |
| 3 | 6a–6b | `#C9A227` | ink `#2A2E2B` | 5.70:1 | Pass |
| **4** | **6b+–6c+** | **`#A65A3C`** | **bg `#F2F1EC`** | **4.475:1** | **Fail (just under 4.5:1)** |
| 5 | 7a–7b | `#3D6B8A` | bg `#F2F1EC` | 5.06:1 | Pass |
| 6 | 7b+–7c+ | `#6B4C7A` | bg `#F2F1EC` | 6.32:1 | Pass |
| 7 | 8a–9c+ | `#1C1B19` | tier-7-border `#F2F1EC` | 15.22:1 | Pass (as intended) |

Tier 4 sits at 4.475:1 — below the 4.5:1 normal-text AA threshold. The badge type (13px bold mono) does **not** qualify for the 3:1 "large text" carve-out (that requires ~18.7px bold / 24px regular). This is a genuine, easily-fixed gap: either darken tier 4's background slightly or swap its text token from `bg` to `ink` (as tiers 1 and 3 already do) to push it back over 4.5:1. Notably, 6b+–6c+ is a very commonly-scanned mid-range grade band, so this isn't an edge-case tier.

### 1b. The "distinguishable in greyscale / under full color-blindness via lightness-stepping" claim is not well supported

DESIGN.md asserts each tier's lightness "steps distinctly ... so tiers stay distinguishable even rendered in greyscale or under full color-blindness." Calculated WCAG relative luminance per tier:

| Tier 1 | Tier 2 | Tier 3 | Tier 4 | Tier 5 | Tier 6 | Tier 7 |
|---|---|---|---|---|---|---|
| 0.343 | 0.091 | 0.384 | 0.158 | 0.133 | 0.097 | 0.011 |

This is not a monotonic "light → dark → light-mid → mid → mid-dark → dark → near-black" progression as described — tier 3 (0.384) is actually *lighter* than tier 1 (0.343), and two adjacent pairs are luminance-close enough to be a real risk in true greyscale/achromatopsia:
- **Tier 4 / Tier 5** (0.158 vs 0.133, Δ0.024) — the closest adjacent pair.
- **Tier 5 / Tier 6** (0.133 vs 0.097, Δ0.036) — second-closest.
- (Non-adjacent but notable: Tier 2 and Tier 6, 0.091 vs 0.097, are nearly indistinguishable in luminance — a green and a violet tier would render as near-identical greys.)

### 1c. Plausible adjacent-tier hue confusion under real (not full-achromatopsia) colorblindness

For the far more common red-green CVD types (deutan/protan, ~8% of men), the calculated hues (HSL) are:

| Tier | Hue | Note |
|---|---|---|
| 1 | 86° (yellow-green) | |
| 2 | 128° (green) | |
| 3 | 46° (gold/ochre) | |
| 4 | 17° (red-orange/clay) | |
| 5 | 204° (blue) | |
| 6 | 280° (violet) | |
| 7 | near-neutral | |

- **Tier 3 (46°) / Tier 4 (17°)** — a 29° hue gap sitting squarely in the yellow-orange-red band that red-green CVD compresses most aggressively; combined with near-identical lightness (0.47 vs 0.44 in HSL terms) and both being desaturated "earthy" colors by design constraint, this is the single most plausible real-world confusion: a deutan/protan user scanning badges by color alone could genuinely mistake a 6a–6b (tier 3) badge for a 6b+–6c+ (tier 4) badge, or vice versa — precisely adjacent grades, which is the worst case for a scanning aid.
- **Tier 5 (204°) / Tier 6 (280°)** — blue vs violet; under protanopia specifically, violet's red component desaturates toward blue, and these two also have the second-closest relative luminance (see 1b). Secondary but real risk.
- Tier 1/2 (both green) and Tier 4/5 (orange vs blue, near-complementary) are *not* meaningfully at risk — large hue and/or luminance separation.

**Net assessment**: none of 1a–1c is a functional accessibility blocker, because the mandatory text label is genuinely sufficient to satisfy WCAG 1.4.1 ("use of color") — a colorblind or greyscale-viewing user can always read "6a+" as text. The doc is correct that this is "the actual accessibility mechanism." But the doc oversells the color layer as a validated secondary safety net when it isn't quite — 1a is a concrete, fixable contrast bug, and 1b/1c mean the "even in greyscale" and "colorblind-aware" language should be softened or the hues nudged (e.g., push tier 4 darker/redder or tier 3 more yellow to widen the 3/4 gap; separate tier 5/6 lightness more).

---

## 2. Touch target sizing (~44px) — coverage gaps

EXPERIENCE.md's Accessibility Floor names touch targets explicitly for: "Flash/Redpoint buttons, map markers, list rows, toggle controls." Checking every interactive element actually described elsewhere in the file against that list:

| Element | Covered by name? | Assessment |
|---|---|---|
| Map markers | Yes | Explicit |
| List rows (areas/climbs) | Yes | Explicit |
| Flash / Redpoint buttons | Yes | Explicit |
| View toggle (map↔list) | Yes (as "toggle controls") | Fine |
| Flat/grouped list-mode toggle | Yes (as "toggle controls") | Fine |
| **Sort control** | **Ambiguous** | Described as a "sort control," not explicitly a toggle-group — if implemented as a shadcn-svelte `Select`, its default trigger height is well under 44px (shadcn's default button/select sizing is ~36px) and nothing in either doc calls for overriding that default for touch. Real, concrete gap. |
| **Group-vs-mine toggle** | **Implicit only** | Described as a `toggle-group`, so plausibly inherits the "toggle controls" umbrella, but is never named in the Accessibility Floor bullet itself — worth an explicit one-line confirmation given it's a per-view control a user will hit one-handed on every climb detail visit. |
| Project / Todo buttons | Implicit only | Grouped with Flash/Redpoint as "Flash/Redpoint/Project/Todo actions" elsewhere, but only Flash/Redpoint are named in the a11y bullet. Low risk (likely same button row/component) but not explicitly stated. |
| **Gallery carousel controls** | **Not covered at all** | This is the clearest omission. The carousel is swipe/scroll-based, which sidesteps a discrete "44px target" requirement for the scroll gesture itself, but the doc doesn't say whether there are any discrete tap targets (caption-tag overlay, delete/reorder control, or a desktop prev/next arrow) — and if there are, they're entirely unaddressed by the touch-target floor. Given photos are called out as "first-class" and this is used one-handed at the crag, this deserves an explicit line. |
| Flash-count toast | N/A | Auto-dismisses, not described as tappable — 44px requirement correctly doesn't apply. (Minor separate note: no manual-dismiss control means a user who wants it gone immediately, e.g. it's obscuring something, has no way to do that — low stakes given it's transient.) |
| Panel-expand/collapse control (hide docked map) | Not named | Likely a small icon/chevron button; not called out, and collapse controls are exactly the kind of small hit target that regresses below 44px by default. |
| Attempt-count prompt stepper/input | Not named | Falls under general "forms are labeled" but not the touch-target bullet specifically; low risk for a single numeric field. |

**Net assessment**: the floor is real and mostly applied, but it's stated as a fixed enumeration rather than a blanket rule ("every interactive element"), and that phrasing lets at least one concrete, likely-to-actually-regress case (sort control, if it becomes a default-sized shadcn Select) and one clear omission (gallery carousel discrete controls, if any exist) fall through the stated floor.

---

## 3. Map-only interaction path — no non-map fallback for area *creation*

**Verdict: real, scoped gap.** Browsing is fine; creating an area is not.

- Browsing existing areas has a genuine non-map path: the view toggle switches to "an alphabetically-sorted, collapsible list of areas/sectors," and app-content search can also jump directly to an area. A user who can't tap a small map marker precisely can still reach any existing area.
- Adding a sector (from an Area Page) and adding a climb (from a sector's detail view) are both list/button-driven, not map-click-driven — also fine.
- **Creating a new area has no non-map path at all.** Per the Information Architecture section and Flow 2 (step 2), the *only* way to create an area — even when using the geocoder place-search to first navigate to the right real-world location — is "clicking the empty point" on the map. The first-login empty state reinforces this: "click the map, or search, to add your first area" — but "search" here is the geocoder, which only pans the map; it doesn't itself create anything without a subsequent precise tap.
- This matters specifically because area creation is disproportionately likely to happen in exactly the hardest condition for precise pointing: on a phone, at the crag, in bright sun, with cold or chalky fingers (the app's own stated primary context). A fat-fingered tap that lands a few pixels off from intended, or lands too close to an existing marker, either creates the area in a subtly wrong spot or accidentally opens an unrelated existing area's page instead of creating anything.
- A low-cost fix that would close this without adding scope creep: a small "+ New area here" button/affordance next to the map (or in the list-view empty state) that creates an area at the map's current center or via a name+optional-location form, as a keyboard/large-target-friendly alternative to the pixel-precise click — without adding a third "ambiguous click" map state, which the doc correctly wants to avoid.

---

## 4. Outdoor / bright-sunlight readability

**Verdict: body text and primary actions hold up well; the palette's deliberately subtle tonal depth cues do not, and that's exactly the kind of thing bright ambient light exposes.**

- Primary reading contrast is strong and has real margin: ink-on-bg 12.18:1, ink-on-card 13.78:1, moss button text 6.60:1, clay button text 5.06:1 — comfortably above AA and with enough headroom to survive glare-induced perceptual contrast loss.
- **`{colors.ink-soft}` (`#6E6A61`) sits right at the AA floor with almost no margin**: 4.76:1 on `bg`, 5.39:1 on `card` — technically passing, but `ink-soft` is used for captions, timestamps, breadcrumbs, and stat-strip labels, several of which are already small type (12.5px caption, 11px eyebrow). A control that just barely clears the indoor AA bar is a poor candidate for outdoor glare tolerance, where there's no accepted "sunlight-readable" WCAG tier but the practical guidance is to keep meaningful margin above the AA minimum, not sit on it.
- **`{colors.line}` (`#C9C3B6`), the border/divider token, has only 1.55:1 contrast against `bg` (1.76:1 against `card`)** — far below even the 3:1 non-text-UI-component guidance. This is the token used for stat-strip dividers, log-row separators, table dividers, and — per DESIGN.md's own Components section — the straight divider at the Area Page's map/list pane seam. In normal indoor light this is a deliberately subtle hairline; in bright outdoor sun it is very likely to wash out to invisible, which would blur exactly the layout structure (where does the list end and the map begin, where do stat cells divide) that a one-handed phone user relies on to parse the screen quickly.
- **The recessed-panel depth cue (`{colors.panel}` `#EDE9E1` vs `{colors.bg}` `#F2F1EC`) has only 1.07:1 contrast**, and the chip-tint backgrounds (`moss-tint`/`clay-tint`) have similarly negligible contrast (~1.05–1.10:1) against `bg`. DESIGN.md explicitly states this tonal-only shift (not a border, not a shadow) is the entire mechanism by which the docked map panel "reads as a distinct, receded region." That mechanism is inherently the most glare-fragile choice in the palette — it's designed to be subtle indoors, and "subtle tonal shift" is precisely what disappears first in bright outdoor light.
- Tier 4's marginal badge contrast (finding 1a, 4.475:1) compounds this concern specifically for badges, which are scanned constantly and outdoors far more than any other UI element.

**Recommendation scope-appropriate for a hobby app**: no palette overhaul needed. The two cheapest fixes with the most outdoor benefit are (a) darkening `{colors.line}` a few steps so dividers/pane-seams stay perceptible in glare, and (b) fixing tier 4's badge contrast (already flagged in 1a). The panel/chip tonal cues are lower-stakes since they're decorative-organizational rather than information-bearing (nothing is lost if the map panel's "recessed" feel washes out outdoors, since the map is still obviously a map).

---

## 5. Other gaps worth flagging (scaled to consumer stakes)

- **No stated live-region/announcement for the flash-count toast.** The toast is the app's one deliberate positive-feedback moment ("Flashed 6a+ ×5"), and it's purely visual, auto-dismissing, with no mention of an `aria-live` region or equivalent. Non-blocking (the log entry itself is durably visible elsewhere), but worth a one-line addition given how central this moment is called out to be in the Gamification section. Low priority — do not over-build this per the doc's own explicit "don't over-build" instruction for this feature.
- **Gallery carousel has no described keyboard/arrow alternative to swipe/scroll**, and (per finding 2) no described discrete tap targets either. For a user who can't swipe precisely one-handed, there's no fallback gesture mentioned. Low priority given photos are secondary content, but ties directly into the touch-target gap already flagged.
- Everything explicitly and correctly scoped out (screen-reader-first map interaction, RTL, reduced-motion) is genuinely out of scope for this app's real user base and shouldn't be added — flagging only that this exclusion list is reasonable, not a gap.
- Forms, alt-text/captions, and keyboard/focus-visible reliance on shadcn-svelte defaults are all appropriately handled and don't need rework.

---

## Summary of concrete, fixable findings

1. Tier 4 grade badge (`#A65A3C` bg / bg-color text) fails WCAG AA text contrast at 4.475:1 (needs 4.5:1) — swap its text token to `ink` like tiers 1/3, or darken the background slightly.
2. The "lightness-stepped, distinguishable in greyscale" claim for the 7-tier badge palette doesn't hold for tier 4/tier 5 (Δ0.024 luminance) and tier 5/tier 6 (Δ0.036); tier 3/tier 4 are also the most plausible adjacent-hue confusion under common red-green colorblindness. Not a functional blocker (text label covers it) but the doc's specific claim should be softened or the hues adjusted.
3. Touch-target floor is stated as a fixed list, not a blanket rule — sort control (if a default-sized Select) and gallery-carousel discrete controls (if any) aren't covered and are realistic candidates to regress below 44px.
4. Area *creation* has no non-map-click path, unlike browsing (which has the list-view fallback) — a real gap precisely in the highest-precision-difficulty context (phone, sun, cold/chalky hands) the app itself calls out as primary.
5. `{colors.line}` (1.55–1.76:1) and the panel/chip tonal depth cues (~1.05–1.10:1) are the palette's most glare-fragile elements for outdoor use; `{colors.ink-soft}` (4.76:1) has essentially zero margin above the AA floor for captions/metadata that are already small type.
