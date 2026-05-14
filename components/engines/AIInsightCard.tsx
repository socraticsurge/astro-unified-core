"use client";
import { useState } from "react";
import { ThumbsUp, ThumbsDown, ChevronDown, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TabInsight } from "@/lib/ai-insight";

type Props = {
  insight: TabInsight;
  readingId: string;
  initialRating: 1 | -1 | null;
};

export function AIInsightCard({ insight, readingId, initialRating }: Props) {
  const [rating, setRating] = useState<1 | -1 | null>(initialRating);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);

  const copyInsight = async () => {
    const lines = insight.sections.map(s => `${s.title}\n${s.interpretation}`).join("\n\n");
    const themes = insight.key_themes.length > 0
      ? `\nKey Themes:\n${insight.key_themes.map(t => `• ${t}`).join("\n")}`
      : "";
    await navigator.clipboard.writeText(lines + themes);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSection = (id: string) =>
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const submitRating = async (value: 1 | -1) => {
    const next = rating === value ? null : value;
    setRating(next);
    await fetch(`/api/admin/ai-insights/${readingId}/rating`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating: next }),
    });
  };

  return (
    <div className="space-y-4">
      {/* Chart verification strip */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(insight.chart_verification).map(([k, v]) => (
          <span
            key={k}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-950/40 border border-violet-800/30 text-[11px] text-violet-300"
          >
            <span className="text-violet-500 capitalize">{k.replace(/_/g, " ")}:</span>
            <span className="font-medium">{v}</span>
          </span>
        ))}
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {insight.sections.map((section) => {
          const expanded = expandedSections.has(section.id);
          return (
            <div
              key={section.id}
              className="rounded-lg border border-white/10 bg-white/[0.02] overflow-hidden"
            >
              <div className="px-4 py-3">
                <h4 className="text-sm font-semibold text-white/90 mb-2">{section.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{section.interpretation}</p>
              </div>

              {section.technical_basis.length > 0 && (
                <div className="border-t border-white/5">
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center gap-1.5 px-4 py-2 text-[11px] text-muted-foreground hover:text-white/70 transition-colors"
                  >
                    <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
                    {expanded ? "Hide" : "Show"} chart factors ({section.technical_basis.length})
                  </button>
                  {expanded && (
                    <div className="px-4 pb-3 space-y-1">
                      {section.technical_basis.map((f, i) => (
                        <div key={i} className="flex gap-2 text-[11px]">
                          <span className="text-violet-400/80 font-medium min-w-[80px]">{f.factor}</span>
                          <span className="text-muted-foreground">{f.value}{f.nakshatra ? ` · ${f.nakshatra}` : ""}</span>
                        </div>
                      ))}
                      {section.content_sources.length > 0 && (
                        <div className="pt-1 text-[10px] text-white/20">
                          Sources: {section.content_sources.join(", ")}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Key themes */}
      {insight.key_themes.length > 0 && (
        <div className="px-3 py-2.5 rounded-lg bg-amber-950/20 border border-amber-800/20">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/60 mb-1.5">Key Themes</p>
          <ul className="space-y-0.5">
            {insight.key_themes.map((t, i) => (
              <li key={i} className="text-xs text-amber-300/80">· {t}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer: model info + copy + rating */}
      <div className="flex items-center justify-between pt-1 border-t border-white/5">
        <span className="text-[10px] text-white/20">
          {insight.model} · prompt v{insight.prompt_version} · {new Date(insight.generated_at).toLocaleDateString()}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-white/30 hover:text-white/60"
            onClick={copyInsight}
            title="Copy insight"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-6 w-6 p-0 ${rating === 1 ? "text-emerald-400" : "text-white/30 hover:text-white/60"}`}
            onClick={() => submitRating(1)}
            title="Thumbs up"
          >
            <ThumbsUp className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`h-6 w-6 p-0 ${rating === -1 ? "text-red-400" : "text-white/30 hover:text-white/60"}`}
            onClick={() => submitRating(-1)}
            title="Thumbs down"
          >
            <ThumbsDown className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
