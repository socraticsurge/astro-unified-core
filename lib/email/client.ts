import { Resend } from "resend";

let client: Resend | null = null;

/**
 * Lazy singleton Resend client. Returns null when `RESEND_API_KEY` is missing,
 * so callers can short-circuit (e.g. local dev without the key set).
 */
export function getResendClient(): Resend | null {
  if (client) return client;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  client = new Resend(key);
  return client;
}
