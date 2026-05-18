"use client"

import * as React from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"

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
  onSubmit?: (question: string) => void
}

export function AskPanel({ open, onClose, context, onSubmit }: AskPanelProps) {
  const [question, setQuestion] = React.useState("")
  const [sent, setSent] = React.useState(false)

  React.useEffect(() => {
    if (!open) {
      setQuestion("")
      setSent(false)
    }
  }, [open])

  const placeholder = context.insightTitle
    ? `Ask about: ${context.insightTitle}`
    : `e.g. What does this ${context.mahadasha} mahadasha mean for my career?`

  return (
    <Sheet open={open} onOpenChange={(isOpen: boolean) => { if (!isOpen) onClose() }}>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-sm w-full flex flex-col gap-4">
        <SheetHeader>
          <SheetTitle>✦ Ask an expert</SheetTitle>
        </SheetHeader>

        {sent ? (
          /* Confirmation state */
          <div className="flex flex-col items-center justify-center flex-1 gap-5 text-center py-10">
            <div className="text-3xl text-[var(--color-accent)]">✦</div>
            <div>
              <p className="text-sm font-semibold text-[var(--color-ink-1)] mb-1">Question sent</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                An astrologer will review your question and respond within 2 days.
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

            {/* Question */}
            <div className="flex flex-col gap-2 flex-1">
              <label htmlFor="ask-question" className="text-xs font-medium uppercase tracking-wide opacity-60">
                Your question
              </label>
              <textarea
                id="ask-question"
                className="flex-1 w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:opacity-40 focus:outline-none focus:ring-2 focus:ring-ring min-h-[120px] resize-none"
                placeholder={placeholder}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </div>

            <Button
              className="w-full"
              type="button"
              disabled={!question.trim()}
              onClick={() => {
                onSubmit?.(question)
                setSent(true)
              }}
            >
              Request consultation →
            </Button>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
