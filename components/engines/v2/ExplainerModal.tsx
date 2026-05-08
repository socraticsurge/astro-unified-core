"use client";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Pre-rendered HTML to insert inside the body. */
  bodyHtml: string;
  /** Optional one-line summary rendered above the body. */
  gist?: string | null;
  /** Optional sources line rendered below the body. */
  sources?: { text: string; chapter?: number | string; sloka?: number | string }[];
};

/**
 * Hand-rolled accessible modal: backdrop + center panel, focus trap on
 * first focusable child, Esc / click-outside / X-button to close, body
 * scroll locked while open. Below 768px it spans the full viewport
 * (briefing's mobile guidance).
 */
export function ExplainerModal({ open, onClose, title, bodyHtml, gist, sources }: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Focus the close button so Esc / Tab work as expected
    closeBtnRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="explainer-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm md:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="relative w-full h-full md:h-auto md:max-h-[85vh] md:w-[640px] md:max-w-[92vw] md:rounded-lg border border-white/10 bg-zinc-950 shadow-2xl flex flex-col"
      >
        <header className="flex items-start justify-between gap-3 p-5 border-b border-white/10">
          <div>
            <h2 id="explainer-title" className="font-heading text-xl font-medium text-foreground">
              {title}
            </h2>
            {gist && (
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{gist}</p>
            )}
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-white/5 hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div
          className="flex-1 overflow-y-auto px-5 py-4 prose prose-sm prose-invert max-w-none
            prose-headings:font-heading prose-headings:font-medium
            prose-h2:text-lg prose-h2:mt-5 prose-h2:mb-2
            prose-h3:text-base prose-h3:mt-4 prose-h3:mb-1.5
            prose-p:leading-relaxed prose-p:text-foreground/90
            prose-blockquote:border-l-2 prose-blockquote:border-amber-500/50
            prose-blockquote:bg-amber-950/10 prose-blockquote:py-1 prose-blockquote:px-3
            prose-blockquote:italic prose-blockquote:text-foreground/85
            prose-table:text-xs prose-th:font-medium prose-th:text-left
            prose-th:border-b prose-th:border-white/10 prose-th:py-1.5
            prose-td:py-1.5 prose-td:border-b prose-td:border-white/5
            prose-strong:text-foreground prose-em:text-foreground/90
            prose-a:text-blue-300 prose-a:no-underline hover:prose-a:underline"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />

        {sources && sources.length > 0 && (
          <footer className="px-5 py-3 border-t border-white/10 text-xs text-muted-foreground">
            <span className="font-medium uppercase tracking-wide text-[10px]">Sources</span>{" "}
            {sources
              .map((s) =>
                [s.text, s.chapter, s.sloka].filter(Boolean).join(" ")
              )
              .join(" · ")}
          </footer>
        )}
      </div>
    </div>
  );
}
