"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/db";
import { NatalChartGrid } from "@/components/unified/NatalChartGrid";
import type { Planet, SignName } from "@/components/unified/types";
import { formatName, formatPlace } from "@/lib/display";
import { toast } from "@/components/ui/Toast";
import {
  ProfileFormFields,
  emptyProfileFormState,
  type ProfileFormState,
} from "@/components/profile/ProfileFormFields";

// ── Inline forms (edit + create share the same fields) ─────────────────────

function InlineEditForm({ profile, onCancel }: { profile: Profile; onCancel: () => void }) {
  const [form, setForm] = useState<ProfileFormState>({
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
      toast("Profile saved", "success");
      // Full reload so the chart re-fetches against the new birth data.
      window.location.href = `/dashboard?profile=${profile.id}`;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      setError(msg);
      toast(msg, "error");
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3 text-xs">
      <ProfileFormFields form={form} onChange={handleChange} />
      {error && <p className="text-xs" style={{ color: "var(--color-danger)" }}>{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 h-8 rounded-md bg-[var(--color-accent)] text-[var(--color-button-fg)] text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
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

export function InlineCreateForm({ onCancel }: { onCancel?: () => void }) {
  const router = useRouter();
  const [form, setForm] = useState<ProfileFormState>(emptyProfileFormState());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Error ${res.status}`);
      toast(`Created ${data?.name ? formatName(data.name) : "profile"}`, "success");
      // ?new=1 triggers the celestial loading screen + parallel prefetch.
      router.push(`/dashboard?profile=${data.id}&new=1`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      setError(msg);
      toast(msg, "error");
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-3 text-xs">
      <ProfileFormFields form={form} onChange={handleChange} />
      {error && <p className="text-xs" style={{ color: "var(--color-danger)" }}>{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 h-8 rounded-md bg-[var(--color-accent)] text-[var(--color-button-fg)] text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {saving ? "Creating…" : "Create profile"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-8 rounded-md border border-[var(--color-border)] text-xs text-muted-foreground hover:text-[var(--color-ink-1)] transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

// ── Main sidebar ─────────────────────────────────────────────────────────────

interface ProfileSidebarProps {
  profile: Profile;
  chartOutput: Record<string, unknown> | null;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  mobileEditMode?: boolean;
}

export function ProfileSidebar({ profile, chartOutput, mobileOpen = false, onMobileClose, mobileEditMode = false }: ProfileSidebarProps) {
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (mobileOpen) setIsEditing(mobileEditMode);
  }, [mobileOpen, mobileEditMode]);

  const handleDelete = async () => {
    if (!window.confirm(`Delete ${formatName(profile.name)}? This cannot be undone.`)) return;
    const res = await fetch(`/api/profiles/${profile.id}`, { method: "DELETE" });
    if (res.ok) {
      toast(`${formatName(profile.name)} deleted`, "success");
      window.location.href = "/dashboard";
    } else {
      toast("Couldn't delete profile", "error");
    }
  };

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
    <aside className={cn(
      "flex-shrink-0 flex flex-col overflow-y-auto",
      mobileOpen
        ? "fixed inset-0 z-50 bg-[var(--color-background)]"
        : "hidden md:flex w-80 border-r border-[var(--color-border)]"
    )}>
      {mobileOpen && (
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] flex-shrink-0">
          <span className="text-sm font-medium text-[var(--color-ink-1)]">Profile details</span>
          <button
            type="button"
            onClick={onMobileClose}
            className="p-2 rounded text-muted-foreground hover:text-[var(--color-ink-1)] transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="p-4 space-y-5">

        {/* Name + edit toggle */}
        <div className="ac-person-name">
          <span>{formatName(profile.name)}</span>
          <span className="ac-person-name-icons">
            <button onClick={() => setIsEditing(v => !v)} title={isEditing ? "Cancel" : "Edit profile"}>
              {isEditing ? <X style={{ width: 13, height: 13 }} /> : <Pencil style={{ width: 13, height: 13 }} />}
            </button>
            {!isEditing && (
              <button onClick={handleDelete} title="Delete profile" style={{ color: "var(--color-danger)" }}>
                <Trash2 style={{ width: 13, height: 13 }} />
              </button>
            )}
          </span>
        </div>
        {(profile.relationship || profile.gender) && (
          <div className="ac-person-meta" style={{ marginTop: -12 }}>
            {[profile.relationship, profile.gender].filter(Boolean).join(" · ")}
          </div>
        )}

        {isEditing ? (
          <InlineEditForm profile={profile} onCancel={() => setIsEditing(false)} />
        ) : (
          <>
            {/* Birth info */}
            <div className="ac-bio">
              <dl>
                <dt>DOB</dt><dd>{profile.date_of_birth} · {profile.time_of_birth}</dd>
                <dt>Born</dt><dd>{formatPlace(profile.place_of_birth)}</dd>
                {profile.current_location && (<><dt>Lives</dt><dd>{formatPlace(profile.current_location)}</dd></>)}
              </dl>
            </div>

            {/* Panchang at birth */}
            {panchangRows.length > 0 && (
              <div>
                <div className="ac-eyebrow with-rule" style={{ marginBottom: "var(--sp-3)" }}>Panchang at birth</div>
                <div className="ac-bio">
                  <dl>
                    {panchangRows.map(({ label, value }) => (
                      <React.Fragment key={label}>
                        <dt>{label}</dt><dd>{value || "—"}</dd>
                      </React.Fragment>
                    ))}
                  </dl>
                </div>
              </div>
            )}

            {/* D1 chart */}
            {planets && (
              <div className="space-y-3">
                <div className="ac-eyebrow with-rule">Birth charts</div>
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

      {/* Disclaimer */}
      <div className="mt-auto p-4 border-t border-[var(--color-border)]">
        <p className="text-[10px] text-muted-foreground/50 leading-relaxed">
          Astrological readings are for self-reflection and guidance only. They do not predict fixed outcomes. Please consult qualified experts before making important decisions.
        </p>
      </div>
    </aside>
  );
}

// ── Create-mode sidebar shell ────────────────────────────────────────────────
// Mirrors the main sidebar's chrome but renders the create form in place of
// the chart/panchang/disclaimer sections. Used when the user clicks
// "Add profile" — no active profile is required.

// IMPORTANT: this component must be visible on mobile too. The previous
// `hidden md:flex` matched the read-only ProfileSidebar (where the wide
// chart sidebar is desktop-only and the NavBar profile chips replace it
// on mobile), but the CREATE state has no mobile equivalent — hiding the
// sidebar left mobile users with "Enter the birth details in the sidebar"
// and no sidebar. Now it spans full width on mobile and the standard
// `w-80` on desktop.
export function ProfileSidebarCreate({ onCancel }: { onCancel?: () => void }) {
  return (
    <aside className="w-full md:w-80 flex-shrink-0 md:border-r border-[var(--color-border)] overflow-y-auto flex flex-col">
      <div className="p-4 space-y-4">
        <div className="ac-person-name">
          <span>New profile</span>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">
          Enter the birth details. Everything else flows from these.
        </p>
        <InlineCreateForm onCancel={onCancel} />
      </div>
    </aside>
  );
}
