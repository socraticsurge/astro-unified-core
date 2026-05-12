import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { isAdmin } from "@/lib/admin";
import { redirect, notFound } from "next/navigation";
import { loadAllSections } from "@/lib/content/loader";
import { renderMarkdown } from "@/lib/content/markdown";
import { ProfileDetailClient } from "./ProfileDetailClient";

export const dynamic = "force-dynamic";

export default async function ProfileDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/signin");

  const { id } = await params;
  const userId = (session.user as { id: string }).id;

  const profile = isAdmin(session)
    ? await db.profiles.getAny(id)
    : await db.profiles.get(id, userId);

  if (!profile) notFound();

  const sections = loadAllSections();
  const explainers: Record<
    string,
    {
      title: string;
      gist?: string | null;
      bodyHtml: string;
      sources?: { text: string; chapter?: number | string; sloka?: number | string }[];
    }
  > = {};
  for (const [sectionInView, entry] of Object.entries(sections)) {
    explainers[sectionInView] = {
      title: entry.title,
      gist: entry.gist ?? null,
      bodyHtml: renderMarkdown(entry.body),
      sources: entry.sources,
    };
  }

  return <ProfileDetailClient explainers={explainers} profile={profile} />;
}
