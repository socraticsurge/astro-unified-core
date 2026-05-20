"use client"

import * as React from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/Toast"
import { PAYMENT_FLOW_ENABLED } from "@/lib/constants"

export interface AskContext {
  profileName: string
  relationship: string
  mahadasha: string
  antardasha: string
  tab: string
  insightTitle?: string
}

interface AskPanelProps {
  open: boolean
  onClose: () => void
  context: AskContext
  writtenEnabled: boolean
  liveEnabled: boolean
  writtenFeePaise: number
  liveFeePaise: number
  onSubmit: (question: string) => Promise<void>
}

const MIN_LENGTH = 30
const MAX_LENGTH = 2000

function fmtRupees(paise: number) {
  return "₹" + Math.round(paise / 100).toLocaleString("en-IN")
}

export function AskPanel({
  open,
  onClose,
  context,
  writtenEnabled,
  liveEnabled,
  writtenFeePaise,
  liveFeePaise,
  onSubmit,
}: AskPanelProps) {
  const isFree = !writtenEnabled && !liveEnabled
  const hasWritten = writtenEnabled || isFree
  const hasLive = liveEnabled
  const showToggle = hasWritten && hasLive

  const [mode, setMode] = React.useState<"written" | "live">(hasWritten ? "written" : "live")
  const [question, setQuestion] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [sent, setSent] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) {
      setQuestion("")
      setSent(false)
      setError(null)
      setSubmitting(false)
      setMode(hasWritten ? "written" : "live")
    }
  }, [open, hasWritten])

  const placeholder = context.insightTitle
    ? `Ask about: ${context.insightTitle}`
    : `e.g. What does this ${context.mahadasha} mahadasha mean for my career?`

  const charCount = question.trim().length
  const canSubmit = charCount >= MIN_LENGTH && charCount <= MAX_LENGTH && !submitting

  const handleSubmit = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit(question.trim())
      setSent(true)
      toast("Your question is on its way — we'll respond within 2 days.", "success")
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to submit. Please try again."
      setError(msg)
      toast(msg, "error")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(isOpen: boolean) => { if (!isOpen) onClose() }}>
      <SheetContent side="right" className="sm:max-w-sm w-full flex flex-col gap-4 overflow-y-auto">
        <SheetHeader>
          <SheetTitle>✦ Ask Dr Chaganti</SheetTitle>
        </SheetHeader>

        {sent ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-5 text-center py-10">
            <div className="text-3xl text-[var(--color-accent)]">✦</div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-ink-1)] mb-1">Question submitted</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Dr. Chaganti will review your question and respond within 2 days.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="mt-2">
              Close
            </Button>
          </div>
        ) : (
          <>
            {/* Context block */}
            <div className="rounded-md border p-3 text-sm bg-[var(--color-ask-ctx-bg)] border-[var(--color-ask-ctx-border)]">
              <div className="font-medium text-[var(--color-ask-ctx-name)]">
                {context.profileName}
                {context.relationship && (
                  <span className="ml-1 font-normal opacity-70">· {context.relationship}</span>
                )}
              </div>
              <div className="mt-0.5 text-xs opacity-80">
                {context.mahadasha} · {context.antardasha} dasha
              </div>
              {context.insightTitle && (
                <div className="mt-1 text-xs italic opacity-70">{context.insightTitle}</div>
              )}
            </div>

            {/* Delivery mode toggle — only when both options are available.
                Fee labels are hidden when PAYMENT_FLOW_ENABLED=false. */}
            {showToggle && (
              <div className="grid grid-cols-2 gap-2">
                {(["written", "live"] as const).map(m => {
                  const label = m === "written" ? "Written Response" : "Live Session"
                  const fee = m === "written"
                    ? (isFree ? "Free" : fmtRupees(writtenFeePaise))
                    : fmtRupees(liveFeePaise)
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={cn(
                        "flex flex-col items-start gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
                        mode === m
                          ? "border-[var(--color-accent-dim)] bg-[var(--color-accent-faint)] text-[var(--color-ink-1)]"
                          : "border-[var(--color-border)] bg-transparent text-muted-foreground hover:border-[var(--color-border-subtle)] hover:text-[var(--color-ink-2)]"
                      )}
                    >
                      <span className="text-xs font-medium">{label}</span>
                      {PAYMENT_FLOW_ENABLED && (
                        <span className={cn("text-[11px]", mode === m ? "text-[var(--color-accent)]" : "text-muted-foreground/60")}>
                          {fee}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Written mode */}
            {(mode === "written" || !hasLive) && hasWritten && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="ask-question" className="text-xs font-medium uppercase tracking-wide opacity-60">
                    Your question
                  </label>
                  <textarea
                    id="ask-question"
                    rows={4}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:opacity-40 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    placeholder={placeholder}
                    value={question}
                    maxLength={MAX_LENGTH}
                    onChange={(e) => setQuestion(e.target.value)}
                  />
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground/60">
                    <span>{charCount < MIN_LENGTH ? `${MIN_LENGTH - charCount} more chars needed` : ""}</span>
                    <span>{charCount}/{MAX_LENGTH}</span>
                  </div>
                </div>

                {error && (
                  <p className="text-xs text-[var(--color-danger)]">{error}</p>
                )}

                <Button
                  className="w-full"
                  type="button"
                  disabled={!canSubmit}
                  onClick={handleSubmit}
                >
                  {submitting
                    ? "Submitting…"
                    : !PAYMENT_FLOW_ENABLED || isFree
                      ? "Submit question"
                      : `Submit · ${fmtRupees(writtenFeePaise)}`}
                </Button>
              </>
            )}

            {/* Live mode */}
            {(mode === "live" || !hasWritten) && hasLive && (
              <div className="flex flex-col gap-3">
                <p className="text-sm text-[var(--color-ink-2)] leading-relaxed">
                  Book a 25-minute live consultation with our astrologer. You&apos;ll pick a slot on the next page.
                </p>
                <a
                  href="/consultation"
                  className="inline-flex items-center justify-center w-full rounded-md bg-[var(--color-accent-faint)] border border-[var(--color-accent-dim)] text-[var(--color-accent)] text-sm font-medium px-4 py-2.5 hover:bg-[var(--color-accent-faint)]/80 transition-colors"
                >
                  Book a live session{PAYMENT_FLOW_ENABLED ? ` · ${fmtRupees(liveFeePaise)}` : ""} →
                </a>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
