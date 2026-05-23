"use client";
import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Sparkles, Copy, ThumbsUp, ThumbsDown } from "lucide-react";
import { assembleStatement } from "@/lib/consultation";
import { ModelPicker } from "@/components/ui/ModelPicker";
import { DEFAULT_DRAFT_MODEL, type AiModelKey } from "@/lib/engines/models";
import type { ConsultationRequestWithUser } from "@/lib/db";
import { PAYMENT_FLOW_ENABLED } from "@/lib/constants";
import { sortBy, renderSortIcon, resolveProfileIds } from "../utils";

interface QuestionsTabProps {
  consultationRequests: ConsultationRequestWithUser[];
  profileNameMap: Map<string, string>;
}

export function QuestionsTab({ consultationRequests, profileNameMap }: QuestionsTabProps) {
  const [qSortCol, setQSortCol] = useState<string>("created_at");
  const [qSortDir, setQSortDir] = useState<"asc" | "desc">("desc");

  const [markingId, setMarkingId] = useState<string | null>(null);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [markedIds, setMarkedIds] = useState<Set<string>>(new Set());
  const [paidIds, setPaidIds] = useState<Set<string>>(new Set());
  const [expandedQId, setExpandedQId] = useState<string | null>(null);
  const [draftModel, setDraftModel] = useState<AiModelKey>(DEFAULT_DRAFT_MODEL);
  const [draftGenerating, setDraftGenerating] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [draftErrors, setDraftErrors] = useState<Record<string, string>>({});
  const [draftCopied, setDraftCopied] = useState<string | null>(null);

  const toggleQSort = (col: string) => {
    if (qSortCol === col) setQSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setQSortCol(col); setQSortDir("asc"); }
  };

  const generateDraft = async (requestId: string) => {
    setDraftGenerating(requestId);
    setDraftErrors((prev) => { const next = { ...prev }; delete next[requestId]; return next; });
    try {
      const res = await fetch("/api/admin/consultation-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: requestId, model: draftModel }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate draft");
      setDrafts((prev) => ({ ...prev, [requestId]: data.draft }));
    } catch (e) {
      setDraftErrors((prev) => ({ ...prev, [requestId]: e instanceof Error ? e.message : "Failed" }));
    } finally {
      setDraftGenerating(null);
    }
  };

  const copyDraft = async (requestId: string) => {
    const text = drafts[requestId];
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setDraftCopied(requestId);
    setTimeout(() => setDraftCopied((prev) => (prev === requestId ? null : prev)), 2000);
  };

  const markPaid = async (id: string) => {
    setMarkingPaidId(id);
    try {
      const res = await fetch(`/api/admin/consultation-requests?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_paid" }),
      });
      if (res.ok) setPaidIds((prev) => new Set([...prev, id]));
    } finally {
      setMarkingPaidId(null);
    }
  };

  const markAnswered = async (id: string) => {
    setMarkingId(id);
    try {
      const res = await fetch(`/api/admin/consultation-requests?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_note: adminNotes[id] ?? "" }),
      });
      if (res.ok) setMarkedIds((prev) => new Set([...prev, id]));
    } finally {
      setMarkingId(null);
    }
  };

  const sortedQuestions = sortBy(consultationRequests, qSortCol, qSortDir);

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
      <table className="w-full text-sm">
        <thead className="bg-[var(--color-surface-1)] text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-[var(--color-surface-hover)]" onClick={() => toggleQSort("user_email")}>User {renderSortIcon("user_email", qSortCol, qSortDir)}</th>
            <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-[var(--color-surface-hover)]" onClick={() => toggleQSort("life_area")}>Life Area {renderSortIcon("life_area", qSortCol, qSortDir)}</th>
            <th className="px-3 py-2 font-medium whitespace-nowrap">Profile(s)</th>
            <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-[var(--color-surface-hover)]" onClick={() => toggleQSort("delivery_mode")}>Mode {renderSortIcon("delivery_mode", qSortCol, qSortDir)}</th>
            <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-[var(--color-surface-hover)]" onClick={() => toggleQSort("created_at")}>Date {renderSortIcon("created_at", qSortCol, qSortDir)}</th>
            <th className="px-3 py-2 font-medium whitespace-nowrap">Ref</th>
            <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-[var(--color-surface-hover)]" onClick={() => toggleQSort("status")}>Status {renderSortIcon("status", qSortCol, qSortDir)}</th>
            <th className="px-3 py-2 font-medium text-right whitespace-nowrap">Details</th>
          </tr>
        </thead>
        <tbody>
          {sortedQuestions.length === 0 && (
            <tr>
              <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">No consultation requests yet.</td>
            </tr>
          )}
          {sortedQuestions.map((req) => {
            const effectiveStatus = markedIds.has(req.id) ? "answered" : paidIds.has(req.id) ? "paid" : req.status;
            const isDone = effectiveStatus === "answered";
            // When payment flow is OFF, treat every non-answered request as
            // ready-to-answer: the admin sees the draft assistant immediately
            // and there is no "Mark as Paid" step. `isReadyToAnswer` is the
            // combined state.
            const isPaid = effectiveStatus === "paid";
            const awaitingPayment = PAYMENT_FLOW_ENABLED && !isDone && !isPaid;
            const isReadyToAnswer = !isDone && (!PAYMENT_FLOW_ENABLED || isPaid);
            const isExpanded = expandedQId === req.id;
            const profileList = resolveProfileIds(req.profile_ids, profileNameMap);
            return (
              <>
                <tr
                  key={req.id}
                  className={`border-t border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] ${isDone ? "opacity-60" : ""}`}
                >
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap text-xs">{req.user_email ?? "—"}</td>
                  <td className="px-3 py-2.5 font-medium whitespace-nowrap">{req.life_area}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {profileList.map((p) => (
                        <Link
                          key={p.id}
                          href={`/dashboard?profile=${p.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[var(--color-accent)]/80 hover:text-[var(--color-accent)] hover:underline whitespace-nowrap"
                        >
                          {p.name}
                        </Link>
                      ))}
                      {profileList.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap text-xs">
                    {req.delivery_mode === "written" ? "Written" : (
                      <div>
                        <div>Live</div>
                        {req.slot_starts_at && (
                          <div className="text-[10px] text-[var(--color-accent)]/70 mt-0.5">
                            {new Date(req.slot_starts_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "short", timeStyle: "short" })} IST
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap text-xs">
                    {new Date(req.created_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground whitespace-nowrap">
                    #{req.id.substring(0, 8).toUpperCase()}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {isDone && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--color-success-faint)] text-[var(--color-success)]">Answered</span>}
                      {PAYMENT_FLOW_ENABLED && isPaid && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--color-surface-2)] text-[var(--color-ink-2)]">Paid</span>}
                      {PAYMENT_FLOW_ENABLED && awaitingPayment && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--color-accent-faint)] text-[var(--color-accent)]">Awaiting Payment</span>}
                      {!PAYMENT_FLOW_ENABLED && isReadyToAnswer && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--color-accent-faint)] text-[var(--color-accent)]">Pending</span>}
                      {req.user_rating === "helpful" && <ThumbsUp className="h-3 w-3 text-[var(--color-success)]" />}
                      {req.user_rating === "not_helpful" && <ThumbsDown className="h-3 w-3 text-[var(--color-danger)]" />}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      onClick={() => setExpandedQId(isExpanded ? null : req.id)}
                      className="text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors"
                    >
                      {isExpanded ? "Close" : "View"}
                    </button>
                  </td>
                </tr>
                {isExpanded && (
                  <tr key={`${req.id}-detail`} className="border-t border-[var(--color-border-subtle)]">
                    <td colSpan={8} className="px-4 py-4 bg-[var(--color-surface-1)]">
                      <div className="space-y-3 max-w-2xl">
                        <div>
                          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Question</p>
                          <p className="text-sm text-foreground/80 leading-relaxed">
                            {assembleStatement(req.observation, req.constraint_text, req.objective, req.options)}
                          </p>
                        </div>
                        {req.delivery_mode === "appointment" && req.slot_starts_at && (
                          <div className="rounded-md border border-[var(--color-accent-dim)] bg-[var(--color-accent-faint)] px-3 py-2">
                            <p className="text-xs uppercase tracking-wider text-[var(--color-accent)] mb-0.5">Selected Slot</p>
                            <p className="text-xs text-foreground/70">
                              {new Date(req.slot_starts_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })} IST
                            </p>
                          </div>
                        )}
                        {req.admin_note && (
                          <div className="rounded-md border border-[var(--color-success-border)] bg-[var(--color-success-faint)] px-3 py-2">
                            <p className="text-xs uppercase tracking-wider text-[var(--color-success)] mb-0.5">Your note</p>
                            <p className="text-xs text-foreground/70">{req.admin_note}</p>
                          </div>
                        )}
                        {req.user_rating && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {req.user_rating === "helpful"
                              ? <ThumbsUp className="h-3 w-3 text-[var(--color-success)]" />
                              : <ThumbsDown className="h-3 w-3 text-[var(--color-danger)]" />}
                            <span>User feedback: {req.user_rating === "helpful" ? "Helpful" : "Not helpful"}</span>
                            {req.user_feedback_note && <span>— &quot;{req.user_feedback_note}&quot;</span>}
                          </div>
                        )}
                        {awaitingPayment && (
                          <button
                            disabled={markingPaidId === req.id}
                            onClick={() => markPaid(req.id)}
                            className="flex items-center gap-1.5 text-xs bg-[var(--color-surface-2)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] text-[var(--color-ink-2)] px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {markingPaidId === req.id ? "Saving…" : "Mark as Paid"}
                          </button>
                        )}
                        {isReadyToAnswer && (
                          <div className="space-y-3 pt-1">
                            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  <Sparkles className="h-3 w-3 text-[var(--color-accent)]" />
                                  <span className="text-xs font-semibold text-[var(--color-ink-2)]">Draft Assistant</span>
                                </div>
                                <ModelPicker value={draftModel} onChange={setDraftModel} disabled={draftGenerating === req.id} />
                              </div>
                              <button
                                disabled={draftGenerating === req.id}
                                onClick={() => generateDraft(req.id)}
                                className="text-xs bg-[var(--color-accent-faint)] hover:bg-[var(--color-accent-faint)]/80 border border-[var(--color-accent-dim)] text-[var(--color-accent)] px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                              >
                                {draftGenerating === req.id ? "Generating…" : drafts[req.id] ? "Regenerate Draft" : "Generate Draft"}
                              </button>
                              {draftErrors[req.id] && <p className="text-xs text-[var(--color-danger)]">{draftErrors[req.id]}</p>}
                              {drafts[req.id] && (
                                <div className="space-y-1.5">
                                  <div className="rounded border border-[var(--color-border)] bg-[var(--color-surface-1)] p-2.5 text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto">
                                    {drafts[req.id]}
                                  </div>
                                  <button
                                    onClick={() => copyDraft(req.id)}
                                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-[var(--color-ink-2)] transition-colors"
                                  >
                                    <Copy className="h-3 w-3" />
                                    {draftCopied === req.id ? "Copied!" : "Copy to clipboard"}
                                  </button>
                                </div>
                              )}
                            </div>

                            <textarea
                              rows={2}
                              placeholder="Optional: add a written note or answer for the user"
                              value={adminNotes[req.id] ?? ""}
                              onChange={(e) => setAdminNotes((prev) => ({ ...prev, [req.id]: e.target.value }))}
                              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]/50 resize-none"
                            />
                            <button
                              disabled={markingId === req.id}
                              onClick={() => markAnswered(req.id)}
                              className="flex items-center gap-1.5 text-xs bg-[var(--color-success-faint)] hover:bg-[var(--color-success-faint)]/80 border border-[var(--color-success-border)] text-[var(--color-success)] px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {markingId === req.id ? "Saving…" : "Mark as Answered"}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
