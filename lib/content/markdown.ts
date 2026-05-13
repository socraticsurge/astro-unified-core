// Tiny wrapper around `marked` configured for the content/ markdown.
// GFM tables, blockquotes, smart-typography pass-through. The output
// is HTML rendered into a className-styled container; the styling is
// applied at the call site (see lib/content/render-styles.ts).

import { marked } from "marked";

marked.setOptions({
  gfm: true,
  breaks: false,
});

const markdownCache = new Map<string, string>();

export function renderMarkdown(md: string): string {
  if (markdownCache.has(md)) return markdownCache.get(md)!;
  const result = marked.parse(md, { async: false }) as string;
  markdownCache.set(md, result);
  return result;
}

/**
 * Strip the Maitreya-attribution sentence from a citation line and
 * remove the "## Source verse" / "## Rendering" subheaders themselves —
 * users see attribution on /credits and Privacy/Terms, not under every
 * verse.
 */
function cleanForDisplay(md: string): string {
  return md
    // Drop "## Source verse" and "## Rendering" structural subheaders
    .replace(/^##\s+Source verse\s*$/gm, "")
    .replace(/^##\s+Rendering\s*$/gm, "")
    // Strip ". Adapted from the Maitreya database..." up to next newline
    .replace(/\.\s*Adapted from the Maitreya database[^\n]*/g, ".")
    // Strip standalone "see content/CREDITS.md" tails just in case
    .replace(/;\s*see content\/CREDITS\.md\.?/g, "")
    // Strip HTML comment placeholders
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();
}

/**
 * Pick the best body for user display from a two-track entry: the
 * authored "Rendering" if present and non-trivial, otherwise the
 * source verse. Always strip the Maitreya attribution sentence.
 */
export function pickDisplayBody(body: string): string {
  const idx = body.indexOf("## Rendering");
  if (idx === -1) {
    return cleanForDisplay(body);
  }
  const sourcePart = body.slice(0, idx);
  const renderingPart = body
    .slice(idx + "## Rendering".length)
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();
  if (renderingPart.length > 0) {
    return cleanForDisplay(renderingPart);
  }
  return cleanForDisplay(sourcePart);
}
