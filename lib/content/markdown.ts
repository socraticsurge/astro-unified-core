// Tiny wrapper around `marked` configured for the content/ markdown.
// GFM tables, blockquotes, smart-typography pass-through. The output
// is HTML rendered into a className-styled container; the styling is
// applied at the call site (see lib/content/render-styles.ts).

import { marked } from "marked";

marked.setOptions({
  gfm: true,
  breaks: false,
});

export function renderMarkdown(md: string): string {
  return marked.parse(md, { async: false }) as string;
}

/**
 * Split a two-track body (dasha-pair, nakshatra, ascendant, etc.) into
 * the source-verse block and the rendering block. Returns rendering as
 * null when it is missing or just an HTML comment placeholder. Keep the
 * source block intact (heading and all) so it can render with its
 * citation line under an "Original source" expander.
 */
export function splitTwoTrack(
  body: string
): { source: string; rendering: string | null } {
  const idx = body.indexOf("## Rendering");
  if (idx === -1) {
    return { source: body, rendering: null };
  }
  const source = body.slice(0, idx).trim();
  const renderingRaw = body
    .slice(idx + "## Rendering".length)
    .replace(/<!--[\s\S]*?-->/g, "")
    .trim();
  return {
    source,
    rendering: renderingRaw.length > 0 ? renderingRaw : null,
  };
}
