"use client";

import { useState } from "react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, ThumbsUp, ThumbsDown } from "lucide-react";
import type {
  User,
  ProfileWithUser,
  CompatibilityCheckWithDetails,
  Feedback,
  ConsultationRequestWithUser,
  AppSettings,
  ConsultationSlot,
  AiInsightsLlmConfig,
  ChatLlmConfig,
  DraftLlmConfig,
  TodayReadingLlmConfig,
} from "@/lib/db";
import type { AiInsightStat } from "@/lib/db/readings";
import { LlmSettingsPanel } from "@/components/admin/LlmSettingsPanel";
import { sortBy, renderSortIcon } from "./utils";
import { QuestionsTab } from "./tabs/QuestionsTab";
import { SettingsTab } from "./tabs/SettingsTab";

type Props = {
  users: User[];
  profiles: ProfileWithUser[];
  feedback: Feedback[];
  compatibilityChecks: CompatibilityCheckWithDetails[];
  consultationRequests: ConsultationRequestWithUser[];
  consultationSlots: ConsultationSlot[];
  appSettings: AppSettings;
  aiInsightStats: AiInsightStat[];
  llmSettings: { ai_insights: AiInsightsLlmConfig; chat: ChatLlmConfig; draft: DraftLlmConfig; today_reading: TodayReadingLlmConfig };
  adminEmail: string;
};

