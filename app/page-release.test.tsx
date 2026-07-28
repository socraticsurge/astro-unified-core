import { afterEach, describe, expect, it, vi } from "vitest";
import HomePage from "./page";

function setReleaseEnvironment(mode: "rehearsal" | "production") {
  const rehearsal = mode === "rehearsal";
  vi.stubEnv("UNIFIED_RELEASE_MODE", mode);
  vi.stubEnv(
    "NEXTAUTH_URL",
    rehearsal
      ? "https://astro-unified-staging.vercel.app"
      : "https://astrochaganti.com",
  );
  vi.stubEnv(
    "VERCEL_PROJECT_PRODUCTION_URL",
    rehearsal ? "astro-unified-staging.vercel.app" : "astrochaganti.com",
  );
  vi.stubEnv(
    "TURSO_DATABASE_URL",
    rehearsal
      ? "libsql://astro-unified-staging-vkchaganti.aws-ap-south-1.turso.io"
      : "libsql://astrounified-live-vkchaganti.aws-ap-south-1.turso.io",
  );
  vi.stubEnv(
    "PANCHANGAM_API_URL",
    rehearsal
      ? "https://telugu-calendar-api-staging.vercel.app"
      : "https://telugu-calendar-api-production.vercel.app",
  );
}

describe("unified root release presentation", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("keeps the rehearsal warning on the staging root", () => {
    setReleaseEnvironment("rehearsal");
    expect(HomePage()).toMatchObject({
      props: { showPreviewBanner: true },
    });
  });

  it("removes the rehearsal warning from the production root", () => {
    setReleaseEnvironment("production");
    expect(HomePage()).toMatchObject({
      props: { showPreviewBanner: false },
    });
  });
});
