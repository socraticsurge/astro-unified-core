// Navigation config — single source of truth for section identity.
// NavBar labels, mobile short labels, and page titles all derive from here.
// Changing a label or title is one edit in this file; nothing else needs touching.

export const NAV_CONFIG = [
  {
    href:      "/dashboard",
    label:     "Natal Charts",
    short:     "Charts",
    pageTitle: "Natal Charts",
  },
  {
    href:      "/compatibility",
    label:     "Kundali",
    short:     "Kundali",
    pageTitle: "Kundali Matching",
  },
  {
    href:      "/consultation",
    label:     "Consult",
    short:     "Consult",
    pageTitle: "Seek Counsel",
  },
] as const;

export type NavEntry = typeof NAV_CONFIG[number];
