// lib/theme.ts
// Theme registry — single source of truth for available themes.
// To add a theme: add one entry here and one [data-theme="id"] block in globals.css.

export type ThemeId = "dark" | "light";

export type ThemeMetadata = {
  id: ThemeId;
  label: string;
  /** Single character shown in the ThemeToggle button */
  icon: string;
};

export const THEMES: ThemeMetadata[] = [
  { id: "dark",  label: "Cosmic",   icon: "✦" },
  { id: "light", label: "Archival", icon: "◻" },
];
