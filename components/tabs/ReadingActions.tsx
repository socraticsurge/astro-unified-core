"use client";
import { useState } from "react";
import posthog from "posthog-js";
import { ThumbsUp, ThumbsDown, Copy, Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export type ReadingActionsProps = {
  /** Plain text of the reading (used for clipboard + share). */
  text: string;
  /** Reading row ID; required for ratings. If null/undefined, rate buttons are disabled. */
  readingId: string | null;
  /** Current rating from the server (1 = up, -1 = down, null = unrated). */
  initialRating: 1 | -1 | null;
  /** Engine slug surfaced as a PostHog `surface` property (e.g. "today-current"). */
  engine: string;
  /** Optional title for the Web Share API. Falls back to "Astro Chaganti reading". */
  shareTitle?: string;
};

export function ReadingActions({
  text,
  readingId,
  initialRating,
  engine,
  shareTitle,
}: ReadingActionsProps) {
  const [rating, setRating] = useState<1 | -1 | null>(initialRating);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState<1 | -1 | null>(null);

  // The Web Share API ships in modern mobile browsers + Safari. When it's
  // missing (most desktop browsers) we silently fall back to the clipboard.
  const canShare =
    typeof navigator !== "undefined" &&
    typeof (navigator as Navigator & { share?: (data: ShareData) => Promise<void> }).share === "function";

  const trimmed = text.trim();

  const trackSafe = (event: string, props: Record<string, unknown>) => {
    try {
      posthog.capture(event, props);
    } catch {
      /* posthog may not be initialised in dev */
    }
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(trimmed);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      trackSafe("today_reading_copied", { engine, length: trimmed.length });
    } catch {
      /* clipboard blocked — give up quietly */
    }
  };

  const onShare = async () => {
    if (canShare) {
      try {
        await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({
          title: shareTitle ?? "Astro Chaganti reading",
          text: trimmed,
        });
        trackSafe("today_reading_shared", { engine, surface: "web-share", length: trimmed.length });
      } catch {
        /* user cancelled or share failed — do nothing */
      }
      return;
    }
    // Fallback: copy and surface the same "copied" indicator.
    await onCopy();
    trackSafe("today_reading_shared", { engine, surface: "clipboard-fallback", length: trimmed.length });
  };

  const submitRating = async (value: 1 | -1) => {
    if (!readingId) return;
    // Toggle off if the same thumb is tapped twice.
    const next: 1 | -1 | null = rating === value ? null : value;
    const prev = rating;
    setRating(next);
    setSubmitting(value);
    try {
      const res = await fetch(`/api/readings/${readingId}/rating`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: next }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      trackSafe("today_reading_rated", { engine, rating: next });
    } catch {
      // Roll back on failure
      setRating(prev);
    } finally {
      setSubmitting(null);
    }
  };

  const ratingDisabled = !readingId;

  return (
    <div className="flex items-center justify-end gap-1 pt-2 mt-2 border-t border-[var(--color-border-subtle)]">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 text-[var(--color-ink-4)] hover:text-[var(--color-ink-2)]"
        onClick={onCopy}
        title={copied ? "Copied" : "Copy reading"}
        aria-label="Copy reading"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-[var(--color-success)]" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 text-[var(--color-ink-4)] hover:text-[var(--color-ink-2)]"
        onClick={onShare}
        title="Share reading"
        aria-label="Share reading"
      >
        <Share2 className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={ratingDisabled || submitting === 1}
        className={`h-7 w-7 p-0 ${
          rating === 1
            ? "text-[var(--color-success)]"
            : "text-[var(--color-ink-4)] hover:text-[var(--color-ink-2)]"
        }`}
        onClick={() => submitRating(1)}
        title="Helpful"
        aria-label="Mark helpful"
        aria-pressed={rating === 1}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={ratingDisabled || submitting === -1}
        className={`h-7 w-7 p-0 ${
          rating === -1
            ? "text-[var(--color-danger)]"
            : "text-[var(--color-ink-4)] hover:text-[var(--color-ink-2)]"
        }`}
        onClick={() => submitRating(-1)}
        title="Not helpful"
        aria-label="Mark not helpful"
        aria-pressed={rating === -1}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
