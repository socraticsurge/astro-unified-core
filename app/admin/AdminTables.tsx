"use client";

import { useState } from "react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronUp, ChevronDown, ChevronsUpDown, Calendar } from "lucide-react";

export function AdminTables({ users, profiles, feedback, compatibilityChecks }: { users: any[], profiles: any[], feedback: any[], compatibilityChecks: any[] }) {
  const [userSortCol, setUserSortCol] = useState<string>("last_login");
  const [userSortDir, setUserSortDir] = useState<"asc" | "desc">("desc");
  
  const [profileSortCol, setProfileSortCol] = useState<string>("created_at");
  const [profileSortDir, setProfileSortDir] = useState<"asc" | "desc">("desc");

  const [compSortCol, setCompSortCol] = useState<string>("created_at");
  const [compSortDir, setCompSortDir] = useState<"asc" | "desc">("desc");

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

  const renderSortIcon = (currentCol: string, sortCol: string, sortDir: string) => {
    if (sortCol !== currentCol) return <ChevronsUpDown className="ml-1 h-3 w-3 inline opacity-30" />;
    return sortDir === "asc" ? <ChevronUp className="ml-1 h-3 w-3 inline" /> : <ChevronDown className="ml-1 h-3 w-3 inline" />;
  };

  const sortedUsers = [...users].sort((a, b) => {
    const aVal = String(a[userSortCol] || "");
    const bVal = String(b[userSortCol] || "");
    const cmp = aVal.localeCompare(bVal);
    return userSortDir === "asc" ? cmp : -cmp;
  });

  const sortedProfiles = [...profiles].sort((a, b) => {
    const aVal = String(a[profileSortCol] || "");
    const bVal = String(b[profileSortCol] || "");
    const cmp = aVal.localeCompare(bVal);
    return profileSortDir === "asc" ? cmp : -cmp;
  });

  const sortedComps = [...compatibilityChecks].sort((a, b) => {
    const aVal = String(a[compSortCol] || "");
    const bVal = String(b[compSortCol] || "");
    const cmp = aVal.localeCompare(bVal);
    return compSortDir === "asc" ? cmp : -cmp;
  });

  return (
    <Tabs defaultValue="users">
      <TabsList className="mb-4">
        <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
        <TabsTrigger value="profiles">Profiles ({profiles.length})</TabsTrigger>
        <TabsTrigger value="compatibility">Compatibility ({compatibilityChecks.length})</TabsTrigger>
        <TabsTrigger value="feedback">Feedback ({feedback.length})</TabsTrigger>
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
                      <details className="relative">
                        <summary className="text-xs text-sky-400 hover:text-sky-300 cursor-pointer list-none">View JSON</summary>
                        <div className="absolute right-0 top-full mt-2 w-96 max-h-96 overflow-y-auto bg-zinc-950 border border-white/10 rounded-lg p-4 z-50 text-[10px] font-mono text-left shadow-2xl">
                          <pre className="whitespace-pre-wrap text-muted-foreground">{JSON.stringify(JSON.parse(check.result_json), null, 2)}</pre>
                        </div>
                      </details>
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
    </Tabs>
  );
}
