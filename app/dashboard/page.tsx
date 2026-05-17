import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { ProfileList } from "@/components/dashboard/ProfileList";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin");

  const userId = (session.user as { id: string }).id;
  const profiles = await db.profiles.list(userId);

  // Skip the list when there's only one profile — go straight to the chart.
  if (profiles.length === 1) redirect(`/profiles/${profiles[0].id}`);

  return <ProfileList initialProfiles={profiles} />;
}
