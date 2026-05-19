"use client";
import { useState } from "react";
import { SectionShell } from "./SectionShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Calendar } from "lucide-react";

type SectionExplainer = {
  title: string;
  gist?: string | null;
  bodyHtml: string;
  sources?: { text: string; chapter?: number | string; sloka?: number | string }[];
};

type Props = {
  profileId: string;
  explainer?: SectionExplainer | null;
};

export function MuhurthaView({ profileId, explainer }: Props) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [form, setForm] = useState({
    event_type: "marriage",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  });

  const handleSearch = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/readings/muhurtha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_id: profileId, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setResults(data.timings || []);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SectionShell sectionInView="Muhurtha (Auspicious Timings)" explainer={explainer ?? null}>
      <div className="space-y-6">
        {/* Search Form */}
        <div className="ac-card ac-card-pad">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, alignItems: "end" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <Label style={{ fontSize: 12 }}>Event Type</Label>
              <select
                className="ac-card"
                style={{ padding: "6px 10px", fontSize: 13, color: "var(--color-ink-1)", cursor: "pointer" }}
                value={form.event_type}
                onChange={(e) => setForm({ ...form, event_type: e.target.value })}
              >
                <option value="marriage">Marriage</option>
                <option value="house_entry">House Warming / Griha Pravesh</option>
                <option value="business">Business / New Venture</option>
                <option value="travel">Travel</option>
                <option value="education">Education</option>
                <option value="medical">Medical</option>
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <Label style={{ fontSize: 12 }}>Start Date</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="bg-[var(--color-surface-1)] border-[var(--color-border)] h-9 text-sm"
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <Label style={{ fontSize: 12 }}>End Date</Label>
              <div style={{ display: "flex", gap: 8 }}>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  className="bg-[var(--color-surface-1)] border-[var(--color-border)] h-9 text-sm"
                />
                <Button
                  onClick={handleSearch}
                  disabled={loading}
                  size="icon"
                  className="shrink-0 bg-[var(--color-accent)] hover:opacity-90 text-[var(--color-button-fg)]"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        {results.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {results.map((r, i) => (
              <div
                key={i}
                className="ac-card ac-card-pad"
                style={{
                  borderColor: "var(--color-success-border)",
                  background: "var(--color-success-faint)",
                  display: "flex", flexDirection: "row", alignItems: "flex-start",
                  justifyContent: "space-between", gap: 12, flexWrap: "wrap",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--color-success)", marginBottom: 2 }}>
                    {r.start_time} → {r.end_time}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-ink-3)" }}>{r.date}</div>
                </div>
                <div className="ac-pills" style={{ gap: 4 }}>
                  {r.points?.map((p: string, j: number) => (
                    <span key={j} className="ac-tag fav" style={{ fontSize: 10 }}>{p}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : !loading && (
          <div style={{
            padding: "40px 16px", textAlign: "center",
            fontSize: 13, fontStyle: "italic", color: "var(--color-ink-3)",
            border: "1px dashed var(--color-border)", borderRadius: 10,
          }}>
            No highly auspicious timings found in this date range. Try widening the window.
          </div>
        )}
      </div>
    </SectionShell>
  );
}
