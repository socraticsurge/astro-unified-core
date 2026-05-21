import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { users } from "./users";
import { getClient, ensureSchema } from "./client";

// Contract tests for users.upsert + users.getByEmail.
//
// These exist because of a real production incident: the previous version
// of `users.upsert` included `id = excluded.id` in the ON CONFLICT clause.
// That meant every Google sign-in could rewrite the user's primary key,
// orphaning every `profiles.user_id` row that pointed at the old id.
// The fix preserves the original id on conflict; these tests pin that
// behaviour so the regression can't sneak back in.

vi.mock("./client", () => ({
  getClient: vi.fn(),
  ensureSchema: vi.fn(),
}));

describe("users.upsert", () => {
  let mockExecute: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockExecute = vi.fn();
    vi.mocked(getClient).mockReturnValue({ execute: mockExecute } as ReturnType<typeof getClient>);
    vi.mocked(ensureSchema).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("issues an INSERT … ON CONFLICT(email) statement", async () => {
    await users.upsert({
      id: "id-1",
      name: "Alice",
      email: "alice@example.com",
      image: null,
    });

    expect(ensureSchema).toHaveBeenCalled();
    expect(mockExecute).toHaveBeenCalledTimes(1);
    const sql = (mockExecute.mock.calls[0][0] as { sql: string }).sql;
    expect(sql).toMatch(/INSERT INTO users/i);
    expect(sql).toMatch(/ON CONFLICT\(email\)/i);
  });

  // The smoking-gun assertion. If a future refactor re-introduces
  // `id = excluded.id`, every existing user's primary key gets rewritten
  // the next time they sign in, and all their `profiles.user_id`
  // foreign keys point at a stale value. This test fails fast.
  it("does NOT overwrite id on email conflict (prevents profile orphaning)", async () => {
    await users.upsert({
      id: "new-id",
      name: "Alice",
      email: "alice@example.com",
      image: null,
    });

    const sql = (mockExecute.mock.calls[0][0] as { sql: string }).sql;
    const onConflict = sql.split(/ON CONFLICT/i)[1] ?? "";
    expect(onConflict).not.toMatch(/\bid\s*=\s*excluded\.id\b/i);
  });

  it("refreshes mutable metadata (name, image, last_login) on conflict", async () => {
    await users.upsert({
      id: "id-1",
      name: "Alice Updated",
      email: "alice@example.com",
      image: "https://example.com/avatar.png",
    });

    const sql = (mockExecute.mock.calls[0][0] as { sql: string }).sql;
    const onConflict = sql.split(/ON CONFLICT/i)[1] ?? "";
    expect(onConflict).toMatch(/last_login\s*=\s*excluded\.last_login/i);
    expect(onConflict).toMatch(/name\s*=\s*excluded\.name/i);
    expect(onConflict).toMatch(/image\s*=\s*excluded\.image/i);
  });

  it("passes id, name, email, image as the first four args", async () => {
    await users.upsert({
      id: "id-42",
      name: "Bob",
      email: "bob@example.com",
      image: "https://example.com/bob.png",
    });

    const args = (mockExecute.mock.calls[0][0] as { args: unknown[] }).args;
    expect(args[0]).toBe("id-42");
    expect(args[1]).toBe("Bob");
    expect(args[2]).toBe("bob@example.com");
    expect(args[3]).toBe("https://example.com/bob.png");
  });
});

describe("users.getByEmail", () => {
  let mockExecute: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockExecute = vi.fn();
    vi.mocked(getClient).mockReturnValue({ execute: mockExecute } as ReturnType<typeof getClient>);
    vi.mocked(ensureSchema).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("queries users by email and returns the parsed row", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [
        {
          id: "id-1",
          name: "Alice",
          email: "alice@example.com",
          image: null,
          last_login: "2026-05-21T00:00:00.000Z",
          created_at: "2025-01-01T00:00:00.000Z",
        },
      ],
    });

    const result = await users.getByEmail("alice@example.com");

    expect(ensureSchema).toHaveBeenCalled();
    const callArg = mockExecute.mock.calls[0][0] as { sql: string; args: unknown[] };
    expect(callArg.sql).toMatch(/SELECT \* FROM users WHERE email = \?/i);
    expect(callArg.args).toEqual(["alice@example.com"]);
    expect(result?.id).toBe("id-1");
    expect(result?.email).toBe("alice@example.com");
  });

  it("returns undefined when no row matches", async () => {
    mockExecute.mockResolvedValueOnce({ rows: [] });
    const result = await users.getByEmail("nobody@example.com");
    expect(result).toBeUndefined();
  });
});
