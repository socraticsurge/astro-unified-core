import { Suspense } from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardLoader } from "@/app/dashboard/DashboardLoader";
import { DashboardSkeleton } from "@/app/dashboard/DashboardSkeleton";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{
    profile?: string;
    compare?: string;
    new?: string;
    create?: string;
  }>;
}) {
  // Session check must happen before the Suspense boundary — we need to know
  // whether to redirect before we can send any HTML to the client.
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin");

  // The skeleton HTML flushes to the client immediately after the session
  // check resolves. DashboardLoader runs the DB queries behind the boundary
  // and streams the real content in once they complete.
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardLoader session={session} searchParams={searchParams} />
    </Suspense>
  );
}
