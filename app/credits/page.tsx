// Public page rendering content/CREDITS.md — attribution for the
// classical sources and the Maitreya project.

import fs from "node:fs";
import path from "node:path";
import { renderMarkdown } from "@/lib/content/markdown";

export const metadata = { title: "Credits — Astro Chaganti" };

export default function CreditsPage() {
  const filePath = path.join(process.cwd(), "content", "CREDITS.md");
  let html = "";
  try {
    const md = fs.readFileSync(filePath, "utf8");
    html = renderMarkdown(md);
  } catch {
    html = "<p>Credits file unavailable.</p>";
  }

  return (
    <article
      className="prose prose-invert max-w-2xl mx-auto py-12
        prose-headings:font-heading prose-headings:font-medium
        prose-p:leading-relaxed
        prose-a:text-blue-300 prose-a:no-underline hover:prose-a:underline"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
