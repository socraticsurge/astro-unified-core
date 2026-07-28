"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, X } from "lucide-react";
import type { Profile } from "@/lib/db";
import { formatName } from "@/lib/display";
import { toast } from "@/components/ui/Toast";
import {
  ProfileFormFields,
  emptyProfileFormState,
  type ProfileFormState,
} from "@/components/profile/ProfileFormFields";
import { ProfileEditForm } from "@/components/profile/ProfileEditForm";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import styles from "./ProfileSidebar.module.css";

// ── Inline forms (edit + create share the same fields) ─────────────────────

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
  open: boolean;
  onClose: () => void;
}

export function ProfileSidebar({
  profile,
  open,
  onClose,
}: ProfileSidebarProps) {
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

  return (
    <Sheet open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <SheetContent
        side="left"
        showCloseButton={false}
        overlayClassName={styles.backdrop}
        className={styles.drawer}
        aria-labelledby="profile-details-title"
      >
        <div className={styles.header}>
          <div>
            <p className={styles.headerEyebrow}>Profile</p>
            <SheetTitle id="profile-details-title" className={styles.headerTitle}>
              Edit profile
            </SheetTitle>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={styles.closeButton}
            aria-label="Close"
            autoFocus
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className={`${styles.body} space-y-5`}>

        <div className={styles.profileHeading}>
          <div>
            <p className={styles.profileName}>{formatName(profile.name)}</p>
            {(profile.relationship || profile.gender) && (
              <p className={styles.profileMeta}>
                {[profile.relationship, profile.gender].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
          <Pencil className="h-4 w-4 text-[var(--color-accent)]" aria-hidden="true" />
        </div>

        <ProfileEditForm profile={profile} onCancel={onClose} />

        <div className={styles.dangerZone}>
          <button type="button" onClick={handleDelete} className={styles.deleteButton}>
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Delete profile
          </button>
        </div>

        </div>

        <div className={styles.footer}>
          <p>
          Astrological readings are for self-reflection and guidance only. They do not predict fixed outcomes. Please consult qualified experts before making important decisions.
          </p>
        </div>
      </SheetContent>
    </Sheet>
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
