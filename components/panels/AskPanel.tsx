"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { CalendarDays, Check, MessageSquareText, Send, Sparkles, Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/Toast"
import { PAYMENT_FLOW_ENABLED } from "@/lib/constants"
import styles from "./AskPanel.module.css"

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
  writtenEnabled?: boolean
  liveEnabled?: boolean
  writtenFeePaise?: number
  liveFeePaise?: number
  onSubmit?: (question: string) => Promise<void>
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
  writtenEnabled = false,
  liveEnabled = false,
  writtenFeePaise = 0,
  liveFeePaise = 0,
  onSubmit = async () => undefined,
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
      /* eslint-disable react-hooks/set-state-in-effect */
      setQuestion("")
      setSent(false)
      setError(null)
      setSubmitting(false)
      setMode(hasWritten ? "written" : "live")
      /* eslint-enable react-hooks/set-state-in-effect */
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
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Failed to submit. Please try again."
      setError(message)
      toast(message, "error")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen: boolean) => { if (!isOpen) onClose() }}>
      <DialogContent className={styles.dialog}>
        <header className={styles.header}>
          <span className={styles.headerIcon}>
            <MessageSquareText size={20} aria-hidden="true" />
          </span>
          <div>
            <p className={styles.eyebrow}>Human astrological guidance</p>
            <DialogTitle className={styles.title}>Ask Dr Chaganti</DialogTitle>
            <DialogDescription className={styles.description}>
              Bring a focused question from this chart to a practising astrologer.
            </DialogDescription>
          </div>
        </header>

        {sent ? (
          <div className={styles.success}>
            <span className={styles.successMark}><Check size={22} aria-hidden="true" /></span>
            <div>
              <p className={styles.successTitle}>Question submitted</p>
              <p className={styles.successText}>
                You&apos;ll receive a response at your email address within two days.
                If you need to reach Dr Chaganti sooner, write directly to{" "}
                <a href="mailto:astrochaganti@gmail.com" className={styles.textLink}>
                  astrochaganti@gmail.com
                </a>
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
          </div>
        ) : (
          <div className={styles.body}>
            <section className={styles.context} aria-label="Question context">
              <span className={styles.contextGlyph}><Sparkles size={16} aria-hidden="true" /></span>
              <div>
                <p className={styles.contextLabel}>Question context</p>
                <p className={styles.contextName}>
                  {context.profileName}
                  {context.relationship && <span> · {context.relationship}</span>}
                </p>
                <p className={styles.contextMeta}>
                  {context.tab} · {context.mahadasha} · {context.antardasha} dasha
                </p>
                {context.insightTitle && <p className={styles.contextInsight}>{context.insightTitle}</p>}
              </div>
            </section>

            {showToggle && (
              <div className={styles.modes} aria-label="Response format">
                {(["written", "live"] as const).map((candidate) => {
                  const isWritten = candidate === "written"
                  const label = isWritten ? "Written response" : "Live session"
                  const detail = isWritten ? "A considered answer by email" : "A 25-minute conversation"
                  const fee = isWritten
                    ? (isFree ? "Free" : fmtRupees(writtenFeePaise))
                    : fmtRupees(liveFeePaise)
                  return (
                    <button
                      key={candidate}
                      type="button"
                      onClick={() => setMode(candidate)}
                      className={cn(styles.mode, mode === candidate && styles.modeActive)}
                      aria-pressed={mode === candidate}
                    >
                      <span className={styles.modeIcon}>
                        {isWritten
                          ? <MessageSquareText size={15} aria-hidden="true" />
                          : <Video size={15} aria-hidden="true" />}
                      </span>
                      <span>
                        <strong>{label}</strong>
                        <small>{detail}</small>
                      </span>
                      {PAYMENT_FLOW_ENABLED && <em>{fee}</em>}
                    </button>
                  )
                })}
              </div>
            )}

            {(mode === "written" || !hasLive) && hasWritten && (
              <section className={styles.formSection}>
                <div className={styles.questionField}>
                  <label htmlFor="ask-question">Your question</label>
                  <textarea
                    id="ask-question"
                    rows={5}
                    className={styles.textarea}
                    placeholder={placeholder}
                    value={question}
                    maxLength={MAX_LENGTH}
                    onChange={(event) => setQuestion(event.target.value)}
                  />
                  <div className={styles.counter}>
                    <span>{charCount < MIN_LENGTH ? `${MIN_LENGTH - charCount} more chars needed` : ""}</span>
                    <span>{charCount}/{MAX_LENGTH}</span>
                  </div>
                </div>

                {error && <p className={styles.error} role="alert">{error}</p>}

                <button
                  className={styles.submit}
                  type="button"
                  disabled={!canSubmit}
                  onClick={handleSubmit}
                >
                  <Send size={14} aria-hidden="true" />
                  {submitting
                    ? "Submitting…"
                    : !PAYMENT_FLOW_ENABLED || isFree
                      ? "Submit question"
                      : `Submit · ${fmtRupees(writtenFeePaise)}`}
                </button>
                <p className={styles.responseNote}>
                  <CalendarDays size={13} aria-hidden="true" />
                  Written responses normally arrive within two days.
                </p>
              </section>
            )}

            {(mode === "live" || !hasWritten) && hasLive && (
              <section className={styles.liveSection}>
                <span className={styles.liveIcon}><Video size={19} aria-hidden="true" /></span>
                <div>
                  <h3>Talk through the chart live</h3>
                  <p>
                    Book a 25-minute live consultation. You&apos;ll choose an available
                    time on the next page.
                  </p>
                  <a href="/consultation" className={styles.liveAction}>
                    Book a live session{PAYMENT_FLOW_ENABLED ? ` · ${fmtRupees(liveFeePaise)}` : ""} →
                  </a>
                </div>
              </section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
