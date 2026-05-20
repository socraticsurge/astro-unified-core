import { getResendClient } from "./client";
import {
  ADMIN_EMAIL_NOTIFICATIONS_ENABLED,
  ADMIN_NOTIFY_EMAIL,
  EMAIL_FROM,
} from "@/lib/constants";

export interface ConsultationNotificationInput {
  requestId: string;
  userName: string | null;
  userEmail: string | null;
  profileNames: string[];
  deliveryMode: "written" | "appointment";
  slotStartsAt: string | null;
  question: string;
}

const CANONICAL_HOST = "https://astro-unified-core-pfni.vercel.app";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Fire-and-forget email to ADMIN_NOTIFY_EMAIL on new consultation request.
 * Never throws — failures are logged but do not propagate to the caller.
 * Call from a Vercel `after()` block to avoid adding latency to the response.
 */
export async function notifyAdminOfConsultationRequest(
  input: ConsultationNotificationInput,
): Promise<void> {
  if (!ADMIN_EMAIL_NOTIFICATIONS_ENABLED) return;
  const resend = getResendClient();
  if (!resend) {
    console.warn("Resend client unavailable (RESEND_API_KEY missing) — skipping admin notify");
    return;
  }

  const requesterLabel = input.userName
    ? `${input.userName}${input.userEmail ? ` <${input.userEmail}>` : ""}`
    : (input.userEmail ?? "Unknown user");
  const profilesLabel = input.profileNames.length ? input.profileNames.join(", ") : "—";
  const modeLabel = input.deliveryMode === "written" ? "Written response" : "Live session";
  const slotLabel = input.slotStartsAt
    ? new Date(input.slotStartsAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "full", timeStyle: "short" }) + " IST"
    : null;
  const adminUrl = `${CANONICAL_HOST}/admin`;

  const subject = `New question from ${input.userName ?? input.userEmail ?? "a user"}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
      <h2 style="margin: 0 0 16px; font-weight: 600;">New consultation request</h2>
      <table style="border-collapse: collapse; width: 100%; font-size: 14px; margin-bottom: 20px;">
        <tr><td style="padding: 6px 12px 6px 0; color: #666; white-space: nowrap;">From</td><td style="padding: 6px 0;">${escapeHtml(requesterLabel)}</td></tr>
        <tr><td style="padding: 6px 12px 6px 0; color: #666;">Profiles</td><td style="padding: 6px 0;">${escapeHtml(profilesLabel)}</td></tr>
        <tr><td style="padding: 6px 12px 6px 0; color: #666;">Mode</td><td style="padding: 6px 0;">${escapeHtml(modeLabel)}</td></tr>
        ${slotLabel ? `<tr><td style="padding: 6px 12px 6px 0; color: #666;">Slot</td><td style="padding: 6px 0;">${escapeHtml(slotLabel)}</td></tr>` : ""}
      </table>
      <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin-bottom: 24px; white-space: pre-wrap; font-size: 14px; line-height: 1.5;">${escapeHtml(input.question)}</div>
      <a href="${adminUrl}" style="display: inline-block; background: #1a1a1a; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 500;">Open in admin</a>
      <p style="margin: 28px 0 0; color: #999; font-size: 12px;">Request ID: ${escapeHtml(input.requestId)}</p>
    </div>
  `.trim();

  const text = [
    `New consultation request`,
    ``,
    `From: ${requesterLabel}`,
    `Profiles: ${profilesLabel}`,
    `Mode: ${modeLabel}`,
    slotLabel ? `Slot: ${slotLabel}` : null,
    ``,
    `Question:`,
    input.question,
    ``,
    `Open in admin: ${adminUrl}`,
    `Request ID: ${input.requestId}`,
  ].filter(Boolean).join("\n");

  try {
    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to: ADMIN_NOTIFY_EMAIL,
      subject,
      html,
      text,
    });
    if (result.error) {
      console.error("Resend admin-notify error:", result.error);
    }
  } catch (e) {
    console.error("Resend admin-notify threw:", e);
  }
}
