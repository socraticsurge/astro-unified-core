"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Profile, CompatibilityCheck } from "@/lib/db";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { fonts, textStyles, colors, clamp, interactive, radii } from "@/lib/typography";
import { scoreColor } from "@/lib/compatibility";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function formatBirthDate(dob: string | null | undefined): string {
  if (!dob) return "";
  try {
    return new Date(dob).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return dob;
  }
}

type SeatRole = "groom" | "bride";

const ROLE_COLORS: Record<SeatRole, {
  accent: string;
  accentFaint: string;
  avatarBg: string;
  avatarText: string;
  cardBorder: string;
  cardGlow: string;
  label: string;
}> = {
  groom: {
    accent: "rgba(196,180,255,0.85)",
    accentFaint: "rgba(196,180,255,0.25)",
    avatarBg: "rgba(139,92,246,0.18)",
    avatarText: "rgba(196,180,255,0.9)",
    cardBorder: "rgba(139,92,246,0.28)",
    cardGlow: "0 0 32px rgba(139,92,246,0.12)",
    label: "Groom",
  },
  bride: {
    accent: "rgba(251,191,200,0.85)",
    accentFaint: "rgba(251,191,200,0.25)",
    avatarBg: "rgba(244,114,182,0.16)",
    avatarText: "rgba(251,191,200,0.9)",
    cardBorder: "rgba(244,114,182,0.26)",
    cardGlow: "0 0 32px rgba(244,114,182,0.10)",
    label: "Bride",
  },
};

