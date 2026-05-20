import DOMPurify from "isomorphic-dompurify";

const sanitizeCache = new Map<string, string>();
const MAX_CACHE_SIZE = 1000;

export function sanitizeHtml(html: string): string {
  if (!html) return "";
  const cached = sanitizeCache.get(html);
  if (cached !== undefined) return cached;

  const result = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "b", "i", "strong", "em", "u", "s", "del", "ins", "mark",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li",
      "blockquote", "cite", "q",
      "pre", "code",
      "table", "thead", "tbody", "tfoot", "tr", "th", "td",
      "a", "span", "div", "hr", "section", "article", "aside", "header", "footer",
      "img",
    ],
    ALLOWED_ATTR: ["href", "title", "alt", "src", "width", "height", "class", "id", "target", "rel"],
  });

  if (sanitizeCache.size >= MAX_CACHE_SIZE) sanitizeCache.clear();
  sanitizeCache.set(html, result);
  return result;
}
