"use client"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useTheme } from "next-themes"
import { marked } from "marked"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ModelPicker } from "@/components/ui/ModelPicker"
import { AIInsightCard } from "@/components/engines/AIInsightCard"
import { RefreshCw, Sparkles, Send, Copy, Check, ThumbsUp, ThumbsDown } from "lucide-react"
import { sanitizeHtml } from "@/lib/sanitize"
import { DEFAULT_INSIGHT_MODEL, type AiModelKey } from "@/lib/engines/models"
import type { TabInsight, InsightTab } from "@/lib/ai-insight"
import type { ChartTabId } from "@/components/profiles/ProfileView"

function MarkdownMessage({ content }: { content: string }) {
  const html = useMemo(() => sanitizeHtml(marked(content) as string), [content])
  const { resolvedTheme } = useTheme()
  const invertClass = resolvedTheme === "dark" ? "prose-invert" : ""
  return (
    <div
      className={`prose prose-sm ${invertClass} max-w-none text-[var(--color-ink-2)] [&>p]:mb-2 [&>p:last-child]:mb-0 [&>ul]:mb-2 [&>ol]:mb-2 [&>ul]:pl-4 [&>ol]:pl-4 [&>li]:mb-0.5 [&>h1,h2,h3,h4]:font-semibold [&>h3,h4]:text-xs [&>h3,h4]:uppercase [&>h3,h4]:tracking-wide [&>h3,h4]:text-[var(--color-ink-3)] [&>blockquote]:border-l-2 [&>blockquote]:border-[var(--color-border)] [&>blockquote]:pl-3 [&>blockquote]:text-[var(--color-ink-3)] [&>code]:bg-[var(--color-surface-2)] [&>code]:px-1 [&>code]:rounded`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

// today → natal so the panel works on every tab
const CHART_TAB_TO_INSIGHT: Partial<Record<ChartTabId, InsightTab>> = {
  today:        "natal",
  natal:        "natal",
  planets:      "natal",
  divisional:   "vargas",
  yogas:        "natal",
  jaimini:      "natal",
  ashtakavarga: "natal",
  dasha:        "dashas",
  transits:     "transit",
  tarabalam:    "tarabalam",
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

type Message = {
  role:       "user" | "assistant"
  content:    string
  message_id?: string   // present on assistant messages; used for persisting feedback
  rating?:    1 | -1 | null
  copied?:    boolean
}

interface Props {
  open:     boolean
  onClose:  () => void
  context:  AIPanelContext | null
  isAdmin?: boolean
}

export function AIAdminPanel({ open, onClose, context, isAdmin = false }: Props) {
  const [subTab, setSubTab] = useState<"summary" | "chat">(isAdmin ? "summary" : "chat")
  const [model,  setModel]  = useState<AiModelKey>(DEFAULT_INSIGHT_MODEL)

  // Summary (admin only)
  const [summaryState,    setSummaryState]    = useState<InsightState>(null)
  const [summaryChecking, setSummaryChecking] = useState(false)
  const [summaryLoading,  setSummaryLoading]  = useState(false)
  const [summaryError,    setSummaryError]    = useState<string | null>(null)

  // Chat
  const [messages,    setMessages]    = useState<Message[]>([])
  const [chatInput,   setChatInput]   = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError,   setChatError]   = useState<string | null>(null)
  const [quota,       setQuota]       = useState<{ used: number; limit: number } | null>(null)
  // session_id groups all turns in one chat session so Q/A pairs are linkable in DB
  const sessionIdRef = useRef<string>(crypto.randomUUID())
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const isCompare  = context?.activeTab === "compare"
  const insightTab = context ? CHART_TAB_TO_INSIGHT[context.activeTab] : null
  const hasSummary = isCompare ? !!context?.compareCheckId : !!insightTab
  const hasChat    = isCompare ? !!context?.compareCheckId : !!context?.profileId

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
    setQuota(null)
    sessionIdRef.current = crypto.randomUUID()
  }, [contextKey])

  // Cache check whenever panel opens or context changes (admin only — summary is admin-gated)
  useEffect(() => {
    if (!open || !context || !hasSummary || !isAdmin) return
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
      } catch (err) {
        if (!cancelled) setSummaryError(err instanceof Error ? err.message : "Failed to load cached summary")
      } finally { if (!cancelled) setSummaryChecking(false) }
    }

    checkCache()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contextKey, isAdmin])

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

    // Enforce quota client-side as an early guard (server enforces authoritatively)
    if (!isAdmin && quota && quota.used >= quota.limit) {
      setChatError(`You've used all ${quota.limit} messages for this month.`)
      return
    }

    const userMsg: Message = { role: "user", content: chatInput.trim() }
    const next = [...messages, userMsg]
    setMessages(next)
    setChatInput("")
    setChatLoading(true)
    setChatError(null)
    try {
      const sid = sessionIdRef.current
      const [url, body] = isCompare
        ? ["/api/readings/chat/compatibility", { check_id: context.compareCheckId, messages: next, model, session_id: sid }] as const
        : ["/api/readings/chat",               {
            profile_id: context.profileId,
            messages: next,
            model,
            tab: insightTab ?? undefined,
            context_label: context.tabLabel,
            session_id: sid,
          }] as const
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      let data: { response?: string; message_id?: string; quota?: { used: number; limit: number }; error?: string } = {}
      try { data = await res.json() } catch { /* empty or non-JSON body */ }
      if (!res.ok) {
        if (res.status === 429 && data.quota) setQuota(data.quota)
        throw new Error(data.error ?? `Request failed (${res.status}) — please try again`)
      }
      if (!data.response) throw new Error("No response received — please try again")
      if (data.quota) setQuota(data.quota)
      setMessages(prev => [...prev, { role: "assistant", content: data.response ?? "", message_id: data.message_id }])
    } catch (err) {
      setChatError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setChatLoading(false)
    }
  }, [context, chatInput, messages, model, isCompare, chatLoading, isAdmin, quota, insightTab])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const copyMessage = useCallback(async (idx: number, content: string) => {
    await navigator.clipboard.writeText(content)
    setMessages(prev => prev.map((m, i) => i === idx ? { ...m, copied: true } : m))
    setTimeout(() => setMessages(prev => prev.map((m, i) => i === idx ? { ...m, copied: false } : m)), 2000)
  }, [])

  const rateMessage = useCallback(async (idx: number, value: 1 | -1) => {
    const msg = messages[idx]
    const next: 1 | -1 | null = msg.rating === value ? null : value
    setMessages(prev => prev.map((m, i) => i === idx ? { ...m, rating: next } : m))

    // Persist to DB if we have a message_id
    if (msg.message_id) {
      try {
        await fetch("/api/chat/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message_id: msg.message_id, rating: next }),
        })
      } catch { /* non-critical — UI already updated */ }
    }
  }, [messages])

  const breadcrumb = context
    ? isCompare
      ? `Compatibility · ${context.profileName} × ${context.partnerName ?? "?"}`
      : `${context.tabLabel} · ${context.profileName}`
    : ""

  const quotaExhausted = !isAdmin && quota && quota.used >= quota.limit

  return (
    <Dialog open={open} onOpenChange={isOpen => { if (!isOpen) onClose() }}>
      <DialogContent className="gap-0 p-0">
        {/* ── Fixed header ── */}
        <div className="shrink-0 border-b border-[var(--color-border)] px-5 pb-0 pt-5 sm:px-6">
          <div className="mb-3 flex items-start justify-between gap-8 pr-9">
            <div>
              <DialogTitle className="flex items-center gap-2 font-[var(--font-display)] text-lg font-semibold">
                <Sparkles className="h-4 w-4 shrink-0 text-[var(--color-accent)]" />
                Explore with AI
              </DialogTitle>
              {breadcrumb && (
                <p className="text-[11px] text-muted-foreground mt-0.5">{breadcrumb}</p>
              )}
            </div>
            {isAdmin ? (
              <ModelPicker value={model} onChange={setModel} disabled={summaryLoading || chatLoading} />
            ) : quota ? (
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                quotaExhausted
                  ? "border-[var(--color-danger)] text-[var(--color-danger)] bg-[var(--color-danger)]/10"
                  : "border-[var(--color-border)] text-muted-foreground"
              }`}>
                {quota.used}/{quota.limit} this month
              </span>
            ) : null}
          </div>

          {/* Sub-tab switcher — admins see both; users see chat only */}
          {isAdmin && (
            <div className="flex gap-0">
              {(["summary", "chat"] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSubTab(t)}
                  className={`px-4 py-2 text-xs font-medium capitalize border-b-2 transition-colors ${
                    subTab === t
                      ? "border-[var(--color-nav-chip-active-text)] text-[var(--color-ink-1)]"
                      : "border-transparent text-muted-foreground hover:text-[var(--color-ink-2)]"
                  }`}
                >
                  {t === "summary" ? "Summary" : "Chat"}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Summary sub-tab (admin only) ── */}
        {isAdmin && subTab === "summary" && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4 sm:p-6">
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
                    <RefreshCw className="h-4 w-4 animate-spin text-[var(--color-accent)]" />
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

        {/* ── Chat sub-tab ── */}
        {(isAdmin ? subTab === "chat" : true) && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {!hasChat ? (
              <p className="p-4 text-xs text-muted-foreground italic">
                {isCompare ? "Run a compatibility check first." : "No chat available."}
              </p>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-8 sm:py-6">
                  <div className="mx-auto max-w-2xl space-y-4">
                  {messages.length === 0 && (
                    <div className="mx-auto mt-8 max-w-md rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-sunk)] px-6 py-8 text-center">
                      <Sparkles className="mx-auto mb-3 h-5 w-5 text-[var(--color-accent)]" />
                      <p className="text-sm font-medium text-[var(--color-ink-2)]">
                      {isCompare
                        ? `Ask about the compatibility between ${context?.profileName} and ${context?.partnerName ?? "?"}.`
                        : `Ask anything about ${context?.profileName ?? ""}'s chart.`}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        Your active profile and {context?.tabLabel.toLowerCase() ?? "chart"} context are already included.
                      </p>
                    </div>
                  )}
                  {messages.map((m, i) => (
                    <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                      <div className={`px-3 py-2 rounded-xl max-w-[88%] text-sm leading-relaxed ${
                        m.role === "user"
                          ? "bg-[var(--color-accent-faint)] text-[var(--color-ink-1)]"
                          : "bg-[var(--color-surface-2)]"
                      }`}>
                        {m.role === "user"
                          ? m.content
                          : <MarkdownMessage content={m.content} />}
                      </div>
                      {m.role === "assistant" && (
                        <div className="flex items-center gap-0.5 mt-1 ml-1">
                          <button
                            onClick={() => copyMessage(i, m.content)}
                            title="Copy"
                            className="p-1 rounded text-muted-foreground hover:text-[var(--color-ink-2)] transition-colors"
                          >
                            {m.copied
                              ? <Check className="h-3 w-3 text-[var(--color-success)]" />
                              : <Copy className="h-3 w-3" />}
                          </button>
                          <button
                            onClick={() => rateMessage(i, 1)}
                            title="Helpful"
                            className={`p-1 rounded transition-colors ${m.rating === 1 ? "text-[var(--color-success)]" : "text-muted-foreground hover:text-[var(--color-ink-2)]"}`}
                          >
                            <ThumbsUp className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => rateMessage(i, -1)}
                            title="Not helpful"
                            className={`p-1 rounded transition-colors ${m.rating === -1 ? "text-[var(--color-danger)]" : "text-muted-foreground hover:text-[var(--color-ink-2)]"}`}
                          >
                            <ThumbsDown className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <RefreshCw className="h-3 w-3 animate-spin text-[var(--color-accent)]" />
                      Thinking…
                    </div>
                  )}
                  {chatError && (
                    <p className="text-xs text-[var(--color-danger)]">{chatError}</p>
                  )}
                  <div ref={messagesEndRef} />
                  </div>
                </div>

                <div className="shrink-0 border-t border-[var(--color-border)] bg-[var(--color-surface-sunk)] p-3 sm:p-4">
                  <div className="mx-auto flex max-w-2xl items-end gap-2">
                  <textarea
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                    placeholder={quotaExhausted ? "Monthly message limit reached." : "Ask a question… (Shift+Enter for newline)"}
                    disabled={chatLoading || !!quotaExhausted}
                    rows={2}
                    className="max-h-[160px] min-h-12 flex-1 resize-none rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] px-4 py-3 text-sm text-[var(--color-ink-1)] placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] disabled:opacity-50"
                  />
                  <Button
                    size="sm"
                    disabled={!chatInput.trim() || chatLoading || !!quotaExhausted}
                    onClick={sendMessage}
                    className="h-11 w-11 shrink-0 rounded-xl p-0"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
