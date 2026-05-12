"use client";
import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { Profile, CompatibilityCheck } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Heart, Plus, Loader2, X, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function CompatibilityPage() {
  const { data: session, status } = useSession();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [checks, setChecks] = useState<CompatibilityCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [selection, setSelection] = useState<{ p1?: string; p2?: string }>({});
  const [result, setResult] = useState<any>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        fetch("/api/profiles"),
        fetch("/api/compatibility"),
      ]);
      const [pData, cData] = await Promise.all([pRes.json(), cRes.json()]);
      setProfiles(Array.isArray(pData) ? pData : []);
      setChecks(Array.isArray(cData) ? cData : []);
    } catch (e) {
      console.error("Failed to load data", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") loadData();
  }, [status, loadData]);

  const handleCalculate = async () => {
    if (!selection.p1 || !selection.p2) return;
    setCalculating(true);
    setResult(null);
    try {
      const res = await fetch("/api/compatibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_id_1: selection.p1,
          profile_id_2: selection.p2,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to calculate");
      setResult(JSON.parse(data.result_json));
      loadData(); // Refresh history
    } catch (e) {
      alert(e instanceof Error ? e.message : "Calculation failed");
    } finally {
      setCalculating(false);
    }
  };

  if (status === "loading" || loading) {
    return <div className="text-center py-20 text-muted-foreground">Loading...</div>;
  }

  const maleProfiles = profiles.filter(p => p.gender?.toLowerCase() === 'male');
  const femaleProfiles = profiles.filter(p => p.gender?.toLowerCase() === 'female');
  
  const selectedP1 = profiles.find(p => p.id === selection.p1);
  const selectedP2 = profiles.find(p => p.id === selection.p2);

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-6 px-4">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-heading">Marriage Compatibility</h1>
          <p className="text-muted-foreground mt-1">Ashtakoota Milan (36-point system)</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Button onClick={() => setModalOpen(true)} disabled={checks.length >= 6} className="bg-pink-600 hover:bg-pink-700 text-white">
            <Heart className="mr-2 h-4 w-4" /> New Compatibility Check
          </Button>
          <div className="text-xs font-medium px-3 py-1 bg-white/5 border border-white/10 rounded-full text-muted-foreground">
            {checks.length} / 6 Checks Used
          </div>
        </div>
      </header>

      {/* History Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {checks.map((c) => {
          const p1 = profiles.find((p) => p.id === c.profile_id_1);
          const p2 = profiles.find((p) => p.id === c.profile_id_2);
          return (
            <Card key={c.id} className="bg-white/5 border-white/10 overflow-hidden hover:bg-white/10 transition-colors cursor-pointer" onClick={() => {
              setSelection({ p1: c.profile_id_1, p2: c.profile_id_2 });
              setResult(JSON.parse(c.result_json));
              setModalOpen(true);
            }}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p1?.name || "Male Profile"}</div>
                  <div className="text-xs text-muted-foreground">& {p2?.name || "Female Profile"}</div>
                </div>
                <div className="text-right ml-4">
                  <div className={`text-xl font-bold ${c.score >= 18 ? "text-green-400" : "text-amber-400"}`}>
                    {c.score}/36
                  </div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Gunas</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {checks.length === 0 && !loading && (
        <div className="text-center py-20 border border-dashed border-white/10 rounded-xl bg-white/5">
          <Heart className="h-10 w-10 text-pink-500/50 mx-auto mb-3" />
          <p className="text-muted-foreground italic">No compatibility checks run yet.</p>
        </div>
      )}

      {/* Selection/Result Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-zinc-950 border border-white/10 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <header className="p-5 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-xl font-bold font-heading">Compatibility Check</h2>
              <button onClick={() => { setModalOpen(false); setResult(null); setSelection({}); }} className="text-muted-foreground hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {!result ? (
                <div className="space-y-6">
                  {checks.length >= 6 && (
                    <div className="p-4 bg-amber-950/30 border border-amber-800/50 rounded-lg flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      <div className="text-sm text-amber-200/90">
                        You have reached your limit of 6 compatibility checks. Please consult support or delete existing checks to run new ones.
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Male Profile</label>
                      <select 
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2.5 text-sm"
                        value={selection.p1 || ""}
                        onChange={(e) => setSelection({ ...selection, p1: e.target.value })}
                        disabled={checks.length >= 6}
                      >
                        <option value="">Select male profile...</option>
                        {maleProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        {maleProfiles.length === 0 && <option disabled>No male profiles saved.</option>}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-pink-400 uppercase tracking-wider">Female Profile</label>
                      <select 
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2.5 text-sm"
                        value={selection.p2 || ""}
                        onChange={(e) => setSelection({ ...selection, p2: e.target.value })}
                        disabled={checks.length >= 6}
                      >
                        <option value="">Select female profile...</option>
                        {femaleProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        {femaleProfiles.length === 0 && <option disabled>No female profiles saved.</option>}
                      </select>
                    </div>
                  </div>
                  <Button 
                    onClick={handleCalculate} 
                    disabled={!selection.p1 || !selection.p2 || calculating || checks.length >= 6}
                    className="w-full bg-pink-600 hover:bg-pink-700 h-12 text-base font-semibold"
                  >
                    {calculating ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Calculating...</> : "Run Check"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Results Display */}
                  <div className="text-center space-y-6">
                    <div className="flex items-center justify-center gap-4 w-full">
                      <div className="flex-1 text-right truncate">
                        <span className="text-blue-300 font-bold text-lg">{selectedP1?.name || "Male"}</span>
                      </div>
                      <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-pink-500/10 border border-pink-500/20">
                        <Heart className="h-5 w-5 text-pink-500 fill-pink-500/20" />
                      </div>
                      <div className="flex-1 text-left truncate">
                        <span className="text-pink-300 font-bold text-lg">{selectedP2?.name || "Female"}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="inline-flex items-center justify-center h-24 w-24 rounded-full border-4 border-pink-500/30 bg-pink-500/10 text-3xl font-black text-pink-400 shadow-[0_0_20px_rgba(236,72,153,0.2)]">
                        {result.total_score}/36
                      </div>
                      <div>
                        <div className="text-sm font-medium text-pink-300">Guna Milan Score</div>
                        <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1">
                          A score above 18 is generally considered auspicious for marriage.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Kootas Table */}
                  <div className="rounded-lg border border-white/5 bg-white/5 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-white/5 text-muted-foreground font-medium uppercase tracking-wider">
                        <tr>
                          <th className="p-3 text-left">Koota</th>
                          <th className="p-3 text-center">Points</th>
                          <th className="p-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {Object.entries(result.scores || {}).map(([name, score]: [string, any]) => (
                          <tr key={name}>
                            <td className="p-3 font-medium capitalize">{name}</td>
                            <td className="p-3 text-center font-bold text-foreground">{score}</td>
                            <td className="p-3 text-right">
                              {score > 0 ? (
                                <span className="text-green-500">Matched</span>
                              ) : (
                                <span className="text-red-500">Unmatched</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Dosha Status */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className={`p-4 rounded-lg border flex flex-col justify-center items-center text-center ${result.kuja_dosha?.male?.is_manglik || result.kuja_dosha?.female?.is_manglik ? "border-red-500/50 bg-red-500/10" : "border-green-500/50 bg-green-500/10"}`}>
                      <div className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">Mangal Dosha</div>
                      <div className="font-bold text-sm">
                        {result.kuja_dosha?.male?.is_manglik || result.kuja_dosha?.female?.is_manglik ? "Present" : "None"}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {result.kuja_dosha?.compatibility?.description || "Auspicious match"}
                      </div>
                    </div>
                    <div className={`p-4 rounded-lg border flex flex-col justify-center items-center text-center ${result.scores?.Bhakoot === 0 ? "border-red-500/50 bg-red-500/10" : "border-green-500/50 bg-green-500/10"}`}>
                      <div className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-1">Bhakoot Dosha</div>
                      <div className="font-bold text-sm">{result.scores?.Bhakoot === 0 ? "Present" : "None"}</div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {result.scores?.Bhakoot === 0 ? "Unfavorable lunar alignment" : "Auspicious match"}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <footer className="p-5 border-t border-white/10 text-center">
              {result && (
                <Button onClick={() => { setResult(null); setSelection({}); }} variant="outline" className="w-full">
                  Run Another Check
                </Button>
              )}
              {!result && (
                <p className="text-[10px] text-muted-foreground italic">
                  Calculations based on classical JHora standards.
                </p>
              )}
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
