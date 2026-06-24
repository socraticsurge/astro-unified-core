import sanitizeHtmlLib from "sanitize-html";

// We delegate to `sanitize-html`, which parses with htmlparser2 and has no
// DOM dependency. This avoids the jsdom/ESM-CJS landmine that crashed
// /credits and any other route in its module graph on Vercel
// (Sentry: ASTROCHAGANTI-1, "require() of ES Module ... encoding-lite.js").
//
// Do NOT swap this for `isomorphic-dompurify` or anything that pulls in
// `jsdom` on the server — the transitive dep chain re-breaks under Turbopack.

const ALLOWED_TAGS = [
  "p", "br", "b", "i", "strong", "em", "u", "s", "del", "ins", "mark",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "blockquote", "cite", "q",
  "pre", "code",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td",
  "a", "span", "div", "hr", "section", "article", "aside", "header", "footer",
  "img",
];

const ALLOWED_ATTRS: Record<string, string[]> = {
  "*": ["class", "id", "title"],
  a: ["href", "target", "rel"],
  img: ["src", "alt", "width", "height"],
};

const OPTIONS: sanitizeHtmlLib.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: ALLOWED_ATTRS,
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["http", "https", "data"] },
  allowProtocolRelative: false,
};

const sanitizeCache = new Map<string, string>();
const MAX_CACHE_SIZE = 1000;

export function sanitizeHtml(html: string): string {
  if (!html) return "";
  const cached = sanitizeCache.get(html);
  if (cached !== undefined) return cached;

  const result = sanitizeHtmlLib(html, OPTIONS);

  if (sanitizeCache.size >= MAX_CACHE_SIZE) sanitizeCache.clear();
  sanitizeCache.set(html, result);
  return result;
}
