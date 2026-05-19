import type { CSSProperties } from "react";

// ── When to use this module ───────────────────────────────────────────────────
//
// The project has TWO ways to apply theme-aware styling:
//
//   1. `.ac-*` utility classes in app/globals.css (e.g. .ac-card, .ac-eyebrow,
//      .ac-kv, .ac-tag, .ac-cell-good). Prefer these for tabular layouts,
//      cards, pills, headings, and anything else the unified dashboard uses —
//      the classes encode the design language directly.
//
//   2. The inline-style tokens exported below (fonts, textStyles, glass,
//      clamp, radii, motion, spacing, shadows, interactive). Use these when:
//      - the style needs to be computed at runtime (e.g. conditional opacity,
//        animated transition values)
//      - Tailwind arbitrary-value syntax becomes unreadable (multiple
//        inline-styled properties at once)
//      - the component already uses inline styles for layout reasons
//
// Both paths resolve to the same CSS variables in globals.css and switch with
// the active theme. You do NOT need to migrate existing inline-style usage to
// `.ac-*` classes wholesale — they are equivalent at runtime. Migrate when
// a clean class-only replacement exists for a specific element.
//
// ── Font family references ─────────────────────────────────────────────────────
// These reference the active theme's fonts via CSS variables.
// The actual font families are loaded in app/layout.tsx and assigned per-theme
// in globals.css ([data-theme="dark"] / [data-theme="light"] blocks).

const DISPLAY = "var(--font-display), Georgia, serif";
const SANS    = "var(--font-ui), system-ui, sans-serif";
const MONO    = "var(--font-mono), ui-monospace, monospace";

// ── Color tokens ──────────────────────────────────────────────────────────────
// All values are CSS variable references — actual colors defined per-theme
// in globals.css. Use these in inline style props.

export const colors = {
  // Text hierarchy
  primary:      "var(--color-ink-1)",
  secondary:    "var(--color-ink-2)",
  tertiary:     "var(--color-ink-3)",
  muted:        "var(--color-ink-4)",
  faint:        "var(--color-ink-4)",

  // Brand accent
  gold:         "var(--color-accent)",
  goldDim:      "var(--color-accent-dim)",
  goldFaint:    "var(--color-accent-faint)",

  // Status
  success:      "var(--color-success)",
  warning:      "var(--color-warning)",
  danger:       "var(--color-danger)",
} as const;

// ── Font role tokens ───────────────────────────────────────────────────────────
export const fonts = {
  display:       { fontFamily: DISPLAY, fontWeight: 400 },
  displayBold:   { fontFamily: DISPLAY, fontWeight: 700 },
  displayItalic: { fontFamily: DISPLAY, fontWeight: 400, fontStyle: "italic" as const },
  ui:            { fontFamily: SANS, fontWeight: 400 },
  uiLight:       { fontFamily: SANS, fontWeight: 300 },
  uiMedium:      { fontFamily: SANS, fontWeight: 500 },
  uiSemibold:    { fontFamily: SANS, fontWeight: 600 },
  uiBold:        { fontFamily: SANS, fontWeight: 700 },
  uiItalic:      { fontFamily: SANS, fontWeight: 400, fontStyle: "italic" as const },
  mono:          { fontFamily: MONO, fontWeight: 400 },
  monoMedium:    { fontFamily: MONO, fontWeight: 600 },
} satisfies Record<string, CSSProperties>;

// ── Type scale ─────────────────────────────────────────────────────────────────
// Values are CSS variable references — actual sizes defined per-theme in
// globals.css and overridden per-breakpoint in the responsive block.
// Components using textStyles automatically get responsive type sizing.

export const scale = {
  pageTitle:   "var(--fs-page-title)",
  sectionHead: "var(--fs-section-head)",
  subhead:     "var(--fs-subhead)",
  body:        "var(--fs-body)",
  label:       "var(--fs-label)",
  small:       "var(--fs-small)",
  xs:          "var(--fs-xs)",
} as const;

