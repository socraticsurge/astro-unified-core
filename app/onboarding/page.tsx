import { getServerSession } from "next-auth/next";
import { authOptions, getUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { OnboardingClient } from "./OnboardingClient";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin");

  const userId = getUserId(session);
  const profiles = await db.profiles.list(userId);

  // Already has profiles — send to dashboard
  if (profiles.length > 0) redirect("/dashboard");

  const googleName = session.user.name ?? "";

  return <OnboardingClient googleName={googleName} />;
}
