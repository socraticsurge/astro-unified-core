import DOMPurify from 'isomorphic-dompurify';

/**
 * Utility to sanitize HTML strings to mitigate XSS risks before usage in
 * `dangerouslySetInnerHTML`.
 */
export function sanitizeHtml(html: string | undefined | null): string {
  if (!html) return '';
  // Use isomorphic-dompurify which provides safe DOMPurify execution on both
  // the client and the server (Node.js environments).
  return DOMPurify.sanitize(html);
}
