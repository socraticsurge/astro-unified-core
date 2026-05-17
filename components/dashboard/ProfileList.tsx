"use client";
import { useState, useMemo } from "react";
import type { Profile } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Search, Trash2, Edit2 } from "lucide-react";
import { ProfileBadges, BirthDetails } from "@/components/profile-ui";
import { fonts, scale, textStyles } from "@/lib/typography";
import { NAV_CONFIG } from "@/lib/nav";

const { pageTitle } = NAV_CONFIG.find(n => n.href === "/dashboard")!;

export function ProfileList({ initialProfiles }: { initialProfiles: Profile[] }) {
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const filtered = profiles.filter((p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return [...filtered].sort((a, b) =>
      String(b.created_at || "").localeCompare(String(a.created_at || ""))
    );
  }, [profiles, searchQuery]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this profile and all its readings?")) return;
    setDeleteError(null);
    const res = await fetch(`/api/profiles/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setDeleteError("Failed to delete profile. Please try again.");
      return;
    }
    setProfiles((p) => p.filter((x) => x.id !== id));
  };

  if (profiles.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 style={{ ...fonts.display, fontSize: scale.pageTitle, letterSpacing: "0.02em", lineHeight: 1.2 }}>
          {pageTitle}
        </h1>
        <p className="text-sm text-muted-foreground">
          Your birth profiles and their Vedic charts.
        </p>
        <Link href="/profiles/new">
          <Button size="lg" className="font-semibold shadow-md bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-bg)]">
            Create your first birth profile
          </Button>
        </Link>
        <div className="border border-[var(--color-border)] rounded-xl p-5 bg-[var(--color-surface-1)] space-y-2">
          <div className="text-sm font-semibold text-[var(--color-accent)]">A suggestion</div>
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
    <div className="space-y-5">
      {deleteError && (
        <div className="p-3 rounded-lg bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/40 text-[var(--color-danger)] text-sm">
          {deleteError}
        </div>
      )}

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 style={{ ...fonts.display, fontSize: scale.pageTitle, letterSpacing: "0.02em", lineHeight: 1.2 }}>
            {pageTitle}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your birth profiles and their Vedic charts.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-44 pl-9 pr-4 py-2 bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent-dim)]"
            />
          </div>
          <Link href="/profiles/new">
            <Button size="sm" className="font-semibold bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-bg)] shrink-0">
              + New
            </Button>
          </Link>
        </div>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sorted.map((p) => (
          <div key={p.id} className="group relative flex flex-col bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-xl overflow-hidden hover:bg-[var(--color-surface-hover)] transition-colors">
            <div className="p-4 border-b border-[var(--color-border-subtle)] flex items-start justify-between gap-2">
              <div>
                <h3 className="font-heading text-xl font-semibold text-foreground line-clamp-1">
                  {p.name}
                </h3>
                <ProfileBadges
                  relationship={p.relationship}
                  gender={p.gender}
                  current_location={p.current_location}
                  profileId={p.id}
                />
              </div>
              <Link href={`/profiles/${p.id}`} className="shrink-0">
                <Button variant="secondary" size="sm" className="h-8 text-xs font-medium">
                  View Chart
                </Button>
              </Link>
            </div>

            <div className="p-4 flex-1">
              <BirthDetails
                date_of_birth={p.date_of_birth}
                time_of_birth={p.time_of_birth}
                place_of_birth={p.place_of_birth}
                timezone={p.timezone}
                timezone_offset={p.timezone_offset}
              />
            </div>

            <div className="px-4 py-3 bg-[var(--color-bg)]/60 border-t border-[var(--color-border-subtle)] flex items-center justify-between">
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
          <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed border-[var(--color-border)] rounded-xl">
            No profiles match your search.
          </div>
        )}
      </div>

      <div className="p-4 rounded-lg bg-[var(--color-accent-faint)] border border-[var(--color-accent-dim)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="text-sm">
          <span className="font-medium text-[var(--color-accent)]">Profile Usage: </span>
          <span className="text-foreground/90">{profiles.length} out of 10 free profiles created.</span>
        </div>
        <p className="text-xs text-muted-foreground sm:text-right max-w-sm leading-relaxed">
          We encourage you to use your available slots to add family members—parents, spouse, children, or siblings—to get a complete astrological picture!
        </p>
      </div>
    </div>
  );
}
