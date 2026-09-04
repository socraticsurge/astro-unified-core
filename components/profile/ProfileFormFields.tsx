"use client";
import React from "react";
import { PlaceLookupNotice } from "@/components/profile/PlaceLookupNotice";

// Shared field set used by both the inline-sidebar create form and the
// inline-sidebar edit form. The full-screen ProfileForm at /profiles/new also
// uses these fields. Centralizing the input shape here means a change to the
// schema (e.g. adding a relationship option) lands in one place.

const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] px-2.5 py-1.5 text-xs text-[var(--color-ink-1)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]";
const INPUT_CLASS =
  "flex h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] px-2.5 py-1.5 text-xs text-[var(--color-ink-1)] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]";
const LABEL_CLASS = "text-[10px] uppercase tracking-wider text-muted-foreground";

export const RELATIONSHIPS = ["Self", "Spouse", "Child", "Father", "Mother", "Sibling", "Friend", "Other"] as const;
export const GENDERS = ["Male", "Female"] as const;

export type ProfileFormState = {
  name: string;
  date_of_birth: string;
  time_of_birth: string;
  place_of_birth: string;
  current_location: string;
  gender: string;
  relationship: string;
};

export function emptyProfileFormState(): ProfileFormState {
  return {
    name: "",
    date_of_birth: "",
    time_of_birth: "",
    place_of_birth: "",
    current_location: "",
    gender: "",
    relationship: "",
  };
}

interface Props {
  form: ProfileFormState;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

// Today's date in YYYY-MM-DD as the `max` attribute on the DOB input.
// Computed at render time — fine for a low-traffic form. (A profile created
// at 23:59 with a midnight clock-flip is a non-issue.)
function todayIsoDate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function ProfileFormFields({ form, onChange }: Props) {
  const today = todayIsoDate();
  return (
    <>
      <div className="space-y-1">
        <label className={LABEL_CLASS}>Full name</label>
        <input name="name" value={form.name} onChange={onChange} className={INPUT_CLASS} required maxLength={100} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className={LABEL_CLASS}>Relationship</label>
          <select name="relationship" value={form.relationship} onChange={onChange} className={SELECT_CLASS} required>
            <option value="">—</option>
            {RELATIONSHIPS.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className={LABEL_CLASS}>Gender</label>
          <select name="gender" value={form.gender} onChange={onChange} className={SELECT_CLASS} required>
            <option value="">—</option>
            {GENDERS.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <label className={LABEL_CLASS}>Date of birth</label>
        <input type="date" name="date_of_birth" value={form.date_of_birth} onChange={onChange} max={today} className={INPUT_CLASS} required />
      </div>
      <div className="space-y-1">
        <label className={LABEL_CLASS}>Time of birth</label>
        <input type="time" name="time_of_birth" value={form.time_of_birth} onChange={onChange} className={INPUT_CLASS} required />
      </div>
      <div className="space-y-1">
        <label className={LABEL_CLASS}>Place of birth</label>
        <input
          name="place_of_birth"
          value={form.place_of_birth}
          onChange={onChange}
          className={INPUT_CLASS}
          required
          maxLength={100}
          placeholder="e.g. Erode, Tamil Nadu, India"
        />
      </div>
      <div className="space-y-1">
        <label className={LABEL_CLASS}>Current location</label>
        <input
          name="current_location"
          value={form.current_location}
          onChange={onChange}
          className={INPUT_CLASS}
          maxLength={100}
          placeholder="City, Country"
        />
      </div>
      <PlaceLookupNotice />
    </>
  );
}
