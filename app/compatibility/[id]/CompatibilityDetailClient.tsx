"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowLeft, LayoutDashboard, User, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { useState } from "react";
import type { Profile, CompatibilityCheck } from "@/lib/db";
import type { CompatResult, AdditionalKuta } from "@/lib/compatibility";
import { KOOTA_MAX } from "@/lib/compatibility";
import { Button } from "@/components/ui/button";


function initials(name: string) {
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

function ResultPill({ result }: { result?: string }) {
  if (result === "good") return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-400">
      <CheckCircle2 className="h-3.5 w-3.5" /> Good
    </span>
  );
  if (result === "bad") return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-400">
      <XCircle className="h-3.5 w-3.5" /> Bad
    </span>
  );
  if (result === "acceptable") return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400">
      <MinusCircle className="h-3.5 w-3.5" /> Acceptable
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
      <MinusCircle className="h-3.5 w-3.5" /> Neutral
    </span>
  );
}

type Props = {
  check: CompatibilityCheck;
  profile1: Profile | null;
  profile2: Profile | null;
};

export function CompatibilityDetailClient({ check, profile1, profile2 }: Props) {
  const { data: session } = useSession();
  const showAdminTools = (session?.user as { isAdmin?: boolean } | undefined)?.isAdmin === true;
  const [isProfessional, setIsProfessional] = useState(false);

  let result: CompatResult | null = null;
  try { result = JSON.parse(check.result_json); } catch {}

  const score = result?.total_score ?? check.score;
  const scores = result?.scores ?? {};
  const kujaDosha = result?.kuja_dosha;
  const hasManglik = kujaDosha?.male?.is_manglik || kujaDosha?.female?.is_manglik;
  const hasBhakoot = (scores.Bhakoot ?? -1) === 0;

  const scoreColor = score >= 26 ? "text-emerald-400 border-emerald-500/40"
    : score >= 18 ? "text-green-400 border-green-500/40"
    : score >= 12 ? "text-amber-400 border-amber-500/40"
    : "text-red-400 border-red-500/40";

  const additionalKutas = result?.additional_kutas ?? {};
  const exceptions = result?.exceptions ?? [];
  const isApproved = result?.is_match_approved;

  const KUTA_LABELS: Record<string, string> = {
    Mahendra: "Mahendra",
    StreeDeergha: "Stree Deergha",
    Vedha: "Vedha",
    Rajju: "Rajju",
    BadConstellations: "Bad Constellations",
    LagnaHouse7: "Lagna / 7th House",
    SexEnergy: "Sex Energy",
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

      {/* Back nav */}
      <Link href="/compatibility" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        All Compatibility Checks
      </Link>

      {/* Header Card */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row items-center gap-6">

          {/* Profile 1 — Male */}
          <div className="flex flex-col items-center gap-2 flex-1">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center border-2 border-white/10 shadow-lg">
              <span className="text-xl font-bold text-white">{initials(profile1?.name ?? "M")}</span>
            </div>
            <div className="text-center">
              <div className="font-semibold text-blue-300">{profile1?.name ?? "Male Profile"}</div>
              {profile1 && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {profile1.date_of_birth} · {profile1.place_of_birth}
                </div>
              )}
            </div>
          </div>

          {/* Score Ring */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div className={`h-24 w-24 rounded-full border-4 flex items-center justify-center font-black text-3xl shadow-lg bg-black/40 ${scoreColor}`}>
              {score}/36
            </div>
            <div className="text-center">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Guna Milan</div>
              <div className="text-[10px] text-muted-foreground/60 mt-0.5">
                {new Date(check.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </div>
            </div>
          </div>

          {/* Profile 2 — Female */}
          <div className="flex flex-col items-center gap-2 flex-1">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-pink-500 to-pink-700 flex items-center justify-center border-2 border-white/10 shadow-lg">
              <span className="text-xl font-bold text-white">{initials(profile2?.name ?? "F")}</span>
            </div>
            <div className="text-center">
              <div className="font-semibold text-pink-300">{profile2?.name ?? "Female Profile"}</div>
              {profile2 && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {profile2.date_of_birth} · {profile2.place_of_birth}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* View Toggle (admin only) */}
      {showAdminTools && (
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white/5 rounded-lg p-0.5 border border-white/10 shadow-inner">
            <Button
              variant={isProfessional ? "ghost" : "secondary"}
              size="sm"
              onClick={() => setIsProfessional(false)}
              className={`h-7 text-[10px] px-3 gap-1.5 uppercase font-bold tracking-wider transition-all ${!isProfessional ? "bg-white/10 text-white shadow-sm" : "text-muted-foreground hover:text-white"}`}
            >
              <User className="h-3 w-3" /> Basic
            </Button>
            <Button
              variant={isProfessional ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setIsProfessional(true)}
              className={`h-7 text-[10px] px-3 gap-1.5 uppercase font-bold tracking-wider transition-all ${isProfessional ? "bg-violet-500/20 text-violet-300 shadow-sm border border-violet-500/30" : "text-muted-foreground hover:text-white"}`}
            >
              <LayoutDashboard className="h-3 w-3" /> Professional
            </Button>
          </div>
        </div>
      )}

      {/* ── BASIC VIEW ── */}
      {!isProfessional && result && (
        <div className="space-y-5">

          {/* Verdict */}
          <div className={`rounded-lg border px-4 py-3 text-sm ${score >= 18 ? "border-green-800/40 bg-green-950/20 text-green-300" : "border-amber-800/40 bg-amber-950/20 text-amber-300"}`}>
            {score >= 26
              ? "Excellent match — highly auspicious for marriage."
              : score >= 18
              ? "Good match — above the auspicious threshold of 18."
              : score >= 12
              ? "Moderate match — below 18, proceed with careful deliberation."
              : "Challenging match — significant incompatibilities identified."}
          </div>

          {/* Koota Breakdown */}
          <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10">
              <h2 className="text-sm font-semibold">Ashtakoota Breakdown</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-muted-foreground text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left p-3">Koota</th>
                  <th className="text-center p-3">Score</th>
                  <th className="text-center p-3">Max</th>
                  <th className="text-right p-3">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {Object.entries(scores).map(([name, pts]) => {
                  const max = KOOTA_MAX[name];
                  const matched = pts > 0;
                  return (
                    <tr key={name} className="hover:bg-white/[0.02]">
                      <td className="p-3 font-medium capitalize">{name}</td>
                      <td className="p-3 text-center font-bold text-foreground">{pts}</td>
                      <td className="p-3 text-center text-muted-foreground">{max ?? "—"}</td>
                      <td className="p-3 text-right">
                        <span className={`text-xs font-semibold ${matched ? "text-green-400" : "text-red-400"}`}>
                          {matched ? "Matched" : "Unmatched"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Dosha Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={`rounded-xl border p-4 ${hasManglik ? "border-red-500/40 bg-red-950/20" : "border-green-700/40 bg-green-950/20"}`}>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Mangal Dosha</div>
              <div className={`font-bold text-base ${hasManglik ? "text-red-400" : "text-green-400"}`}>
                {hasManglik ? "Present" : "Not Present"}
              </div>
              {kujaDosha?.male?.is_manglik && <div className="text-xs text-muted-foreground mt-1">{profile1?.name ?? "Male"}: Manglik</div>}
              {kujaDosha?.female?.is_manglik && <div className="text-xs text-muted-foreground mt-0.5">{profile2?.name ?? "Female"}: Manglik</div>}
              <div className="text-xs text-muted-foreground mt-2 leading-relaxed">
                {kujaDosha?.compatibility?.description ?? (hasManglik ? "Mangal Dosha present — consult for remedies." : "No Mangal Dosha.")}
              </div>
            </div>

            <div className={`rounded-xl border p-4 ${hasBhakoot ? "border-red-500/40 bg-red-950/20" : "border-green-700/40 bg-green-950/20"}`}>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Bhakoot Dosha</div>
              <div className={`font-bold text-base ${hasBhakoot ? "text-red-400" : "text-green-400"}`}>
                {hasBhakoot ? "Present" : "Not Present"}
              </div>
              <div className="text-xs text-muted-foreground mt-2 leading-relaxed">
                {hasBhakoot ? "Unfavorable lunar sign alignment — consult for remedies." : "Bhakoot compatibility is auspicious."}
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground/50">
            Calculations follow classical Ashtakoota Milan (JHora standards). A score of 18+ is the traditional threshold for auspicious marriage compatibility.
          </p>
        </div>
      )}

      {/* ── PROFESSIONAL VIEW ── */}
      {isProfessional && result && (
        <div className="space-y-6">

          {/* Overall verdict banner */}
          <div className={`rounded-xl border px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between
            ${isApproved ? "border-emerald-700/40 bg-emerald-950/20" : "border-red-800/40 bg-red-950/20"}`}>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Match Verdict</div>
              <div className={`text-lg font-bold ${isApproved ? "text-emerald-300" : "text-red-300"}`}>
                {isApproved ? "Match Approved" : "Match Not Approved"}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Score {score}/36 · {score >= 18 ? "Above" : "Below"} auspicious threshold of 18
              </div>
            </div>
            {kujaDosha?.compatibility && (
              <div className="text-right shrink-0">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Kuja Balance</div>
                <ResultPill result={kujaDosha.compatibility.result} />
                {kujaDosha.compatibility.description && (
                  <div className="text-xs text-muted-foreground mt-1 max-w-48">{kujaDosha.compatibility.description}</div>
                )}
              </div>
            )}
          </div>

          {/* Birth Profiles */}
          {(result.male_details || result.female_details) && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10">
                <h2 className="text-sm font-semibold">Natal Moon Profiles</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-white/10">
                {[
                  { label: profile1?.name ?? "Male", details: result.male_details, color: "text-blue-300" },
                  { label: profile2?.name ?? "Female", details: result.female_details, color: "text-pink-300" },
                ].map(({ label, details, color }) => (
                  <div key={label} className="p-4 space-y-2.5">
                    <div className={`text-xs font-bold uppercase tracking-wider ${color}`}>{label}</div>
                    {[
                      ["Moon Sign", details?.moon_sign],
                      ["Nakshatra", details?.nakshatra],
                      ["Gana", details?.gana],
                      ["Nadi", details?.nadi],
                      ["Yoni", details?.yoni],
                    ].map(([k, v]) => v && (
                      <div key={k} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{k}</span>
                        <span className="font-medium capitalize">{v}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Kuja Dosha Breakdown */}
          {kujaDosha && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10">
                <h2 className="text-sm font-semibold">Kuja Dosha Analysis</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Mars, Saturn, Rahu, Ketu, Sun in houses 2 · 4 · 7 · 8 · 12</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-white/10">
                {[
                  { label: profile1?.name ?? "Male", dosha: kujaDosha.male, color: "text-blue-300" },
                  { label: profile2?.name ?? "Female", dosha: kujaDosha.female, color: "text-pink-300" },
                ].map(({ label, dosha, color }) => (
                  <div key={label} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-xs font-bold uppercase tracking-wider ${color}`}>{label}</span>
                      <span className={`text-xs font-semibold ${dosha?.is_manglik ? "text-red-400" : "text-green-400"}`}>
                        {dosha?.is_manglik ? "Manglik" : "Not Manglik"}
                      </span>
                    </div>
                    {dosha?.total_score !== undefined && (
                      <div className="text-xs text-muted-foreground mb-2">Dosha score: <span className="text-foreground font-medium">{dosha.total_score}</span></div>
                    )}
                    {dosha?.breakdown && Object.keys(dosha.breakdown).length > 0 ? (
                      <div className="space-y-1.5">
                        {Object.entries(dosha.breakdown).map(([planet, entry]) => (
                          <div key={planet} className="flex items-center justify-between text-xs bg-red-950/20 rounded px-2.5 py-1.5 border border-red-900/30">
                            <span className="font-medium text-red-300">{planet}</span>
                            <span className="text-muted-foreground">House {entry.house} · {entry.sign}</span>
                            <span className="text-red-400 font-semibold">+{entry.score}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground/60 italic">No contributing planets</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional Kutas */}
          {Object.keys(additionalKutas).length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10">
                <h2 className="text-sm font-semibold">Additional Kutas</h2>
              </div>
              <div className="divide-y divide-white/5">
                {Object.entries(additionalKutas).map(([key, val]) => {
                  const label = KUTA_LABELS[key] ?? key;
                  const kuta: AdditionalKuta = typeof val === "string" ? { result: val } : val;
                  return (
                    <div key={key} className="px-4 py-3 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 hover:bg-white/[0.02]">
                      <div className="sm:w-36 shrink-0">
                        <div className="text-sm font-medium">{label}</div>
                      </div>
                      <div className="flex-1 space-y-1">
                        <ResultPill result={kuta.result} />
                        {kuta.group && (
                          <div className="text-xs text-muted-foreground">
                            Group: <span className="text-foreground font-medium">{kuta.group}</span>
                            {kuta.effect && <span className="ml-1 text-amber-400/80"> — {kuta.effect}</span>}
                          </div>
                        )}
                        {kuta.description && (
                          <div className="text-xs text-muted-foreground">{kuta.description}</div>
                        )}
                        {kuta.male && kuta.female && (
                          <div className="text-xs text-muted-foreground">
                            Male: <span className="text-blue-300 font-medium capitalize">{kuta.male}</span>
                            <span className="mx-2 text-white/20">·</span>
                            Female: <span className="text-pink-300 font-medium capitalize">{kuta.female}</span>
                          </div>
                        )}
                        {kuta.issues && kuta.issues.length > 0 && (
                          <ul className="space-y-0.5">
                            {kuta.issues.map((issue, i) => (
                              <li key={i} className="text-xs text-red-400">· {issue}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dosha Exceptions / Mitigations */}
          {exceptions.length > 0 && (
            <div className="rounded-xl border border-amber-800/30 bg-amber-950/10 overflow-hidden">
              <div className="px-4 py-3 border-b border-amber-800/20">
                <h2 className="text-sm font-semibold text-amber-300">Dosha Mitigations</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Classical exceptions that neutralize doshas</p>
              </div>
              <ul className="divide-y divide-amber-900/20">
                {exceptions.map((ex, i) => (
                  <li key={i} className="px-4 py-3 flex items-start gap-3 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <span className="text-amber-200/80">{ex}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-muted-foreground/50">
            Calculations follow classical Ashtakoota Milan (JHora standards). Additional kutas per BPHS / VedAstro conventions.
          </p>
        </div>
      )}

      {/* No result fallback */}
      {!result && (
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8 text-center text-muted-foreground text-sm">
          Result data unavailable for this check.
        </div>
      )}
    </div>
  );
}
