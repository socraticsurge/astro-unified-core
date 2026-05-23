"use client";

import { useState } from "react";
import posthog from "posthog-js";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown } from "lucide-react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import {
  MIN_FIELD_LENGTH,
  WRITTEN_FEE_PAISE, LIVE_FEE_PAISE, formatFee,
} from "@/lib/consultation";
import type { ConsultationRequest, Profile, ConsultationSlot } from "@/lib/db";
import type { DeliveryMode } from "@/lib/consultation";
import { fonts, textStyles, colors, interactive, glass, radii, motion } from "@/lib/typography";
import { PAYMENT_FLOW_ENABLED } from "@/lib/constants";
import { ProfileSelectorCard } from "@/components/profile/ProfileSelectorCard";

const UPI_ID = "meherkalyanichaganti@okaxis";
const WHATSAPP_NUMBER = "919704076544";
const MIN_QUESTION_LENGTH = MIN_FIELD_LENGTH;

const glassCard: React.CSSProperties = { ...glass, borderRadius: radii.lg };

type Props = {
  allRequests: ConsultationRequest[];
  profiles: Profile[];
  writtenConsultationEnabled: boolean;
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

function displayQuestion(req: ConsultationRequest): string {
  if (!req.constraint_text && !req.objective && !req.options) return req.observation;
  return [req.observation, req.constraint_text, req.objective, req.options].filter(Boolean).join(" | ");
}

export function ConsultationForm({ allRequests, profiles, writtenConsultationEnabled, liveConsultationEnabled, writtenFeePaise, liveFeePaise, availableSlots, userName, userEmail }: Props) {
  const router = useRouter();
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [question, setQuestion] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>(writtenConsultationEnabled ? "written" : "appointment");
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openRequests = allRequests.filter(r => r.status !== "answered");
  const answered = allRequests.filter(r => r.status === "answered");

  const profileMap = new Map(profiles.map(p => [p.id, p.name]));

  function resolveProfileNames(profileIdsJson: string): string {
    try {
      const ids: string[] = JSON.parse(profileIdsJson);
      return ids.map(id => profileMap.get(id) ?? "Deleted Profile").join(", ");
    } catch { return "—"; }
  }

  const completeProfiles = profiles.filter(isProfileComplete);
  const incompleteProfiles = profiles.filter(p => !isProfileComplete(p));

  const canSubmit =
    selectedProfiles.length > 0 &&
    question.trim().length >= MIN_QUESTION_LENGTH &&
    (deliveryMode !== "appointment" || !!selectedSlotId);

  const toggleProfile = (id: string) => {
    setSelectedProfiles(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/consultation-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_ids: selectedProfiles,
          question: question.trim(),
          delivery_mode: deliveryMode,
          ...(deliveryMode === "appointment" && selectedSlotId ? { slot_id: selectedSlotId } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Submission failed");
        return;
      }
      setQuestion("");
      setSelectedProfiles([]);
      setSelectedSlotId(null);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">

      {/* ── New question form ── */}
      <div style={{ ...glassCard, padding: "28px 24px", boxShadow: "var(--shadow-elevated), inset 0 1px 0 var(--color-border-subtle)" }}>

        {/* Step 1: Profiles */}
        <div className="space-y-4 mb-6">
          <p style={textStyles.stepLabel}>Whose chart is this reading for?</p>
          {profiles.length === 0 ? (
            <Link href="/dashboard" style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              border: `1.5px dashed ${colors.goldFaint}`,
              borderRadius: radii.lg,
              padding: "24px 16px",
              textDecoration: "none",
              background: "var(--color-surface-1)",
            }}>
              <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true" style={{ opacity: 0.2 }}>
                <circle cx="20" cy="14" r="8" fill="none" stroke="#fbbf24" strokeWidth="1.5" />
                <path d="M4 38 Q4 26 20 26 Q36 26 36 38" fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span style={{ ...fonts.displayItalic, fontSize: "0.9rem", color: colors.goldDim }}>Add a profile to begin</span>
            </Link>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "10px" }}>
              {completeProfiles.map(p => (
                <ProfileSelectorCard
                  key={p.id}
                  name={p.name}
                  subtitle={p.relationship ?? undefined}
                  selected={selectedProfiles.includes(p.id)}
                  onSelect={() => toggleProfile(p.id)}
                />
              ))}
              {incompleteProfiles.map(p => (
                <ProfileSelectorCard
                  key={p.id}
                  name={p.name}
                  incomplete
                  incompleteHref={`/profiles/${p.id}/edit`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-[var(--color-border-subtle)] mb-6" />

        {/* Step 2: Question */}
        <div className="space-y-2 mb-6">
          <p style={textStyles.stepLabel}>
            What would you like to understand?
          </p>
          <div className="relative">
            <textarea
              rows={5}
              placeholder="Describe your situation and what you'd like to understand. The more specific you are, the more precisely Dr. Chaganti can address it…"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] px-4 py-3 text-foreground placeholder:text-muted-foreground/35 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-dim)] resize-none"
              style={{ ...fonts.display, fontSize: "1.05rem", lineHeight: 1.75 }}
            />
            <span className={`absolute bottom-2.5 right-3 text-[10px] tabular-nums transition-all ${question.trim().length >= MIN_QUESTION_LENGTH ? "text-[var(--color-accent-dim)]" : "text-muted-foreground/30"}`}>
              {question.trim().length}/{MIN_QUESTION_LENGTH}+
            </span>
          </div>
        </div>

        {/* Step 3: Delivery mode */}
        <div className="space-y-3 mb-6">
          <p style={textStyles.stepLabel}>
            How would you like it answered?
          </p>
          {!writtenConsultationEnabled && !liveConsultationEnabled ? (
            <p style={{
              fontSize: "0.88rem",
              color: "var(--color-ink-3)",
              fontStyle: "italic",
              border: "var(--border-width) solid var(--color-border-subtle)",
              borderRadius: radii.md,
              padding: "14px 18px",
              background: "var(--color-surface-1)",
            }}>
              Consultations are not available at this time.
            </p>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              {writtenConsultationEnabled && (
                <DeliveryCard
                  selected={deliveryMode === "written"}
                  onClick={() => { setDeliveryMode("written"); setSelectedSlotId(null); }}
                  title="Written Response"
                  price={PAYMENT_FLOW_ENABLED ? formatFee(writtenFeePaise) : ""}
                  description="Detailed written answer within a few days"
                />
              )}
              {liveConsultationEnabled && (
                <DeliveryCard
                  selected={deliveryMode === "appointment"}
                  onClick={() => setDeliveryMode("appointment")}
                  title="Live Session"
                  price={PAYMENT_FLOW_ENABLED ? formatFee(liveFeePaise) : ""}
                  description="25-minute live consultation"
                />
              )}
            </div>
          )}
        </div>

        {/* Slot picker */}
        {liveConsultationEnabled && deliveryMode === "appointment" && (
          <div className="space-y-3 mb-6">
            <p style={textStyles.stepLabel}>
              Choose a time (IST)
            </p>
            {availableSlots.length === 0 ? (
              <p style={{
                ...fonts.display,
                fontSize: "0.92rem",
                color: "var(--color-ink-3)",
                border: "var(--border-width) solid var(--color-border)",
                borderRadius: radii.md,
                padding: "14px 18px",
                background: "var(--color-surface-1)",
                fontStyle: "italic",
              }}>
                No slots available right now — reach out to Kalyani on WhatsApp to arrange a time.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {availableSlots.map(slot => {
                  const label = new Date(slot.starts_at).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata", weekday: "short", day: "numeric",
                    month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
                  });
                  const isSelected = selectedSlotId === slot.id;
                  return (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedSlotId(slot.id)}
                      className={interactive.slotButton}
                      style={{
                        textAlign: "left",
                        padding: "12px 18px",
                        borderRadius: radii.lg,
                        border: `var(--border-width) solid ${isSelected ? "var(--color-accent-dim)" : "var(--color-border)"}`,
                        background: isSelected ? "var(--color-accent-faint)" : "var(--color-surface-1)",
                        color: isSelected ? "var(--color-accent)" : "var(--color-ink-2)",
                        ...fonts.display,
                        fontSize: "1rem",
                      }}
                    >
                      {label} IST
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="mb-4 text-sm text-[var(--color-danger)] bg-[var(--color-danger-faint)] border border-[var(--color-danger-border)] rounded-xl px-4 py-2.5">
            {error}
          </p>
        )}

        {(writtenConsultationEnabled || liveConsultationEnabled) && <button
          onClick={handleSubmit}
          disabled={!canSubmit || submitting}
          style={{
            width: "100%",
            padding: "14px 0",
            borderRadius: radii.lg,
            border: "none",
            cursor: canSubmit && !submitting ? "pointer" : "not-allowed",
            background: canSubmit && !submitting
              ? "linear-gradient(105deg, #92400e 0%, #d97706 35%, #fcd34d 50%, #d97706 65%, #92400e 100%)"
              : "var(--color-border-subtle)",
            backgroundSize: "200% auto",
            color: canSubmit && !submitting ? "var(--color-bg)" : "var(--color-ink-4)",
            ...fonts.displayBold,
            fontSize: "1.1rem",
            letterSpacing: "0.04em",
            boxShadow: canSubmit && !submitting ? "var(--shadow-card)" : "none",
            transition: `all ${motion.standard}`,
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? "Sending…" : "Ask your question  ✦"}
        </button>}
      </div>

      {/* ── Open / pending questions ── */}
      {openRequests.length > 0 && (
        <section className="space-y-3">
          <h2 style={{ ...fonts.display, fontSize: "1.2rem", color: "var(--color-ink-3)", letterSpacing: "0.06em" }}>
            Open questions
          </h2>
          {openRequests.map(req => (
            <PendingCard
              key={req.id}
              pending={req}
              profileNames={resolveProfileNames(req.profile_ids)}
              userName={userName}
              userEmail={userEmail}
            />
          ))}
        </section>
      )}

      {/* ── Answered history ── */}
      {answered.length > 0 && (
        <HistorySection answered={answered} resolveProfileNames={resolveProfileNames} />
      )}
    </div>
  );
}

function PendingCard({ pending, profileNames, userName, userEmail }: {
  pending: ConsultationRequest;
  profileNames: string;
  userName: string;
  userEmail: string;
}) {
  // When PAYMENT_FLOW_ENABLED is off, "pending" requests are treated as
  // queued for the astrologer — no payment step. The Payment Instructions
  // card and the "Awaiting payment" wording are suppressed.
  const showPaymentFlow = PAYMENT_FLOW_ENABLED && (pending.status === "pending_payment" || pending.status === "paid");
  const awaitingPayment = showPaymentFlow && pending.status === "pending_payment";
  const isPaid = pending.status === "paid";
  const isQueued = !PAYMENT_FLOW_ENABLED && pending.status !== "answered";

  return (
    <div style={{
      ...glassCard,
      padding: "20px",
      borderColor: (isPaid || isQueued) ? "rgba(52,211,153,0.2)" : "var(--color-accent-dim)",
      background: (isPaid || isQueued) ? "rgba(4,120,87,0.10)" : "rgba(120,53,15,0.12)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
    }}>
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-4 w-4 text-[var(--color-warning)]" />
        <span style={{ ...fonts.display, fontSize: "1rem", color: (isPaid || isQueued) ? "var(--color-success)" : "var(--color-accent)" }}>
          {isQueued
            ? "In the queue — Dr. Chaganti will respond shortly"
            : isPaid
              ? "Payment confirmed — in the queue"
              : "Awaiting payment"}
        </span>
      </div>

      <div className="space-y-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-4 text-sm mb-4">
        <div>
          <span style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-ink-4)" }}>Profile(s)</span>
          <p style={{ ...fonts.display, fontSize: "1rem", color: "var(--color-accent-dim)" }} className="mt-0.5">{profileNames}</p>
        </div>
        <div>
          <span style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-ink-4)" }}>Question</span>
          <p style={{ ...fonts.display, fontSize: "1rem", color: "var(--color-ink-2)", lineHeight: 1.65 }} className="mt-0.5">
            {displayQuestion(pending)}
          </p>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <span style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-ink-4)" }}>Mode</span>
            <p className="text-sm mt-0.5">{pending.delivery_mode === "written" ? "Written Response" : "Live Session"}</p>
          </div>
          {pending.delivery_mode === "appointment" && pending.slot_starts_at && (
            <div className="text-right">
              <span style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-ink-4)" }}>Slot</span>
              <p style={{ ...fonts.display, fontSize: "0.95rem", color: "var(--color-accent-dim)" }} className="mt-0.5">
                {new Date(pending.slot_starts_at).toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata", weekday: "short", day: "numeric",
                  month: "short", hour: "2-digit", minute: "2-digit", hour12: true,
                })} IST
              </p>
            </div>
          )}
        </div>
      </div>

      {awaitingPayment && (
        <PaymentInstructions pending={pending} profileNames={profileNames} userName={userName} userEmail={userEmail} />
      )}

      {(isPaid || isQueued) && (
        <div className="space-y-3">
          <div className="rounded-xl border border-[var(--color-success-border)] bg-[var(--color-success-faint)] px-4 py-3 flex items-center gap-2 text-[var(--color-success)] text-sm">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            <span style={fonts.display}>
              {pending.delivery_mode === "appointment"
                ? "Confirmed. You will receive a Google Meet link for your slot."
                : "Confirmed. Dr. Chaganti will answer your question shortly. He'll respond by email."}
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
        timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "long",
        year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true,
      }) + " IST"
    : "";

  const rescheduleMsg = encodeURIComponent(`Hi Kalyani 🙏\n\nI need to reschedule my live consultation.\n\nRef: #${ref}\nSlot: ${slotLabel}\n\nCould you please help me find an alternative slot?`);
  const cancelMsg = encodeURIComponent(`Hi Kalyani 🙏\n\nI need to cancel my live consultation.\n\nRef: #${ref}\nSlot: ${slotLabel}\n\nPlease process the cancellation and let me know next steps.`);

  return (
    <div style={{
      border: "var(--border-width) solid var(--color-border)",
      borderRadius: radii.md,
      background: "var(--color-surface-1)",
      padding: "14px 16px",
    }}>
      <p style={{ fontSize: "0.75rem", color: "var(--color-ink-3)", marginBottom: "10px" }}>Need to change your slot? Reach out to Kalyani on WhatsApp:</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${rescheduleMsg}`} target="_blank" rel="noopener noreferrer"
          style={{
            fontSize: "0.78rem",
            color: "var(--color-accent)",
            border: "var(--border-width) solid var(--color-accent-faint)",
            borderRadius: radii.sm,
            padding: "6px 14px",
            textDecoration: "none",
            background: "var(--color-accent-faint)",
            letterSpacing: "0.04em",
          }}>
          Reschedule via WhatsApp
        </a>
        <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${cancelMsg}`} target="_blank" rel="noopener noreferrer"
          style={{
            fontSize: "0.78rem",
            color: "var(--color-ink-3)",
            border: "var(--border-width) solid var(--color-border)",
            borderRadius: radii.sm,
            padding: "6px 14px",
            textDecoration: "none",
            background: "var(--color-surface-1)",
            letterSpacing: "0.04em",
          }}>
          Cancel
        </a>
      </div>
    </div>
  );
}

