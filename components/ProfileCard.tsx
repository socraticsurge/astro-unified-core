"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import Link from "next/link";
import type { Profile } from "@/lib/db";

type Props = { profile: Profile; onDelete: (id: string) => void };

export function ProfileCard({ profile, onDelete }: Props) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">{profile.name}</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(profile.id)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>DOB: {profile.date_of_birth} at {profile.time_of_birth}</p>
          <p>Place: {profile.place_of_birth}</p>
          <p>Timezone: {profile.timezone}</p>
        </div>
        <div className="mt-3 flex gap-2">
          <Badge variant="secondary">{profile.latitude.toFixed(2)}°N</Badge>
          <Badge variant="secondary">{profile.longitude.toFixed(2)}°E</Badge>
        </div>
        <Link href={`/profiles/${profile.id}`}>
          <Button className="mt-4 w-full" variant="default">View Chart</Button>
        </Link>
      </CardContent>
    </Card>
  );
}
