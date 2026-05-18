"use client";
import { useState } from "react";
import type { Profile } from "@/lib/db";
import { NatalChartGrid } from "@/components/unified/NatalChartGrid";
import type { Planet, SignName } from "@/components/unified/types";

// ── Inline edit form ────────────────────────────────────────────────────────

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] px-2.5 py-1.5 text-xs text-[var(--color-ink-1)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]";
const INPUT_CLASS =
  "flex h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] px-2.5 py-1.5 text-xs text-[var(--color-ink-1)] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]";
const LABEL_CLASS = "text-[9px] uppercase tracking-wider text-muted-foreground";

function InlineEditForm({ profile, onCancel }: { profile: Profile; onCancel: () => void }) {
  const [form, setForm] = useState({
    name:             profile.name,
    date_of_birth:    profile.date_of_birth,
    time_of_birth:    profile.time_of_birth,
    place_of_birth:   profile.place_of_birth,
    current_location: profile.current_location ?? "",
    gender:           profile.gender ?? "",
    relationship:     profile.relationship ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/profiles/${profile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Error ${res.status}`);
      window.location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 text-xs">
      <div className="space-y-1">
        <label className={LABEL_CLASS}>Full name</label>
        <input name="name" value={form.name} onChange={handleChange} className={INPUT_CLASS} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className={LABEL_CLASS}>Relationship</label>
          <select name="relationship" value={form.relationship} onChange={handleChange} className={SELECT_CLASS}>
            <option value="">—</option>
            {["Self","Spouse","Child","Father","Mother","Sibling","Friend","Other"].map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className={LABEL_CLASS}>Gender</label>
          <select name="gender" value={form.gender} onChange={handleChange} className={SELECT_CLASS}>
            <option value="">—</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <label className={LABEL_CLASS}>Date of birth</label>
        <input type="date" name="date_of_birth" value={form.date_of_birth} onChange={handleChange} className={INPUT_CLASS} />
      </div>
      <div className="space-y-1">
        <label className={LABEL_CLASS}>Time of birth</label>
        <input type="time" name="time_of_birth" value={form.time_of_birth} onChange={handleChange} className={INPUT_CLASS} />
      </div>
      <div className="space-y-1">
        <label className={LABEL_CLASS}>Place of birth</label>
        <input name="place_of_birth" value={form.place_of_birth} onChange={handleChange} className={INPUT_CLASS} />
      </div>
      <div className="space-y-1">
        <label className={LABEL_CLASS}>Current location</label>
        <input name="current_location" value={form.current_location} onChange={handleChange} className={INPUT_CLASS} placeholder="City, Country" />
      </div>
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 h-8 rounded-md bg-[var(--color-accent)] text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 h-8 rounded-md border border-[var(--color-border)] text-xs text-muted-foreground hover:text-[var(--color-ink-1)] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Main sidebar ─────────────────────────────────────────────────────────────

interface ProfileSidebarProps {
  profile: Profile;
  chartOutput: Record<string, unknown> | null;
}

export function ProfileSidebar({ profile, chartOutput }: ProfileSidebarProps) {
  const [isEditing, setIsEditing] = useState(false);

  const data     = chartOutput?.data as Record<string, unknown> | undefined;
  const panchang = data?.panchang as {
    tithi?:     { name?: string; paksha?: string };
    vara?:      { name?: string };
    nakshatra?: { name?: string; pada?: number };
    yoga?:      { name?: string };
    karana?:    string;
  } | undefined;
  const lagna   = data?.lagna   as Record<string, unknown> | undefined;
  const planets = data?.planets as Record<string, Planet>  | undefined;

  const lagnaSign   = lagna?.sign    as SignName | undefined;
  const lagnaD9Sign = lagna?.d9_sign as SignName | undefined;

  const panchangRows = panchang
    ? [
        { label: "Tithi",     value: `${panchang.tithi?.name ?? ""}${panchang.tithi?.paksha ? ` · ${panchang.tithi.paksha}` : ""}` },
        { label: "Vara",      value: panchang.vara?.name ?? "" },
        { label: "Nakshatra", value: `${panchang.nakshatra?.name ?? ""} P${panchang.nakshatra?.pada ?? ""}` },
        { label: "Yoga",      value: panchang.yoga?.name ?? "" },
        { label: "Karana",    value: panchang.karana ?? "" },
      ]
    : [];

  return (
    <aside className="w-80 flex-shrink-0 border-r border-[var(--color-border)] overflow-y-auto hidden md:flex flex-col">
      <div className="p-4 space-y-5">

        {/* Name + edit toggle */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-ink-1)] leading-tight">
              {profile.name}
            </h2>
            {(profile.relationship || profile.gender) && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {[profile.relationship, profile.gender].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <button
            onClick={() => setIsEditing(v => !v)}
            className="shrink-0 text-xs text-muted-foreground hover:text-[var(--color-ink-1)] transition-colors"
          >
            {isEditing ? "×" : "Edit"}
          </button>
        </div>

        {isEditing ? (
          <InlineEditForm profile={profile} onCancel={() => setIsEditing(false)} />
        ) : (
          <>
            {/* Birth info */}
            <div className="space-y-1 text-xs">
              <div className="flex gap-2">
                <span className="text-muted-foreground w-14 shrink-0">DOB</span>
                <span className="text-[var(--color-ink-2)]">{profile.date_of_birth} · {profile.time_of_birth}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground w-14 shrink-0">Born</span>
                <span className="text-[var(--color-ink-2)] leading-tight">{profile.place_of_birth}</span>
              </div>
              {profile.current_location && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-14 shrink-0">Lives</span>
                  <span className="text-[var(--color-ink-2)] leading-tight">{profile.current_location}</span>
                </div>
              )}
            </div>

            {/* Panchang at birth */}
            {panchangRows.length > 0 && (
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Panchang at Birth
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                  {panchangRows.map(({ label, value }) => (
                    <div key={label} className="flex flex-col">
                      <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold leading-none mb-0.5">{label}</span>
                      <span className="text-[11px] font-semibold text-[var(--color-ink-1)] leading-tight">{value || "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* D1 chart */}
            {planets && (
              <div className="space-y-3">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                  Birth Charts
                </p>
                <NatalChartGrid
                  planets={planets}
                  lagnaSign={lagnaSign}
                  signKey="sign"
                  label="D1 — Rasi"
                />
                <NatalChartGrid
                  planets={planets}
                  lagnaSign={lagnaD9Sign}
                  signKey="d9_sign"
                  label="D9 — Navamsa"
                />
              </div>
            )}
          </>
        )}

      </div>
    </aside>
  );
}
