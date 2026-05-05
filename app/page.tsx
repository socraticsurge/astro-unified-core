"use client";
import { useEffect, useState } from "react";
import type { Profile } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export default function HomePage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    fetch("/api/profiles")
      .then((r) => r.json())
      .then(setProfiles)
      .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this profile and all its readings?")) return;
    await fetch(`/api/profiles/${id}`, { method: "DELETE" });
    setProfiles((p) => p.filter((x) => x.id !== id));
  };

  if (loading) return <div className="text-center py-16 text-muted-foreground">Loading…</div>;

  if (profiles.length === 0) {
    return (
      <div className="text-center py-16 space-y-4">
        <p className="text-2xl font-light text-muted-foreground">No profiles yet</p>
        <Link href="/profiles/new"><Button>Create your first birth profile</Button></Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Saved Profiles</h1>
      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Time</th>
              <th className="px-3 py-2 font-medium">Place</th>
              <th className="px-3 py-2 font-medium">Timezone</th>
              <th className="px-3 py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.id} className="border-t border-white/10 hover:bg-white/5">
                <td className="px-3 py-2 font-medium">
                  <Link href={`/profiles/${p.id}`} className="hover:underline">{p.name}</Link>
                </td>
                <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{p.date_of_birth}</td>
                <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{p.time_of_birth}</td>
                <td className="px-3 py-2 text-muted-foreground max-w-[24rem] truncate" title={p.place_of_birth}>
                  {p.place_of_birth}
                </td>
                <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                  {p.timezone} (UTC{p.timezone_offset >= 0 ? "+" : ""}{p.timezone_offset})
                </td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <Link href={`/profiles/${p.id}`}>
                    <Button variant="outline" size="sm" className="h-7 text-xs mr-1">View</Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(p.id)}
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    aria-label="Delete profile"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
