"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Profile, CompatibilityCheck } from "@/lib/db";
import { Loader2 } from "lucide-react";

const cormorant: React.CSSProperties = {
  fontFamily: "var(--font-cormorant), Georgia, serif",
  fontWeight: 300,
};

function ScoreRing({ score }: { score: number }) {
  const color = score >= 26 ? "#34d399" : score >= 18 ? "#86efac" : score >= 12 ? "#fbbf24" : "#f87171";
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
      <circle
        cx="32" cy="32" r="28" fill="none" stroke={color} strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${(score / 36) * 175.9} 175.9`}
        transform="rotate(-90 32 32)"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
      <text x="32" y="37" textAnchor="middle" fill={color} fontSize="14" fontWeight="700" fontFamily="system-ui">
        {score}
      </text>
    </svg>
  );
}

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

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
  const [groomId, setGroomId] = useState("");
  const [brideId, setBrideId] = useState("");

  const groomProfiles = initialProfiles.filter(p => p.gender?.toLowerCase() === "male");
  const brideProfiles = initialProfiles.filter(p => p.gender?.toLowerCase() === "female");
  const canRun = !!groomId && !!brideId && !calculating;

  const handleCalculate = async () => {
    if (!canRun) return;
    setCalculating(true);
    setCalcError(null);
    try {
      const res = await fetch("/api/compatibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_id_1: groomId, profile_id_2: brideId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to calculate");
      setChecks(prev => prev.some(c => c.id === data.id) ? prev : [data, ...prev]);
      router.push(`/compatibility/${data.id}`);
    } catch (e) {
      setCalcError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">

      {/* Page heading */}
      <div>
        <h1 style={{ ...cormorant, fontSize: "2.4rem", letterSpacing: "0.02em", lineHeight: 1.15, color: "rgba(255,255,255,0.92)" }}>
          Kundali Matching
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ashtakoota Milan — 36 gunas, classical Vedic compatibility
        </p>
      </div>

      {/* Match form */}
      <div style={{
        background: "rgba(255,255,255,0.045)",
        border: "1px solid rgba(255,255,255,0.11)",
        borderRadius: "20px",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        boxShadow: "0 16px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.10)",
        padding: "28px 24px",
      }}>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Groom */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span style={{ fontSize: "1.1rem" }}>🤵</span>
              <span style={{ ...cormorant, fontSize: "1.15rem", color: "rgba(196,180,255,0.9)", letterSpacing: "0.04em" }}>
                Groom
              </span>
            </div>
            {groomProfiles.length === 0 ? (
              <p className="text-xs text-muted-foreground leading-relaxed">
                No male profiles found. <Link href="/profiles/new" className="text-amber-400 underline">Add a profile</Link> and set gender to Male.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {groomProfiles.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setGroomId(g => g === p.id ? "" : p.id)}
                    disabled={calculating}
                    className={`flex items-center gap-2 px-3 py-2 rounded-full border text-sm transition-all ${
                      groomId === p.id
                        ? "border-violet-400/60 bg-violet-400/10 text-violet-200"
                        : "border-white/10 bg-white/5 text-white/60 hover:text-white/90 hover:bg-white/10"
                    }`}
                    style={cormorant}
                  >
                    <span className="h-5 w-5 rounded-full bg-violet-500/30 flex items-center justify-center text-[10px] font-bold text-violet-300 shrink-0">
                      {initials(p.name)}
                    </span>
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Bride */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span style={{ fontSize: "1.1rem" }}>👰</span>
              <span style={{ ...cormorant, fontSize: "1.15rem", color: "rgba(251,191,200,0.9)", letterSpacing: "0.04em" }}>
                Bride
              </span>
            </div>
            {brideProfiles.length === 0 ? (
              <p className="text-xs text-muted-foreground leading-relaxed">
                No female profiles found. <Link href="/profiles/new" className="text-amber-400 underline">Add a profile</Link> and set gender to Female.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {brideProfiles.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setBrideId(b => b === p.id ? "" : p.id)}
                    disabled={calculating}
                    className={`flex items-center gap-2 px-3 py-2 rounded-full border text-sm transition-all ${
                      brideId === p.id
                        ? "border-rose-400/60 bg-rose-400/10 text-rose-200"
                        : "border-white/10 bg-white/5 text-white/60 hover:text-white/90 hover:bg-white/10"
                    }`}
                    style={cormorant}
                  >
                    <span className="h-5 w-5 rounded-full bg-rose-500/30 flex items-center justify-center text-[10px] font-bold text-rose-300 shrink-0">
                      {initials(p.name)}
                    </span>
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="my-5 border-t border-white/[0.07]" />

        {calcError && (
          <p className="mb-4 text-sm text-red-300 bg-red-950/30 border border-red-900/40 rounded-xl px-4 py-2.5">
            {calcError}
          </p>
        )}

        <button
          onClick={handleCalculate}
          disabled={!canRun}
          style={{
            width: "100%",
            padding: "13px 0",
            borderRadius: "14px",
            border: "none",
            cursor: canRun ? "pointer" : "not-allowed",
            background: canRun
              ? "linear-gradient(105deg, #92400e 0%, #d97706 35%, #fcd34d 50%, #d97706 65%, #92400e 100%)"
              : "rgba(255,255,255,0.06)",
            backgroundSize: "200% auto",
            color: canRun ? "#3b1a00" : "rgba(255,255,255,0.3)",
            fontWeight: 600,
            fontSize: "1rem",
            letterSpacing: "0.02em",
            boxShadow: canRun ? "0 4px 20px rgba(217,119,6,0.35)" : "none",
            transition: "opacity 0.2s ease",
            opacity: calculating ? 0.7 : 1,
          }}
        >
          {calculating
            ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin inline" /> Calculating…</span>
            : "✦  See how they match"}
        </button>

        {(!groomId || !brideId) && (
          <p className="mt-3 text-center text-xs text-muted-foreground/60">
            {!groomId && !brideId ? "Select a groom and a bride above" : !groomId ? "Select the groom" : "Select the bride"}
          </p>
        )}
      </div>

      {/* Past results */}
      {checks.length > 0 && (
        <section className="space-y-3">
          <h2 style={{ ...cormorant, fontSize: "1.2rem", color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em" }}>
            Past readings
          </h2>
          <div className="space-y-2">
            {checks.map(c => {
              const p1 = initialProfiles.find(p => p.id === c.profile_id_1);
              const p2 = initialProfiles.find(p => p.id === c.profile_id_2);
              const isGood = c.score >= 18;
              return (
                <Link key={c.id} href={`/compatibility/${c.id}`}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    background: "rgba(255,255,255,0.035)",
                    border: "1px solid rgba(255,255,255,0.09)",
                    borderRadius: "16px",
                    padding: "14px 18px",
                    transition: "background 0.2s",
                  }}
                    className="hover:bg-white/[0.06] cursor-pointer"
                  >
                    <ScoreRing score={c.score} />
                    <div className="flex-1 min-w-0">
                      <div style={{ ...cormorant, fontSize: "1.1rem", color: "rgba(255,255,255,0.88)" }} className="truncate">
                        {p1?.name ?? "—"} <span style={{ color: "rgba(255,255,255,0.3)", fontStyle: "italic" }}>&amp;</span> {p2?.name ?? "—"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {new Date(c.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div style={{ ...cormorant, fontSize: "1.5rem", fontWeight: 600, color: isGood ? "#86efac" : "#fbbf24" }}>
                        {c.score}/36
                      </div>
                      <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                        {isGood ? "Auspicious" : "Moderate"}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {checks.length === 0 && groomProfiles.length > 0 && brideProfiles.length > 0 && (
        <div className="text-center py-12">
          <div style={{ fontSize: "2rem", marginBottom: "8px" }}>💍</div>
          <p style={{ ...cormorant, fontSize: "1.1rem", color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>
            Select a groom and bride above to see how the stars align
          </p>
        </div>
      )}
    </div>
  );
}
