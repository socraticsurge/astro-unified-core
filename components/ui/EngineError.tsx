"use client";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

// ── EngineError ────────────────────────────────────────────────────────────
//
// Shared error state for engine views. Replaces the mix of `.ac-banner.warn`
// banners, raw-palette danger text, and `alert()` calls across the
// engine components with one consistent presentation.
//
//   <EngineError error={error} />                            // danger banner
//   <EngineError error={error} onRetry={handleSearch} />     // adds Retry btn
//   <EngineError error="No chart yet" tone="warning" />      // soft tone
//
// For one-off, transient failures inside an action (e.g. a save button
// failing), prefer `toast(message, "error")` from @/components/ui/Toast.
// Use EngineError for persistent panel-level error states that block the
// user from seeing the expected content.

type EngineErrorProps = {
  /**
   * Error to display. Accepts a string, Error, or nullish. If nullish, the
   * component renders nothing — convenient for `<EngineError error={error} />`
   * inside JSX without conditional wrappers.
   */
  error: string | Error | null | undefined;
  /**
   * Optional retry callback. When provided, a "Retry" button is rendered
   * next to the message.
   */
  onRetry?: () => void;
  /**
   * - "danger" (default): genuine failures — fetch error, server error.
   * - "warning": soft, non-blocking states like "no data yet".
   */
  tone?: "danger" | "warning";
  /** Extra class names appended to the banner. */
  className?: string;
};

export function EngineError({
  error,
  onRetry,
  tone = "danger",
  className,
}: EngineErrorProps) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : error;

  return (
    <div
      role="alert"
      className={cn("ac-banner", tone === "danger" ? "danger" : "warn", "justify-between", className)}
    >
      <span className="flex-1 leading-relaxed">{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 inline-flex items-center gap-1 text-xs font-medium underline-offset-2 hover:underline"
        >
          <RefreshCw className="h-3 w-3" aria-hidden="true" />
          Retry
        </button>
      )}
    </div>
  );
}
