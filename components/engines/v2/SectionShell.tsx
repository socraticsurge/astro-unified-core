"use client";
import { useState } from "react";
import { ChevronDown, ChevronRight, Info } from "lucide-react";
import { ExplainerModal } from "./ExplainerModal";

type SectionExplainer = {
  title: string;
  gist?: string | null;
  bodyHtml: string;
  sources?: { text: string; chapter?: number | string; sloka?: number | string }[];
};

type Props = {
  /** Exact title string used by the legacy DashaflowView for this section. */
  sectionInView: string;
  /** Pre-rendered explainer payload, or null if no explainer exists. */
  explainer: SectionExplainer | null;
  /** Visual accent class for the title. */
  accent?: string;
  /** Initial collapse state — matches the legacy view's defaultOpen. */
  defaultOpen?: boolean;
  /** The section data (table, cards, etc.) to render below the title. */
  children: React.ReactNode;
};

/**
 * V2 section wrapper. Same collapse semantics as the legacy
 * `Section.tsx`, plus an Info button next to the title that opens an
 * ExplainerModal. If no explainer exists for this section, the Info
 * button is not rendered (briefing rule: never show an icon that opens
 * an empty modal).
 */
export function SectionShell({
  sectionInView,
  explainer,
  accent = "text-green-400",
  defaultOpen = true,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="border-b last:border-b-0">
      <div className="flex items-center gap-2 py-3 px-1">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex-1 flex items-center justify-between text-left hover:bg-white/5 rounded transition-colors -mx-1 px-1"
          aria-expanded={open}
        >
          <span className={`font-semibold text-sm uppercase tracking-wide ${accent}`}>
            {sectionInView}
          </span>
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {explainer && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            aria-label={`About ${sectionInView}`}
            title="About this section"
            className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground"
          >
            <Info className="h-4 w-4" />
          </button>
        )}
      </div>
      {open && <div className="pb-4 px-1">{children}</div>}

      {explainer && (
        <ExplainerModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={explainer.title}
          gist={explainer.gist ?? null}
          bodyHtml={explainer.bodyHtml}
          sources={explainer.sources}
        />
      )}
    </div>
  );
}
