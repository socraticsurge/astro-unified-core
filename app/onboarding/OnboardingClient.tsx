"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"

const STEPS = ["About", "Birthday", "Birth Time", "Birthplace"] as const
type Step = 0 | 1 | 2 | 3

const RELATIONSHIPS = ["Self", "Spouse", "Child", "Father", "Mother", "Sibling", "Friend", "Other"]
const GENDERS = ["Male", "Female"]

function todayIsoDate() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function safeJson(text: string): { id?: string; error?: string } | null {
  try { return JSON.parse(text) } catch { return null }
}

// ── Cosmic orbital (reused from ProfileLoadingScreen) ─────────────────────────
function CosmicOrbital({ size = 56 }: { size?: number }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-full border border-[var(--color-accent)]/15" />
      <div className="absolute rounded-full border border-[var(--color-accent)]/20" style={{ inset: size * 0.14 }} />
      <div
        className="w-2 h-2 rounded-full bg-[var(--color-accent)] opacity-80"
        style={{ boxShadow: "0 0 12px 3px var(--color-accent)" }}
      />
      <div className="absolute inset-0 flex items-center justify-center" style={{ animation: "ob-orbit1 2.4s linear infinite" }}>
        <div
          className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-dim)]"
          style={{ transform: `translateY(-${size * 0.41}px)`, boxShadow: "0 0 5px 1px var(--color-accent-dim)" }}
        />
      </div>
      <div className="absolute inset-0 flex items-center justify-center" style={{ animation: "ob-orbit2 3.8s linear infinite", animationDelay: "-1.4s" }}>
        <div
          className="w-1 h-1 rounded-full bg-[var(--color-cool)] opacity-70"
          style={{ transform: `translateY(-${size * 0.5}px)` }}
        />
      </div>
      <style>{`
        @keyframes ob-orbit1 { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes ob-orbit2 { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ step }: { step: Step }) {
  return (
    <div className="w-full max-w-sm mx-auto space-y-2">
      <div className="flex justify-between text-[10px] text-muted-foreground font-medium tracking-wide uppercase">
        {STEPS.map((label, i) => (
          <span key={label} style={{ opacity: i <= step ? 1 : 0.4 }}>{label}</span>
        ))}
      </div>
      <div className="h-0.5 bg-[var(--color-border)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--color-accent)] rounded-full transition-all duration-500 ease-out"
          style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
        />
      </div>
    </div>
  )
}

// ── Field wrapper ─────────────────────────────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-[var(--color-ink-1)]">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

const inputCls = "w-full h-11 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-ink-1)] placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/40 transition-shadow"
const selectCls = inputCls + " appearance-none cursor-pointer"

// ── Step panels ───────────────────────────────────────────────────────────────
function StepAbout({
  form, onChange,
}: {
  form: FormState
  onChange: (k: keyof FormState, v: string) => void
}) {
  return (
    <div className="space-y-4">
      <Field label="Name">
        <input
          className={inputCls}
          type="text"
          value={form.name}
          onChange={e => onChange("name", e.target.value)}
          placeholder="Full name"
          autoFocus
          required
        />
      </Field>
      <Field label="Relationship to you">
        <select className={selectCls} value={form.relationship} onChange={e => onChange("relationship", e.target.value)} required>
          <option value="" disabled>Select…</option>
          {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </Field>
      <Field label="Gender">
        <select className={selectCls} value={form.gender} onChange={e => onChange("gender", e.target.value)} required>
          <option value="" disabled>Select…</option>
          {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </Field>
    </div>
  )
}

function StepDate({ form, onChange }: { form: FormState; onChange: (k: keyof FormState, v: string) => void }) {
  return (
    <div className="space-y-4">
      <Field label="Date of birth">
        <input
          className={inputCls}
          type="date"
          value={form.date_of_birth}
          onChange={e => onChange("date_of_birth", e.target.value)}
          max={todayIsoDate()}
          required
          autoFocus
        />
      </Field>
    </div>
  )
}

function StepTime({ form, onChange }: { form: FormState; onChange: (k: keyof FormState, v: string) => void }) {
  return (
    <div className="space-y-4">
      <Field
        label="Time of birth"
        hint="Check your birth certificate or ask a family member. Even an approximate time helps — we default to noon if you're unsure."
      >
        <input
          className={inputCls}
          type="time"
          value={form.time_of_birth}
          onChange={e => onChange("time_of_birth", e.target.value)}
          required
          autoFocus
        />
      </Field>
    </div>
  )
}

function StepPlace({ form, onChange }: { form: FormState; onChange: (k: keyof FormState, v: string) => void }) {
  return (
    <div className="space-y-4">
      <Field label="Place of birth" hint="City, state or country is fine.">
        <input
          className={inputCls}
          type="text"
          value={form.place_of_birth}
          onChange={e => onChange("place_of_birth", e.target.value)}
          placeholder="e.g. Mumbai, India"
          required
          autoFocus
        />
      </Field>
      <Field label="Current location" hint="Used for transit readings. Leave blank to use birthplace.">
        <input
          className={inputCls}
          type="text"
          value={form.current_location}
          onChange={e => onChange("current_location", e.target.value)}
          placeholder="e.g. Bengaluru, India"
        />
      </Field>
    </div>
  )
}

// ── Form state ────────────────────────────────────────────────────────────────
type FormState = {
  name: string
  relationship: string
  gender: string
  date_of_birth: string
  time_of_birth: string
  place_of_birth: string
  current_location: string
}

function stepValid(step: Step, form: FormState): boolean {
  if (step === 0) return !!form.name.trim() && !!form.relationship && !!form.gender
  if (step === 1) return !!form.date_of_birth
  if (step === 2) return !!form.time_of_birth
  if (step === 3) return !!form.place_of_birth.trim()
  return false
}

// ── Main component ────────────────────────────────────────────────────────────
export function OnboardingClient({ googleName }: { googleName: string }) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(0)
  const [dir, setDir] = useState<1 | -1>(1) // 1 = forward, -1 = back
  const [animKey, setAnimKey] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState<FormState>({
    name: googleName,
    relationship: "",
    gender: "",
    date_of_birth: "",
    time_of_birth: "12:00",
    place_of_birth: "",
    current_location: "",
  })

  const onChange = (k: keyof FormState, v: string) => setForm(f => ({ ...f, [k]: v }))

  function navigate(nextStep: Step, direction: 1 | -1) {
    setDir(direction)
    setAnimKey(k => k + 1)
    setStep(nextStep)
  }

  function handleBack() {
    if (step > 0) navigate((step - 1) as Step, -1)
  }

  async function handleNext() {
    if (!stepValid(step, form)) return
    if (step < 3) {
      navigate((step + 1) as Step, 1)
      return
    }
    // Final step — submit
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          relationship: form.relationship,
          gender: form.gender,
          date_of_birth: form.date_of_birth,
          time_of_birth: form.time_of_birth,
          place_of_birth: form.place_of_birth.trim(),
          current_location: form.current_location.trim() || form.place_of_birth.trim(),
        }),
      })
      const text = await res.text()
      const data = text ? safeJson(text) : null
      if (!res.ok) throw new Error(data?.error ?? `Failed (${res.status})`)
      if (!data?.id) throw new Error("Unexpected server response")
      router.push(`/dashboard?profile=${data.id}&new=1`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
      setSubmitting(false)
    }
  }

  const headings: Record<Step, { title: string; subtitle: string }> = {
    0: { title: "Who is this chart for?", subtitle: "Start with the basics." },
    1: { title: "When were they born?", subtitle: "The date shapes the dasha cycle." },
    2: { title: "What time were they born?", subtitle: "The hour reveals the Ascendant." },
    3: { title: "Where were they born?", subtitle: "Place anchors the chart to the sky." },
  }

  const { title, subtitle } = headings[step]
  const canProceed = stepValid(step, form)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-background">
      {/* Header */}
      <div className="mb-10 flex flex-col items-center gap-4">
        <CosmicOrbital size={56} />
        <div className="text-center">
          <p className="text-xs tracking-widest uppercase text-muted-foreground font-medium mb-1">Astro Chaganti</p>
          <h1 className="font-heading text-2xl font-medium text-[var(--color-ink-1)]">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm">
        {/* Progress */}
        <div className="mb-6">
          <ProgressBar step={step} />
        </div>

        {/* Step content — slide animation */}
        <div className="overflow-hidden">
          <div
            key={animKey}
            style={{
              animation: `ob-slide-${dir > 0 ? "in-right" : "in-left"} 0.28s cubic-bezier(0.4,0,0.2,1) both`,
            }}
          >
            {step === 0 && <StepAbout form={form} onChange={onChange} />}
            {step === 1 && <StepDate form={form} onChange={onChange} />}
            {step === 2 && <StepTime form={form} onChange={onChange} />}
            {step === 3 && <StepPlace form={form} onChange={onChange} />}
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="mt-3 text-xs text-destructive">{error}</p>
        )}

        {/* Navigation */}
        <div className="mt-6 flex items-center gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={handleBack}
              disabled={submitting}
              className="h-11 px-4 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-ink-2)] hover:bg-[var(--color-surface-hover)] transition-colors disabled:opacity-40"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed || submitting}
            className="flex-1 h-11 rounded-lg bg-[var(--color-accent)] text-[var(--color-button-fg)] text-sm font-medium transition-opacity disabled:opacity-40 hover:opacity-90"
          >
            {submitting ? "Creating chart…" : step === 3 ? "Create my chart" : "Continue"}
          </button>
        </div>

        {/* Step counter */}
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Step {step + 1} of {STEPS.length}
        </p>
      </div>

      <style>{`
        @keyframes ob-slide-in-right {
          from { opacity: 0; transform: translateX(24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes ob-slide-in-left {
          from { opacity: 0; transform: translateX(-24px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
