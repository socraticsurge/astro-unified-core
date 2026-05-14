import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { CompatibilityClient } from "@/components/compatibility/CompatibilityClient";

export const dynamic = "force-dynamic";

export default async function CompatibilityPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin");

  const userId = (session.user as { id: string }).id;
  const [profiles, checks] = await Promise.all([
    db.profiles.list(userId),
    db.compatibility.list(userId),
  ]);

  return <CompatibilityClient initialProfiles={profiles} initialChecks={checks} />;
}
