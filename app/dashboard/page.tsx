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
  const filtered = profiles.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const sorted = [...filtered].sort((a, b) => {
    // Default to sorting by created_at descending (newest first)
    const aVal = String(a.created_at || "");
    const bVal = String(b.created_at || "");
    return bVal.localeCompare(aVal);
  });

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
        <Link href="/profiles/new">
          <Button size="lg" className="font-semibold shadow-md bg-amber-500 hover:bg-amber-600 text-amber-950">
            Create your first birth profile
          </Button>
        </Link>
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
    <div className="space-y-8">
      {/* Hero CTA & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <Link href="/profiles/new" className="w-full sm:w-auto">
          <Button size="lg" className="w-full sm:w-auto font-semibold shadow-md bg-amber-500 hover:bg-amber-600 text-amber-950">
            + Create New Profile
          </Button>
        </Link>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search profiles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-700 rounded-md text-sm"
          />
        </div>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map((p) => (
          <div key={p.id} className="group relative flex flex-col bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:bg-white/10 transition-colors">
            
            {/* Card Header */}
            <div className="p-4 border-b border-white/5 flex items-start justify-between gap-2">
              <div>
                <h3 className="font-heading text-xl font-semibold text-foreground line-clamp-1">
                  {p.name}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  {p.relationship && (
                    <span className="inline-flex items-center rounded-full bg-amber-900/30 px-2 py-0.5 text-[10px] font-medium text-amber-300 ring-1 ring-inset ring-amber-900/50">
                      {p.relationship}
                    </span>
                  )}
                  {p.gender && (
                    <span className="inline-flex items-center rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-300 ring-1 ring-inset ring-zinc-700">
                      {p.gender}
                    </span>
                  )}
                </div>
              </div>
              <Link href={`/profiles/${p.id}`} className="shrink-0">
                <Button variant="secondary" size="sm" className="h-8 text-xs font-medium">
                  View Chart
                </Button>
              </Link>
            </div>

            {/* Card Body */}
            <div className="p-4 space-y-2 text-sm text-muted-foreground flex-1">
              <div className="flex items-center justify-between">
                <span>Date:</span>
                <span className="text-foreground/90 font-medium">{p.date_of_birth}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Time:</span>
                <span className="text-foreground/90 font-medium">{p.time_of_birth}</span>
              </div>
              <div className="pt-2 border-t border-white/5">
                <div className="text-xs text-muted-foreground mb-0.5">Place of Birth</div>
                <div className="text-foreground/90 font-medium line-clamp-2 leading-tight">
                  {p.place_of_birth}
                </div>
              </div>
            </div>

            {/* Card Footer */}
            <div className="px-4 py-3 bg-black/20 border-t border-white/5 flex items-center justify-between">
              <div className="text-[10px] text-muted-foreground/60 font-mono">
                {p.timezone} (UTC{p.timezone_offset >= 0 ? "+" : ""}{p.timezone_offset})
              </div>
              <div className="flex items-center gap-1">
                <Link href={`/profiles/${p.id}/edit`}>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(p.id)}
                  className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
        {sorted.length === 0 && searchQuery && (
          <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed border-white/10 rounded-xl">
            No profiles match your search.
          </div>
        )}
      </div>
      
      <div className="p-4 rounded-lg bg-amber-950/20 border border-amber-700/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
