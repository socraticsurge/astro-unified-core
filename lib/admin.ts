import type { Session } from "next-auth";

export const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "cvk.atreya@gmail.com")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export function isAdmin(session: Session | null | undefined): boolean {
  const email = session?.user?.email?.toLowerCase();
  if (!email) return false;
  return ADMIN_EMAILS.includes(email);
}
