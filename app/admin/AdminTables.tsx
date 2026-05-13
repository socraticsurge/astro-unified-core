"use client";

import { useState } from "react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronUp, ChevronDown, ChevronsUpDown, Calendar, CheckCircle2, ThumbsUp, ThumbsDown } from "lucide-react";
import type { User, ProfileWithUser, CompatibilityCheckWithDetails, Feedback, ConsultationRequestWithUser, AppSettings, ConsultationSlot } from "@/lib/db";
import { assembleStatement } from "@/lib/consultation";

type Props = {
  users: User[];
  profiles: ProfileWithUser[];
  feedback: Feedback[];
  compatibilityChecks: CompatibilityCheckWithDetails[];
  consultationRequests: ConsultationRequestWithUser[];
  consultationSlots: ConsultationSlot[];
  appSettings: AppSettings;
};

export function AdminTables({ users, profiles, feedback, compatibilityChecks, consultationRequests, consultationSlots: initialSlots, appSettings }: Props) {
  const [userSortCol, setUserSortCol] = useState<string>("last_login");
  const [userSortDir, setUserSortDir] = useState<"asc" | "desc">("desc");
  
  const [profileSortCol, setProfileSortCol] = useState<string>("created_at");
  const [profileSortDir, setProfileSortDir] = useState<"asc" | "desc">("desc");

  const [compSortCol, setCompSortCol] = useState<string>("created_at");
  const [compSortDir, setCompSortDir] = useState<"asc" | "desc">("desc");

  const [liveConsultation, setLiveConsultation] = useState(appSettings.live_consultation_enabled);
  const [settingSaving, setSettingSaving] = useState(false);
  const [writtenFeeRs, setWrittenFeeRs] = useState(Math.round(appSettings.written_fee_paise / 100));
  const [liveFeeRs, setLiveFeeRs] = useState(Math.round(appSettings.live_fee_paise / 100));
  const [feeSaving, setFeeSaving] = useState(false);

  const [slots, setSlots] = useState<ConsultationSlot[]>(initialSlots);
  const [newSlotInput, setNewSlotInput] = useState("");
  const [slotAdding, setSlotAdding] = useState(false);
  const [slotDeletingId, setSlotDeletingId] = useState<string | null>(null);

  const addSlot = async () => {
    if (!newSlotInput) return;
    setSlotAdding(true);
    try {
      // Treat input as IST: append +05:30 offset before converting to UTC ISO
      const startsAt = new Date(newSlotInput + ":00+05:30").toISOString();
      const res = await fetch("/api/admin/consultation-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ starts_at: startsAt }),
      });
      if (res.ok) {
        const slot = await res.json() as ConsultationSlot;
        setSlots(prev => [...prev, slot].sort((a, b) => a.starts_at.localeCompare(b.starts_at)));
        setNewSlotInput("");
      }
    } finally {
      setSlotAdding(false);
    }
  };

  const deleteSlot = async (id: string) => {
    setSlotDeletingId(id);
    try {
      const res = await fetch(`/api/admin/consultation-slots?id=${id}`, { method: "DELETE" });
      if (res.ok) setSlots(prev => prev.filter(s => s.id !== id));
    } finally {
      setSlotDeletingId(null);
    }
  };

  const [markingId, setMarkingId] = useState<string | null>(null);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [markedIds, setMarkedIds] = useState<Set<string>>(new Set());
  const [paidIds, setPaidIds] = useState<Set<string>>(new Set());
  const [expandedQId, setExpandedQId] = useState<string | null>(null);

  const [qSortCol, setQSortCol] = useState<string>("created_at");
  const [qSortDir, setQSortDir] = useState<"asc" | "desc">("desc");
  const toggleQSort = (col: string) => {
    if (qSortCol === col) setQSortDir(d => d === "asc" ? "desc" : "asc");
    else { setQSortCol(col); setQSortDir("asc"); }
  };

  const toggleUserSort = (col: string) => {
    if (userSortCol === col) setUserSortDir(d => d === "asc" ? "desc" : "asc");
    else { setUserSortCol(col); setUserSortDir("asc"); }
  };

  const toggleProfileSort = (col: string) => {
    if (profileSortCol === col) setProfileSortDir(d => d === "asc" ? "desc" : "asc");
    else { setProfileSortCol(col); setProfileSortDir("asc"); }
  };

  const toggleCompSort = (col: string) => {
    if (compSortCol === col) setCompSortDir(d => d === "asc" ? "desc" : "asc");
    else { setCompSortCol(col); setCompSortDir("asc"); }
  };

  const saveFees = async () => {
    setFeeSaving(true);
    try {
      await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          written_fee_paise: writtenFeeRs * 100,
          live_fee_paise: liveFeeRs * 100,
        }),
      });
    } finally {
      setFeeSaving(false);
    }
  };

  const toggleLiveConsultation = async () => {
    setSettingSaving(true);
    const next = !liveConsultation;
    try {
      await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ live_consultation_enabled: next }),
      });
      setLiveConsultation(next);
    } finally {
      setSettingSaving(false);
    }
  };

  const markPaid = async (id: string) => {
    setMarkingPaidId(id);
    try {
      const res = await fetch(`/api/admin/consultation-requests?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_paid" }),
      });
      if (res.ok) setPaidIds(prev => new Set([...prev, id]));
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
      if (res.ok) setMarkedIds(prev => new Set([...prev, id]));
    } finally {
      setMarkingId(null);
    }
  };

  const renderSortIcon = (currentCol: string, sortCol: string, sortDir: string) => {
    if (sortCol !== currentCol) return <ChevronsUpDown className="ml-1 h-3 w-3 inline opacity-30" />;
    return sortDir === "asc" ? <ChevronUp className="ml-1 h-3 w-3 inline" /> : <ChevronDown className="ml-1 h-3 w-3 inline" />;
  };

  function sortBy<T>(arr: T[], col: string, dir: "asc" | "desc"): T[] {
    return [...arr].sort((a, b) => {
      const aVal = String((a as Record<string, unknown>)[col] ?? "");
      const bVal = String((b as Record<string, unknown>)[col] ?? "");
      const cmp = aVal.localeCompare(bVal);
      return dir === "asc" ? cmp : -cmp;
    });
  }

  const sortedUsers = sortBy(users, userSortCol, userSortDir);
  const sortedProfiles = sortBy(profiles, profileSortCol, profileSortDir);
  const sortedComps = sortBy(compatibilityChecks, compSortCol, compSortDir);
  const sortedQuestions = sortBy(consultationRequests, qSortCol, qSortDir);

  const profileNameMap = new Map(profiles.map(p => [p.id, p.name]));
  function resolveProfileIds(profileIdsJson: string): Array<{ id: string; name: string }> {
    try {
      const ids: string[] = JSON.parse(profileIdsJson);
      return ids.map(id => ({ id, name: profileNameMap.get(id) ?? "Deleted" }));
    } catch {
      return [];
    }
  }

  return (
    <Tabs defaultValue="users">
      <TabsList className="mb-4 flex-wrap h-auto">
        <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
        <TabsTrigger value="profiles">Profiles ({profiles.length})</TabsTrigger>
        <TabsTrigger value="compatibility">Compatibility ({compatibilityChecks.length})</TabsTrigger>
        <TabsTrigger value="feedback">Feedback ({feedback.length})</TabsTrigger>
        <TabsTrigger value="questions">
          Questions ({consultationRequests.filter(r => r.status !== "answered").length} active)
        </TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>

      <TabsContent value="users">
        {/* ... (existing user table) */}
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium cursor-pointer hover:bg-white/10" onClick={() => toggleUserSort("name")}>Name {renderSortIcon("name", userSortCol, userSortDir)}</th>
                <th className="px-3 py-2 font-medium cursor-pointer hover:bg-white/10" onClick={() => toggleUserSort("email")}>Email {renderSortIcon("email", userSortCol, userSortDir)}</th>
                <th className="px-3 py-2 font-medium cursor-pointer hover:bg-white/10" onClick={() => toggleUserSort("id")}>User ID {renderSortIcon("id", userSortCol, userSortDir)}</th>
                <th className="px-3 py-2 font-medium cursor-pointer hover:bg-white/10" onClick={() => toggleUserSort("created_at")}>Created {renderSortIcon("created_at", userSortCol, userSortDir)}</th>
                <th className="px-3 py-2 font-medium cursor-pointer hover:bg-white/10" onClick={() => toggleUserSort("last_login")}>Last Login {renderSortIcon("last_login", userSortCol, userSortDir)}</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((u) => (
                <tr key={String(u.id)} className="border-t border-white/10 hover:bg-white/5">
                  <td className="px-3 py-2 font-medium">{String(u.name || "—")}</td>
                  <td className="px-3 py-2 text-muted-foreground">{String(u.email || "—")}</td>
                  <td className="px-3 py-2 text-muted-foreground font-mono text-xs">{String(u.id)}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    {u.created_at ? new Date(String(u.created_at)).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    {u.last_login ? new Date(String(u.last_login)).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : "—"}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No users yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </TabsContent>

      <TabsContent value="profiles">
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-white/10" onClick={() => toggleProfileSort("name")}>Profile {renderSortIcon("name", profileSortCol, profileSortDir)}</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-white/10" onClick={() => toggleProfileSort("user_name")}>Owner Name {renderSortIcon("user_name", profileSortCol, profileSortDir)}</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-white/10" onClick={() => toggleProfileSort("user_email")}>Owner Email {renderSortIcon("user_email", profileSortCol, profileSortDir)}</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-white/10" onClick={() => toggleProfileSort("relationship")}>Relation {renderSortIcon("relationship", profileSortCol, profileSortDir)}</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-white/10" onClick={() => toggleProfileSort("gender")}>Gender {renderSortIcon("gender", profileSortCol, profileSortDir)}</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-white/10" onClick={() => toggleProfileSort("date_of_birth")}>Date of Birth {renderSortIcon("date_of_birth", profileSortCol, profileSortDir)}</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-white/10" onClick={() => toggleProfileSort("time_of_birth")}>Time of Birth {renderSortIcon("time_of_birth", profileSortCol, profileSortDir)}</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-white/10" onClick={() => toggleProfileSort("place_of_birth")}>Place {renderSortIcon("place_of_birth", profileSortCol, profileSortDir)}</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-white/10" onClick={() => toggleProfileSort("created_at")}>Created {renderSortIcon("created_at", profileSortCol, profileSortDir)}</th>
              </tr>
            </thead>
            <tbody>
              {sortedProfiles.map((p) => (
                <tr key={p.id} className="border-t border-white/10 hover:bg-white/5">
                  <td className="px-3 py-2 font-medium whitespace-nowrap">
                    <Link href={`/profiles/${p.id}`} className="hover:underline text-amber-300">
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{p.user_name || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{p.user_email || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{p.relationship || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{p.gender || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{p.date_of_birth}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{p.time_of_birth}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    {p.place_of_birth}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    {p.created_at ? new Date(p.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : "—"}
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

      <TabsContent value="compatibility">
        <div className="flex justify-end mb-4">
          <button 
            onClick={async () => {
              if (confirm("Are you sure you want to clear ALL compatibility checks? This cannot be undone.")) {
                const res = await fetch("/api/admin/clear-compatibility");
                const data = await res.json();
                if (data.success) {
                  alert(data.message);
                  window.location.reload();
                } else {
                  alert(data.error || "Failed to clear history");
                }
              }
            }}
            className="text-xs text-red-400 hover:text-red-300 border border-red-900/50 bg-red-950/20 px-3 py-1.5 rounded-md transition-colors"
          >
            Clear History
          </button>
        </div>
        <div className="overflow-x-auto rounded-lg border border-white/10 bg-white/5">
          <table className="w-full text-sm text-left">
            <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-white/10" onClick={() => toggleCompSort("user_email")}>User {renderSortIcon("user_email", compSortCol, compSortDir)}</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-white/10" onClick={() => toggleCompSort("p1_name")}>Male Profile {renderSortIcon("p1_name", compSortCol, compSortDir)}</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-white/10" onClick={() => toggleCompSort("p2_name")}>Female Profile {renderSortIcon("p2_name", compSortCol, compSortDir)}</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-white/10" onClick={() => toggleCompSort("score")}>Score {renderSortIcon("score", compSortCol, compSortDir)}</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-white/10" onClick={() => toggleCompSort("created_at")}>Date {renderSortIcon("created_at", compSortCol, compSortDir)}</th>
                <th className="px-3 py-2 font-medium text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {sortedComps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground italic">
                    No compatibility checks recorded yet.
                  </td>
                </tr>
              ) : (
                sortedComps.map((check) => (
                  <tr key={check.id} className="hover:bg-white/5">
                    <td className="px-4 py-3 font-medium text-white">{check.user_email || "Unknown User"}</td>
                    <td className="px-4 py-3">{check.p1_name || "Deleted Profile"}</td>
                    <td className="px-4 py-3">{check.p2_name || "Deleted Profile"}</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${check.score >= 18 ? "text-green-400" : "text-amber-400"}`}>
                        {check.score}/36
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        {new Date(check.created_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link href={`/compatibility/${check.id}`} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
                          View
                        </Link>
                        <details className="relative">
                          <summary className="text-xs text-sky-400 hover:text-sky-300 cursor-pointer list-none">JSON</summary>
                          <div className="absolute right-0 top-full mt-2 w-96 max-h-96 overflow-y-auto bg-zinc-950 border border-white/10 rounded-lg p-4 z-50 text-[10px] font-mono text-left shadow-2xl">
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

      <TabsContent value="feedback">
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-muted-foreground">
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
                <tr key={String(f.id)} className="border-t border-white/10 hover:bg-white/5">
                  <td className="px-3 py-2 text-2xl">{String(f.rating || "—")}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{String(f.user_email || "Anonymous")}</td>
                  <td className="px-3 py-2 text-muted-foreground max-w-xs">{String(f.message || "—")}</td>
                  <td className="px-3 py-2 text-muted-foreground font-mono text-xs whitespace-nowrap">{String(f.page_url || "—")}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    {f.created_at ? new Date(String(f.created_at)).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : "—"}
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
      <TabsContent value="questions">
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-white/10" onClick={() => toggleQSort("user_email")}>User {renderSortIcon("user_email", qSortCol, qSortDir)}</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-white/10" onClick={() => toggleQSort("life_area")}>Life Area {renderSortIcon("life_area", qSortCol, qSortDir)}</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap">Profile(s)</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-white/10" onClick={() => toggleQSort("delivery_mode")}>Mode {renderSortIcon("delivery_mode", qSortCol, qSortDir)}</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-white/10" onClick={() => toggleQSort("created_at")}>Date {renderSortIcon("created_at", qSortCol, qSortDir)}</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap">Ref</th>
                <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-white/10" onClick={() => toggleQSort("status")}>Status {renderSortIcon("status", qSortCol, qSortDir)}</th>
                <th className="px-3 py-2 font-medium text-right whitespace-nowrap">Details</th>
              </tr>
            </thead>
            <tbody>
              {sortedQuestions.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">No consultation requests yet.</td>
                </tr>
              )}
              {sortedQuestions.map(req => {
                const effectiveStatus = markedIds.has(req.id) ? "answered" : paidIds.has(req.id) ? "paid" : req.status;
                const isDone = effectiveStatus === "answered";
                const isPaid = effectiveStatus === "paid";
                const awaitingPayment = !isDone && !isPaid; // pending_payment or legacy pending
                const isExpanded = expandedQId === req.id;
                const profileList = resolveProfileIds(req.profile_ids);
                return (
                  <>
                    <tr
                      key={req.id}
                      className={`border-t border-white/10 hover:bg-white/5 ${isDone ? "opacity-60" : ""}`}
                    >
                      <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap text-xs">{req.user_email ?? "—"}</td>
                      <td className="px-3 py-2.5 font-medium whitespace-nowrap">{req.life_area}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {profileList.map(p => (
                            <Link
                              key={p.id}
                              href={`/profiles/${p.id}`}
                              className="text-xs text-amber-300/80 hover:text-amber-300 hover:underline whitespace-nowrap"
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
                              <div className="text-[10px] text-amber-300/70 mt-0.5">
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
                          {isDone && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-900/30 text-green-400">Answered</span>}
                          {isPaid && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-400">Paid</span>}
                          {awaitingPayment && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-900/30 text-amber-400">Awaiting Payment</span>}
                          {req.user_rating === "helpful" && <ThumbsUp className="h-3 w-3 text-green-400" />}
                          {req.user_rating === "not_helpful" && <ThumbsDown className="h-3 w-3 text-red-400" />}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <button
                          onClick={() => setExpandedQId(isExpanded ? null : req.id)}
                          className="text-xs text-sky-400 hover:text-sky-300 transition-colors"
                        >
                          {isExpanded ? "Close" : "View"}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${req.id}-detail`} className="border-t border-white/5">
                        <td colSpan={8} className="px-4 py-4 bg-white/[0.02]">
                          <div className="space-y-3 max-w-2xl">
                            <div>
                              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Question</p>
                              <p className="text-sm text-foreground/80 leading-relaxed">
                                {assembleStatement(req.observation, req.constraint_text, req.objective, req.options)}
                              </p>
                            </div>
                            {req.delivery_mode === "appointment" && req.slot_starts_at && (
                              <div className="rounded-md border border-amber-700/30 bg-amber-900/20 px-3 py-2">
                                <p className="text-xs uppercase tracking-wider text-amber-400 mb-0.5">Selected Slot</p>
                                <p className="text-xs text-foreground/70">
                                  {new Date(req.slot_starts_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true })} IST
                                </p>
                              </div>
                            )}
                            {req.admin_note && (
                              <div className="rounded-md border border-green-700/30 bg-green-900/20 px-3 py-2">
                                <p className="text-xs uppercase tracking-wider text-green-400 mb-0.5">Your note</p>
                                <p className="text-xs text-foreground/70">{req.admin_note}</p>
                              </div>
                            )}
                            {req.user_rating && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {req.user_rating === "helpful"
                                  ? <ThumbsUp className="h-3 w-3 text-green-400" />
                                  : <ThumbsDown className="h-3 w-3 text-red-400" />}
                                <span>User feedback: {req.user_rating === "helpful" ? "Helpful" : "Not helpful"}</span>
                                {req.user_feedback_note && <span>— "{req.user_feedback_note}"</span>}
                              </div>
                            )}
                            {awaitingPayment && (
                              <button
                                disabled={markingPaidId === req.id}
                                onClick={() => markPaid(req.id)}
                                className="flex items-center gap-1.5 text-xs bg-blue-700/20 hover:bg-blue-700/30 border border-blue-700/40 text-blue-400 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {markingPaidId === req.id ? "Saving…" : "Mark as Paid"}
                              </button>
                            )}
                            {isPaid && (
                              <div className="space-y-2 pt-1">
                                <textarea
                                  rows={2}
                                  placeholder="Optional: add a written note or answer for the user"
                                  value={adminNotes[req.id] ?? ""}
                                  onChange={e => setAdminNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
                                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-amber-400/50 resize-none"
                                />
                                <button
                                  disabled={markingId === req.id}
                                  onClick={() => markAnswered(req.id)}
                                  className="flex items-center gap-1.5 text-xs bg-green-700/20 hover:bg-green-700/30 border border-green-700/40 text-green-400 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
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
      </TabsContent>

      <TabsContent value="settings">
        <div className="max-w-md space-y-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">App Settings</h2>

          {/* Consultation pricing */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-4">
            <p className="text-sm font-medium">Consultation Pricing</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Written Response (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={writtenFeeRs}
                  onChange={e => setWrittenFeeRs(parseInt(e.target.value, 10) || 0)}
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-amber-400/50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Live Consultation (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={liveFeeRs}
                  onChange={e => setLiveFeeRs(parseInt(e.target.value, 10) || 0)}
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-amber-400/50"
                />
              </div>
            </div>
            <button
              disabled={feeSaving}
              onClick={saveFees}
              className="text-xs bg-amber-700/20 hover:bg-amber-700/30 border border-amber-700/40 text-amber-400 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
            >
              {feeSaving ? "Saving…" : "Save Pricing"}
            </button>
          </div>

          {/* Live consultation toggle */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Live Consultation Option</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                When ON, users see "Live Consultation" as a delivery mode when submitting questions.
              </p>
            </div>
            <button
              disabled={settingSaving}
              onClick={toggleLiveConsultation}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50 ${liveConsultation ? "bg-amber-500" : "bg-white/20"}`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${liveConsultation ? "translate-x-5" : "translate-x-0"}`}
              />
            </button>
          </div>

          {/* Slot management */}
          <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-4">
            <div>
              <p className="text-sm font-medium">Live Consultation Slots</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enter date and time in IST. Users only see slots at least 5 days away that are not yet booked.
              </p>
            </div>
            <div className="flex gap-2 items-end">
              <div className="space-y-1 flex-1">
                <label className="text-xs text-muted-foreground">Date &amp; Time (IST)</label>
                <input
                  type="datetime-local"
                  value={newSlotInput}
                  onChange={e => setNewSlotInput(e.target.value)}
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-amber-400/50"
                />
              </div>
              <button
                disabled={!newSlotInput || slotAdding}
                onClick={addSlot}
                className="text-xs bg-amber-700/20 hover:bg-amber-700/30 border border-amber-700/40 text-amber-400 px-3 py-2 rounded-md transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {slotAdding ? "Adding…" : "Add Slot"}
              </button>
            </div>
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {slots.length === 0 && (
                <p className="text-xs text-muted-foreground py-2">No slots created yet.</p>
              )}
              {slots.map(slot => {
                const isPast = new Date(slot.starts_at) < new Date();
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
                  <div
                    key={slot.id}
                    className={`flex items-center justify-between px-3 py-1.5 rounded-md border ${
                      isPast ? "border-white/5 bg-white/[0.02] opacity-50" : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs">{label} IST</span>
                      {slot.is_booked ? (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-900/30 text-green-400">Booked</span>
                      ) : isPast ? (
                        <span className="text-[10px] text-muted-foreground">Past</span>
                      ) : (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-900/30 text-amber-400">Available</span>
                      )}
                    </div>
                    {!slot.is_booked && (
                      <button
                        disabled={slotDeletingId === slot.id}
                        onClick={() => deleteSlot(slot.id)}
                        className="text-[10px] text-red-400/70 hover:text-red-400 transition-colors disabled:opacity-50 ml-3"
                      >
                        {slotDeletingId === slot.id ? "…" : "Delete"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
