import { timingSafeEqual } from "crypto";

const STAGING_URL = "https://astro-unified-staging.vercel.app";
const LOCAL_REVIEW_URL = "http://localhost:3001";
const STAGING_DATABASE_HOST =
  "astro-unified-staging-vkchaganti.aws-ap-south-1.turso.io";
const STAGING_EMAIL_SUFFIX = "@staging.astrochaganti.test";

type StagingAuthEnvironment = Partial<Pick<
  NodeJS.ProcessEnv,
  | "ASTRO_STAGING_AUTH"
  | "ASTRO_LOCAL_REVIEW"
  | "NODE_ENV"
  | "NEXTAUTH_URL"
  | "TURSO_DATABASE_URL"
  | "STAGING_AUTH_EMAIL"
  | "STAGING_AUTH_PASSWORD"
  | "STAGING_AUTH_NAME"
  | "STAGING_ADMIN_EMAIL"
  | "STAGING_ADMIN_PASSWORD"
  | "STAGING_ADMIN_NAME"
>>;

type StagingAccount = {
  email: string;
  password: string;
  name: string;
  userId: "gate7-owner" | "gate7-admin";
};

export type StagingAuthConfig =
  | { enabled: false; reason: string }
  | {
      enabled: true;
      accounts: [StagingAccount, StagingAccount];
    };

function normalizedUrl(value: string | undefined): string {
  return (value ?? "").replace(/\/$/, "");
}

function databaseHost(value: string | undefined): string {
  if (!value) return "";
  try {
    return new URL(value).host;
  } catch {
    return "";
  }
}

/**
 * Staging credentials are deliberately guarded by independent environment,
 * URL and database facts. Local review additionally requires development mode
 * and its explicit switch. A copied variable cannot enable this provider on
 * the live application or against live data.
 */
export function getStagingAuthConfig(
  environment: StagingAuthEnvironment = process.env,
): StagingAuthConfig {
  if (environment.ASTRO_STAGING_AUTH !== "enabled") {
    return { enabled: false, reason: "switch-disabled" };
  }
  const localReview = environment.NODE_ENV === "development"
    && environment.ASTRO_LOCAL_REVIEW === "enabled";
  const expectedUrl = localReview ? LOCAL_REVIEW_URL : STAGING_URL;
  if (normalizedUrl(environment.NEXTAUTH_URL) !== expectedUrl) {
    return { enabled: false, reason: "url-boundary-mismatch" };
  }
  if (databaseHost(environment.TURSO_DATABASE_URL) !== STAGING_DATABASE_HOST) {
    return { enabled: false, reason: "database-boundary-mismatch" };
  }

  const email = (environment.STAGING_AUTH_EMAIL ?? "").trim().toLowerCase();
  const password = environment.STAGING_AUTH_PASSWORD ?? "";
  const name = (environment.STAGING_AUTH_NAME ?? "Gate 7 Owner").trim();
  const adminEmail = (environment.STAGING_ADMIN_EMAIL ?? "").trim().toLowerCase();
  const adminPassword = environment.STAGING_ADMIN_PASSWORD ?? "";
  const adminName = (environment.STAGING_ADMIN_NAME ?? "Gate 7 Admin").trim();

  if (!email.endsWith(STAGING_EMAIL_SUFFIX)) {
    return { enabled: false, reason: "synthetic-email-required" };
  }
  if (password.length < 16) {
    return { enabled: false, reason: "password-too-short" };
  }
  if (!adminEmail.endsWith(STAGING_EMAIL_SUFFIX)) {
    return { enabled: false, reason: "synthetic-admin-email-required" };
  }
  if (adminPassword.length < 16) {
    return { enabled: false, reason: "admin-password-too-short" };
  }
  if (email === adminEmail) {
    return { enabled: false, reason: "distinct-accounts-required" };
  }

  return {
    enabled: true,
    accounts: [
      { email, password, name, userId: "gate7-owner" },
      {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
        userId: "gate7-admin",
      },
    ],
  };
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function validateStagingCredentials(
  config: Extract<StagingAuthConfig, { enabled: true }>,
  credentials: { email?: string; password?: string } | undefined,
) {
  const email = (credentials?.email ?? "").trim().toLowerCase();
  const password = credentials?.password ?? "";
  const account = config.accounts.find(
    (candidate) =>
      safeEqual(email, candidate.email) && safeEqual(password, candidate.password),
  );
  if (!account) return null;
  return {
    id: account.userId,
    name: account.name,
    email: account.email,
    image: null,
  };
}
