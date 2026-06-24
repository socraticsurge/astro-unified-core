import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { chatMessages } from "./chat-messages";
import { getClient, ensureSchema } from "./client";

vi.mock("./client", () => ({
  getClient: vi.fn(),
  ensureSchema: vi.fn(),
}));

describe("chatMessages.stats", () => {
  let mockExecute: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockExecute = vi.fn();
    vi.mocked(getClient).mockReturnValue({ execute: mockExecute } as ReturnType<typeof getClient>);
    vi.mocked(ensureSchema).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("runs ensureSchema and four parallel queries, then shapes the result", async () => {
    // overview row: [total_user, unique_users, sessions, this_month, up, down, unrated_assistant]
    mockExecute
      .mockResolvedValueOnce({ rows: [[120, 14, 33, 22, 18, 3, 41]] })
      .mockResolvedValueOnce({
        rows: [
          ["user-1", "alice@example.com", "Alice", 50, "2026-06-24T10:00:00Z"],
          ["user-2", "bob@example.com", null, 30, "2026-06-23T22:30:00Z"],
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          ["gemma-4-31b-it", 90],
          ["gemini-3.1-flash-lite", 12],
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          ["session-A", "user-1", "alice@example.com", "profile", 8, "2026-06-24T09:00:00Z", "2026-06-24T10:00:00Z"],
        ],
      });

    const result = await chatMessages.stats();

    expect(ensureSchema).toHaveBeenCalledOnce();
    expect(mockExecute).toHaveBeenCalledTimes(4);

    expect(result.overview).toEqual({
      total_user_messages: 120,
      unique_users: 14,
      sessions: 33,
      this_month: 22,
      thumbs_up: 18,
      thumbs_down: 3,
      unrated_assistant: 41,
    });

    expect(result.by_user).toEqual([
      { user_id: "user-1", email: "alice@example.com", name: "Alice", message_count: 50, last_message_at: "2026-06-24T10:00:00Z" },
      { user_id: "user-2", email: "bob@example.com", name: null, message_count: 30, last_message_at: "2026-06-23T22:30:00Z" },
    ]);

    expect(result.by_model).toEqual([
      { model: "gemma-4-31b-it", count: 90 },
      { model: "gemini-3.1-flash-lite", count: 12 },
    ]);

    expect(result.recent_sessions).toEqual([
      {
        session_id: "session-A",
        user_id: "user-1",
        user_email: "alice@example.com",
        session_type: "profile",
        message_count: 8,
        started_at: "2026-06-24T09:00:00Z",
        last_activity_at: "2026-06-24T10:00:00Z",
      },
    ]);
  });

  it("passes the current calendar month start (UTC) as the this_month threshold", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [[0, 0, 0, 0, 0, 0, 0]] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await chatMessages.stats();

    const overviewCall = mockExecute.mock.calls[0][0] as { args: string[] };
    const monthStart = new Date(overviewCall.args[0]);

    expect(monthStart.getUTCDate()).toBe(1);
    expect(monthStart.getUTCHours()).toBe(0);
    expect(monthStart.getUTCMinutes()).toBe(0);
    expect(monthStart.getUTCSeconds()).toBe(0);
  });

  it("returns zeroed overview and empty arrays when there is no chat activity", async () => {
    mockExecute
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await chatMessages.stats();

    expect(result.overview.total_user_messages).toBe(0);
    expect(result.overview.unique_users).toBe(0);
    expect(result.by_user).toEqual([]);
    expect(result.by_model).toEqual([]);
    expect(result.recent_sessions).toEqual([]);
  });
});
