import type { CSSProperties } from "react";

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
export const scale = {
  pageTitle:   "2.2rem",
  sectionHead: "1.4rem",
  subhead:     "1.15rem",
  body:        "1rem",
  label:       "0.95rem",
  small:       "0.875rem",
  xs:          "0.75rem",
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

// ── Interactive state tokens ───────────────────────────────────────────────────
// Tailwind class strings for hover/active states. These reference CSS variables
// via Tailwind's arbitrary value syntax so they switch with the theme.

export const interactive = {
  card:        "hover:bg-[var(--color-surface-hover)] active:bg-[var(--color-surface-active)] transition-all cursor-pointer",
  listRow:     "hover:bg-[var(--color-surface-hover)] active:bg-[var(--color-surface-active)] transition-all cursor-pointer",
  ghostButton: "hover:bg-[var(--color-surface-hover)] active:bg-[var(--color-surface-active)] transition-all",
  slotButton:  "hover:bg-[var(--color-accent-faint)] active:bg-[var(--color-accent-faint)] transition-all cursor-pointer",
} as const;
