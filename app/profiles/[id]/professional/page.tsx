// Admin-only professional chart page. Redirects non-admins to the
// standard profile page. Pre-loads all section explainers like the
// standard page, but passes them to the richer ProfessionalChartClient.

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { loadAllSections } from "@/lib/content/loader";
import { renderMarkdown } from "@/lib/content/markdown";
import { ProfessionalChartClient } from "./ProfessionalChartClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ProfessionalChartPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) {
    const { id } = await params;
    redirect(`/profiles/${id}`);
  }

  const sections = loadAllSections();
  const explainers: Record<
    string,
    { title: string; gist?: string | null; bodyHtml: string; sources?: { text: string; chapter?: number | string; sloka?: number | string }[] }
  > = {};
  for (const [sectionInView, entry] of Object.entries(sections)) {
    explainers[sectionInView] = {
      title: entry.title,
      gist: entry.gist ?? null,
      bodyHtml: renderMarkdown(entry.body),
      sources: entry.sources,
    };
  }

  return <ProfessionalChartClient explainers={explainers} />;
}
