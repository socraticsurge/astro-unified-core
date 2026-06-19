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
  let viewingUserLabel: string | undefined;

  if (adminUser && params?.profile && !ownProfiles.some(p => p.id === params.profile)) {
    // Admin viewing another user's profile — load ALL of that user's profiles
    // so Tarabalam, CompareTab, etc. work with the correct profile set.
    const viewedProfile = await db.profiles.getAny(params.profile);
    if (!viewedProfile) redirect("/admin");

    const [contextProfiles, contextUser] = await Promise.all([
      db.profiles.list(viewedProfile.user_id),
      db.users.getById(viewedProfile.user_id),
    ]);

    profiles = contextProfiles.length > 0 ? contextProfiles : [viewedProfile];
    initialProfileId = viewedProfile.id;
    viewingUserLabel = contextUser?.name ?? contextUser?.email ?? "unknown user";

    if (params?.compare) {
      const check = await db.compatibility.getAny(params.compare);
      if (check) {
        initialCompareCheck = check;
      }
    }
  } else {
    // Empty-profile users go through the onboarding flow before the dashboard.
    if (!adminUser && ownProfiles.length === 0) redirect("/onboarding");

    initialProfileId = params?.profile
      ? ownProfiles.find(p => p.id === params.profile)?.id
      : undefined;
  }

  const isCreating = params?.create === "1";
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
      viewingUserLabel={viewingUserLabel}
      appSettings={{
        writtenEnabled: appSettings.written_consultation_enabled,
        liveEnabled: appSettings.live_consultation_enabled,
        writtenFeePaise: appSettings.written_fee_paise,
        liveFeePaise: appSettings.live_fee_paise,
      }}
    />
  );
}
