import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { DashboardClient } from "@/app/dashboard/DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ profile?: string }> | { profile?: string }
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin");

  const userId  = (session.user as { id: string }).id;
  const profiles = await db.profiles.list(userId);

  // First-time user: send directly to profile creation
  if (profiles.length === 0) redirect("/profiles/new");

  // Allow deep-linking a specific profile via ?profile=id
  const params = searchParams instanceof Promise ? await searchParams : searchParams;
  const initialProfileId = params?.profile
    ? profiles.find(p => p.id === params.profile)?.id
    : undefined;

  return (
    <DashboardClient
      profiles={profiles}
      initialProfileId={initialProfileId}
    />
  );
}
