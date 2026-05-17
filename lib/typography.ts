import type { CSSProperties } from "react";

// ── Font family references ────────────────────────────────────────────────────
// These point at the CSS variables loaded in app/layout.tsx.
// To swap a font: change the loader in layout.tsx and update the fallback below.

const DISPLAY = "var(--font-cormorant), Georgia, serif";
const SANS    = "var(--font-sans), system-ui, sans-serif";

// ── Color palette ─────────────────────────────────────────────────────────────
// Semantic names — use these everywhere instead of raw rgba strings.
// All values assume a dark background (#060318 base).

export const colors = {
  // Text hierarchy
  primary:    "rgba(255,255,255,0.92)",  // main headings, key content
  secondary:  "rgba(255,255,255,0.60)",  // body text, descriptions
  tertiary:   "rgba(255,255,255,0.38)",  // hints, step labels, placeholders
  muted:      "rgba(255,255,255,0.22)",  // disabled states, meta info
  faint:      "rgba(255,255,255,0.10)",  // borders, dividers, subtle surfaces

  // Gold accent (brand / active / highlight)
  gold:       "rgba(251,191,36,1)",      // active nav, CTA text, scores
  goldDim:    "rgba(251,191,36,0.55)",   // subdued gold labels
  goldFaint:  "rgba(251,191,36,0.15)",   // gold background wash

  // Semantic status
  success:    "rgba(52,211,153,1)",      // good scores, confirmed states
  warning:    "rgba(251,191,36,1)",      // partial scores (same as gold)
  danger:     "rgba(248,113,113,1)",     // low scores, errors
} as const;

// ── Font role tokens ──────────────────────────────────────────────────────────
// Spread into inline style props. Add fontSize / lineHeight / letterSpacing
// at the call site — those vary per context and belong there.
//
//   <h1 style={{ ...fonts.display, fontSize: scale.pageTitle }}>…</h1>
//   <button style={{ ...fonts.uiMedium, fontSize: scale.small }}>…</button>
//
// display* → Philosopher — wordmark, headings, decorative labels, quotes
// ui*      → Mulish      — nav, buttons, body text, UI chrome

export const fonts = {
  // Philosopher — display / brand
  display:       { fontFamily: DISPLAY, fontWeight: 400 },
  displayBold:   { fontFamily: DISPLAY, fontWeight: 700 },
  displayItalic: { fontFamily: DISPLAY, fontWeight: 400, fontStyle: "italic" as const },

  // Mulish — interface / body
  ui:            { fontFamily: SANS, fontWeight: 400 },
  uiLight:       { fontFamily: SANS, fontWeight: 300 },
  uiMedium:      { fontFamily: SANS, fontWeight: 500 },
  uiSemibold:    { fontFamily: SANS, fontWeight: 600 },
  uiBold:        { fontFamily: SANS, fontWeight: 700 },
  uiItalic:      { fontFamily: SANS, fontWeight: 400, fontStyle: "italic" as const },
} satisfies Record<string, CSSProperties>;

// ── Type scale ────────────────────────────────────────────────────────────────
// Named sizes. Changing a value here updates every call site that uses it.

export const scale = {
  pageTitle:   "2.2rem",   // h1 — page titles
  sectionHead: "1.4rem",   // h2 — section / panel headings
  subhead:     "1.15rem",  // h3 — card titles, sub-sections
  body:        "1rem",     // body prose
  label:       "0.95rem",  // form labels, step labels
  small:       "0.875rem", // secondary text, nav items
  xs:          "0.75rem",  // meta, timestamps, badges
} as const;

// ── Composed text styles ──────────────────────────────────────────────────────
// Fully-composed style objects: font + weight + size + color + spacing.
// Use directly when the role is unambiguous, or override individual properties.
//
//   <h1 style={textStyles.pageTitle}>Natal Charts</h1>
//   <p style={{ ...textStyles.body, color: colors.tertiary }}>…</p>

export const textStyles = {
  // Page-level headings (Philosopher)
  pageTitle: {
    ...fonts.display,
    fontSize: scale.pageTitle,
    letterSpacing: "0.02em",
    lineHeight: 1.15,
    color: colors.primary,
  },
  sectionHead: {
    ...fonts.display,
    fontSize: scale.sectionHead,
    letterSpacing: "0.03em",
    lineHeight: 1.25,
    color: colors.primary,
  },
  subhead: {
    ...fonts.display,
    fontSize: scale.subhead,
    letterSpacing: "0.03em",
    lineHeight: 1.3,
    color: colors.primary,
  },

  // Decorative / step labels (Philosopher italic)
  stepLabel: {
    ...fonts.displayItalic,
    fontSize: scale.label,
    letterSpacing: "0.05em",
    color: colors.tertiary,
  },

  // Body / UI text (Mulish)
  body: {
    ...fonts.ui,
    fontSize: scale.body,
    lineHeight: 1.65,
    color: colors.secondary,
  },
  bodyMedium: {
    ...fonts.uiMedium,
    fontSize: scale.body,
    lineHeight: 1.65,
    color: colors.secondary,
  },
  small: {
    ...fonts.ui,
    fontSize: scale.small,
    lineHeight: 1.5,
    color: colors.secondary,
  },
  label: {
    ...fonts.uiMedium,
    fontSize: scale.small,
    letterSpacing: "0.01em",
    color: colors.secondary,
  },
  meta: {
    ...fonts.ui,
    fontSize: scale.xs,
    letterSpacing: "0.04em",
    color: colors.muted,
  },
} satisfies Record<string, CSSProperties>;

// ── Name clamping ─────────────────────────────────────────────────────────────
// Apply to every name displayed inside a card so no card grows taller than
// its neighbors. Pick the variant that fits the card size.
//
//   <div style={{ ...textStyles.subhead, ...clamp.one }}>Krishnavenkataraman</div>
//   → "Krishnavenkat…"

export const clamp = {
  one: {
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    maxWidth: "100%",
  },
  two: {
    overflow: "hidden",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
  },
} satisfies Record<string, CSSProperties>;
