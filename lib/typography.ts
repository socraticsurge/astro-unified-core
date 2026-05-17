import type { CSSProperties } from "react";

// ── Font family references ────────────────────────────────────────────────────
// These point at the CSS variables loaded in app/layout.tsx.
// To swap a font: change the loader in layout.tsx and update the fallback below.

const DISPLAY = "var(--font-cormorant), Georgia, serif";
const SANS    = "var(--font-sans), system-ui, sans-serif";

// ── Role tokens ───────────────────────────────────────────────────────────────
// Spread into inline style props. Add fontSize / lineHeight / letterSpacing
// at the call site — sizes vary per component and belong there.
//
//   <h1 style={{ ...fonts.display, fontSize: scale.pageTitle }}>…</h1>
//   <button style={{ ...fonts.uiMedium, fontSize: "0.875rem" }}>…</button>
//
// Roles:
//   display*   → Philosopher (currently) — wordmark, page headings, decorative labels, quotes
//   ui*        → Mulish (currently)     — nav items, buttons, body text, UI chrome

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
// Reference sizes. Use as named values or ignore and set fontSize inline.
// Changing a value here updates every call site that references it by name.

export const scale = {
  pageTitle:   "2.2rem",   // h1 — "Natal Charts", "Seek Counsel"
  sectionHead: "1.5rem",   // h2 — panel headings, score totals
  subhead:     "1.2rem",   // h3 — card titles
  body:        "1rem",     // body prose
  label:       "0.95rem",  // step labels, slot buttons
  small:       "0.875rem", // nav items, secondary text
  xs:          "0.75rem",  // meta, timestamps
} as const;
