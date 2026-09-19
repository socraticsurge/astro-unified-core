import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));
vi.mock("next-auth/next", () => ({
  getServerSession: vi
    .fn()
    .mockResolvedValue({
      user: { id: "synthetic", email: "synthetic@example.invalid" },
    }),
}));
vi.mock("@/lib/auth", () => ({
  authOptions: {},
  getUserId: () => "synthetic",
}));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: () => ({ success: true }) }));
vi.mock("@/lib/posthog-server", () => ({
  getPostHogClient: () => ({ capture: vi.fn() }),
}));
vi.mock("@/lib/engines/today-landing", () => ({
  fetchTodayCelestialFacts: vi.fn(),
  buildDailyLandingContent: vi.fn(),
}));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

it("public landing, valid feedback and signed-in profile requests never repair missing storage", async () => {
  const dir = mkdtempSync(join(tmpdir(), "astro-routes-"));
  const previous = process.env.TURSO_DATABASE_URL;
  process.env.TURSO_DATABASE_URL = `file:${join(dir, "test.db")}`;
  vi.resetModules();
  const { getClient } = await import("./client");
  const client = getClient();
  const execute = vi.spyOn(client, "execute");
  const batch = vi.spyOn(client, "batch");
  try {
    const landing = await import("@/app/api/landing/today/route");
    const feedback = await import("@/app/api/feedback/route");
    const profiles = await import("@/app/api/profiles/route");
    const responses = [
      await landing.GET(),
      await feedback.POST(
        new NextRequest("https://example.invalid/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rating: "😊" }),
        }),
      ),
      await profiles.GET(),
    ];
    for (const response of responses) {
      expect(response.status).toBe(503);
      expect(response.headers.get("Cache-Control")).toContain("no-store");
      expect(JSON.stringify(await response.json())).not.toMatch(
        /sqlite|SELECT|libsql|token/i,
      );
    }
    expect(execute).not.toHaveBeenCalled();
    expect(batch).toHaveBeenCalledTimes(1);
    expect(batch.mock.calls[0][1]).toBe("read");
    expect(
      batch.mock.calls[0][0].every((statement) =>
        /^SELECT\b/.test(
          typeof statement === "string" ? statement : statement.sql,
        ),
      ),
    ).toBe(true);
    const { fetchTodayCelestialFacts, buildDailyLandingContent } =
      await import("@/lib/engines/today-landing");
    expect(fetchTodayCelestialFacts).not.toHaveBeenCalled();
    expect(buildDailyLandingContent).not.toHaveBeenCalled();
    expect(
      (await client.execute("SELECT name FROM sqlite_schema")).rows,
    ).toHaveLength(0);
  } finally {
    client.close();
    if (previous === undefined) delete process.env.TURSO_DATABASE_URL;
    else process.env.TURSO_DATABASE_URL = previous;
    rmSync(dir, { recursive: true, force: true });
  }
});