// ── Composed text styles ───────────────────────────────────────────────────────
export const textStyles = {
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
  stepLabel: {
    ...fonts.displayItalic,
    fontSize: scale.label,
    letterSpacing: "0.05em",
    color: colors.tertiary,
  },
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

// ── Glass / surface token ──────────────────────────────────────────────────────
// Theme-aware: dark = glassmorphism, light = solid archival panel.
// The CSS variables resolve to the correct values per theme.

export const glass: CSSProperties = {
  background:           "var(--surface-blend)",
  backdropFilter:       "var(--backdrop-blur)",
  WebkitBackdropFilter: "var(--backdrop-blur)",
  border:               "var(--border-width) solid var(--color-border)",
  borderRadius:         "var(--radius-lg)",
};

// ── Text clamping ──────────────────────────────────────────────────────────────
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

// ── Border radius scale ────────────────────────────────────────────────────────
// Values come from the active theme's CSS variables.
// dark: 12/16/20/999px   light: 0/2/4/999px

export const radii = {
  sm:   "var(--radius-sm)",
  md:   "var(--radius-md)",
  lg:   "var(--radius-lg)",
  full: "var(--radius-full)",
} as const;

// ── Motion tokens ──────────────────────────────────────────────────────────────
// Use in inline transition/animation values.
// dark: springy (300ms cubic-bezier)   light: snappy (180ms ease)
//
//   style={{ transition: `all ${motion.standard}` }}

export const motion = {
  standard: "var(--duration-normal) var(--easing-standard)",
  fast:     "var(--duration-fast) var(--easing-standard)",
  slow:     "var(--duration-slow) var(--easing-standard)",
  exit:     "var(--duration-normal) var(--easing-exit)",
} as const;

// ── Spacing tokens ─────────────────────────────────────────────────────────────
// Theme-aware spacing values. Use in inline style props where Tailwind arbitrary
// values are awkward (e.g. gap, padding on dynamically-styled containers).
// Tighter on mobile (< 640px) via globals.css responsive override block.
//
//   style={{ padding: spacing[6] }}           // 24px desktop, 20px mobile
//   style={{ gap: spacing[4] }}               // 16px — no mobile override

export const spacing = {
  1:  "var(--space-1)",   //  4px
  2:  "var(--space-2)",   //  8px
  3:  "var(--space-3)",   // 12px
  4:  "var(--space-4)",   // 16px
  5:  "var(--space-5)",   // 20px
  6:  "var(--space-6)",   // 24px → 20px mobile
  8:  "var(--space-8)",   // 32px → 24px mobile
  10: "var(--space-10)",  // 40px → 32px mobile
  12: "var(--space-12)",  // 48px → 36px mobile
  16: "var(--space-16)",  // 64px → 48px mobile
} as const;

// ── Shadow tokens ─────────────────────────────────────────────────────────────
// Theme-aware: dark = soft glow, light = hard offset shadow.
// Use in inline style={{ boxShadow: shadows.card }} or shadows.elevated.

export const shadows = {
  card:     "var(--shadow-card)",
  elevated: "var(--shadow-elevated)",
} as const;

// ── Interactive state tokens ───────────────────────────────────────────────────
// Tailwind class strings for hover/active states. These reference CSS variables
// via Tailwind's arbitrary value syntax so they switch with the theme.

export const interactive = {
  card:        "hover:bg-[var(--color-surface-hover)] active:bg-[var(--color-surface-active)] transition-all cursor-pointer",
  listRow:     "hover:bg-[var(--color-surface-hover)] active:bg-[var(--color-surface-active)] transition-all cursor-pointer",
  ghostButton: "hover:bg-[var(--color-surface-hover)] active:bg-[var(--color-surface-active)] transition-all",
  slotButton:  "hover:bg-[var(--color-accent-faint)] active:bg-[var(--color-accent-faint)] transition-all cursor-pointer",
} as const;