function SeatCard({
  role,
  profiles,
  idx,
  onPrev,
  onNext,
  disabled,
}: {
  role: SeatRole;
  profiles: Profile[];
  idx: number;
  onPrev: () => void;
  onNext: () => void;
  disabled: boolean;
}) {
  const c = ROLE_COLORS[role];
  const count = profiles.length;
  // Virtual total: all real profiles + 1 "new profile" slide at the end
  const virtualTotal = count + 1;
  const isNewSlide = idx >= count;
  const profile = isNewSlide ? null : profiles[idx];

  const cardBase: React.CSSProperties = {
    position: "relative",
    borderRadius: "20px",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "200px",
    flex: 1,
    padding: "28px 20px 20px",
    transition: "box-shadow 0.3s ease, border-color 0.3s ease",
  };

  // Create / new-profile slide
  if (isNewSlide) {
    return (
      <div style={{
        ...cardBase,
        background: "rgba(255,255,255,0.025)",
        border: `1.5px dashed ${c.accentFaint}`,
      }}>
        <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden="true" style={{ marginBottom: "12px", opacity: 0.22 }}>
          <circle cx="24" cy="17" r="9" fill="none" stroke={c.accent} strokeWidth="1.5" />
          <path d="M5 44 Q5 30 24 30 Q43 30 43 44" fill="none" stroke={c.accent} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <p style={{ ...fonts.display, fontSize: "0.95rem", fontStyle: "italic", color: c.accentFaint, textAlign: "center", lineHeight: 1.5, marginBottom: "14px" }}>
          New profile
        </p>
        <Link
          href="/profiles/new"
          style={{
            fontSize: "0.75rem",
            letterSpacing: "0.08em",
            color: c.accent,
            opacity: 0.65,
            textDecoration: "none",
            border: `1px solid ${c.accentFaint}`,
            borderRadius: "999px",
            padding: "5px 14px",
          }}
        >
          + create
        </Link>

        {/* Carousel controls — always shown here so user knows they can go back */}
        {count >= 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "18px" }}>
            <button onClick={onPrev} disabled={disabled} aria-label="Previous"
              style={{ background: "none", border: `1px solid ${c.accentFaint}`, borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: disabled ? "not-allowed" : "pointer", color: c.accent, opacity: disabled ? 0.4 : 0.6 }}>
              <ChevronLeft size={14} />
            </button>
            <span style={{ ...fonts.display, fontSize: "0.82rem", color: "rgba(255,255,255,0.25)", minWidth: "28px", textAlign: "center" }}>+</span>
            <button onClick={onNext} disabled={disabled} aria-label="Next"
              style={{ background: "none", border: `1px solid ${c.accentFaint}`, borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: disabled ? "not-allowed" : "pointer", color: c.accent, opacity: disabled ? 0.4 : 0.6 }}>
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    );
  }

  // Filled profile slide
  return (
    <div style={{
      ...cardBase,
      background: "rgba(255,255,255,0.04)",
      border: `1px solid ${c.cardBorder}`,
      boxShadow: c.cardGlow,
    }}>
      {/* Role label */}
      <div style={{
        position: "absolute", top: "14px", left: "50%", transform: "translateX(-50%)",
        ...textStyles.meta, letterSpacing: "0.14em", textTransform: "uppercase",
        color: c.accentFaint, whiteSpace: "nowrap",
      }}>
        {c.label}
      </div>

      {/* Avatar */}
      <div style={{ marginBottom: "14px", marginTop: "8px" }}>
        <ProfileAvatar
          name={profile!.name}
          size="lg"
          color={c.avatarBg}
          textColor={c.avatarText}
        />
      </div>

      {/* Name */}
      <div style={{ ...fonts.display, ...clamp.two, fontSize: "1.35rem", color: colors.primary, textAlign: "center", lineHeight: 1.2, width: "100%" }}>
        {profile!.name}
      </div>

      {/* Birth date */}
      {profile!.date_of_birth && (
        <div style={{ ...textStyles.meta, marginTop: "6px", textAlign: "center" }}>
          {formatBirthDate(profile!.date_of_birth)}
        </div>
      )}

      {/* Carousel controls — always show so user can reach the "new profile" slide */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "18px" }}>
        <button onClick={onPrev} disabled={disabled} aria-label="Previous"
          style={{ background: "none", border: `1px solid ${c.accentFaint}`, borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: disabled ? "not-allowed" : "pointer", color: c.accent, opacity: disabled ? 0.4 : 0.7 }}>
          <ChevronLeft size={14} />
        </button>
        <span style={{ ...fonts.display, fontSize: "0.85rem", color: "rgba(255,255,255,0.3)", minWidth: "36px", textAlign: "center", letterSpacing: "0.04em" }}>
          {idx + 1}/{virtualTotal}
        </span>
        <button onClick={onNext} disabled={disabled} aria-label="Next"
          style={{ background: "none", border: `1px solid ${c.accentFaint}`, borderRadius: "50%", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: disabled ? "not-allowed" : "pointer", color: c.accent, opacity: disabled ? 0.4 : 0.7 }}>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const color = scoreColor(score);
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
  const [groomIdx, setGroomIdx] = useState(0);
  const [brideIdx, setBrideIdx] = useState(0);

  const groomProfiles = initialProfiles.filter(p => p.gender?.toLowerCase() === "male");
  const brideProfiles = initialProfiles.filter(p => p.gender?.toLowerCase() === "female");
  // idx past end of real profiles = "new profile" slide; those seats have no selection
  const selectedGroom = groomIdx < groomProfiles.length ? groomProfiles[groomIdx] : null;
  const selectedBride = brideIdx < brideProfiles.length ? brideProfiles[brideIdx] : null;
  const groomId = selectedGroom?.id ?? "";
  const brideId = selectedBride?.id ?? "";
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
        <h1 style={textStyles.pageTitle}>Kundali Matching</h1>
      </div>

      {/* Portrait seat cards */}
      <div style={{ display: "flex", alignItems: "stretch", gap: "16px" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <SeatCard
            role="groom"
            profiles={groomProfiles}
            idx={groomIdx}
            onPrev={() => setGroomIdx(i => (i - 1 + (groomProfiles.length + 1)) % (groomProfiles.length + 1))}
            onNext={() => setGroomIdx(i => (i + 1) % (groomProfiles.length + 1))}
            disabled={calculating}
          />
        </div>

        {/* Connector */}
        <div style={{
          ...fonts.display,
          fontSize: "1.8rem",
          fontStyle: "italic",
          color: "rgba(255,255,255,0.10)",
          flexShrink: 0,
          userSelect: "none",
          lineHeight: 1,
        }}>
          &amp;
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <SeatCard
            role="bride"
            profiles={brideProfiles}
            idx={brideIdx}
            onPrev={() => setBrideIdx(i => (i - 1 + (brideProfiles.length + 1)) % (brideProfiles.length + 1))}
            onNext={() => setBrideIdx(i => (i + 1) % (brideProfiles.length + 1))}
            disabled={calculating}
          />
        </div>
      </div>

      {/* CTA */}
      <div>
        {calcError && (
          <p style={{
            marginBottom: "12px",
            fontSize: "0.85rem",
            color: "#fca5a5",
            background: "rgba(127,29,29,0.25)",
            border: "1px solid rgba(127,29,29,0.4)",
            borderRadius: radii.sm,
            padding: "10px 16px",
          }}>
            {calcError}
          </p>
        )}

        <button
          onClick={handleCalculate}
          disabled={!canRun}
          style={{
            width: "100%",
            padding: "14px 0",
            borderRadius: "16px",
            border: "none",
            cursor: canRun ? "pointer" : "not-allowed",
            background: canRun
              ? "linear-gradient(105deg, #92400e 0%, #d97706 35%, #fcd34d 50%, #d97706 65%, #92400e 100%)"
              : "rgba(255,255,255,0.06)",
            backgroundSize: "200% auto",
            color: canRun ? "#3b1a00" : "rgba(255,255,255,0.22)",
            ...fonts.displayBold,
            fontSize: "1.1rem",
            letterSpacing: "0.04em",
            boxShadow: canRun ? "0 4px 24px rgba(217,119,6,0.32)" : "none",
            transition: "opacity 0.2s ease",
            opacity: calculating ? 0.7 : 1,
          }}
        >
          {calculating
            ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                <Loader2 className="h-4 w-4 animate-spin" style={{ display: "inline" }} /> Calculating…
              </span>
            : "See how they align"}
        </button>
      </div>

      {/* Past readings */}
      {checks.length > 0 && (
        <section className="space-y-3">
          <h2 style={{ ...fonts.display, fontSize: "1.1rem", color: "rgba(255,255,255,0.38)", letterSpacing: "0.08em" }}>
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
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "16px",
                    padding: "14px 18px",
                  }}
                    className={interactive.listRow}
                  >
                    <ScoreRing score={c.score} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ ...fonts.display, fontSize: "1.1rem", color: "rgba(255,255,255,0.85)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p1?.name ?? "—"}{" "}
                        <span style={{ color: "rgba(255,255,255,0.22)", fontStyle: "italic" }}>&amp;</span>{" "}
                        {p2?.name ?? "—"}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)", marginTop: "3px" }}>
                        {new Date(c.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ ...fonts.display, fontSize: "1.5rem", fontWeight: 700, color: isGood ? "#86efac" : "#fbbf24" }}>
                        {c.score}/36
                      </div>
                      <div style={{ fontSize: "0.62rem", color: "rgba(255,255,255,0.28)", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: "1px" }}>
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
    </div>
  );
}
