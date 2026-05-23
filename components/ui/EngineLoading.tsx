"use client";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ── EngineLoading ──────────────────────────────────────────────────────────
//
// Shared loading state for engine views (reading panels, modal fetches, tab
// content). Replaces ad-hoc `<Loader2 /> Loading...` snippets scattered across
// engines so the spinner+label pair stays visually consistent.
//
//   <EngineLoading />                                    // "Loading…"
//   <EngineLoading message="Calculating Tarabalam…" />
//   <EngineLoading variant="card" />                     // wrapped in ac-card
//
// For button-internal spinners (the icon swap on a submit button), keep using
// `<Loader2 className="h-4 w-4 animate-spin" />` directly — this component is
// for the surrounding panel/inline status, not button glyphs.

type EngineLoadingProps = {
  /** Text shown next to the spinner. Defaults to "Loading…". */
  message?: string;
  /**
   * - "inline" (default): spinner + text in a single row, no surface.
   *   Use inside an existing card or section.
   * - "card": wrapped in `.ac-card .ac-card-pad`, centered. Use as a
   *   full-panel placeholder while the engine fetches its primary payload.
   */
  variant?: "inline" | "card";
  /** Extra class names appended to the root. */
  className?: string;
};

export function EngineLoading({
  message = "Loading…",
  variant = "inline",
  className,
}: EngineLoadingProps) {
  const content = (
    <span className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin text-[var(--color-accent)]" aria-hidden="true" />
      {message}
    </span>
  );

  if (variant === "card") {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn("ac-card ac-card-pad flex items-center justify-center min-h-[120px]", className)}
      >
        {content}
      </div>
    );
  }

  return (
    <div role="status" aria-live="polite" className={cn("px-5 py-6", className)}>
      {content}
    </div>
  );
}
