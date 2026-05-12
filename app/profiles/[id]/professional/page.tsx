// Admin-only professional chart page. Redirects non-admins to the
// standard profile page. Pre-loads all section explainers like the
// standard page, but passes them to the richer ProfessionalChartClient.

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { db } from "@/lib/db";
import { loadAllSections } from "@/lib/content/loader";
import { renderMarkdown } from "@/lib/content/markdown";
import { fetchDashaflow } from "@/lib/engines/dashaflow";
import { ProfessionalChartClient } from "./ProfessionalChartClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function ProfessionalChartPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  const { id } = await params;

  if (!isAdmin(session)) {
    redirect(`/profiles/${id}`);
  }

  // 1. Load Profile
  const profile = await db.profiles.getAny(id);
  if (!profile) {
    redirect("/dashboard");
  }

  // 2. Load/Generate Dashaflow Chart (Main data)
  let chartData: Record<string, unknown> | null = null;
  const cached = await db.readings.latestByEngine(id, "dashaflow");
  if (cached) {
    chartData = JSON.parse(cached.output_data as string);
  } else {
    const input = {
      date_of_birth: profile.date_of_birth,
      time_of_birth: profile.time_of_birth,
      latitude: profile.latitude,
      longitude: profile.longitude,
      timezone: profile.timezone,
    };
    const output = await fetchDashaflow(input);
    if (output.data) {
      chartData = output.data as Record<string, unknown>;
      await db.readings.save({ profile_id: id, engine: "dashaflow", input_snapshot: input, output_data: chartData });
    }
  }

  // 3. Load Explainers
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

  return <ProfessionalChartClient explainers={explainers} initialChart={chartData} />;
}
