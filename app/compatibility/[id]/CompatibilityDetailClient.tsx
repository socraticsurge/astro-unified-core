"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ArrowLeft, CheckCircle2, XCircle, MinusCircle, MessageSquare, ChevronDown, LayoutDashboard, User } from "lucide-react";
import { useState } from "react";
import type { Profile, CompatibilityCheck } from "@/lib/db";
import type { CompatResult, AdditionalKuta } from "@/lib/compatibility";
import { KOOTA_MAX } from "@/lib/compatibility";
import { Button } from "@/components/ui/button";
import { CompatibilityInsightShell } from "@/components/engines/CompatibilityInsightShell";
import { CompatibilityChat } from "@/components/engines/CompatibilityChat";
import { fonts, textStyles, colors, clamp, glass, radii } from "@/lib/typography";
import { scoreColor, scoreLabel } from "@/lib/compatibility";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function ResultPill({ result }: { result?: string }) {
  if (result === "good") return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
      <CheckCircle2 className="h-3.5 w-3.5" /> Auspicious
    </span>
  );
  if (result === "bad") return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-400">
      <XCircle className="h-3.5 w-3.5" /> Inauspicious
    </span>
  );
  if (result === "acceptable") return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400">
      <MinusCircle className="h-3.5 w-3.5" /> Moderate
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
      <MinusCircle className="h-3.5 w-3.5" /> Neutral
    </span>
  );
}

