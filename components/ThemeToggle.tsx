"use client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { THEMES } from "@/lib/theme";
import { fonts } from "@/lib/typography";

/**
 * Cycles through THEMES on each click.
 * Shows the current theme icon; clicking advances to the next theme.
 * Must be mounted before rendering to avoid SSR hydration mismatch.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Render nothing until mounted — avoids hydration mismatch
  if (!mounted) return <div className="w-8 h-7" aria-hidden="true" />;

  const currentIndex = THEMES.findIndex(t => t.id === theme);
  const safeIndex    = currentIndex === -1 ? 0 : currentIndex;
  const currentTheme = THEMES[safeIndex];
  const nextTheme    = THEMES[(safeIndex + 1) % THEMES.length];

  return (
    <button
      onClick={() => setTheme(nextTheme.id)}
      aria-label={`Switch to ${nextTheme.label} theme`}
      title={`Switch to ${nextTheme.label}`}
      style={{ ...fonts.mono, fontSize: "0.8rem" }}
      className="w-8 h-7 flex items-center justify-center rounded-lg text-[var(--color-ink-3)] hover:text-[var(--color-ink-1)] hover:bg-[var(--color-surface-hover)] transition-all"
    >
      {currentTheme.icon}
    </button>
  );
}
