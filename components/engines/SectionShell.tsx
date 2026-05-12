"use client";
import { useState, memo } from "react";
import { ChevronDown, ChevronRight, Info } from "lucide-react";
import { ExplainerModal, type ChartEntry } from "./ExplainerModal";

type SectionExplainer = {
  title: string;
  gist?: string | null;
  bodyHtml: string;
  sources?: { text: string; chapter?: number | string; sloka?: number | string }[];
};

type Props = {
  /** Exact title string used by DashaflowView for this section. */
  sectionInView: string;
  /** Pre-rendered explainer payload, or null if no explainer exists. */
  explainer: SectionExplainer | null;
  /**
   * Optional chart-specific entries to surface inside the modal under a
   * "For your chart" tab. Pass an empty array (or omit) for sections
   * that have no per-row personal content.
   */
  chartEntries?: ChartEntry[];
  /** Visual accent class for the title. */
  accent?: string;
  /** Initial collapse state for the section. */
  defaultOpen?: boolean;
  /** The section data (table, cards, etc.) to render below the title. */
  children: React.ReactNode;
};

/**
 * Section wrapper used by DashaflowView. Renders the section title with
 * a chevron-toggle (collapse/expand) and an Info button to its right.
 * Clicking the Info button opens the ExplainerModal, which renders the
 * section explainer always; if `chartEntries` is provided, it also
 * exposes a "For your chart" tab with chart-specific verses.
 *
 * If neither an explainer nor any chart entries exist, the icon is not
 * rendered.
 */
export const SectionShell = memo(function SectionShell({
  sectionInView,
  explainer,
  chartEntries,
  accent = "text-green-400",
  defaultOpen = true,
  children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const [modalOpen, setModalOpen] = useState(false);

  const hasModalContent = !!explainer || (chartEntries && chartEntries.length > 0);

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
        {hasModalContent && (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            aria-label={`Read about ${sectionInView}`}
            title="Read Vedic explanation"
            className="shrink-0 rounded-md p-1 text-amber-400/70 hover:bg-amber-950/40 hover:text-amber-300 transition-colors"
          >
            <Info className="h-4 w-4" />
          </button>
        )}
      </div>
      {open && <div className="pb-4 px-1">{children}</div>}

      {hasModalContent && (
        <ExplainerModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title={explainer?.title ?? sectionInView}
          gist={explainer?.gist ?? null}
          bodyHtml={explainer?.bodyHtml ?? ""}
          sources={explainer?.sources}
          chartEntries={chartEntries}
        />
      )}
    </div>
  );
});
