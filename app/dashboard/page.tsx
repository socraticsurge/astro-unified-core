import { getServerSession } from "next-auth/next";
import { authOptions, getUserId } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { DashboardClient } from "@/app/dashboard/DashboardClient";
import type { Profile, CompatibilityCheck } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ profile?: string; compare?: string; new?: string }> | { profile?: string; compare?: string; new?: string }
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin");

  const userId = getUserId(session);
  const adminUser = isAdmin(session);
  const params = searchParams instanceof Promise ? await searchParams : searchParams;

  const [ownProfiles, appSettings] = await Promise.all([
    db.profiles.list(userId),
    db.settings.getAll(),
  ]);

  let profiles: Profile[] = ownProfiles;
  let initialProfileId: string | undefined;
  let initialCompareCheck: CompatibilityCheck | undefined;

  if (adminUser && params?.profile && !ownProfiles.some(p => p.id === params.profile)) {
    // Admin viewing another user's profile — load it regardless of ownership
    const viewedProfile = await db.profiles.getAny(params.profile);
    if (!viewedProfile) redirect("/admin");

    profiles = [viewedProfile];
    initialProfileId = viewedProfile.id;

    if (params?.compare) {
      const check = await db.compatibility.getAny(params.compare);
      if (check) {
        initialCompareCheck = check;
        const partnerId = check.profile_id_1 === viewedProfile.id
          ? check.profile_id_2
          : check.profile_id_1;
        const partnerProfile = await db.profiles.getAny(partnerId);
        if (partnerProfile) profiles = [viewedProfile, partnerProfile];
      }
    }
  } else {
    if (ownProfiles.length === 0) redirect("/profiles/new");
    initialProfileId = params?.profile
      ? ownProfiles.find(p => p.id === params.profile)?.id
      : undefined;
  }

  return (
    <DashboardClient
      profiles={profiles}
      initialProfileId={initialProfileId}
      isAdmin={adminUser}
      isNewProfile={params?.new === "1"}
      initialCompareCheck={initialCompareCheck}
      appSettings={{
        writtenEnabled: appSettings.written_consultation_enabled,
        liveEnabled: appSettings.live_consultation_enabled,
        writtenFeePaise: appSettings.written_fee_paise,
        liveFeePaise: appSettings.live_fee_paise,
      }}
    />
  );
}
