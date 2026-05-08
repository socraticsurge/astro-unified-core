// V2 profile-detail page. Server component that pre-loads all section
// explainers from disk and passes them as props to the V2 client view.
// Per-row content (planet-in-house, dasha-pair, etc.) is fetched
// lazily by the client via /api/content/[type]/[key].

import { loadAllSections } from "@/lib/content/loader";
import { renderMarkdown } from "@/lib/content/markdown";
import { V2Client } from "./V2Client";

export const dynamic = "force-dynamic";

export default async function ProfileDetailV2Page() {
  const sections = loadAllSections();
  // Pre-render markdown to HTML so the client doesn't bundle a parser.
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

  return <V2Client explainers={explainers} />;
}
