"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { CheckCircle2, XCircle, MinusCircle, MessageSquare, ChevronDown, LayoutDashboard, User, MessageCircle } from "lucide-react";
import { useState } from "react";
import type { Profile, CompatibilityCheck } from "@/lib/db";
import type { CompatResult, AdditionalKuta } from "@/lib/compatibility";
import { KOOTA_MAX } from "@/lib/compatibility";
import { Button } from "@/components/ui/button";
import { CompatibilityInsightShell } from "@/components/engines/CompatibilityInsightShell";
import { CompatibilityChat } from "@/components/engines/CompatibilityChat";
import { scoreColor, scoreLabel } from "@/lib/compatibility";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { PageHeader } from "@/components/PageHeader";

function ResultPill({ result }: { result?: string }) {
  if (result === "good")       return <span className="ac-tag fav">Auspicious</span>;
  if (result === "bad")        return <span className="ac-tag unf">Inauspicious</span>;
  if (result === "acceptable") return <span className="ac-tag warn">Moderate</span>;
  return <span className="ac-tag neu">Neutral</span>;
}

function ScoreArc({ score }: { score: number }) {
  const pct = score / 36;
  const r = 52;
  const circ = 2 * Math.PI * r;
  const strokeColor = scoreColor(score);
  const label = scoreLabel(score);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width="128" height="128" viewBox="0 0 128 128" aria-hidden="true">
        <circle cx="64" cy="64" r={r} fill="none" stroke="var(--color-border)" strokeWidth="8" />
        <circle cx="64" cy="64" r={r} fill="none" stroke={strokeColor} strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${pct * circ} ${circ}`}
          transform="rotate(-90 64 64)"
        />
        <text x="64" y="58" textAnchor="middle" fill={strokeColor} fontSize="26" fontWeight="700" fontFamily="system-ui">{score}</text>
        <text x="64" y="74" textAnchor="middle" fill="var(--color-ink-4)" fontSize="11" fontFamily="system-ui">/36 gunas</text>
      </svg>
      <span style={{ fontFamily: "var(--font-display)", fontSize: "0.9rem", color: strokeColor, letterSpacing: "0.06em" }}>{label}</span>
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
    Mahendra: "Mahendra", StreeDeergha: "Stree Deergha", Vedha: "Vedha",
    Rajju: "Rajju", BadConstellations: "Bad Constellations",
    LagnaHouse7: "Lagna / 7th House", SexEnergy: "Sex Energy",
  };

  return (
    <div className="max-w-2xl mx-auto px-4 space-y-6 pb-8">

      <PageHeader
        back="/compatibility"
        title={`${groomName} × ${brideName}`}
        subtitle="Compatibility reading"
      />

      {/* Hero card */}
      <div className="ac-card ac-card-pad">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 16 }}>
            {/* Groom */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
              <ProfileAvatar name={groomName} size="lg" />
              <div style={{ textAlign: "center", width: "100%" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", color: "var(--color-ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {groomName}
                </div>
                <div className="ac-eyebrow">Groom</div>
              </div>
            </div>

            <div style={{ flexShrink: 0 }}>
              <ScoreArc score={score} />
            </div>

            {/* Bride */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
              <ProfileAvatar name={brideName} size="lg" />
              <div style={{ textAlign: "center", width: "100%" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", color: "var(--color-ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {brideName}
                </div>
                <div className="ac-eyebrow">Bride</div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: 11, color: "var(--color-ink-4)", letterSpacing: "0.08em" }}>
            {new Date(check.created_at).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>
      </div>

      {/* Admin view toggle */}
      {showAdminTools && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="ac-card" style={{ display: "flex", padding: 2 }}>
            <Button variant={isProfessional ? "ghost" : "secondary"} size="sm"
              onClick={() => setIsProfessional(false)}
              className={`h-7 text-[10px] px-3 gap-1.5 uppercase font-bold tracking-wider ${!isProfessional ? "bg-[var(--color-surface-hover)] text-[var(--color-ink-1)]" : "text-[var(--color-ink-3)]"}`}>
              <User className="h-3 w-3" /> Summary
            </Button>
            <Button variant={isProfessional ? "secondary" : "ghost"} size="sm"
              onClick={() => setIsProfessional(true)}
              className={`h-7 text-[10px] px-3 gap-1.5 uppercase font-bold tracking-wider ${isProfessional ? "bg-[var(--color-surface-2)] text-[var(--color-ink-2)] border border-[var(--color-border)]" : "text-[var(--color-ink-3)]"}`}>
              <LayoutDashboard className="h-3 w-3" /> Detailed
            </Button>
          </div>
        </div>
      )}

      {/* ── BASIC VIEW ── */}
      {!isProfessional && result && (
        <div className="space-y-4">

          {/* Verdict banner */}
          <div
            className="ac-card ac-card-pad"
            style={{
              borderColor: score >= 18 ? "var(--color-success-border)" : "var(--color-danger-border)",
              background:  score >= 18 ? "var(--color-success-faint)"  : "var(--color-danger-faint)",
            }}
          >
            <p style={{ fontFamily: "var(--font-display)", fontSize: "1.35rem", color: score >= 18 ? "var(--color-success)" : "var(--color-danger)", lineHeight: 1.4 }}>
              {score >= 26 ? "An excellent match — highly auspicious for marriage."
                : score >= 18 ? "A good match — above the auspicious threshold of 18 gunas."
                : score >= 12 ? "A moderate match — below 18 gunas, worth careful deliberation."
                : "A challenging match — significant incompatibilities identified."}
            </p>
          </div>

          {/* Koota breakdown */}
          <div className="ac-card">
            <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--color-border)" }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", color: "var(--color-ink-2)" }}>
                Guna Breakdown
              </h2>
            </div>
            <div style={{ padding: "0 0 4px" }}>
              {Object.entries(scores).map(([name, pts]) => {
                const max = KOOTA_MAX[name];
                const full = typeof max === "number" && pts >= max;
                const partial = typeof max === "number" && pts > 0 && pts < max;
                const zero = pts === 0;
                return (
                  <div key={name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 20px", borderBottom: "1px solid var(--color-border)" }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: "1rem", color: "var(--color-ink-2)" }}>{name}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontWeight: 600, color: full ? "var(--color-success)" : partial ? "var(--color-warning)" : "var(--color-danger)", fontSize: "1rem" }}>{pts}</span>
                        <span style={{ color: "var(--color-ink-4)", fontSize: "0.8rem" }}>/{max ?? "—"}</span>
                      </div>
                      {full    && <CheckCircle2 className="h-3.5 w-3.5" style={{ color: "var(--color-success)" }} />}
                      {zero    && <XCircle      className="h-3.5 w-3.5" style={{ color: "var(--color-danger)" }} />}
                      {partial && <MinusCircle  className="h-3.5 w-3.5" style={{ color: "var(--color-warning)" }} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dosha cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div className="ac-card ac-card-pad" style={{
              borderColor: hasManglik ? "var(--color-danger-border)" : "var(--color-success-border)",
              background:  hasManglik ? "var(--color-danger-faint)"  : "var(--color-success-faint)",
            }}>
              <div className="ac-eyebrow" style={{ marginBottom: 6 }}>Mangal Dosha</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", color: hasManglik ? "var(--color-danger)" : "var(--color-success)" }}>
                {hasManglik ? "Present" : "Not Present"}
              </div>
              {kujaDosha?.male?.is_manglik && <div style={{ fontSize: 12, color: "var(--color-ink-3)", marginTop: 4 }}>{groomName} is Manglik</div>}
              {kujaDosha?.female?.is_manglik && <div style={{ fontSize: 12, color: "var(--color-ink-3)", marginTop: 2 }}>{brideName} is Manglik</div>}
              <div style={{ fontSize: 12, color: "var(--color-ink-3)", marginTop: 8, lineHeight: 1.5 }}>
                {kujaDosha?.compatibility?.description ?? (hasManglik ? "Mangal Dosha present — seek guidance on remedies." : "No Mangal Dosha detected.")}
              </div>
            </div>

            <div className="ac-card ac-card-pad" style={{
              borderColor: hasBhakoot ? "var(--color-danger-border)" : "var(--color-success-border)",
              background:  hasBhakoot ? "var(--color-danger-faint)"  : "var(--color-success-faint)",
            }}>
              <div className="ac-eyebrow" style={{ marginBottom: 6 }}>Bhakoot Dosha</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "1.3rem", color: hasBhakoot ? "var(--color-danger)" : "var(--color-success)" }}>
                {hasBhakoot ? "Present" : "Not Present"}
              </div>
              <div style={{ fontSize: 12, color: "var(--color-ink-3)", marginTop: 8, lineHeight: 1.5 }}>
                {hasBhakoot ? "An unfavourable lunar sign alignment — seek guidance on remedies." : "Bhakoot compatibility is auspicious."}
              </div>
            </div>
          </div>

          <p style={{ fontSize: 11, color: "var(--color-ink-4)", textAlign: "center", paddingBottom: 8 }}>
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
              <div className="ac-card overflow-hidden">
                <button onClick={() => setShowChat(o => !o)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", textAlign: "left", background: "none", border: "none", cursor: "pointer" }}>
                  <MessageSquare style={{ width: 14, height: 14, color: "var(--color-accent)", flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-accent)", flex: 1 }}>Compatibility Chat</span>
                  <ChevronDown style={{ width: 16, height: 16, color: "var(--color-ink-3)", transform: showChat ? "rotate(180deg)" : "none", transition: "transform 150ms" }} />
                </button>
                {showChat && (
                  <div style={{ borderTop: "1px solid var(--color-border)" }}>
                    <CompatibilityChat checkId={check.id} name1={groomName} name2={brideName} />
                  </div>
                )}
              </div>
            </>
          )}

          {/* Overall verdict */}
          <div className="ac-card ac-card-pad" style={{
            borderColor: isApproved ? "var(--color-success-border)" : "var(--color-danger-border)",
            background:  isApproved ? "var(--color-success-faint)"  : "var(--color-danger-faint)",
          }}>
            <div className="ac-eyebrow" style={{ marginBottom: 6 }}>Match Verdict</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", color: isApproved ? "var(--color-success)" : "var(--color-danger)" }}>
              {isApproved ? "Match Approved" : "Match Not Approved"}
            </div>
            <div style={{ fontSize: 12, color: "var(--color-ink-3)", marginTop: 4 }}>
              {score}/36 gunas · {score >= 18 ? "Above" : "Below"} the auspicious threshold of 18
            </div>
          </div>

          {/* Natal Moon Profiles */}
          {(result.male_details || result.female_details) && (
            <div className="ac-card overflow-hidden">
              <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--color-border)" }}>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", color: "var(--color-ink-2)" }}>Natal Moon Profiles</h2>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                {[
                  { label: groomName, details: result.male_details },
                  { label: brideName, details: result.female_details },
                ].map(({ label, details }, i) => (
                  <div key={label} style={{ padding: 16, borderLeft: i === 1 ? "1px solid var(--color-border)" : "none" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "0.95rem", color: "var(--color-cool)", marginBottom: 10 }}>
                      {label}
                    </div>
                    {[
                      ["Moon Sign", details?.moon_sign],
                      ["Nakshatra",  details?.nakshatra],
                      ["Gana",       details?.gana],
                      ["Nadi",       details?.nadi],
                      ["Yoni",       details?.yoni],
                    ].map(([k, v]) => v && (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                        <span style={{ color: "var(--color-ink-3)" }}>{k}</span>
                        <span style={{ fontWeight: 500, textTransform: "capitalize", color: "var(--color-ink-1)" }}>{v}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Kuja Dosha */}
          {kujaDosha && (
            <div className="ac-card overflow-hidden">
              <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--color-border)" }}>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", color: "var(--color-ink-2)" }}>Kuja Dosha Analysis</h2>
                <p style={{ fontSize: 11, color: "var(--color-ink-3)", marginTop: 2 }}>Mars, Saturn, Rahu, Ketu, Sun in houses 2 · 4 · 7 · 8 · 12</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                {[
                  { label: groomName, dosha: kujaDosha.male },
                  { label: brideName, dosha: kujaDosha.female },
                ].map(({ label, dosha }, i) => (
                  <div key={label} style={{ padding: 16, borderLeft: i === 1 ? "1px solid var(--color-border)" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <span style={{ fontFamily: "var(--font-display)", fontSize: "0.95rem", color: "var(--color-cool)" }}>{label}</span>
                      <span className={dosha?.is_manglik ? "ac-tag unf" : "ac-tag fav"}>
                        {dosha?.is_manglik ? "Manglik" : "Not Manglik"}
                      </span>
                    </div>
                    {dosha?.total_score !== undefined && (
                      <div style={{ fontSize: 12, color: "var(--color-ink-3)", marginBottom: 8 }}>
                        Dosha score: <span style={{ fontWeight: 500, color: "var(--color-ink-1)" }}>{dosha.total_score}</span>
                      </div>
                    )}
                    {dosha?.breakdown && Object.keys(dosha.breakdown).length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {Object.entries(dosha.breakdown).map(([planet, entry]) => (
                          <div key={planet} className="ac-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", borderColor: "var(--color-danger-border)", background: "var(--color-danger-faint)" }}>
                            <span style={{ fontWeight: 500, color: "var(--color-danger)", fontSize: 12 }}>{planet}</span>
                            <span style={{ fontSize: 12, color: "var(--color-ink-3)" }}>H{entry.house} · {entry.sign}</span>
                            <span style={{ color: "var(--color-danger)", fontWeight: 600, fontSize: 12 }}>+{entry.score}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, fontStyle: "italic", color: "var(--color-ink-4)" }}>No contributing planets</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional Kutas */}
          {Object.keys(additionalKutas).length > 0 && (
            <div className="ac-card overflow-hidden">
              <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--color-border)" }}>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", color: "var(--color-ink-2)" }}>Additional Kutas</h2>
              </div>
              <div>
                {Object.entries(additionalKutas).map(([key, val]) => {
                  const label = KUTA_LABELS[key] ?? key;
                  const kuta: AdditionalKuta = typeof val === "string" ? { result: val } : val;
                  return (
                    <div key={key} style={{ padding: "12px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", gap: 16, flexWrap: "wrap" }}>
                      <div style={{ minWidth: 140, flexShrink: 0 }}>
                        <span style={{ fontFamily: "var(--font-display)", fontSize: "1rem", color: "var(--color-ink-2)" }}>{label}</span>
                      </div>
                      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                        <ResultPill result={kuta.result} />
                        {kuta.group && (
                          <div style={{ fontSize: 12, color: "var(--color-ink-3)" }}>
                            Group: <span style={{ color: "var(--color-ink-1)", fontWeight: 500 }}>{kuta.group}</span>
                            {kuta.effect && <span style={{ marginLeft: 4, color: "var(--color-warning)" }}> — {kuta.effect}</span>}
                          </div>
                        )}
                        {kuta.description && <div style={{ fontSize: 12, color: "var(--color-ink-3)" }}>{kuta.description}</div>}
                        {kuta.male && kuta.female && (
                          <div style={{ fontSize: 12, color: "var(--color-ink-3)" }}>
                            <span style={{ color: "var(--color-cool)", fontWeight: 500, textTransform: "capitalize" }}>{groomName}: {kuta.male}</span>
                            <span style={{ margin: "0 6px", color: "var(--color-ink-4)" }}>·</span>
                            <span style={{ color: "var(--color-cool)", fontWeight: 500, textTransform: "capitalize" }}>{brideName}: {kuta.female}</span>
                          </div>
                        )}
                        {kuta.issues && kuta.issues.length > 0 && (
                          <ul>
                            {kuta.issues.map((issue, i) => (
                              <li key={i} style={{ fontSize: 12, color: "var(--color-danger)" }}>· {issue}</li>
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
            <div className="ac-card overflow-hidden" style={{ borderColor: "var(--color-accent-dim)", background: "var(--color-accent-faint)" }}>
              <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--color-accent-dim)" }}>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", color: "var(--color-accent)" }}>Dosha Mitigations</h2>
                <p style={{ fontSize: 11, color: "var(--color-ink-3)", marginTop: 2 }}>Classical exceptions that neutralise doshas</p>
              </div>
              <ul>
                {exceptions.map((ex, i) => (
                  <li key={i} style={{ padding: "10px 20px", borderBottom: "1px solid var(--color-accent-dim)", display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13 }}>
                    <CheckCircle2 style={{ width: 14, height: 14, color: "var(--color-accent)", flexShrink: 0, marginTop: 2 }} />
                    <span style={{ color: "var(--color-ink-2)" }}>{ex}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p style={{ fontSize: 11, color: "var(--color-ink-4)", textAlign: "center", paddingBottom: 8 }}>
            Classical Ashtakoota Milan · JHora standards · Additional kutas per BPHS / VedAstro conventions
          </p>
        </div>
      )}

      {!result && (
        <div className="ac-card ac-card-pad" style={{ textAlign: "center", color: "var(--color-ink-3)", fontSize: 13 }}>
          Result data unavailable for this reading.
        </div>
      )}

      {/* Consultation CTA */}
      {result && (
        <div className="ac-card ac-card-pad" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <MessageCircle style={{ width: 16, height: 16, color: "var(--color-accent)", flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 13, color: "var(--color-ink-2)" }}>Have questions about this result?</p>
              <p style={{ fontSize: 11, color: "var(--color-ink-3)", marginTop: 2 }}>A personal consultation can provide deeper context.</p>
            </div>
          </div>
          <Link href="/consultation">
            <Button variant="outline" size="sm" className="shrink-0 text-xs" style={{ borderColor: "var(--color-accent-dim)", color: "var(--color-accent)" }}>
              Ask a question
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
