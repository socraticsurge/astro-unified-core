"use client";
import { useState } from "react";
import { SectionShell } from "./SectionShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Calendar, Clock } from "lucide-react";

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
    event_type: "General",
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
      <div className="space-y-8">
        {/* Search Form */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
          <div className="space-y-1.5">
            <Label>Event Type</Label>
            <select 
              className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2 text-sm"
              value={form.event_type}
              onChange={(e) => setForm({ ...form, event_type: e.target.value })}
            >
              <option value="General">General/Panchanga</option>
              <option value="Marriage">Marriage</option>
              <option value="House Warming">House Warming</option>
              <option value="Vehicle Purchase">Vehicle Purchase</option>
              <option value="Property">Property</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Start Date</Label>
            <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="bg-zinc-900 border-zinc-800" />
          </div>
          <div className="space-y-1.5">
            <Label>End Date</Label>
            <div className="flex gap-2">
              <Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="bg-zinc-900 border-zinc-800" />
              <Button onClick={handleSearch} disabled={loading} size="icon" className="shrink-0 bg-violet-600 hover:bg-violet-700">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {results.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {results.map((r, i) => (
                <div key={i} className="p-4 rounded-lg bg-green-950/20 border border-green-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-green-300 flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" />
                      {r.start_time} to {r.end_time}
                    </div>
                    <div className="text-xs text-muted-foreground">{r.date}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {r.points?.map((p: string, j: number) => (
                      <span key={j} className="text-[10px] bg-green-900/40 text-green-400 px-2 py-0.5 rounded-full border border-green-800/50">{p}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : !loading && (
            <div className="py-12 text-center text-sm text-muted-foreground italic border border-dashed border-white/10 rounded-lg">
              {results.length === 0 && form.event_type !== "General" ? "No highly auspicious timings found in this window." : "Search for auspicious timings by selecting an event and date range."}
            </div>
          )}
        </div>
      </div>
    </SectionShell>
  );
}
