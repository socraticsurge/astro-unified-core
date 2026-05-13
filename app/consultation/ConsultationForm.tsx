"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LIFE_AREAS, LIFE_AREA_EXAMPLES, MIN_FIELD_LENGTH, assembleStatement } from "@/lib/consultation";
import type { ConsultationRequest, Profile } from "@/lib/db";
import type { LifeArea, DeliveryMode } from "@/lib/consultation";

type Props = {
  pending: ConsultationRequest | null;
  profiles: Profile[];
  liveConsultationEnabled: boolean;
};

export function ConsultationForm({ pending, profiles, liveConsultationEnabled }: Props) {
  const router = useRouter();
  const [selectedArea, setSelectedArea] = useState<LifeArea | null>(null);
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [observation, setObservation] = useState("");
  const [constraint, setConstraint] = useState("");
  const [objective, setObjective] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("written");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (pending) {
    return <PendingCard pending={pending} />;
  }

  const examples = selectedArea ? LIFE_AREA_EXAMPLES[selectedArea] : null;
  const assembled = assembleStatement(observation, constraint, objective);
  const canSubmit =
    selectedArea &&
    selectedProfiles.length > 0 &&
    observation.trim().length >= MIN_FIELD_LENGTH &&
    constraint.trim().length >= MIN_FIELD_LENGTH &&
    objective.trim().length >= MIN_FIELD_LENGTH;

  const toggleProfile = (id: string) => {
    setSelectedProfiles(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (!canSubmit || !selectedArea) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/consultation-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_ids: selectedProfiles,
          life_area: selectedArea,
          observation: observation.trim(),
          constraint_text: constraint.trim(),
          objective: objective.trim(),
          delivery_mode: deliveryMode,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Submission failed");
        return;
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Step 1: Select life area */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          1. Choose a life area
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {LIFE_AREAS.map(area => (
            <button
              key={area}
              onClick={() => setSelectedArea(area)}
              className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                selectedArea === area
                  ? "border-amber-400/60 bg-amber-400/10 text-amber-300"
                  : "border-white/10 bg-white/5 text-foreground/70 hover:bg-white/10 hover:text-foreground"
              }`}
            >
              {area}
            </button>
          ))}
        </div>
      </section>

      {/* Step 2: Select profiles */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          2. Select profile(s) this is about
        </h2>
        {profiles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You have no profiles yet. <a href="/dashboard" className="underline text-amber-400">Create one first.</a>
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {profiles.map(p => (
              <button
                key={p.id}
                onClick={() => toggleProfile(p.id)}
                className={`px-3 py-1.5 rounded-full border text-sm transition-colors ${
                  selectedProfiles.includes(p.id)
                    ? "border-amber-400/60 bg-amber-400/10 text-amber-300"
                    : "border-white/10 bg-white/5 text-foreground/70 hover:bg-white/10 hover:text-foreground"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Step 3: Life Problem Statement */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          3. Describe your situation
        </h2>
        <p className="text-xs text-muted-foreground">
          Structure your question as three parts. Be specific — the more precise your input, the more targeted the answer.
        </p>

        <div className="space-y-4">
          <FieldBlock
            label="What is happening (Observation)"
            hint="Describe the current situation factually."
            placeholder={examples?.observation ?? "e.g. I have been passed over for promotion twice despite strong performance reviews"}
            value={observation}
            onChange={setObservation}
          />
          <FieldBlock
            label="What is blocking you (Constraint)"
            hint="Identify the main obstacle or uncertainty."
            placeholder={examples?.constraint ?? "e.g. I cannot tell if this is a timing issue, the wrong company, or the wrong field entirely"}
            value={constraint}
            onChange={setConstraint}
          />
          <FieldBlock
            label="What success looks like (Objective)"
            hint="State clearly what you want to understand or decide."
            placeholder={examples?.objective ?? "e.g. I want to know whether to persist here or make a lateral move before year-end"}
            value={objective}
            onChange={setObjective}
          />
        </div>
      </section>

      {/* Live preview */}
      {assembled.length > 10 && (
        <section className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-1">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Preview — your question as submitted</p>
          <p className="text-sm text-foreground/80 leading-relaxed">{assembled}</p>
        </section>
      )}

      {/* Step 4: Delivery mode */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          4. How would you like your answer?
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <DeliveryCard
            mode="written"
            selected={deliveryMode === "written"}
            onClick={() => setDeliveryMode("written")}
            title="Written Answer"
            description="Receive a detailed written response, typically within a few days."
          />
          {liveConsultationEnabled && (
            <DeliveryCard
              mode="appointment"
              selected={deliveryMode === "appointment"}
              onClick={() => setDeliveryMode("appointment")}
              title="Live Consultation"
              description="Book a live appointment to discuss in person."
            />
          )}
        </div>
      </section>

      {error && (
        <p className="text-sm text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg px-4 py-3">{error}</p>
      )}

      <Button
        onClick={handleSubmit}
        disabled={!canSubmit || submitting}
        className="w-full sm:w-auto"
      >
        {submitting ? "Submitting…" : "Submit Question"}
        {!submitting && <ChevronRight className="ml-1.5 h-4 w-4" />}
      </Button>
    </div>
  );
}

function FieldBlock({
  label,
  hint,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const ok = value.trim().length >= MIN_FIELD_LENGTH;
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-sm font-medium">{label}</label>
        <span className={`text-xs ${ok ? "text-green-400" : "text-muted-foreground"}`}>
          {value.trim().length}/{MIN_FIELD_LENGTH}+ chars
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <textarea
        rows={3}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-amber-400/50 resize-none"
      />
    </div>
  );
}

function DeliveryCard({
  mode,
  selected,
  onClick,
  title,
  description,
}: {
  mode: DeliveryMode;
  selected: boolean;
  onClick: () => void;
  title: string;
  description: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 text-left rounded-lg border p-4 transition-colors ${
        selected
          ? "border-amber-400/60 bg-amber-400/10"
          : "border-white/10 bg-white/5 hover:bg-white/10"
      }`}
    >
      <div className={`text-sm font-semibold ${selected ? "text-amber-300" : "text-foreground"}`}>{title}</div>
      <div className="text-xs text-muted-foreground mt-1">{description}</div>
    </button>
  );
}

function PendingCard({ pending }: { pending: ConsultationRequest }) {
  return (
    <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-6 space-y-4">
      <div className="flex items-center gap-2 text-amber-400">
        <Clock className="h-5 w-5" />
        <span className="font-semibold">Your question is pending</span>
      </div>
      <p className="text-sm text-muted-foreground">
        Your question has been received. You will be notified when it is answered.
        Once answered, you can submit your next question.
      </p>
      <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4 text-sm">
        <div>
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Life Area</span>
          <p className="mt-0.5 font-medium">{pending.life_area}</p>
        </div>
        <div>
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Your Question</span>
          <p className="mt-0.5 text-foreground/80 leading-relaxed">
            {assembleStatement(pending.observation, pending.constraint_text, pending.objective)}
          </p>
        </div>
        <div>
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Delivery Mode</span>
          <p className="mt-0.5 capitalize">{pending.delivery_mode === "written" ? "Written Answer" : "Live Consultation"}</p>
        </div>
        <div>
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Submitted</span>
          <p className="mt-0.5 text-muted-foreground text-xs">
            {new Date(pending.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
          </p>
        </div>
      </div>

      {pending.admin_note && (
        <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4 space-y-1">
          <div className="flex items-center gap-1.5 text-green-400 text-sm font-semibold">
            <CheckCircle2 className="h-4 w-4" /> Answer
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed">{pending.admin_note}</p>
        </div>
      )}
    </div>
  );
}
