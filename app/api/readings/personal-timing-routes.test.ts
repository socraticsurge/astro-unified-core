import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));
vi.mock("next-auth/next", () => ({ getServerSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  authOptions: {},
  getUserId: (session: { user: { id: string } }) => session.user.id,
}));
vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(() => ({ success: true })),
}));
vi.mock("@/lib/panchangam/personal-search", () => ({
  searchGeneralMuhurtam: vi.fn(),
  searchPersonalTarabalam: vi.fn(),
  searchPersonalMuhurtam: vi.fn(),
}));

import { getServerSession } from "next-auth/next";
import {
  searchGeneralMuhurtam,
  searchPersonalMuhurtam,
  searchPersonalTarabalam,
} from "@/lib/panchangam/personal-search";
import { POST as postTarabalam } from "./tarabalam/route";
import { POST as postMuhurtam } from "./muhurtam/route";

const session = { user: { id: "owner-id", email: "owner@example.test" } };
const envelope = {
  contract_version: "1.0",
  request_id: "request-id",
  engine: { package: "test", version: "1", system: "drik", ayanamsa: "lahiri" },
  data: { days: [], slots: [] },
  evidence: { evaluated_factors: [], not_evaluated: [], provenance: [] },
  warnings: [],
  profile_labels: [],
};

function post(path: string, body: unknown) {
  return new NextRequest(`https://astro-unified-staging.vercel.app${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-request-id": "request-id" },
    body: JSON.stringify(body),
  });
}

describe("private personal timing routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerSession).mockResolvedValue(session as never);
    vi.mocked(searchPersonalTarabalam).mockResolvedValue(envelope as never);
    vi.mocked(searchPersonalMuhurtam).mockResolvedValue(envelope as never);
    vi.mocked(searchGeneralMuhurtam).mockResolvedValue({
      ...envelope,
      validation_mode: "general",
    } as never);
  });

  it("rejects unauthenticated Tarabalam without public caching", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const response = await postTarabalam(
      post("/api/readings/tarabalam", {
        profile_ids: ["profile-1"],
        start_date: "2026-07-22",
        end_date: "2026-07-23",
      }),
    );
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(searchPersonalTarabalam).not.toHaveBeenCalled();
  });

  it("rejects duplicate or oversized profile selection before computation", async () => {
    const response = await postTarabalam(
      post("/api/readings/tarabalam", {
        profile_ids: ["profile-1", "profile-1"],
        start_date: "2026-07-22",
        end_date: "2026-07-23",
      }),
    );
    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(searchPersonalTarabalam).not.toHaveBeenCalled();
  });

  it("passes a bounded Tarabalam request to the owner-scoped service", async () => {
    const response = await postTarabalam(
      post("/api/readings/tarabalam", {
        profile_ids: ["profile-1", "profile-2"],
        start_date: "2026-07-22",
        end_date: "2026-08-01",
        chandra_mode: "strict",
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(searchPersonalTarabalam).toHaveBeenCalledWith(
      "owner-id",
      expect.objectContaining({
        profile_ids: ["profile-1", "profile-2"],
        chandra_mode: "strict",
      }),
      "request-id",
    );
  });

  it("rejects a Tarabalam request beyond the exact 90-day limit", async () => {
    const response = await postTarabalam(
      post("/api/readings/tarabalam", {
        profile_ids: ["profile-1"],
        start_date: "2026-07-22",
        end_date: "2026-10-20",
      }),
    );
    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(searchPersonalTarabalam).not.toHaveBeenCalled();
  });

  it("passes personalized Muhurtam through the canonical route", async () => {
    const response = await postMuhurtam(
      post("/api/readings/muhurtam", {
        profile_ids: ["profile-1"],
        start_date: "2026-07-22",
        end_date: "2026-07-28",
        activity: "wedding",
        chandra_mode: "stars",
        include_night: false,
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(searchPersonalMuhurtam).toHaveBeenCalledWith(
      "owner-id",
      expect.objectContaining({ activity: "wedding", profile_ids: ["profile-1"] }),
      "request-id",
    );
    expect(searchGeneralMuhurtam).not.toHaveBeenCalled();
  });

  it("keeps the general finder available without participant validation", async () => {
    const response = await postMuhurtam(
      post("/api/readings/muhurtam", {
        profile_ids: ["profile-1"],
        start_date: "2026-07-22",
        end_date: "2026-07-28",
        activity: "wedding",
        chandra_mode: "stars",
        include_night: false,
        validation_mode: "general",
      }),
    );
    expect(response.status).toBe(200);
    expect(searchGeneralMuhurtam).toHaveBeenCalledWith(
      "owner-id",
      expect.objectContaining({
        activity: "wedding",
        profile_ids: ["profile-1"],
        validation_mode: "general",
      }),
      "request-id",
    );
    expect(searchPersonalMuhurtam).not.toHaveBeenCalled();
  });

  it("preserves the engine's real fourteen-day Muhurtam boundary", async () => {
    const response = await postMuhurtam(
      post("/api/readings/muhurtam", {
        profile_ids: ["profile-1"],
        start_date: "2026-07-22",
        end_date: "2026-08-05",
        activity: "wedding",
        chandra_mode: "stars",
        include_night: false,
        validation_mode: "general",
      }),
    );
    expect(response.status).toBe(400);
    expect(searchGeneralMuhurtam).not.toHaveBeenCalled();
    expect(searchPersonalMuhurtam).not.toHaveBeenCalled();
  });
});