export function AdminTables({
  users,
  profiles,
  feedback,
  compatibilityChecks,
  consultationRequests,
  consultationSlots,
  appSettings,
  aiInsightStats,
  llmSettings,
  adminEmail,
}: Props) {
  // Sort state for inline tabs (Users / Profiles / Compatibility). Questions
  // and Settings own their own state — see ./tabs/QuestionsTab + SettingsTab.
  const [userSortCol, setUserSortCol] = useState<string>("last_login");
  const [userSortDir, setUserSortDir] = useState<"asc" | "desc">("desc");

  const [profileSortCol, setProfileSortCol] = useState<string>("created_at");
  const [profileSortDir, setProfileSortDir] = useState<"asc" | "desc">("desc");

  const [compSortCol, setCompSortCol] = useState<string>("created_at");
  const [compSortDir, setCompSortDir] = useState<"asc" | "desc">("desc");

  const toggleUserSort = (col: string) => {
    if (userSortCol === col) setUserSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setUserSortCol(col); setUserSortDir("asc"); }
  };
  const toggleProfileSort = (col: string) => {
    if (profileSortCol === col) setProfileSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setProfileSortCol(col); setProfileSortDir("asc"); }
  };
  const toggleCompSort = (col: string) => {
    if (compSortCol === col) setCompSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setCompSortCol(col); setCompSortDir("asc"); }
  };

  const sortedUsers = sortBy(users, userSortCol, userSortDir);
  const sortedProfiles = sortBy(profiles, profileSortCol, profileSortDir);
  const sortedComps = sortBy(compatibilityChecks, compSortCol, compSortDir);

  // Per-user activity counts derived from existing prop data — no extra DB queries.
  const profileCountByUser = new Map<string, number>();
  for (const p of profiles) profileCountByUser.set(p.user_id, (profileCountByUser.get(p.user_id) ?? 0) + 1);
  const compatCountByUser = new Map<string, number>();
  for (const c of compatibilityChecks) compatCountByUser.set(c.user_id, (compatCountByUser.get(c.user_id) ?? 0) + 1);
  const questionCountByUser = new Map<string, number>();
  for (const r of consultationRequests) questionCountByUser.set(r.user_id, (questionCountByUser.get(r.user_id) ?? 0) + 1);

  const profileNameMap = new Map(profiles.map((p) => [p.id, p.name]));

  return (
    <Tabs defaultValue="users">
      <TabsList className="mb-4 flex-wrap h-auto">
        <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
        <TabsTrigger value="profiles">Profiles ({profiles.length})</TabsTrigger>
        <TabsTrigger value="compatibility">Compatibility ({compatibilityChecks.length})</TabsTrigger>
        <TabsTrigger value="feedback">Feedback ({feedback.length})</TabsTrigger>
        <TabsTrigger value="questions">
          Questions ({consultationRequests.filter((r) => r.status !== "answered").length} active)
        </TabsTrigger>
        <TabsTrigger value="ai-insights">AI Insights</TabsTrigger>
        <TabsTrigger value="llm-settings">LLM Settings</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>

      {/* ── Users ─────────────────────────────────────────────────────────── */}
      <TabsContent value="users">
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface-1)] text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium cursor-pointer hover:bg-[var(--color-surface-hover)]" onClick={() => toggleUserSort("name")}>Name {renderSortIcon("name", userSortCol, userSortDir)}</th>
                <th className="px-3 py-2 font-medium cursor-pointer hover:bg-[var(--color-surface-hover)]" onClick={() => toggleUserSort("email")}>Email {renderSortIcon("email", userSortCol, userSortDir)}</th>
                <th className="px-3 py-2 font-medium cursor-pointer hover:bg-[var(--color-surface-hover)]" onClick={() => toggleUserSort("id")}>User ID {renderSortIcon("id", userSortCol, userSortDir)}</th>
                <th className="px-3 py-2 font-medium cursor-pointer hover:bg-[var(--color-surface-hover)]" onClick={() => toggleUserSort("created_at")}>Created {renderSortIcon("created_at", userSortCol, userSortDir)}</th>
                <th className="px-3 py-2 font-medium cursor-pointer hover:bg-[var(--color-surface-hover)]" onClick={() => toggleUserSort("last_login")}>Last Login {renderSortIcon("last_login", userSortCol, userSortDir)}</th>
                <th className="px-3 py-2 font-medium text-center whitespace-nowrap">Profiles</th>
                <th className="px-3 py-2 font-medium text-center whitespace-nowrap">Compat</th>
                <th className="px-3 py-2 font-medium text-center whitespace-nowrap">Questions</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((u) => (
                <tr key={String(u.id)} className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]">
                  <td className="px-3 py-2 font-medium">{String(u.name || "—")}</td>
                  <td className="px-3 py-2 text-muted-foreground">{String(u.email || "—")}</td>
                  <td className="px-3 py-2 text-muted-foreground font-mono text-xs">{String(u.id)}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    {u.created_at ? new Date(String(u.created_at)).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    {u.last_login ? new Date(String(u.last_login)).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "—"}
                  </td>
                  <td className="px-3 py-2 text-center tabular-nums">{profileCountByUser.get(String(u.id)) ?? 0}</td>
                  <td className="px-3 py-2 text-center tabular-nums">{compatCountByUser.get(String(u.id)) ?? 0}</td>
                  <td className="px-3 py-2 text-center tabular-nums">{questionCountByUser.get(String(u.id)) ?? 0}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">No users yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </TabsContent>

      {/* ── Profiles ──────────────────────────────────────────────────────── */}
      <TabsContent value="profiles">
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface-1)] text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-[var(--color-surface-hover)]" onClick={() => toggleProfileSort("name")}>Profile {renderSortIcon("name", profileSortCol, profileSortDir)}</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-[var(--color-surface-hover)]" onClick={() => toggleProfileSort("user_name")}>Owner Name {renderSortIcon("user_name", profileSortCol, profileSortDir)}</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-[var(--color-surface-hover)]" onClick={() => toggleProfileSort("user_email")}>Owner Email {renderSortIcon("user_email", profileSortCol, profileSortDir)}</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-[var(--color-surface-hover)]" onClick={() => toggleProfileSort("relationship")}>Relation {renderSortIcon("relationship", profileSortCol, profileSortDir)}</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-[var(--color-surface-hover)]" onClick={() => toggleProfileSort("gender")}>Gender {renderSortIcon("gender", profileSortCol, profileSortDir)}</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-[var(--color-surface-hover)]" onClick={() => toggleProfileSort("date_of_birth")}>Date of Birth {renderSortIcon("date_of_birth", profileSortCol, profileSortDir)}</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-[var(--color-surface-hover)]" onClick={() => toggleProfileSort("time_of_birth")}>Time of Birth {renderSortIcon("time_of_birth", profileSortCol, profileSortDir)}</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-[var(--color-surface-hover)]" onClick={() => toggleProfileSort("place_of_birth")}>Place {renderSortIcon("place_of_birth", profileSortCol, profileSortDir)}</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-[var(--color-surface-hover)]" onClick={() => toggleProfileSort("created_at")}>Created {renderSortIcon("created_at", profileSortCol, profileSortDir)}</th>
              </tr>
            </thead>
            <tbody>
              {sortedProfiles.map((p) => (
                <tr key={p.id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]">
                  <td className="px-3 py-2 font-medium whitespace-nowrap">
                    <Link href={`/dashboard?profile=${p.id}`} target="_blank" rel="noopener noreferrer" className="hover:underline text-[var(--color-accent)]">
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{p.user_name || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{p.user_email || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{p.relationship || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{p.gender || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{p.date_of_birth}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{p.time_of_birth}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{p.place_of_birth}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    {p.created_at ? new Date(p.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "—"}
                  </td>
                </tr>
              ))}
              {profiles.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">No profiles yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </TabsContent>

      {/* ── Compatibility ─────────────────────────────────────────────────── */}
      <TabsContent value="compatibility">
        <div className="flex justify-end mb-4">
          <button
            onClick={async () => {
              if (confirm("Are you sure you want to clear ALL compatibility checks? This cannot be undone.")) {
                const res = await fetch("/api/admin/clear-compatibility", { method: "POST" });
                const data = await res.json();
                if (data.success) {
                  alert(data.message);
                  window.location.reload();
                } else {
                  alert(data.error || "Failed to clear history");
                }
              }
            }}
            className="text-xs text-[var(--color-danger)] hover:text-[var(--color-danger)] border border-[var(--color-danger-border)] bg-[var(--color-danger-faint)] px-3 py-1.5 rounded-md transition-colors"
          >
            Clear History
          </button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)]">
          <table className="w-full text-sm text-left">
            <thead className="bg-[var(--color-surface-1)] text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-[var(--color-surface-hover)]" onClick={() => toggleCompSort("user_email")}>User {renderSortIcon("user_email", compSortCol, compSortDir)}</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap">Made By</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-[var(--color-surface-hover)]" onClick={() => toggleCompSort("p1_name")}>Male Profile {renderSortIcon("p1_name", compSortCol, compSortDir)}</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-[var(--color-surface-hover)]" onClick={() => toggleCompSort("p2_name")}>Female Profile {renderSortIcon("p2_name", compSortCol, compSortDir)}</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-[var(--color-surface-hover)]" onClick={() => toggleCompSort("score")}>Score {renderSortIcon("score", compSortCol, compSortDir)}</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-[var(--color-surface-hover)]" onClick={() => toggleCompSort("created_at")}>Date {renderSortIcon("created_at", compSortCol, compSortDir)}</th>
                <th className="px-3 py-2 font-medium text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-border)]">
              {sortedComps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground italic">
                    No compatibility checks recorded yet.
                  </td>
                </tr>
              ) : (
                sortedComps.map((check) => (
                  <tr key={check.id} className="hover:bg-[var(--color-surface-hover)]">
                    <td className="px-4 py-3 font-medium text-[var(--color-ink-1)]">{check.user_email || "Unknown User"}</td>
                    <td className="px-4 py-3">
                      {check.user_email === adminEmail
                        ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--color-accent-faint)] text-[var(--color-accent)]">Admin</span>
                        : <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--color-surface-2)] text-muted-foreground">User</span>
                      }
                    </td>
                    <td className="px-4 py-3">{check.p1_name || "Deleted Profile"}</td>
                    <td className="px-4 py-3">{check.p2_name || "Deleted Profile"}</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${check.score >= 18 ? "text-[var(--color-success)]" : "text-[var(--color-accent)]"}`}>
                        {check.score}/36
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        {new Date(check.created_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/dashboard?profile=${check.profile_id_1}&compare=${check.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors"
                        >
                          View
                        </Link>
                        <details className="relative">
                          <summary className="text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] cursor-pointer list-none">JSON</summary>
                          <div className="absolute right-0 top-full mt-2 w-96 max-h-96 overflow-y-auto bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded-lg p-4 z-50 text-[10px] font-mono text-left shadow-2xl">
                            <pre className="whitespace-pre-wrap text-muted-foreground">{JSON.stringify(JSON.parse(check.result_json), null, 2)}</pre>
                          </div>
                        </details>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </TabsContent>

      {/* ── Feedback ──────────────────────────────────────────────────────── */}
      <TabsContent value="feedback">
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface-1)] text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium whitespace-nowrap">Rating</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap">User</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap">Message</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap">Page</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {feedback.map((f) => (
                <tr key={String(f.id)} className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]">
                  <td className="px-3 py-2 text-2xl">{String(f.rating || "—")}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{String(f.user_email || "Anonymous")}</td>
                  <td className="px-3 py-2 text-muted-foreground max-w-xs">{String(f.message || "—")}</td>
                  <td className="px-3 py-2 text-muted-foreground font-mono text-xs whitespace-nowrap">{String(f.page_url || "—")}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    {f.created_at ? new Date(String(f.created_at)).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "—"}
                  </td>
                </tr>
              ))}
              {feedback.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">No feedback yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </TabsContent>

      {/* ── Questions ─────────────────────────────────────────────────────── */}
      <TabsContent value="questions">
        <QuestionsTab consultationRequests={consultationRequests} profileNameMap={profileNameMap} />
      </TabsContent>

      {/* ── AI Insights ───────────────────────────────────────────────────── */}
      <TabsContent value="ai-insights">
        {aiInsightStats.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6">No AI insights generated yet.</p>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">Thumbs up/down ratings you gave to generated AI insights per tab.</p>
            <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
              <table className="w-full text-sm">
                <thead className="bg-[var(--color-surface-1)] text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Tab</th>
                    <th className="px-3 py-2 font-medium text-center">Total</th>
                    <th className="px-3 py-2 font-medium text-center text-[var(--color-success)]">
                      <ThumbsUp className="h-3 w-3 inline mr-1" />Up
                    </th>
                    <th className="px-3 py-2 font-medium text-center text-[var(--color-danger)]">
                      <ThumbsDown className="h-3 w-3 inline mr-1" />Down
                    </th>
                    <th className="px-3 py-2 font-medium text-center text-muted-foreground">Unrated</th>
                  </tr>
                </thead>
                <tbody>
                  {aiInsightStats.map((s) => (
                    <tr key={s.engine} className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]">
                      <td className="px-3 py-2 font-medium capitalize">{s.engine.replace("ai-", "")}</td>
                      <td className="px-3 py-2 text-center tabular-nums">{s.total}</td>
                      <td className="px-3 py-2 text-center tabular-nums text-[var(--color-success)]">{s.thumbs_up}</td>
                      <td className="px-3 py-2 text-center tabular-nums text-[var(--color-danger)]">{s.thumbs_down}</td>
                      <td className="px-3 py-2 text-center tabular-nums text-muted-foreground">{s.unrated}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </TabsContent>

      {/* ── LLM Settings ──────────────────────────────────────────────────── */}
      <TabsContent value="llm-settings">
        <LlmSettingsPanel
          initialAiInsights={llmSettings.ai_insights}
          initialChat={llmSettings.chat}
          initialDraft={llmSettings.draft}
          initialTodayReading={llmSettings.today_reading}
        />
      </TabsContent>

      {/* ── App Settings ──────────────────────────────────────────────────── */}
      <TabsContent value="settings">
        <SettingsTab appSettings={appSettings} initialSlots={consultationSlots} />
      </TabsContent>
    </Tabs>
  );
}
