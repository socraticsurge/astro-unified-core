"use client"

import { useState, type ChangeEvent, type FormEvent } from "react"
import type { Profile } from "@/lib/db"
import { ProfileFormFields, type ProfileFormState } from "@/components/profile/ProfileFormFields"
import { toast } from "@/components/ui/Toast"

interface ProfileEditFormProps {
  profile: Profile
  onCancel: () => void
}

export function ProfileEditForm({ profile, onCancel }: ProfileEditFormProps) {
  const [form, setForm] = useState<ProfileFormState>({
    name: profile.name,
    date_of_birth: profile.date_of_birth,
    time_of_birth: profile.time_of_birth,
    place_of_birth: profile.place_of_birth,
    current_location: profile.current_location ?? "",
    gender: profile.gender ?? "",
    relationship: profile.relationship ?? "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(current => ({ ...current, [event.target.name]: event.target.value }))
  }

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(`/api/profiles/${profile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error((data as { error?: string })?.error ?? `Error ${response.status}`)
      }
      toast("Profile saved", "success")
      window.location.href = `/dashboard?profile=${profile.id}`
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Save failed"
      setError(message)
      toast(message, "error")
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-3 text-xs" aria-label="Edit profile">
      <ProfileFormFields form={form} onChange={handleChange} />
      {error && (
        <p className="text-xs" style={{ color: "var(--color-danger)" }} role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 h-8 rounded-md bg-[var(--color-accent)] text-[var(--color-button-fg)] text-xs font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-8 rounded-md border border-[var(--color-border)] text-xs text-muted-foreground hover:text-[var(--color-ink-1)] transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
