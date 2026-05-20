"use client";
import { ThemeProvider as NextThemes } from "next-themes";
import { THEMES } from "@/lib/theme";

/**
 * Wraps the app in next-themes' provider.
 * - attribute="data-theme": sets data-theme on <html> instead of class
 * - defaultTheme="dark": cosmic theme on first visit
 * - enableSystem=false: user's explicit choice persists, not OS preference
 * - disableTransitionOnChange=false: CSS transitions fire during switch
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes
      attribute="data-theme"
      defaultTheme="dark"
      themes={THEMES.map(t => t.id)}
      enableSystem={false}
      disableTransitionOnChange={false}
    >
      {children}
    </NextThemes>
  );
}
