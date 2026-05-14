"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Profile, CompatibilityCheck } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Heart, Loader2, AlertCircle } from "lucide-react";

export function CompatibilityClient({
  initialProfiles,
  initialChecks,
}: {
  initialProfiles: Profile[];
  initialChecks: CompatibilityCheck[];
}) {
  const router = useRouter();
  const [checks, setChecks] = useState<CompatibilityCheck[]>(initialChecks);
  const [calculating, setCalculating] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [selection, setSelection] = useState<{ p1: string; p2: string }>({ p1: "", p2: "" });

  // ⚡ Bolt Optimization: Memoize profile filtering to prevent O(N) recalculations on every re-render.
  // Re-renders happen frequently here on user typing, dropdown selections, etc.
  const maleProfiles = useMemo(
    () => initialProfiles.filter((p) => p.gender?.toLowerCase() === "male"),
    [initialProfiles]
  );

  const femaleProfiles = useMemo(
    () => initialProfiles.filter((p) => p.gender?.toLowerCase() === "female"),
    [initialProfiles]
  );

  const atLimit = checks.length >= 6;

  const handleCalculate = async () => {
    if (!selection.p1 || !selection.p2) return;
    setCalculating(true);
    setCalcError(null);
    try {
      const res = await fetch("/api/compatibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_id_1: selection.p1, profile_id_2: selection.p2 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to calculate");
      setChecks((prev) => prev.some((c) => c.id === data.id) ? prev : [data, ...prev]);
      router.push(`/compatibility/${data.id}`);
    } catch (e) {
      setCalcError(e instanceof Error ? e.message : "Calculation failed");
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 py-6 px-4">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold font-heading">Marriage Compatibility</h1>
          <p className="text-muted-foreground mt-1 text-sm">Ashtakoota Milan — 36-point system</p>
        </div>
        <div className="text-xs font-medium px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-muted-foreground">
          {checks.length} / 6 checks used
        </div>
      </header>

      {/* New Check Form */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">New Compatibility Check</h2>

        {atLimit && (
          <div className="p-3 bg-amber-950/30 border border-amber-800/50 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-200/90">
              You have reached the limit of 6 checks. Contact support or ask an admin to clear your history.
            </p>
          </div>
        )}

        {calcError && (
          <div className="p-3 bg-red-950/30 border border-red-800/50 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{calcError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Male Profile</label>
            <select
              className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2.5 text-sm disabled:opacity-50"
              value={selection.p1}
              onChange={(e) => setSelection((s) => ({ ...s, p1: e.target.value }))}
              disabled={atLimit || calculating}
            >
              <option value="">Select male profile…</option>
              {maleProfiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              {maleProfiles.length === 0 && <option disabled>No male profiles — add gender to a profile first.</option>}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-pink-400 uppercase tracking-wider">Female Profile</label>
            <select
              className="w-full bg-zinc-900 border border-zinc-800 rounded-md p-2.5 text-sm disabled:opacity-50"
              value={selection.p2}
              onChange={(e) => setSelection((s) => ({ ...s, p2: e.target.value }))}
              disabled={atLimit || calculating}
            >
              <option value="">Select female profile…</option>
              {femaleProfiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              {femaleProfiles.length === 0 && <option disabled>No female profiles — add gender to a profile first.</option>}
            </select>
          </div>
        </div>

        <Button
          onClick={handleCalculate}
          disabled={!selection.p1 || !selection.p2 || calculating || atLimit}
          className="bg-pink-600 hover:bg-pink-700 gap-2"
        >
          {calculating
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Calculating…</>
            : <><Heart className="h-4 w-4" /> Run Check</>}
        </Button>
      </div>

      {/* History */}
      {checks.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Previous Checks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {checks.map((c) => {
              const p1 = initialProfiles.find((p) => p.id === c.profile_id_1);
              const p2 = initialProfiles.find((p) => p.id === c.profile_id_2);
              return (
                <Link key={c.id} href={`/compatibility/${c.id}`}>
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition-colors p-4 flex items-center justify-between gap-4 cursor-pointer">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{p1?.name ?? "Male Profile"}</div>
                      <div className="text-xs text-muted-foreground truncate">& {p2?.name ?? "Female Profile"}</div>
                      <div className="text-[10px] text-muted-foreground/50 mt-1">
                        {new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-xl font-bold ${c.score >= 18 ? "text-green-400" : "text-amber-400"}`}>
                        {c.score}/36
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Gunas</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {checks.length === 0 && (
        <div className="text-center py-20 border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
          <Heart className="h-10 w-10 text-pink-500/40 mx-auto mb-3" />
          <p className="text-muted-foreground italic text-sm">No compatibility checks yet. Run your first check above.</p>
        </div>
      )}
    </div>
  );
}
