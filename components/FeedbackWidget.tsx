"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { MessageSquare, X, CheckCircle } from "lucide-react";

const RATINGS = [
  { value: "😞", label: "Not useful" },
  { value: "😐", label: "It's okay" },
  { value: "😊", label: "Love it!" },
];

export function FeedbackWidget() {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const reset = () => {
    setRating(null);
    setMessage("");
    setSubmitted(false);
    setOpen(false);
  };

  const handleSubmit = async () => {
    if (!rating) return;
    setLoading(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, message, page_url: pathname }),
      });
      setSubmitted(true);
      setTimeout(reset, 2500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={ref} className="fixed bottom-24 sm:bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {/* Popover */}
      {open && (
        <div className="w-72 bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
          {submitted ? (
            <div className="p-6 flex flex-col items-center gap-3 text-center">
              <CheckCircle className="h-10 w-10 text-[var(--color-success)]" />
              <p className="font-semibold text-foreground">Thank you!</p>
              <p className="text-xs text-muted-foreground">Your feedback helps us improve.</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border-subtle)]">
                <p className="text-sm font-semibold">Share Feedback</p>
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 space-y-4">
                {/* Emoji Rating */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">How are you finding the app?</p>
                  <div className="flex items-center justify-around">
                    {RATINGS.map((r) => (
                      <button
                        key={r.value}
                        title={r.label}
                        onClick={() => setRating(r.value)}
                        className={`text-3xl p-2 rounded-xl transition-all hover:scale-125 ${
                          rating === r.value
                            ? "bg-[var(--color-accent-faint)] scale-125 ring-2 ring-[var(--color-accent-dim)]"
                            : "hover:bg-[var(--color-surface-hover)]"
                        }`}
                      >
                        {r.value}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Text */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Anything we can improve? <span className="opacity-50">(optional)</span></p>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="Your thoughts..."
                    className="w-full px-3 py-2 text-sm bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-dim)] placeholder:text-muted-foreground/50"
                  />
                </div>

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={!rating || loading}
                  className="w-full py-2 rounded-lg text-sm font-semibold bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-button-fg)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? "Sending…" : "Send Feedback"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Trigger Button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium shadow-lg transition-all hover:scale-105 ${
          open
            ? "bg-[var(--color-surface-active)] text-foreground"
            : "bg-[var(--color-surface-1)]/90 text-muted-foreground hover:text-foreground border border-[var(--color-border)]"
        }`}
      >
        <MessageSquare className="h-3.5 w-3.5" />
        <span>Feedback</span>
      </button>
    </div>
  );
}
