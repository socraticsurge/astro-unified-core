"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { Profile } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Search, ChevronUp, ChevronDown, ChevronsUpDown, Trash2, Edit2 } from "lucide-react";

export default function DashboardPage() {
  const { status } = useSession();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortCol, setSortCol] = useState<keyof Profile>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = profiles.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const sorted = [...filtered].sort((a, b) => {
    const aVal = String(a[sortCol] || "");
    const bVal = String(b[sortCol] || "");
    const cmp = aVal.localeCompare(bVal);
    return sortDir === "asc" ? cmp : -cmp;
  });

  const toggleSort = (col: keyof Profile) => {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const renderSortIcon = (col: keyof Profile) => {
    if (sortCol !== col) return <ChevronsUpDown className="ml-1 h-3 w-3 inline opacity-30" />;
    return sortDir === "asc" ? <ChevronUp className="ml-1 h-3 w-3 inline" /> : <ChevronDown className="ml-1 h-3 w-3 inline" />;
  };

  const load = () =>
    fetch("/api/profiles")
      .then((r) => r.json())
      .then((data) => setProfiles(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await Promise.resolve();
      if (cancelled) return;
      if (status === "authenticated") {
        load();
      } else if (status !== "loading") {
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [status]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this profile and all its readings?")) return;
    await fetch(`/api/profiles/${id}`, { method: "DELETE" });
    setProfiles((p) => p.filter((x) => x.id !== id));
  };

  if (loading || status === "loading") {
    return <div className="text-center py-16 text-muted-foreground">Loading…</div>;
  }

  if (profiles.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-16 space-y-6 text-center">
        <p className="text-2xl font-light text-muted-foreground">No profiles yet</p>
        <Link href="/profiles/new"><Button size="lg">Create your first birth profile</Button></Link>
        <div className="text-left border border-white/10 rounded-lg p-5 bg-white/5 mt-8 space-y-2">
          <div className="text-sm font-semibold text-amber-300">A suggestion to get the most out of this</div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Start with your own profile, then add your family — parents, spouse,
            children, siblings — and anyone else whose chart bears on the questions you
            want to bring to a consultation. Astrological forces affect a family as a
            unit, so a fuller picture is more useful than a single chart.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4">
        <h1 className="text-2xl font-bold">Saved Profiles</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search profiles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm min-w-[250px]"
          />
        </div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-white/10" onClick={() => toggleSort("name")}>Name {renderSortIcon("name")}</th>
              <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-white/10" onClick={() => toggleSort("relationship")}>Relation {renderSortIcon("relationship")}</th>
              <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-white/10" onClick={() => toggleSort("gender")}>Gender {renderSortIcon("gender")}</th>
              <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-white/10" onClick={() => toggleSort("date_of_birth")}>Date {renderSortIcon("date_of_birth")}</th>
              <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-white/10" onClick={() => toggleSort("time_of_birth")}>Time {renderSortIcon("time_of_birth")}</th>
              <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-white/10" onClick={() => toggleSort("place_of_birth")}>Place {renderSortIcon("place_of_birth")}</th>
              <th className="px-3 py-2 font-medium whitespace-nowrap cursor-pointer hover:bg-white/10" onClick={() => toggleSort("timezone")}>Timezone {renderSortIcon("timezone")}</th>
              <th className="px-3 py-2 font-medium whitespace-nowrap text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
              <tr key={p.id} className="border-t border-white/10 hover:bg-white/5">
                <td className="px-3 py-2 font-medium whitespace-nowrap">
                  <Link href={`/profiles/${p.id}`} className="hover:underline">{p.name}</Link>
                </td>
                <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{p.relationship || "—"}</td>
                <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{p.gender || "—"}</td>
                <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{p.date_of_birth}</td>
                <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{p.time_of_birth}</td>
                <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                  {p.place_of_birth}
                </td>
                <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                  {p.timezone} (UTC{p.timezone_offset >= 0 ? "+" : ""}{p.timezone_offset})
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/profiles/${p.id}`}>
                      <Button variant="outline" size="sm" className="h-7 text-xs">View</Button>
                    </Link>
                    <Link href={`/profiles/${p.id}/edit`}>
                      <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Edit profile">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(p.id)}
                      className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                      aria-label="Delete profile"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="mt-6 p-4 rounded-lg bg-amber-950/20 border border-amber-700/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="text-sm">
          <span className="font-medium text-amber-300">Profile Usage: </span>
          <span className="text-foreground/90">{profiles.length} out of 10 free profiles created.</span>
        </div>
        <p className="text-xs text-muted-foreground sm:text-right max-w-sm leading-relaxed">
          We encourage you to use your available slots to add family members—parents, spouse, children, or siblings—to get a complete astrological picture!
        </p>
      </div>
    </div>
  );
}
