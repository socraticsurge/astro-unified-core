"use client";
import { useEffect, useState } from "react";
import { ProfileCard } from "@/components/ProfileCard";
import type { Profile } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {profiles.map((p) => (
          <ProfileCard key={p.id} profile={p} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
}
