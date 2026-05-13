"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, ChevronRight, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, AlertCircle } from "lucide-react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import {
  LIFE_AREAS, LIFE_AREA_EXAMPLES, OPTIONS_GENERIC_PLACEHOLDER,
  MIN_FIELD_LENGTH, assembleStatement,
  WRITTEN_FEE_PAISE, LIVE_FEE_PAISE, formatFee,
} from "@/lib/consultation";
import type { ConsultationRequest, Profile, ConsultationSlot } from "@/lib/db";
import type { LifeArea, DeliveryMode } from "@/lib/consultation";

const UPI_ID = "meherkalyanichaganti@okaxis";
const WHATSAPP_NUMBER = "919704076544";

type Props = {
  allRequests: ConsultationRequest[];
  profiles: Profile[];
  liveConsultationEnabled: boolean;
  writtenFeePaise: number;
  liveFeePaise: number;
  availableSlots: ConsultationSlot[];
  userName: string;
  userEmail: string;
};

function isProfileComplete(p: Profile): boolean {
  return !!(p.gender && p.relationship && p.current_location && p.current_latitude != null && p.current_longitude != null);
}

export function ConsultationForm({ allRequests, profiles, liveConsultationEnabled, writtenFeePaise, liveFeePaise, availableSlots, userName, userEmail }: Props) {
  const router = useRouter();
  const [selectedArea, setSelectedArea] = useState<LifeArea | null>(null);
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [observation, setObservation] = useState("");
  const [constraint, setConstraint] = useState("");
  const [objective, setObjective] = useState("");
  const [options, setOptions] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("written");
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Any non-answered request blocks a new submission
  const activeRequest = allRequests.find(r => r.status !== "answered") ?? null;
  const answered = allRequests.filter(r => r.status === "answered");

  const profileMap = new Map(profiles.map(p => [p.id, p.name]));

  function resolveProfileNames(profileIdsJson: string): string {
    try {
      const ids: string[] = JSON.parse(profileIdsJson);
      return ids.map(id => profileMap.get(id) ?? "Deleted Profile").join(", ");
    } catch {
      return "—";
    }
  }

  const completeProfiles = profiles.filter(isProfileComplete);
  const incompleteProfiles = profiles.filter(p => !isProfileComplete(p));

  const examples = selectedArea ? LIFE_AREA_EXAMPLES[selectedArea] : null;
  const assembled = assembleStatement(observation, constraint, objective, options);
  const canSubmit =
    selectedArea &&
    selectedProfiles.length > 0 &&
    observation.trim().length >= MIN_FIELD_LENGTH &&
    constraint.trim().length >= MIN_FIELD_LENGTH &&
    objective.trim().length >= MIN_FIELD_LENGTH &&
    options.trim().length >= MIN_FIELD_LENGTH &&
    (deliveryMode !== "appointment" || !!selectedSlotId);

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
          options: options.trim(),
          delivery_mode: deliveryMode,
          ...(deliveryMode === "appointment" && selectedSlotId ? { slot_id: selectedSlotId } : {}),
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
    <div className="space-y-10">
      {activeRequest ? (
        <PendingCard
          pending={activeRequest}
          profileNames={resolveProfileNames(activeRequest.profile_ids)}
          userName={userName}
          userEmail={userEmail}
        />
      ) : (
        <div className="space-y-8">
          {/* Step 1: Life area */}
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

          {/* Step 2: Profiles */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              2. Select profile(s) this is about
            </h2>
            {profiles.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You have no profiles yet.{" "}
                <a href="/dashboard" className="underline text-amber-400">Create one first.</a>
              </p>
            ) : (
              <div className="space-y-2">
                {completeProfiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {completeProfiles.map(p => (
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
                {incompleteProfiles.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 text-amber-500/70" />
                      The following profiles are missing required information and cannot be selected:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {incompleteProfiles.map(p => (
                        <span
                          key={p.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/5 bg-white/3 text-sm text-muted-foreground/50"
                        >
                          {p.name}
                          <Link
                            href={`/profiles/${p.id}/edit`}
                            className="text-xs text-amber-400/70 hover:text-amber-400 underline"
                          >
                            Complete →
                          </Link>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Step 3: Life Problem Statement */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              3. Describe your situation
            </h2>
            <p className="text-xs text-muted-foreground">
              Structure your question as four parts. Be specific — the more precise your input, the more targeted the answer.
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
              <FieldBlock
                label="Options you are considering"
                hint="List the choices you are weighing. If no specific options have formed yet, describe what you are drawn to or what paths have been suggested."
                placeholder={examples?.options ?? OPTIONS_GENERIC_PLACEHOLDER}
                value={options}
                onChange={setOptions}
              />
            </div>
          </section>

          {/* Live preview */}
          {assembled.length > 10 && (
            <section className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Preview — your question as submitted
              </p>
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
                onClick={() => { setDeliveryMode("written"); setSelectedSlotId(null); }}
                title="Written Response"
                price={formatFee(writtenFeePaise)}
                description="Detailed written answer, typically within a few days."
              />
              {liveConsultationEnabled && (
                <DeliveryCard
                  mode="appointment"
                  selected={deliveryMode === "appointment"}
                  onClick={() => setDeliveryMode("appointment")}
                  title="Live Consultation"
                  price={formatFee(liveFeePaise)}
                  description="25-minute live session to discuss in person."
                />
              )}
            </div>
          </section>

          {/* Step 5: Slot picker — only for live consultation */}
          {liveConsultationEnabled && deliveryMode === "appointment" && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                5. Choose a consultation slot
              </h2>
              <p className="text-xs text-muted-foreground">All times are in IST (Indian Standard Time).</p>
              {availableSlots.length === 0 ? (
                <p className="text-sm text-muted-foreground rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  No slots are currently available. Please check back later or reach out to Kalyani on WhatsApp to arrange a time.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {availableSlots.map(slot => {
                    const label = new Date(slot.starts_at).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    });
                    return (
                      <button
                        key={slot.id}
                        onClick={() => setSelectedSlotId(slot.id)}
                        className={`text-left px-4 py-3 rounded-lg border text-sm transition-colors ${
                          selectedSlotId === slot.id
                            ? "border-amber-400/60 bg-amber-400/10 text-amber-300"
                            : "border-white/10 bg-white/5 text-foreground/70 hover:bg-white/10 hover:text-foreground"
                        }`}
                      >
                        {label} IST
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {error && (
            <p className="text-sm text-red-400 bg-red-950/30 border border-red-900/40 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          <Button onClick={handleSubmit} disabled={!canSubmit || submitting} className="w-full sm:w-auto">
            {submitting ? "Submitting…" : "Submit Question"}
            {!submitting && <ChevronRight className="ml-1.5 h-4 w-4" />}
          </Button>
        </div>
      )}

      {answered.length > 0 && (
        <HistorySection answered={answered} resolveProfileNames={resolveProfileNames} />
      )}
    </div>
  );
}

function PendingCard({
  pending,
  profileNames,
  userName,
  userEmail,
}: {
  pending: ConsultationRequest;
  profileNames: string;
  userName: string;
  userEmail: string;
}) {
  // Legacy "pending" rows pre-v6 are treated as pending_payment
  const awaitingPayment = pending.status === "pending_payment" || pending.status === "pending";
  const isPaid = pending.status === "paid";

  return (
    <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-6 space-y-4">
      <div className="flex items-center gap-2 text-amber-400">
        <Clock className="h-5 w-5" />
        <span className="font-semibold">
          {isPaid
            ? "Payment confirmed — your question is in the queue"
            : "Question submitted — payment required"}
        </span>
      </div>

      <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4 text-sm">
        <div>
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Life Area</span>
          <p className="mt-0.5 font-medium">{pending.life_area}</p>
        </div>
        <div>
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Profile(s)</span>
          <p className="mt-0.5 font-medium text-amber-300/80">{profileNames}</p>
        </div>
        <div>
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Your Question</span>
          <p className="mt-0.5 text-foreground/80 leading-relaxed">
            {assembleStatement(pending.observation, pending.constraint_text, pending.objective, pending.options)}
          </p>
        </div>
        <div>
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Delivery</span>
          <p className="mt-0.5">{pending.delivery_mode === "written" ? "Written Response" : "Live Consultation (25 min)"}</p>
        </div>
        {pending.delivery_mode === "appointment" && pending.slot_starts_at && (
          <div>
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Selected Slot</span>
            <p className="mt-0.5 font-medium text-amber-300/90">
              {new Date(pending.slot_starts_at).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              })} IST
            </p>
          </div>
        )}
        <div>
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Submitted</span>
          <p className="mt-0.5 text-muted-foreground text-xs">
            {new Date(pending.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
          </p>
        </div>
      </div>

      {awaitingPayment && (
        <PaymentInstructions
          pending={pending}
          profileNames={profileNames}
          userName={userName}
          userEmail={userEmail}
        />
      )}

      {isPaid && (
        <div className="space-y-3">
          <div className="rounded-lg border border-green-700/30 bg-green-950/20 px-4 py-3 flex items-center gap-2 text-green-400 text-sm">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            <span>
              {pending.delivery_mode === "appointment"
                ? "Payment confirmed. You will receive a Google Meet link for your slot."
                : "Payment confirmed. Dr. Chaganti will answer your question shortly."}
            </span>
          </div>
          {pending.delivery_mode === "appointment" && pending.slot_starts_at && (
            <SlotActions pending={pending} />
          )}
        </div>
      )}
    </div>
  );
}

function SlotActions({ pending }: { pending: ConsultationRequest }) {
  const ref = pending.id.substring(0, 8).toUpperCase();
  const slotLabel = pending.slot_starts_at
    ? new Date(pending.slot_starts_at).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }) + " IST"
    : "";

  const rescheduleMsg = encodeURIComponent(
    `Hi Kalyani 🙏\n\nI need to reschedule my live consultation.\n\nRef: #${ref}\nSlot: ${slotLabel}\n\nCould you please help me find an alternative slot?`
  );
  const cancelMsg = encodeURIComponent(
    `Hi Kalyani 🙏\n\nI need to cancel my live consultation.\n\nRef: #${ref}\nSlot: ${slotLabel}\n\nPlease process the cancellation and let me know next steps.`
  );

  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 space-y-2">
      <p className="text-xs text-muted-foreground">Need to change your slot? Reach out to Kalyani on WhatsApp:</p>
      <div className="flex flex-wrap gap-2">
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${rescheduleMsg}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs bg-amber-700/20 hover:bg-amber-700/30 border border-amber-700/40 text-amber-400 px-3 py-1.5 rounded-md transition-colors"
        >
          <span>💬</span> Request Reschedule
        </a>
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${cancelMsg}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md transition-colors"
        >
          <span>💬</span> Request Cancellation
        </a>
      </div>
    </div>
  );
}

function PaymentInstructions({
  pending,
  profileNames,
  userName,
  userEmail,
}: {
  pending: ConsultationRequest;
  profileNames: string;
  userName: string;
  userEmail: string;
}) {
  const [copied, setCopied] = useState(false);

  const amountPaise = pending.amount_paise ?? (pending.delivery_mode === "written" ? WRITTEN_FEE_PAISE : LIVE_FEE_PAISE);
  const amountRupees = amountPaise / 100;
  const modeLabel = pending.delivery_mode === "written" ? "Written Response" : "Live Consultation (25 min)";
  const ref = pending.id.substring(0, 8).toUpperCase();

  const upiQrValue = `upi://pay?pa=${UPI_ID}&pn=Kalyani+Chaganti&am=${amountRupees}&cu=INR&tn=Astro+Chaganti+Consultation`;

  const question = assembleStatement(pending.observation, pending.constraint_text, pending.objective, pending.options);

  const slotLine = pending.slot_starts_at
    ? `Slot: ${new Date(pending.slot_starts_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })} IST\n`
    : "";

  const waMessage = encodeURIComponent(
    `Hi Kalyani 🙏\n\nPayment pending for a consultation on Astro Chaganti.\n\n` +
    `Name: ${userName || "Not provided"}\n` +
    `Email: ${userEmail}\n` +
    `Profile(s): ${profileNames}\n` +
    `Life Area: ${pending.life_area}\n` +
    `Type: ${modeLabel}\n` +
    slotLine +
    `Amount: ₹${amountRupees.toLocaleString("en-IN")}\n` +
    `Ref: #${ref}\n\n` +
    `Question:\n${question}\n\n` +
    `Sending the payment now. Please confirm once received.`
  );

  const copyUpi = () => {
    navigator.clipboard.writeText(UPI_ID).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-amber-700/40 bg-amber-950/30 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-amber-200">Pay to confirm your question</p>
          <span className="text-lg font-bold text-amber-300">
            ₹{amountRupees.toLocaleString("en-IN")}
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start">
          {/* QR code */}
          <div className="rounded-lg bg-white p-2 flex-shrink-0">
            <QRCodeSVG value={upiQrValue} size={120} />
          </div>
          <div className="space-y-3 flex-1">
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">UPI ID</p>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono text-foreground/90 bg-white/5 px-2.5 py-1 rounded border border-white/10">
                  {UPI_ID}
                </code>
                <button
                  onClick={copyUpi}
                  className="text-xs text-amber-400 hover:text-amber-300 transition-colors px-2 py-1 border border-amber-400/20 rounded"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Scan the QR code with any UPI app (Google Pay, PhonePe, Paytm) or copy the UPI ID to pay manually. The amount is pre-filled.
            </p>
          </div>
        </div>

        <div className="border-t border-white/10 pt-3 space-y-2">
          <p className="text-xs text-muted-foreground leading-relaxed">
            After paying, send your payment screenshot to Kalyani on WhatsApp. She handles payment confirmation so Dr. Chaganti can stay focused on answering your question.
          </p>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${waMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm bg-green-700/20 hover:bg-green-700/30 border border-green-700/40 text-green-400 px-4 py-2 rounded-md transition-colors font-medium"
          >
            <span>💬</span>
            Send payment confirmation on WhatsApp
          </a>
        </div>
      </div>
      <p className="text-xs text-muted-foreground/50">
        Ref: #{ref} · {modeLabel}
      </p>
    </div>
  );
}

function HistorySection({
  answered,
  resolveProfileNames,
}: {
  answered: ConsultationRequest[];
  resolveProfileNames: (ids: string) => string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, "helpful" | "not_helpful">>(() => {
    const initial: Record<string, "helpful" | "not_helpful"> = {};
    for (const req of answered) {
      if (req.user_rating) initial[req.id] = req.user_rating;
    }
    return initial;
  });
  const [ratingNote, setRatingNote] = useState<Record<string, string>>({});
  const [showNoteFor, setShowNoteFor] = useState<string | null>(null);
  const [submittingFeedback, setSubmittingFeedback] = useState<string | null>(null);

  const submitFeedback = async (id: string, rating: "helpful" | "not_helpful") => {
    setSubmittingFeedback(id);
    try {
      await fetch(`/api/consultation-requests/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, note: ratingNote[id] ?? undefined }),
      });
      setRatings(prev => ({ ...prev, [id]: rating }));
      setShowNoteFor(null);
    } finally {
      setSubmittingFeedback(null);
    }
  };

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground border-t border-white/10 pt-6">
        Past Questions &amp; Answers
      </h2>
      <div className="space-y-2">
        {answered.map(req => {
          const isOpen = expandedId === req.id;
          const currentRating = ratings[req.id] ?? null;
          return (
            <div key={req.id} className="rounded-lg border border-white/10 bg-white/5 overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/5 transition-colors"
                onClick={() => setExpandedId(isOpen ? null : req.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="text-sm font-medium truncate block">{req.life_area}</span>
                    <span className="text-xs text-muted-foreground">
                      {resolveProfileNames(req.profile_ids)} · {new Date(req.created_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {currentRating === "helpful" && <ThumbsUp className="h-3.5 w-3.5 text-green-400" />}
                  {currentRating === "not_helpful" && <ThumbsDown className="h-3.5 w-3.5 text-red-400" />}
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 space-y-4 border-t border-white/10 pt-3">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">Your Question</span>
                    <p className="mt-1 text-sm text-foreground/80 leading-relaxed">
                      {assembleStatement(req.observation, req.constraint_text, req.objective, req.options)}
                    </p>
                  </div>

                  {req.admin_note ? (
                    <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4 space-y-1">
                      <div className="flex items-center gap-1.5 text-green-400 text-xs font-semibold uppercase tracking-wider">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Answer
                      </div>
                      <p className="text-sm text-foreground/80 leading-relaxed">{req.admin_note}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No written note was added for this answer.</p>
                  )}

                  {req.answered_at && (
                    <p className="text-xs text-muted-foreground">
                      Answered {new Date(req.answered_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                    </p>
                  )}

                  {!currentRating ? (
                    <div className="space-y-2 pt-1 border-t border-white/10">
                      <p className="text-xs text-muted-foreground">Was this answer helpful?</p>
                      <div className="flex gap-2">
                        <button
                          disabled={!!submittingFeedback}
                          onClick={() => setShowNoteFor(showNoteFor === req.id ? null : req.id)}
                          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-colors ${
                            showNoteFor === req.id
                              ? "border-green-600/50 bg-green-900/20 text-green-400"
                              : "border-white/10 bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10"
                          }`}
                        >
                          <ThumbsUp className="h-3.5 w-3.5" /> Helpful
                        </button>
                        <button
                          disabled={!!submittingFeedback}
                          onClick={() => submitFeedback(req.id, "not_helpful")}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-white/10 bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors disabled:opacity-50"
                        >
                          <ThumbsDown className="h-3.5 w-3.5" /> Not helpful
                        </button>
                      </div>
                      {showNoteFor === req.id && (
                        <div className="space-y-2">
                          <textarea
                            rows={2}
                            placeholder="Optional: what was most useful? (helps improve future answers)"
                            value={ratingNote[req.id] ?? ""}
                            onChange={e => setRatingNote(prev => ({ ...prev, [req.id]: e.target.value }))}
                            className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-green-400/50 resize-none"
                          />
                          <button
                            disabled={submittingFeedback === req.id}
                            onClick={() => submitFeedback(req.id, "helpful")}
                            className="text-xs bg-green-700/20 hover:bg-green-700/30 border border-green-700/40 text-green-400 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                          >
                            {submittingFeedback === req.id ? "Submitting…" : "Submit"}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground pt-1 border-t border-white/10">
                      {currentRating === "helpful" ? "You marked this answer as helpful." : "You marked this answer as not helpful."}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
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
  price,
  description,
}: {
  mode: DeliveryMode;
  selected: boolean;
  onClick: () => void;
  title: string;
  price: string;
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
      <div className="flex items-center justify-between gap-3">
        <div className={`text-sm font-semibold ${selected ? "text-amber-300" : "text-foreground"}`}>{title}</div>
        <div className={`text-sm font-bold flex-shrink-0 ${selected ? "text-amber-400" : "text-amber-400/60"}`}>{price}</div>
      </div>
      <div className="text-xs text-muted-foreground mt-1">{description}</div>
    </button>
  );
}
