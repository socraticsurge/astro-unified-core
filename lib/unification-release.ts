const STAGING_WEB_URL = "https://astro-unified-staging.vercel.app";
const STAGING_WEB_HOST = "astro-unified-staging.vercel.app";
const STAGING_DATABASE_HOST =
  "astro-unified-staging-vkchaganti.aws-ap-south-1.turso.io";
const STAGING_PANCHANGAM_URL =
  "https://telugu-calendar-api-staging.vercel.app";
const LOCAL_REVIEW_WEB_URL = "http://localhost:3001";
const LOCAL_REVIEW_WEB_HOST = "localhost";
const LOCAL_REVIEW_PANCHANGAM_URL = "http://127.0.0.1:8000";
const PRODUCTION_WEB_URL = "https://astrochaganti.com";
// Vercel resolves this system variable to the shortest production custom
// domain when the project has one, rather than its generated vercel.app URL.
const PRODUCTION_WEB_HOST = "astrochaganti.com";
const PRODUCTION_DATABASE_HOST =
  "astrounified-live-vkchaganti.aws-ap-south-1.turso.io";
const PRODUCTION_PANCHANGAM_URL =
  "https://telugu-calendar-api-production.vercel.app";

type ReleaseEnvironment = Partial<Pick<
  NodeJS.ProcessEnv,
  | "UNIFIED_RELEASE_MODE"
  | "ASTRO_LOCAL_REVIEW"
  | "NODE_ENV"
  | "NEXTAUTH_URL"
  | "VERCEL_PROJECT_PRODUCTION_URL"
  | "TURSO_DATABASE_URL"
  | "PANCHANGAM_API_URL"
>>;

export type UnificationReleaseConfig =
  | { mode: "legacy"; reason: string }
  | {
      mode: "rehearsal";
      reason: "staging-boundary-confirmed" | "local-review-boundary-confirmed";
    }
  | { mode: "production"; reason: "production-boundary-confirmed" };

function normalizedUrl(value: string | undefined): string {
  return (value ?? "").replace(/\/$/, "");
}

function host(value: string | undefined): string {
  if (!value) return "";
  try {
    return new URL(value).host;
  } catch {
    return "";
  }
}

/**
 * The unified root is fail-closed on every dependency graph. A rehearsal needs
 * every staging fact; local review additionally requires development mode and
 * local web/API hosts. A Gate 9 build needs every production fact. Merely
 * copying a switch between environments cannot activate a mode.
 */
export function getUnificationReleaseConfig(
  environment: ReleaseEnvironment = process.env,
): UnificationReleaseConfig {
  const requestedMode = environment.UNIFIED_RELEASE_MODE;
  if (requestedMode !== "rehearsal" && requestedMode !== "production") {
    return { mode: "legacy", reason: "switch-disabled" };
  }

  const localReview = requestedMode === "rehearsal"
    && environment.NODE_ENV === "development"
    && environment.ASTRO_LOCAL_REVIEW === "enabled";

  const expected = requestedMode === "rehearsal"
    ? localReview
      ? {
          webUrl: LOCAL_REVIEW_WEB_URL,
          webHost: LOCAL_REVIEW_WEB_HOST,
          databaseHost: STAGING_DATABASE_HOST,
          panchangamUrl: LOCAL_REVIEW_PANCHANGAM_URL,
        }
      : {
          webUrl: STAGING_WEB_URL,
          webHost: STAGING_WEB_HOST,
          databaseHost: STAGING_DATABASE_HOST,
          panchangamUrl: STAGING_PANCHANGAM_URL,
        }
    : {
        webUrl: PRODUCTION_WEB_URL,
        webHost: PRODUCTION_WEB_HOST,
        databaseHost: PRODUCTION_DATABASE_HOST,
        panchangamUrl: PRODUCTION_PANCHANGAM_URL,
      };

  if (normalizedUrl(environment.NEXTAUTH_URL) !== expected.webUrl) {
    return { mode: "legacy", reason: "auth-url-boundary-mismatch" };
  }
  if (environment.VERCEL_PROJECT_PRODUCTION_URL !== expected.webHost) {
    return { mode: "legacy", reason: "project-boundary-mismatch" };
  }
  if (host(environment.TURSO_DATABASE_URL) !== expected.databaseHost) {
    return { mode: "legacy", reason: "database-boundary-mismatch" };
  }
  if (normalizedUrl(environment.PANCHANGAM_API_URL) !== expected.panchangamUrl) {
    return { mode: "legacy", reason: "panchangam-boundary-mismatch" };
  }
  return requestedMode === "rehearsal"
    ? {
        mode: "rehearsal",
        reason: localReview
          ? "local-review-boundary-confirmed"
          : "staging-boundary-confirmed",
      }
    : { mode: "production", reason: "production-boundary-confirmed" };
}
