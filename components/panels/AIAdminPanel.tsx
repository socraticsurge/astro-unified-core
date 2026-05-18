"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { ModelPicker } from "@/components/ui/ModelPicker"
import { AIInsightCard } from "@/components/engines/AIInsightCard"
import { RefreshCw, Sparkles, Send } from "lucide-react"
import { DEFAULT_INSIGHT_MODEL, DEFAULT_CHAT_MODEL, type AiModelKey } from "@/lib/engines/models"
import type { TabInsight, InsightTab } from "@/lib/ai-insight"
import type { ChartTabId } from "@/components/profiles/ProfileView"

const CHART_TAB_TO_INSIGHT: Partial<Record<ChartTabId, InsightTab>> = {
  planets:      "natal",
  divisional:   "vargas",
  yogas:        "natal",
  jaimini:      "natal",
  ashtakavarga: "natal",
  dasha:        "dashas",
  transits:     "transit",
  career:       "career",
}

export interface AIPanelContext {
  profileId:      string
  profileName:    string
  activeTab:      ChartTabId
  tabLabel:       string
  compareCheckId: string | null
  partnerName:    string | null
}

type InsightState = {
  insight:   TabInsight
  readingId: string
  rating:    1 | -1 | null
} | null

type Message = { role: "user" | "assistant"; content: string }

interface Props {
  open:    boolean
  onClose: () => void
  context: AIPanelContext | null
}

