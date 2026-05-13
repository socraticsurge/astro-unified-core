import DOMPurify from 'isomorphic-dompurify';

export function sanitizeHtml(html: string | undefined | null): string {
  if (!html) return '';
  return DOMPurify.sanitize(html);
}
