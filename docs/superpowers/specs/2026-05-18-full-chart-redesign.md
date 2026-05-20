# Full Chart — Navigation Redesign Spec

**Date:** 2026-05-18  
**Status:** Approved  
**Scope:** Admin-only Full Chart view (`UnifiedView` and its tab components)

---

## Goal

Eliminate scroll burden in the Full Chart view by introducing sub-tabs within the existing Patterns and Time top-level tabs. Make the dasha timeline explorable at all 5 levels without losing orientation. Keep the top-level shell stable so new domains (relationships, health, spirituality) can be added as sub-tabs later without restructuring the outer navigation.

---

## What does NOT change

- The 5 top-level tabs: **Chart · Planets · Houses & Vargas · Patterns · Time**
- The sticky HouseGrid on desktop (left column)
- The IdentityStrip at the top
- Chart, Planets, and Houses & Vargas tabs — no changes to these

---

## Patterns tab — sub-tabs

Current: one long scrolling page with 4 logical sections.  
Change: replace with 4 sub-tabs, each rendering exactly one section.

| Sub-tab | Content |
|---|---|
| **Yogas** | Yoga cards (major yogas highlighted in amber, minor below) |
| **Doshas** | Kaal Sarpa, Graha Yuddha, Gandanta |
| **Jaimini** | Karakas table, Karakamsha card, Arudha Padas grid, Upapada |
| **Ashtakavarga** | SAV sign-by-sign row + BAV planet grid |

Default sub-tab on load: **Yogas**.

---

## Time tab — sub-tabs

Current: one long scrolling page with 4 logical sections (dasha stack, mahadasha table, transits, career).  
Change: replace with 4 sub-tabs.

| Sub-tab | Content |
|---|---|
| **Current Period** | The existing 5-level indented dasha stack (Maha → Antar → Pratyantar → Sukshma → Prana). Read-only, always reflects today. |
| **Timeline** | Accordion drill-down across all Mahadashas (see below). |
| **Transits** | Today's transit positions table, Sade Sati alert, Rahu/Ketu axis card, SAV scores per planet. |
| **Career** | D10 analysis card, career themes tags, strength indicators list. |

Default sub-tab on load: **Current Period**.

---

## Timeline sub-tab — accordion drill-down

### Default state on load

- All 9 Mahadashas render as collapsed rows showing planet name + date range.
- The currently active Mahadasha is auto-expanded, revealing its 9 Antardashas.
- The currently active Antardasha has a `● now` badge.
- Levels 4–5 (Sukshma, Prana) are only auto-expanded if the parent Antardasha is the currently active one. This keeps the default view to 2 levels deep for most users.

### Interaction

- **Click any Mahadasha row** → toggles its Antardasha list open/closed.
- **Click any Antardasha row** → toggles its Pratyantar list open/closed (indented further).
- **Click any Pratyantar row** → toggles Sukshma list open/closed.
- **Click any Sukshma row** → toggles Prana list open/closed.
- Only one Mahadasha can be expanded at a time (clicking a second one collapses the first). Nested levels within it can all be open simultaneously.
- Each row shows: planet name, start date, end date, and a `● now` badge if it is the currently active period at that level.

### Visual hierarchy

Indentation increases by 16px per level. Color distinguishes levels:

| Level | Color |
|---|---|
| Mahadasha (L1) | `text-[var(--color-ink-1)]`, bold |
| Antardasha (L2) | `text-[var(--color-ink-2)]` |
| Pratyantar (L3) | `text-[var(--color-ink-3)]` / muted |
| Sukshma (L4) | `text-muted-foreground`, smaller font |
| Prana (L5) | `text-muted-foreground`, smaller font |

Active period at each level gets `text-[var(--color-accent)]` and the `● now` badge.

---

## Sub-tab component pattern

Both Patterns and Time use the same sub-tab pattern. Use shadcn `Tabs` (the same component already used for top-level tabs) with a visually lighter treatment to distinguish them from top-level tabs — smaller text, less padding, a subtle underline variant rather than pill variant.

```
<Tabs defaultValue="...">
  <TabsList variant="underline" className="mb-4">
    <TabsTrigger value="...">Label</TabsTrigger>
    ...
  </TabsList>
  <TabsContent value="...">...</TabsContent>
</Tabs>
```

If shadcn's `tabs.tsx` doesn't support an underline variant natively, add a `data-variant="underline"` class to `TabsList` and style accordingly in the component — do not fork the primitive.

---

## Files to create / modify

| File | Change |
|---|---|
| `components/unified/tabs/PatternsTab.tsx` | Replace scroll layout with 4 sub-tabs |
| `components/unified/tabs/TimeTab.tsx` | Replace scroll layout with 4 sub-tabs |
| `components/unified/tabs/timeline/DashaTimeline.tsx` | New — accordion drill-down component |
| `components/unified/tabs/timeline/DashaRow.tsx` | New — single expandable row, recursive for nested levels |

No changes to `UnifiedView.tsx`, `HouseGrid.tsx`, `IdentityStrip.tsx`, or any top-level tab routing.

---

## Data notes

- Dasha data for all levels already exists in `chartOutput.data.dashas` — the sidecar returns the full tree.
- The `TimeTab` currently destructures `dashas.maha`, `dashas.antar`, `dashas.pratyantar`, `dashas.sukshma`, `dashas.prana` for the current-period stack, and `dashas.timeline` for the flat Mahadasha list.
- The accordion needs `dashas.timeline` extended with nested sub-period arrays. Confirm with the sidecar response shape before building — if sub-periods are not in the response, a sidecar endpoint change is a prerequisite.
- Transit and Career data fetching logic stays in `TimeTab` and is passed down as props to the Transits and Career sub-tab components.

---

## Out of scope

- No changes to Chart, Planets, or Houses & Vargas tabs.
- No changes to sidecar engines or API routes (unless dasha sub-period data is confirmed missing — see Data notes above).
- No mobile-specific layout changes beyond what the accordion naturally provides.
- No URL routing per sub-tab (bookmarkable sub-tabs are a future enhancement).