function PaymentInstructions({ pending, profileNames, userName, userEmail }: {
  pending: ConsultationRequest;
  profileNames: string;
  userName: string;
  userEmail: string;
}) {
  const [copied, setCopied] = useState(false);

  const amountPaise = pending.amount_paise ?? (pending.delivery_mode === "written" ? WRITTEN_FEE_PAISE : LIVE_FEE_PAISE);
  const amountRupees = amountPaise / 100;
  const modeLabel = pending.delivery_mode === "written" ? "Written Response" : "Live Session";
  const ref = pending.id.substring(0, 8).toUpperCase();
  const upiQrValue = `upi://pay?pa=${UPI_ID}&pn=Kalyani+Chaganti&am=${amountRupees}&cu=INR&tn=Astro+Chaganti+Consultation`;
  const question = displayQuestion(pending);

  const slotLine = pending.slot_starts_at
    ? `Slot: ${new Date(pending.slot_starts_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })} IST\n`
    : "";

  const waMessage = encodeURIComponent(
    `Hi Kalyani 🙏\n\nPayment pending for a consultation on Astro Chaganti.\n\n` +
    `Name: ${userName || "Not provided"}\nEmail: ${userEmail}\nProfile(s): ${profileNames}\n` +
    `Type: ${modeLabel}\n${slotLine}Amount: ₹${amountRupees.toLocaleString("en-IN")}\nRef: #${ref}\n\n` +
    `Question:\n${question}\n\nSending the payment now. Please confirm once received.`
  );

  const copyUpi = () => {
    navigator.clipboard.writeText(UPI_ID).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  return (
    <div className="rounded-xl border border-[var(--color-accent-dim)] bg-[var(--color-accent-faint)] p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p style={{ ...fonts.display, fontSize: "1.1rem", color: "var(--color-accent)" }}>Pay to confirm</p>
        <span style={{ ...fonts.display, fontSize: "1.5rem", fontWeight: 700, color: "#fbbf24" }}>
          ₹{amountRupees.toLocaleString("en-IN")}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <div className="rounded-lg bg-white p-2 flex-shrink-0">
          <QRCodeSVG value={upiQrValue} size={110} />
        </div>
        <div className="space-y-3 flex-1">
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">UPI ID</p>
            <div className="flex items-center gap-2">
              <code className="text-sm font-mono text-foreground/85 bg-[var(--color-surface-1)] px-2.5 py-1 rounded-lg border border-[var(--color-border)]">{UPI_ID}</code>
              <button onClick={copyUpi} className="text-xs text-[var(--color-warning)] hover:text-[var(--color-accent)] transition-colors px-2 py-1 border border-[var(--color-accent-dim)] rounded-lg">
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Scan with any UPI app (Google Pay, PhonePe, Paytm) or copy the ID above.
          </p>
        </div>
      </div>

      <div className="border-t border-[var(--color-border)] pt-3 space-y-2">
        <p className="text-xs text-muted-foreground">After paying, send your screenshot to Kalyani on WhatsApp so she can confirm.</p>
        <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${waMessage}`} target="_blank" rel="noopener noreferrer"
          style={{
            display: "inline-block",
            fontSize: "0.85rem",
            color: "var(--color-success)",
            border: "var(--border-width) solid rgba(52,211,153,0.25)",
            borderRadius: radii.sm,
            padding: "9px 18px",
            textDecoration: "none",
            background: "rgba(4,120,87,0.12)",
            letterSpacing: "0.03em",
            ...fonts.display,
          }}>
          Confirm payment via WhatsApp
        </a>
      </div>
      <p className="text-[10px] text-muted-foreground/35">Ref: #{ref} · {modeLabel}</p>
    </div>
  );
}

function HistorySection({ answered, resolveProfileNames }: {
  answered: ConsultationRequest[];
  resolveProfileNames: (ids: string) => string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, "helpful" | "not_helpful">>(() => {
    const initial: Record<string, "helpful" | "not_helpful"> = {};
    for (const req of answered) { if (req.user_rating) initial[req.id] = req.user_rating; }
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
      posthog.capture("consultation_feedback_submitted", {
        rating,
        has_note: !!(ratingNote[id]?.trim()),
      });
      setRatings(prev => ({ ...prev, [id]: rating }));
      setShowNoteFor(null);
    } finally { setSubmittingFeedback(null); }
  };

  return (
    <section className="space-y-3 border-t border-[var(--color-border-subtle)] pt-8">
      <h2 style={{ ...fonts.display, fontSize: "1.2rem", color: "var(--color-ink-3)", letterSpacing: "0.06em" }}>
        Answered questions
      </h2>
      <div className="space-y-2">
        {answered.map(req => {
          const isOpen = expandedId === req.id;
          const currentRating = ratings[req.id] ?? null;
          return (
            <div key={req.id} style={glassCard} className="overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[var(--color-surface-hover)] transition-all"
                onClick={() => setExpandedId(isOpen ? null : req.id)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <CheckCircle2 className="h-4 w-4 text-[var(--color-success)] flex-shrink-0" />
                  <div className="min-w-0">
                    <span style={{ ...fonts.display, fontSize: "1rem", color: "var(--color-ink-1)" }} className="truncate block">
                      {resolveProfileNames(req.profile_ids)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(req.created_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {currentRating === "helpful" && <ThumbsUp className="h-3.5 w-3.5 text-[var(--color-success)]" />}
                  {currentRating === "not_helpful" && <ThumbsDown className="h-3.5 w-3.5 text-[var(--color-danger)]" />}
                  {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>

              {isOpen && (
                <div className="px-5 pb-5 space-y-4 border-t border-[var(--color-border-subtle)] pt-4">
                  <div>
                    <span style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-ink-4)" }}>Your Question</span>
                    <p style={{ ...fonts.display, fontSize: "1.02rem", color: "var(--color-ink-2)", lineHeight: 1.7 }} className="mt-1">
                      {displayQuestion(req)}
                    </p>
                  </div>

                  {req.admin_note ? (
                    <div className="rounded-xl border border-[var(--color-success-border)] bg-[var(--color-success-faint)] p-4 space-y-1">
                      <div className="flex items-center gap-1.5 text-[var(--color-success)] text-xs font-semibold uppercase tracking-wider">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Answer
                      </div>
                      <p style={{ ...fonts.display, fontSize: "1.02rem", color: "var(--color-ink-1)", lineHeight: 1.7 }}>{req.admin_note}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No written note was added for this answer.</p>
                  )}

                  {req.answered_at && (
                    <p className="text-xs text-muted-foreground/50">
                      Answered {new Date(req.answered_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                    </p>
                  )}

                  {!currentRating ? (
                    <div className="space-y-2 pt-1 border-t border-[var(--color-border-subtle)]">
                      <p className="text-xs text-muted-foreground">Was this helpful?</p>
                      <div className="flex gap-2">
                        <button disabled={!!submittingFeedback}
                          onClick={() => setShowNoteFor(showNoteFor === req.id ? null : req.id)}
                          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                            showNoteFor === req.id ? "border-[var(--color-success-border)] bg-[var(--color-success-faint)] text-[var(--color-success)]" : "border-[var(--color-border)] bg-[var(--color-surface-1)] text-muted-foreground hover:text-foreground"
                          }`}>
                          <ThumbsUp className="h-3.5 w-3.5" /> Yes
                        </button>
                        <button disabled={!!submittingFeedback}
                          onClick={() => submitFeedback(req.id, "not_helpful")}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] text-muted-foreground hover:text-foreground transition-all disabled:opacity-50">
                          <ThumbsDown className="h-3.5 w-3.5" /> Not really
                        </button>
                      </div>
                      {showNoteFor === req.id && (
                        <div className="space-y-2">
                          <textarea rows={2} placeholder="Optional: what was most useful?"
                            value={ratingNote[req.id] ?? ""}
                            onChange={e => setRatingNote(prev => ({ ...prev, [req.id]: e.target.value }))}
                            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-[var(--color-success)]/40 resize-none"
                          />
                          <button disabled={submittingFeedback === req.id}
                            onClick={() => submitFeedback(req.id, "helpful")}
                            className="text-xs bg-[var(--color-success-faint)] hover:bg-[var(--color-success-faint)] border border-[var(--color-success-border)] text-[var(--color-success)] px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                            {submittingFeedback === req.id ? "Submitting…" : "Submit"}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground/50 pt-1 border-t border-[var(--color-border-subtle)]">
                      {currentRating === "helpful" ? "You found this answer helpful." : "You marked this as not helpful."}
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

function DeliveryCard({ selected, onClick, title, price, description }: {
  selected: boolean;
  onClick: () => void;
  title: string;
  price: string;
  description: string;
}) {
  return (
    <button onClick={onClick} style={{
      flex: 1,
      textAlign: "left",
      borderRadius: radii.lg,
      border: `var(--border-width) solid ${selected ? "var(--color-accent-dim)" : "var(--color-border)"}`,
      background: selected ? "var(--color-accent-faint)" : "var(--color-surface-1)",
      padding: "16px 18px",
      transition: `all ${motion.standard}`,
      boxShadow: selected ? "var(--shadow-card)" : "none",
      cursor: "pointer",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "5px" }}>
        <span style={{ ...fonts.display, fontSize: "1.1rem", color: selected ? "var(--color-accent)" : "var(--color-ink-2)" }}>
          {title}
        </span>
        <span style={{ ...fonts.displayBold, fontSize: "1rem", color: selected ? colors.gold : colors.goldFaint }}>
          {price}
        </span>
      </div>
      <div style={{ fontSize: "0.75rem", color: "var(--color-ink-4)", letterSpacing: "0.02em" }}>{description}</div>
    </button>
  );
}
