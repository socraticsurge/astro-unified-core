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

  return <ProfileList initialProfiles={profiles} />;
}