export function AIAdminPanel({ open, onClose, context }: Props) {
  const [subTab, setSubTab] = useState<"summary" | "chat">("summary")
  const [model,  setModel]  = useState<AiModelKey>(DEFAULT_INSIGHT_MODEL)

  // Summary
  const [summaryState,    setSummaryState]    = useState<InsightState>(null)
  const [summaryChecking, setSummaryChecking] = useState(false)
  const [summaryLoading,  setSummaryLoading]  = useState(false)
  const [summaryError,    setSummaryError]    = useState<string | null>(null)

  // Chat
  const [messages,     setMessages]     = useState<Message[]>([])
  const [chatInput,    setChatInput]    = useState("")
  const [chatLoading,  setChatLoading]  = useState(false)
  const [chatError,    setChatError]    = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const isCompare   = context?.activeTab === "compare"
  const insightTab  = context ? CHART_TAB_TO_INSIGHT[context.activeTab] : null
  const hasSummary  = isCompare ? !!context?.compareCheckId : !!insightTab
  const hasChat     = isCompare ? !!context?.compareCheckId : !!context?.profileId

  // Reset everything when the meaningful context changes (profile, tab, or compare check)
  const contextKey = context
    ? `${context.profileId}|${context.activeTab}|${context.compareCheckId ?? ""}`
    : ""
  const prevKey = useRef("")

  useEffect(() => {
    if (contextKey === prevKey.current) return
    prevKey.current = contextKey
    setSummaryState(null)
    setSummaryError(null)
    setMessages([])
    setChatError(null)
  }, [contextKey])

  // Cache check whenever the panel opens or context changes
  useEffect(() => {
    if (!open || !context || !hasSummary) return
    let cancelled = false

    async function checkCache() {
      setSummaryChecking(true)
      try {
        const url = isCompare
          ? `/api/readings/ai-insight/compatibility?check_id=${context!.compareCheckId}`
          : `/api/readings/ai-insight?profile_id=${context!.profileId}&tab=${insightTab}`
        const res = await fetch(url, { cache: "no-store" })
        if (!res.ok || cancelled) return
        const data = await res.json()
        if (!cancelled && data.insight) {
          setSummaryState({ insight: data.insight as TabInsight, readingId: data.reading_id, rating: data.rating ?? null })
        }
      } catch { /* silently ignore */ }
      finally { if (!cancelled) setSummaryChecking(false) }
    }

    checkCache()
    return () => { cancelled = true }
  // contextKey captures all the deps we care about; open re-triggers on panel open
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contextKey])

  const generateSummary = useCallback(async (force = false) => {
    if (!context) return
    setSummaryLoading(true)
    setSummaryError(null)
    try {
      const [url, body] = isCompare
        ? ["/api/readings/ai-insight/compatibility", { check_id: context.compareCheckId, model, force }] as const
        : ["/api/readings/ai-insight",               { profile_id: context.profileId, tab: insightTab, model, force }] as const
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to generate")
      setSummaryState({ insight: data.insight as TabInsight, readingId: data.reading_id, rating: data.rating ?? null })
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSummaryLoading(false)
    }
  }, [context, model, isCompare, insightTab])

  const sendMessage = useCallback(async () => {
    if (!context || !chatInput.trim() || chatLoading) return
    const userMsg: Message = { role: "user", content: chatInput.trim() }
    const next = [...messages, userMsg]
    setMessages(next)
    setChatInput("")
    setChatLoading(true)
    setChatError(null)
    try {
      const [url, body] = isCompare
        ? ["/api/readings/chat/compatibility", { check_id: context.compareCheckId, messages: next, model }] as const
        : ["/api/readings/chat",               { profile_id: context.profileId, messages: next, model }] as const
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to get response")
      setMessages(prev => [...prev, { role: "assistant", content: data.response }])
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setChatLoading(false)
    }
  }, [context, chatInput, messages, model, isCompare, chatLoading])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Switch to DEFAULT_CHAT_MODEL when entering chat, DEFAULT_INSIGHT_MODEL for summary
  useEffect(() => {
    setModel(subTab === "chat" ? DEFAULT_CHAT_MODEL : DEFAULT_INSIGHT_MODEL)
  }, [subTab])

  const breadcrumb = context
    ? isCompare
      ? `Compatibility · ${context.profileName} × ${context.partnerName ?? "?"}`
      : `${context.tabLabel} · ${context.profileName}`
    : ""

  return (
    <Sheet open={open} onOpenChange={isOpen => { if (!isOpen) onClose() }}>
      <SheetContent side="right" className="sm:max-w-sm w-full flex flex-col overflow-hidden p-0 gap-0">

        {/* Header */}
        <SheetHeader className="px-4 pt-4 pb-3 shrink-0 border-b border-[var(--color-border)]">
          <SheetTitle className="flex items-center gap-1.5 text-sm font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-violet-400 shrink-0" />
            AI Assistant
          </SheetTitle>
          {breadcrumb && (
            <p className="text-[11px] text-muted-foreground">{breadcrumb}</p>
          )}
          <div className="flex items-center justify-between pt-1">
            <ModelPicker value={model} onChange={setModel} disabled={summaryLoading || chatLoading} />
          </div>
          <div className="flex gap-0 -mb-3 -mx-4 px-4">
            {(["summary", "chat"] as const).map(t => (
              <button
                key={t}
                onClick={() => setSubTab(t)}
                className={`px-4 py-2 text-xs font-medium capitalize border-b-2 transition-colors ${
                  subTab === t
                    ? "border-[var(--color-nav-chip-active-text)] text-[var(--color-ink-1)]"
                    : "border-transparent text-muted-foreground hover:text-[var(--color-ink-2)]"
                }`}
              >
                {t === "chat" ? "Chat" : "Summary"}
              </button>
            ))}
          </div>
        </SheetHeader>

        {/* Summary sub-tab */}
        {subTab === "summary" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!hasSummary ? (
              <p className="text-xs text-muted-foreground italic">
                {isCompare
                  ? "Run a compatibility check first to enable AI summary."
                  : "No AI summary available for this tab."}
              </p>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={summaryChecking || summaryLoading}
                    onClick={() => generateSummary(!!summaryState)}
                    className="h-7 px-3 text-xs gap-1.5 border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]"
                  >
                    <RefreshCw className={`h-3 w-3 ${(summaryChecking || summaryLoading) ? "animate-spin" : ""}`} />
                    {summaryChecking ? "Checking cache…" : summaryState ? "Regenerate" : "Generate"}
                  </Button>
                  {summaryState && !summaryLoading && (
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(summaryState.insight.generated_at).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {summaryLoading && (
                  <div className="flex items-center gap-2 py-10 justify-center text-sm text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin text-violet-400" />
                    Generating summary…
                  </div>
                )}
                {summaryError && !summaryLoading && (
                  <p className="text-xs text-[var(--color-danger)]">{summaryError}</p>
                )}
                {summaryState && !summaryLoading && (
                  <AIInsightCard
                    insight={summaryState.insight}
                    readingId={summaryState.readingId}
                    initialRating={summaryState.rating}
                  />
                )}
              </>
            )}
          </div>
        )}

        {/* Chat sub-tab */}
        {subTab === "chat" && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {!hasChat ? (
              <p className="p-4 text-xs text-muted-foreground italic">
                {isCompare ? "Run a compatibility check first." : "No chat available for this tab."}
              </p>
            ) : (
              <>
                {/* Message list */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 && (
                    <p className="text-xs text-muted-foreground italic text-center pt-8">
                      {isCompare
                        ? `Ask about the compatibility between ${context?.profileName} and ${context?.partnerName ?? "?"}.`
                        : `Ask about the ${context?.tabLabel ?? ""} tab for ${context?.profileName ?? ""}.`}
                    </p>
                  )}
                  {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      <span className={`inline-block px-3 py-2 rounded-xl max-w-[88%] text-sm leading-relaxed ${
                        m.role === "user"
                          ? "bg-violet-700/30 text-[var(--color-ink-1)]"
                          : "bg-[var(--color-surface-2)] text-[var(--color-ink-2)]"
                      }`}>
                        {m.content}
                      </span>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <RefreshCw className="h-3 w-3 animate-spin text-violet-400" />
                      Thinking…
                    </div>
                  )}
                  {chatError && (
                    <p className="text-xs text-[var(--color-danger)]">{chatError}</p>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="shrink-0 p-3 border-t border-[var(--color-border)] flex gap-2 items-end">
                  <textarea
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                    placeholder="Ask a question… (Shift+Enter for newline)"
                    disabled={chatLoading}
                    rows={2}
                    className="flex-1 resize-none rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 py-2 text-xs text-[var(--color-ink-1)] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] max-h-[120px]"
                  />
                  <Button
                    size="sm"
                    disabled={!chatInput.trim() || chatLoading}
                    onClick={sendMessage}
                    className="shrink-0 h-8 w-8 p-0"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

      </SheetContent>
    </Sheet>
  )
}
