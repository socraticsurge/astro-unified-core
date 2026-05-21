"use client";
import { useEffect, useState } from "react";
import type { Profile } from "@/lib/db";

function safeJson(text: string): { id?: string; error?: string } | null {
  try { return JSON.parse(text); } catch { return null; }
}

// Today's date in YYYY-MM-DD format. Used as the `max` attribute on the
// DOB input so the browser blocks future dates at the picker level. The
// server should still validate independently — clients can bypass `max`
// by editing the input directly.
function todayIsoDate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export function ProfileForm({ initialData }: { initialData?: Partial<Profile> }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: initialData?.name || "", 
    date_of_birth: initialData?.date_of_birth || "", 
    time_of_birth: initialData?.time_of_birth || "", 
    place_of_birth: initialData?.place_of_birth || "",
    current_location: initialData?.current_location || "",
    gender: initialData?.gender || "",
    relationship: initialData?.relationship || "",
  });

  // Pre-warm the Python sidecar so the chart fetches faster after submit.
  useEffect(() => {
    fetch("/api/sidecar-warmup").catch(() => {});
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const isEdit = !!initialData?.id;
      const endpoint = isEdit ? `/api/profiles/${initialData.id}` : "/api/profiles";
      
      const res = await fetch(endpoint, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const text = await res.text();
      const data = text ? safeJson(text) : null;
      if (!res.ok) {
        throw new Error(data?.error ?? `Failed (${res.status} ${res.statusText})`);
      }
      if (!data?.id) throw new Error("Server returned unexpected response");
      // New profiles: ?new=1 triggers the loading screen in DashboardClient
      router.push(isEdit ? `/dashboard?profile=${data.id}` : `/dashboard?profile=${data.id}&new=1`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-lg mx-auto">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
            <Input id="name" name="name" value={form.name} onChange={handleChange} required maxLength={100} placeholder="e.g. Ramanujan" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="relationship">Relationship <span className="text-destructive">*</span></Label>
              <select 
                id="relationship" 
                name="relationship" 
                value={form.relationship} 
                onChange={handleChange}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="" disabled>Select...</option>
                <option value="Self">Self</option>
                <option value="Spouse">Spouse</option>
                <option value="Child">Child</option>
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Sibling">Sibling</option>
                <option value="Friend">Friend</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="gender">Gender <span className="text-destructive">*</span></Label>
              <select 
                id="gender" 
                name="gender" 
                value={form.gender} 
                onChange={handleChange}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="" disabled>Select...</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="date_of_birth">Date of Birth <span className="text-destructive">*</span></Label>
            <Input id="date_of_birth" name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleChange} max={todayIsoDate()} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="time_of_birth">Time of Birth <span className="text-destructive">*</span></Label>
            <Input id="time_of_birth" name="time_of_birth" type="time" value={form.time_of_birth} onChange={handleChange} required />
            <p className="text-xs text-muted-foreground pt-1">
              24-hour format — for example, 14:30 means 2:30 PM. Use the most accurate
              time you have; even a 5-minute difference can shift the Lagna.
            </p>
          </div>
          <div className="space-y-4 pt-2 border-t border-[var(--color-border)]">
            <div className="space-y-1">
              <Label htmlFor="place_of_birth">Place of Birth <span className="text-destructive">*</span></Label>
              <Input id="place_of_birth" name="place_of_birth" value={form.place_of_birth} onChange={handleChange} required maxLength={100} placeholder="e.g. Erode, Tamil Nadu, India" />
              <p className="text-xs text-muted-foreground pt-1">
                Tip: if your village or town isn&apos;t recognized, use the nearest larger city or
                district headquarters. Lagna calculations are usually unaffected by small
                distance differences.
              </p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="current_location">Current City / Location</Label>
              <Input id="current_location" name="current_location" value={form.current_location} onChange={handleChange} maxLength={100} placeholder="e.g. Chennai, Tamil Nadu, India" />
              <p className="text-xs text-muted-foreground pt-1">
                Required for accurate Muhurtha and transit calculations.
              </p>
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving…" : initialData?.id ? "Save Changes" : "Create Profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
