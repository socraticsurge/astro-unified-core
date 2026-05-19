import { getServerSession } from "next-auth/next";
import { authOptions, getUserId } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { redirect, notFound } from "next/navigation";
import { CompatibilityDetailClient } from "./CompatibilityDetailClient";

export const dynamic = "force-dynamic";

export default async function CompatibilityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin");

  const { id } = await params;
  const userId = getUserId(session);
  const admin = isAdmin(session);

  const check = admin
    ? await db.compatibility.getAny(id)
    : await db.compatibility.get(id, userId);

  if (!check) notFound();

  const [profile1, profile2] = await Promise.all([
    db.profiles.getAny(check.profile_id_1),
    db.profiles.getAny(check.profile_id_2),
  ]);

  return (
    <CompatibilityDetailClient
      check={check}
      profile1={profile1 ?? null}
      profile2={profile2 ?? null}
    />
  );
}
