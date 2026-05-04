"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ProfileForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", date_of_birth: "", time_of_birth: "", place_of_birth: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create profile");
      }
      const profile = await res.json();
      router.push(`/profiles/${profile.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader><CardTitle>New Birth Profile</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" name="name" value={form.name} onChange={handleChange} required placeholder="e.g. Ramanujan" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="date_of_birth">Date of Birth</Label>
            <Input id="date_of_birth" name="date_of_birth" type="date" value={form.date_of_birth} onChange={handleChange} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="time_of_birth">Time of Birth</Label>
            <Input id="time_of_birth" name="time_of_birth" type="time" value={form.time_of_birth} onChange={handleChange} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="place_of_birth">Place of Birth</Label>
            <Input id="place_of_birth" name="place_of_birth" value={form.place_of_birth} onChange={handleChange} required placeholder="e.g. Erode, Tamil Nadu, India" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Geocoding & Saving…" : "Create Profile"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
