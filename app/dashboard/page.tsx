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
  searchParams?:
    | Promise<{ profile?: string; compare?: string; new?: string; create?: string }>
    | { profile?: string; compare?: string; new?: string; create?: string };
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
    // Empty-profile users go straight into create mode — the sidebar renders
    // the inline create form. No more separate /profiles/new screen.
    initialProfileId = params?.profile
      ? ownProfiles.find(p => p.id === params.profile)?.id
      : undefined;
  }

  const isCreating = params?.create === "1" || (!adminUser && ownProfiles.length === 0);
  const isNewProfile = params?.new === "1";

  // `key` forces DashboardClient to remount whenever the URL meaningfully
  // changes — new profile selection (e.g. post-create redirect), entering or
  // leaving the create flow, or the `new=1` loading-screen flag. Without
  // this, React keeps the same useState values across navigation and the
  // user sees the previously-active profile's chart instead of the freshly
  // created profile + its loading screen.
  const dashboardKey = `${initialProfileId ?? "none"}|${isCreating ? "create" : "view"}|${isNewProfile ? "new" : ""}`;

  return (
    <DashboardClient
      key={dashboardKey}
      profiles={profiles}
      initialProfileId={initialProfileId}
      isAdmin={adminUser}
      isNewProfile={isNewProfile}
      isCreating={isCreating}
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
