// Async server component — runs DB queries after the Suspense boundary has
// already flushed the skeleton to the client. Keeps all data-fetching logic
// out of page.tsx so the outer shell can stream immediately.
import { getUserId } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { DashboardClient } from "@/app/dashboard/DashboardClient";
import type { Profile, CompatibilityCheck } from "@/lib/db";
import type { Session } from "next-auth";

interface Props {
  session: Session
  searchParams?: Promise<{
    profile?: string
    compare?: string
    new?: string
    create?: string
  }>
}

export async function DashboardLoader({ session, searchParams }: Props) {
  const userId = getUserId(session);
  const adminUser = isAdmin(session);
  const params = await searchParams;

  const [ownProfiles, appSettings] = await Promise.all([
    db.profiles.list(userId),
    db.settings.getAll(),
  ]);

  let profiles: Profile[] = ownProfiles;
  let initialProfileId: string | undefined;
  let initialCompareCheck: CompatibilityCheck | undefined;
  let viewingUserLabel: string | undefined;

  if (adminUser && params?.profile && !ownProfiles.some(p => p.id === params.profile)) {
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
    if (!adminUser && ownProfiles.length === 0) redirect("/onboarding");

    initialProfileId = params?.profile
      ? ownProfiles.find(p => p.id === params.profile)?.id
      : undefined;
  }

  const isCreating = params?.create === "1";
  const isNewProfile = params?.new === "1";

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
