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
  onSubmit?: (topic: string, note: string) => void
}

const TOPICS = [
  { id: "career", label: "Career & professional timing" },
  { id: "dasha", label: "Upcoming dasha transition" },
  { id: "relationship", label: "Relationship guidance" },
  { id: "general", label: "General reading" },
] as const

type TopicId = (typeof TOPICS)[number]["id"]

function getDefaultTopic(tab: string): TopicId {
  if (tab === "Compare") return "relationship"
  if (tab === "Time") return "dasha"
  return "general"
}

export function AskPanel({ open, onClose, context, onSubmit }: AskPanelProps) {
  const [selectedTopic, setSelectedTopic] = React.useState<TopicId>(
    getDefaultTopic(context.tab)
  )
  const [note, setNote] = React.useState("")

  // Reset topic and note when context.tab changes or panel closes
  React.useEffect(() => {
    setSelectedTopic(getDefaultTopic(context.tab))
    if (!open) setNote('')
  }, [open, context.tab])

  return (
    <Sheet open={open} onOpenChange={(isOpen: boolean) => { if (!isOpen) onClose() }}>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-md w-full">
        <SheetHeader>
          <SheetTitle>✦ Ask an expert</SheetTitle>
        </SheetHeader>

        {/* Context block */}
        <div
          className="mx-4 rounded-md border p-3 text-sm bg-[var(--color-ask-ctx-bg)] border-[var(--color-ask-ctx-border)]"
        >
          <div className="font-medium text-[var(--color-ask-ctx-name)]">
            {context.profileName}
            {context.relationship && (
              <span className="ml-1 font-normal opacity-70">· {context.relationship}</span>
            )}
          </div>
          <div className="mt-0.5 opacity-80">
            {context.mahadasha} · {context.antardasha} dasha
          </div>
          {context.insightTitle && (
            <div className="mt-1 italic opacity-70">{context.insightTitle}</div>
          )}
        </div>

        {/* Topic picker */}
        <fieldset className="mx-4 mt-4 space-y-2 border-0 p-0">
          <legend className="mb-2 text-xs font-medium uppercase tracking-wide opacity-60">
            Topic
          </legend>
          {TOPICS.map((topic) => {
            const isActive = selectedTopic === topic.id
            return (
              <label
                key={topic.id}
                className={[
                  "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-[var(--color-ask-option-active-bg)] border-[var(--color-ask-option-active-border)] text-[var(--color-ask-option-active-text)]"
                    : "border-transparent hover:bg-muted",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name="ask-topic"
                  value={topic.id}
                  checked={isActive}
                  onChange={() => setSelectedTopic(topic.id)}
                  aria-label={topic.label}
                  className="sr-only"
                />
                {topic.label}
              </label>
            )
          })}
        </fieldset>

        {/* Free text */}
        <div className="mx-4 mt-4">
          <label htmlFor="ask-note" className="sr-only">Additional context</label>
          <textarea
            id="ask-note"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:opacity-50 focus:outline-none focus:ring-2 focus:ring-ring min-h-[96px] resize-none"
            placeholder="e.g. I have a job offer decision coming up next month…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {/* Submit */}
        <div className="mx-4 mt-4">
          <Button
            className="w-full"
            type="button"
            onClick={() => {
              onSubmit?.(selectedTopic, note)
              onClose()
            }}
          >
            Request consultation →
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
