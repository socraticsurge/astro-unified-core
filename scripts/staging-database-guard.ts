const STAGING_DATABASE_HOST =
  "astro-unified-staging-vkchaganti.aws-ap-south-1.turso.io";
const CONFIRMATION = "astro-unified-staging";

export function assertStagingDatabase() {
  const rawUrl = process.env.TURSO_DATABASE_URL;
  let host = "";
  try {
    host = rawUrl ? new URL(rawUrl).host : "";
  } catch {
    // The explicit error below keeps malformed URLs out of logs.
  }

  if (
    host !== STAGING_DATABASE_HOST ||
    process.env.ASTRO_STAGING_MIGRATION_CONFIRM !== CONFIRMATION
  ) {
    throw new Error(
      "Refusing database operation: the Gate 7 staging URL and explicit confirmation are required.",
    );
  }
}
