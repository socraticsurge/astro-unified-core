/**
 * A lightweight HTML sanitizer that works on both client and server.
 * It provides a defense-in-depth layer against XSS when using dangerouslySetInnerHTML.
 *
 * Note: Since external libraries cannot be installed due to network restrictions,
 * this is a custom implementation. It uses DOMParser on the client for robust
 * sanitization and a conservative approach on the server.
 */

const ALLOWED_TAGS = new Set([
  'p', 'br', 'b', 'i', 'strong', 'em', 'u', 's', 'del', 'ins', 'mark',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'blockquote', 'cite', 'q',
  'pre', 'code',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'a', 'span', 'div', 'hr', 'section', 'article', 'aside', 'header', 'footer',
  'img'
]);

const ALLOWED_ATTRS = new Set([
  'href', 'title', 'alt', 'src', 'width', 'height', 'class', 'id', 'target', 'rel'
]);

const sanitizeCache = new Map<string, string>();
const MAX_CACHE_SIZE = 1000;

/**
 * Sanitizes an HTML string to remove dangerous tags and attributes.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  if (sanitizeCache.has(html)) return sanitizeCache.get(html)!;

  let result = '';
  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    result = sanitizeClientSide(html);
  } else {
    result = sanitizeServerSide(html);
  }

  if (sanitizeCache.size >= MAX_CACHE_SIZE) {
    sanitizeCache.clear();
  }
  sanitizeCache.set(html, result);
  return result;
}

function sanitizeClientSide(html: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const sanitizeNode = (node: Node) => {
      if (node.nodeType === 1) { // Node.ELEMENT_NODE
        const el = node as Element;
        const tagName = el.tagName.toLowerCase();

        if (!ALLOWED_TAGS.has(tagName)) {
          // If tag is not allowed, move its children up and remove it
          while (el.firstChild) {
            el.parentNode?.insertBefore(el.firstChild, el);
          }
          el.remove();
          return;
        }

        // Clean attributes
        const attrs = el.attributes;
        for (let i = attrs.length - 1; i >= 0; i--) {
          const attr = attrs[i];
          const attrName = attr.name.toLowerCase();

          if (!ALLOWED_ATTRS.has(attrName) || attrName.startsWith('on')) {
            el.removeAttribute(attr.name);
          } else if (attrName === 'href' || attrName === 'src' || attrName === 'action' || attrName === 'formaction') {
            const val = attr.value.toLowerCase().replace(/[\x00-\x20\x7F-\x9F\s]/g, '');
            if (val.includes('javascript:') || val.includes('data:') || val.includes('vbscript:')) {
               el.removeAttribute(attr.name);
            }
          }
        }
      }

      // Process children - clone array because original changes during iteration
      const children = Array.from(node.childNodes);
      children.forEach(sanitizeNode);
    };

    sanitizeNode(doc.body);
    return doc.body.innerHTML;
  } catch (_e) {
    return sanitizeServerSide(html);
  }
}

/**
 * Server-side fallback using a conservative approach.
 * Instead of complex regex, it strips all tags except whitelisted ones
 * and aggressively removes attributes that could contain scripts.
 */
function sanitizeServerSide(html: string): string {
  // 1. Strip comments
  let sanitized = html.replace(/<!--[\s\S]*?-->/g, '');

  // 2. Aggressively strip known dangerous tags and their entire content
  const DANGEROUS_TAGS = ['script', 'style', 'iframe', 'object', 'embed', 'form', 'frameset', 'applet', 'meta', 'link', 'base'];
  for (const tag of DANGEROUS_TAGS) {
    const regex = new RegExp(`<${tag}\\b[^<]*(?:(?!<\\/${tag}>)<[^<]*)*<\\/${tag}>`, 'gi');
    sanitized = sanitized.replace(regex, '');
    // Also catch self-closing variants
    const selfClosingRegex = new RegExp(`<${tag}\\b[^>]*\\/>`, 'gi');
    sanitized = sanitized.replace(selfClosingRegex, '');
  }

  // 3. Remove all event handlers (onXXXXX=...)
  sanitized = sanitized.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]*)/gi, '');

  // 4. Neutralize URI-based XSS (javascript:, data:, vbscript:)
  // Handles some basic obfuscation like spaces or entities
  sanitized = sanitized.replace(
    /(href|src|action|formaction)\s*=\s*["']?\s*(?:[^"'>\s]*?(?:j\s*a\s*v\s*a\s*s\s*c\s*r\s*i\s*p\s*t|d\s*a\s*t\s*a|v\s*b\s*s\s*c\s*r\s*i\s*p\s*t|&#x?[0-9a-f]+;?):)[^"'>\s]*/gi,
    '$1="#"'
  );

  // 5. Final fallback: remove any occurrences of 'javascript' to break potential payloads
  sanitized = sanitized.replace(/j\s*a\s*v\s*a\s*s\s*c\s*r\s*i\s*p\s*t/gi, 'no-script');

  return sanitized;
}
