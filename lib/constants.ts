// Application-wide constants. Import from here instead of inlining magic numbers.

/** Maximum number of profiles a single user may create. */
export const MAX_PROFILES = 10;

/** Maximum character length for long-form consultation fields. */
export const MAX_FIELD_LENGTH = 2000;

/** Maximum number of profile IDs accepted in a single consultation request. */
export const MAX_CONSULTATION_PROFILES = 10;

/** Default per-user rate-limit: requests allowed per window. */
export const RATE_LIMIT_DEFAULT_COUNT = 5;

/** Rate-limit sliding window in milliseconds (1 minute). */
export const RATE_LIMIT_WINDOW_MS = 60_000;

/**
 * Feature flag: enable the consultation payment flow.
 *
 * When `false` (the current default), consultation requests skip the
 * "awaiting payment" step entirely:
 * - New requests are created with status = 'pending' immediately
 * - The pricing UI in ConsultationForm / AskPanel is hidden
 * - The "Mark as Paid" admin action is hidden — admin only sees "Mark Answered"
 * - The pricing inputs in admin Settings are hidden
 *
 * Payment is handled out-of-band today (Dr. Chaganti answers a question and
 * shares it via email). Flip this to `true` and re-deploy once a real
 * payment integration (Razorpay/Stripe) is wired up.
 *
 * The DB schema (`amount_paise`, status enum including 'pending_payment' /
 * 'paid') is intentionally preserved so existing rows remain readable and
 * the feature can be revived without a migration.
 */
export const PAYMENT_FLOW_ENABLED = false;

/**
 * Feature flag: send Resend email to admin when a new consultation request is
 * submitted. Flip to `false` if the inbox starts getting too noisy or Resend
 * misbehaves — no deploy needed if you just clear `RESEND_API_KEY` in Vercel
 * (the helper short-circuits when the key is missing), but the flag exists
 * for an in-code toggle that survives env-var churn.
 */
export const ADMIN_EMAIL_NOTIFICATIONS_ENABLED = true;

/** Recipient for admin email notifications (new consultation requests). */
export const ADMIN_NOTIFY_EMAIL = "astrochaganti@gmail.com";

/** Resend shared sender — works without domain verification. Switch to a
 * verified domain (e.g. `notify@astrochaganti.com`) once the custom domain
 * is live. */
export const EMAIL_FROM = "Astro Chaganti <onboarding@resend.dev>";