function ScoreArc({ score }: { score: number }) {
  const pct = score / 36;
  const r = 52;
  const circ = 2 * Math.PI * r;
  const strokeColor = scoreColor(score);
  const label = scoreLabel(score);
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="128" height="128" viewBox="0 0 128 128" aria-hidden="true">
        <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
        <circle cx="64" cy="64" r={r} fill="none" stroke={strokeColor} strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${pct * circ} ${circ}`}
          transform="rotate(-90 64 64)"
        />
        <text x="64" y="58" textAnchor="middle" fill={strokeColor} fontSize="26" fontWeight="700" fontFamily="system-ui">{score}</text>
        <text x="64" y="74" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="11" fontFamily="system-ui">/36 gunas</text>
      </svg>
      <span style={{ ...fonts.display, fontSize: "0.9rem", color: strokeColor, letterSpacing: "0.06em" }}>{label}</span>
    </div>
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
  const [showChat, setShowChat] = useState(false);

  let result: CompatResult | null = null;
  try { result = JSON.parse(check.result_json); } catch {}

  const score = result?.total_score ?? check.score;
  const scores = result?.scores ?? {};
  const kujaDosha = result?.kuja_dosha;
  const hasManglik = kujaDosha?.male?.is_manglik || kujaDosha?.female?.is_manglik;
  const hasBhakoot = (scores.Bhakoot ?? -1) === 0;
  const additionalKutas = result?.additional_kutas ?? {};
  const exceptions = result?.exceptions ?? [];
  const isApproved = result?.is_match_approved;

  const groomName = profile1?.name ?? "Groom";
  const brideName = profile2?.name ?? "Bride";

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
    <div className="max-w-2xl mx-auto px-4 space-y-6 pb-8">

      {/* Back */}
      <Link href="/compatibility" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        <span style={fonts.display}>All readings</span>
      </Link>

      {/* Hero card */}
      <div style={{ ...glass, borderRadius: radii.lg, padding: "28px 20px", boxShadow: "0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12)" }}>
        <div className="flex flex-col items-center gap-6">
          {/* Couple row */}
          <div className="flex items-center justify-between w-full gap-4">
            {/* Groom */}
            <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
              <ProfileAvatar
                name={groomName}
                size="lg"
                color="rgba(139,92,246,0.18)"
                textColor="rgba(196,180,255,0.9)"
              />
              <div className="text-center w-full">
                <div style={{ ...fonts.display, ...clamp.one, fontSize: "1.05rem", color: "rgba(196,180,255,0.95)" }}>
                  {groomName}
                </div>
                <div style={{ ...textStyles.meta, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  Groom
                </div>
              </div>
            </div>

            {/* Score arc */}
            <div className="shrink-0">
              <ScoreArc score={score} />
            </div>

            {/* Bride */}
            <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
              <ProfileAvatar
                name={brideName}
                size="lg"
                color="rgba(244,114,182,0.16)"
                textColor="rgba(251,191,200,0.9)"
              />
              <div className="text-center w-full">
                <div style={{ ...fonts.display, ...clamp.one, fontSize: "1.05rem", color: "rgba(251,191,200,0.95)" }}>
                  {brideName}
                </div>
                <div style={{ ...textStyles.meta, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  Bride
                </div>
              </div>
            </div>
          </div>

          {/* Date */}
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", letterSpacing: "0.08em" }}>
            {new Date(check.created_at).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>
      </div>

      {/* Admin view toggle */}
      {showAdminTools && (
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white/5 rounded-lg p-0.5 border border-white/10">
            <Button variant={isProfessional ? "ghost" : "secondary"} size="sm"
              onClick={() => setIsProfessional(false)}
              className={`h-7 text-[10px] px-3 gap-1.5 uppercase font-bold tracking-wider ${!isProfessional ? "bg-white/10 text-white" : "text-muted-foreground"}`}>
              <User className="h-3 w-3" /> Summary
            </Button>
            <Button variant={isProfessional ? "secondary" : "ghost"} size="sm"
              onClick={() => setIsProfessional(true)}
              className={`h-7 text-[10px] px-3 gap-1.5 uppercase font-bold tracking-wider ${isProfessional ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "text-muted-foreground"}`}>
              <LayoutDashboard className="h-3 w-3" /> Detailed
            </Button>
          </div>
        </div>
      )}

      {/* ── BASIC VIEW ── */}
      {!isProfessional && result && (
        <div className="space-y-4">

          {/* Verdict banner */}
          <div style={{
            ...glass, borderRadius: radii.lg,
            padding: "18px 20px",
            borderColor: score >= 18 ? "rgba(52,211,153,0.25)" : "rgba(251,191,36,0.25)",
            background: score >= 18 ? "rgba(4,120,87,0.12)" : "rgba(120,53,15,0.15)",
          }}>
            <p style={{ ...fonts.display, fontSize: "1.35rem", color: score >= 18 ? "rgba(167,243,208,0.95)" : "rgba(251,191,36,0.9)", lineHeight: 1.4 }}>
              {score >= 26
                ? "An excellent match — highly auspicious for marriage."
                : score >= 18
                ? "A good match — above the auspicious threshold of 18 gunas."
                : score >= 12
                ? "A moderate match — below 18 gunas, worth careful deliberation."
                : "A challenging match — significant incompatibilities identified."}
            </p>
          </div>

          {/* Koota breakdown */}
          <div style={{ ...glass, borderRadius: radii.lg }}>
            <div className="px-5 py-3 border-b border-white/[0.08]">
              <h2 style={{ ...fonts.display, fontSize: "1.15rem", color: "rgba(255,255,255,0.75)" }}>
                Guna Breakdown
              </h2>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {Object.entries(scores).map(([name, pts]) => {
                const max = KOOTA_MAX[name];
                const full = typeof max === "number" && pts >= max;
                const partial = typeof max === "number" && pts > 0 && pts < max;
                const zero = pts === 0;
                return (
                  <div key={name} className="flex items-center justify-between px-5 py-3">
                    <span style={{ ...fonts.display, fontSize: "1rem", color: "rgba(255,255,255,0.75)" }}>{name}</span>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span style={{ fontWeight: 600, color: full ? "#34d399" : partial ? "#fbbf24" : "#f87171", fontSize: "1rem" }}>{pts}</span>
                        <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.8rem" }}>/{max ?? "—"}</span>
                      </div>
                      {full && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                      {zero && <XCircle className="h-3.5 w-3.5 text-red-400" />}
                      {partial && <MinusCircle className="h-3.5 w-3.5 text-amber-400" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dosha cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div style={{
              ...glass, borderRadius: radii.lg,
              padding: "16px",
              borderColor: hasManglik ? "rgba(239,68,68,0.3)" : "rgba(52,211,153,0.25)",
              background: hasManglik ? "rgba(127,29,29,0.15)" : "rgba(4,120,87,0.10)",
            }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: "6px" }}>
                Mangal Dosha
              </div>
              <div style={{ ...fonts.display, fontSize: "1.3rem", color: hasManglik ? "#fca5a5" : "#6ee7b7" }}>
                {hasManglik ? "Present" : "Not Present"}
              </div>
              {kujaDosha?.male?.is_manglik && <div className="text-xs text-muted-foreground mt-1">{groomName} is Manglik</div>}
              {kujaDosha?.female?.is_manglik && <div className="text-xs text-muted-foreground mt-0.5">{brideName} is Manglik</div>}
              <div className="text-xs text-muted-foreground mt-2 leading-relaxed">
                {kujaDosha?.compatibility?.description ?? (hasManglik ? "Mangal Dosha present — seek guidance on remedies." : "No Mangal Dosha detected.")}
              </div>
            </div>

            <div style={{
              ...glass, borderRadius: radii.lg,
              padding: "16px",
              borderColor: hasBhakoot ? "rgba(239,68,68,0.3)" : "rgba(52,211,153,0.25)",
              background: hasBhakoot ? "rgba(127,29,29,0.15)" : "rgba(4,120,87,0.10)",
            }}>
              <div style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: "6px" }}>
                Bhakoot Dosha
              </div>
              <div style={{ ...fonts.display, fontSize: "1.3rem", color: hasBhakoot ? "#fca5a5" : "#6ee7b7" }}>
                {hasBhakoot ? "Present" : "Not Present"}
              </div>
              <div className="text-xs text-muted-foreground mt-2 leading-relaxed">
                {hasBhakoot
                  ? "An unfavourable lunar sign alignment — seek guidance on remedies."
                  : "Bhakoot compatibility is auspicious."}
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground/40 text-center pb-2">
            Classical Ashtakoota Milan · JHora standards · 18+ gunas is the traditional threshold
          </p>
        </div>
      )}

      {/* ── PROFESSIONAL VIEW ── */}
      {isProfessional && result && (
        <div className="space-y-5">

          {showAdminTools && (
            <>
              <CompatibilityInsightShell checkId={check.id} name1={groomName} name2={brideName} />
              <div style={{ ...glass, borderRadius: radii.lg }} className="overflow-hidden">
                <button onClick={() => setShowChat(o => !o)} className="w-full flex items-center gap-2 px-4 py-3 text-left">
                  <MessageSquare className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-amber-300 flex-1">Compatibility Chat</span>
                  <ChevronDown className={`h-4 w-4 text-white/40 transition-transform ${showChat ? "rotate-180" : ""}`} />
                </button>
                {showChat && (
                  <div className="border-t border-white/[0.07]">
                    <CompatibilityChat checkId={check.id} name1={groomName} name2={brideName} />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Overall verdict */}
          <div style={{
            ...glass, borderRadius: radii.lg, padding: "20px",
            borderColor: isApproved ? "rgba(52,211,153,0.3)" : "rgba(239,68,68,0.3)",
            background: isApproved ? "rgba(4,120,87,0.12)" : "rgba(127,29,29,0.15)",
          }}>
            <div style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: "6px" }}>
              Match Verdict
            </div>
            <div style={{ ...fonts.display, fontSize: "1.6rem", color: isApproved ? "#6ee7b7" : "#fca5a5" }}>
              {isApproved ? "Match Approved" : "Match Not Approved"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {score}/36 gunas · {score >= 18 ? "Above" : "Below"} the auspicious threshold of 18
            </div>
          </div>

          {/* Natal Moon Profiles */}
          {(result.male_details || result.female_details) && (
            <div style={{ ...glass, borderRadius: radii.lg }} className="overflow-hidden">
              <div className="px-5 py-3 border-b border-white/[0.08]">
                <h2 style={{ ...fonts.display, fontSize: "1.15rem", color: "rgba(255,255,255,0.75)" }}>Natal Moon Profiles</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.07]">
                {[
                  { label: groomName, details: result.male_details, color: "rgba(196,180,255,0.9)" },
                  { label: brideName, details: result.female_details, color: "rgba(251,191,200,0.9)" },
                ].map(({ label, details, color }) => (
                  <div key={label} className="p-4 space-y-2.5">
                    <div style={{ ...fonts.display, fontSize: "0.95rem", color }}>
                      {label}
                    </div>
                    {[
                      ["Moon Sign", details?.moon_sign],
                      ["Nakshatra", details?.nakshatra],
                      ["Gana", details?.gana],
                      ["Nadi", details?.nadi],
                      ["Yoni", details?.yoni],
                    ].map(([k, v]) => v && (
                      <div key={k} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{k}</span>
                        <span className="font-medium capitalize" style={{ color: "rgba(255,255,255,0.85)" }}>{v}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Kuja Dosha */}
          {kujaDosha && (
            <div style={{ ...glass, borderRadius: radii.lg }} className="overflow-hidden">
              <div className="px-5 py-3 border-b border-white/[0.08]">
                <h2 style={{ ...fonts.display, fontSize: "1.15rem", color: "rgba(255,255,255,0.75)" }}>Kuja Dosha Analysis</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Mars, Saturn, Rahu, Ketu, Sun in houses 2 · 4 · 7 · 8 · 12</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.07]">
                {[
                  { label: groomName, dosha: kujaDosha.male, color: "rgba(196,180,255,0.9)" },
                  { label: brideName, dosha: kujaDosha.female, color: "rgba(251,191,200,0.9)" },
                ].map(({ label, dosha, color }) => (
                  <div key={label} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span style={{ ...fonts.display, fontSize: "0.95rem", color }}>{label}</span>
                      <span className={`text-xs font-semibold ${dosha?.is_manglik ? "text-red-400" : "text-emerald-400"}`}>
                        {dosha?.is_manglik ? "Manglik" : "Not Manglik"}
                      </span>
                    </div>
                    {dosha?.total_score !== undefined && (
                      <div className="text-xs text-muted-foreground mb-2">Dosha score: <span className="font-medium text-foreground">{dosha.total_score}</span></div>
                    )}
                    {dosha?.breakdown && Object.keys(dosha.breakdown).length > 0 ? (
                      <div className="space-y-1.5">
                        {Object.entries(dosha.breakdown).map(([planet, entry]) => (
                          <div key={planet} className="flex items-center justify-between text-xs bg-red-950/20 rounded-lg px-2.5 py-1.5 border border-red-900/30">
                            <span className="font-medium text-red-300">{planet}</span>
                            <span className="text-muted-foreground">House {entry.house} · {entry.sign}</span>
                            <span className="text-red-400 font-semibold">+{entry.score}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground/50 italic">No contributing planets</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional Kutas */}
          {Object.keys(additionalKutas).length > 0 && (
            <div style={{ ...glass, borderRadius: radii.lg }} className="overflow-hidden">
              <div className="px-5 py-3 border-b border-white/[0.08]">
                <h2 style={{ ...fonts.display, fontSize: "1.15rem", color: "rgba(255,255,255,0.75)" }}>Additional Kutas</h2>
              </div>
              <div className="divide-y divide-white/[0.06]">
                {Object.entries(additionalKutas).map(([key, val]) => {
                  const label = KUTA_LABELS[key] ?? key;
                  const kuta: AdditionalKuta = typeof val === "string" ? { result: val } : val;
                  return (
                    <div key={key} className="px-5 py-3 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
                      <div className="sm:w-36 shrink-0">
                        <div style={{ ...fonts.display, fontSize: "1rem", color: "rgba(255,255,255,0.7)" }}>{label}</div>
                      </div>
                      <div className="flex-1 space-y-1">
                        <ResultPill result={kuta.result} />
                        {kuta.group && (
                          <div className="text-xs text-muted-foreground">
                            Group: <span className="text-foreground font-medium">{kuta.group}</span>
                            {kuta.effect && <span className="ml-1 text-amber-400/80"> — {kuta.effect}</span>}
                          </div>
                        )}
                        {kuta.description && <div className="text-xs text-muted-foreground">{kuta.description}</div>}
                        {kuta.male && kuta.female && (
                          <div className="text-xs text-muted-foreground">
                            <span style={{ color: "rgba(196,180,255,0.85)" }} className="font-medium capitalize">{groomName}: {kuta.male}</span>
                            <span className="mx-2 text-white/20">·</span>
                            <span style={{ color: "rgba(251,191,200,0.85)" }} className="font-medium capitalize">{brideName}: {kuta.female}</span>
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

          {/* Dosha exceptions */}
          {exceptions.length > 0 && (
            <div style={{ ...glass, borderRadius: radii.lg, borderColor: "rgba(251,191,36,0.2)", background: "rgba(120,53,15,0.12)" }} className="overflow-hidden">
              <div className="px-5 py-3 border-b border-amber-800/20">
                <h2 style={{ ...fonts.display, fontSize: "1.15rem", color: "rgba(253,230,138,0.85)" }}>Dosha Mitigations</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Classical exceptions that neutralise doshas</p>
              </div>
              <ul className="divide-y divide-amber-900/20">
                {exceptions.map((ex, i) => (
                  <li key={i} className="px-5 py-3 flex items-start gap-3 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <span className="text-amber-200/80">{ex}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-muted-foreground/30 text-center pb-2">
            Classical Ashtakoota Milan · JHora standards · Additional kutas per BPHS / VedAstro conventions
          </p>
        </div>
      )}

      {!result && (
        <div style={{ ...glass, borderRadius: radii.lg }} className="p-10 text-center text-muted-foreground text-sm">
          Result data unavailable for this reading.
        </div>
      )}
    </div>
  );
}
