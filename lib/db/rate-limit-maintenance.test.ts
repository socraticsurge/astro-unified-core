import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./client", () => ({
  ensureSchema: vi.fn(),
  getClient: vi.fn(),
}));

import { ensureSchema, getClient } from "./client";
import { cleanupExpiredDistributedRateLimits } from "./rate-limit-maintenance";

describe("cleanupExpiredDistributedRateLimits", () => {
  const execute = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ensureSchema).mockResolvedValue(undefined);
    vi.mocked(getClient).mockReturnValue({ execute } as never);
    execute.mockResolvedValue({ rowsAffected: 12, rows: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("deletes bounded, oldest-first expired batches", async () => {
    await expect(cleanupExpiredDistributedRateLimits()).resolves.toEqual({
      deletedRows: 12,
      batches: 1,
      backlogRemaining: false,
    });
    expect(ensureSchema).toHaveBeenCalledTimes(1);
    const statement = execute.mock.calls[0][0];
    expect(statement.args).toEqual([5_000]);
    expect(statement.sql).toContain("ORDER BY expires_at_ms");
    expect(statement.sql).toContain("LIMIT ?");
    expect(statement.sql).toContain("unixepoch('subsec')");
  });

  it("drains more than one batch before stopping", async () => {
    execute
      .mockResolvedValueOnce({ rowsAffected: 5_000, rows: [] })
      .mockResolvedValueOnce({ rowsAffected: 73, rows: [] });

    await expect(cleanupExpiredDistributedRateLimits()).resolves.toEqual({
      deletedRows: 5_073,
      batches: 2,
      backlogRemaining: false,
    });
    expect(execute).toHaveBeenCalledTimes(2);
    expect(execute.mock.calls[0][0].args).toEqual([5_000]);
    expect(execute.mock.calls[1][0].args).toEqual([5_000]);
  });

  it("reports a backlog after the 100,000-row safety cap", async () => {
    execute.mockReset();
    for (let index = 0; index < 20; index += 1) {
      execute.mockResolvedValueOnce({ rowsAffected: 5_000, rows: [] });
    }
    execute.mockResolvedValueOnce({ rowsAffected: 0, rows: [[1]] });

    await expect(cleanupExpiredDistributedRateLimits()).resolves.toEqual({
      deletedRows: 100_000,
      batches: 20,
      backlogRemaining: true,
    });
    expect(execute).toHaveBeenCalledTimes(21);
  });

  it("uses a partial final batch for a caller-supplied cap", async () => {
    execute
      .mockResolvedValueOnce({ rowsAffected: 5_000, rows: [] })
      .mockResolvedValueOnce({ rowsAffected: 1_000, rows: [] })
      .mockResolvedValueOnce({ rowsAffected: 0, rows: [[0]] });

    await expect(cleanupExpiredDistributedRateLimits(6_000)).resolves.toEqual({
      deletedRows: 6_000,
      batches: 2,
      backlogRemaining: false,
    });
    expect(execute.mock.calls[1][0].args).toEqual([1_000]);
  });

  it("rejects malformed storage mutation counts", async () => {
    execute.mockResolvedValue({ rowsAffected: 5_001, rows: [] });
    await expect(cleanupExpiredDistributedRateLimits()).rejects.toThrow(
      "Invalid rate-limit cleanup result",
    );
  });

  it("times out a never-settling schema preparation", async () => {
    vi.useFakeTimers();
    vi.mocked(ensureSchema).mockReturnValue(new Promise(() => undefined));
    const result = cleanupExpiredDistributedRateLimits();
    const rejection = expect(result).rejects.toThrow(
      "Rate-limit cleanup timed out",
    );

    await vi.advanceTimersByTimeAsync(2_500);
    await rejection;
    expect(execute).not.toHaveBeenCalled();
  });

  it("times out a never-settling cleanup query", async () => {
    vi.useFakeTimers();
    execute.mockReturnValue(new Promise(() => undefined));
    const result = cleanupExpiredDistributedRateLimits();
    const rejection = expect(result).rejects.toThrow(
      "Rate-limit cleanup timed out",
    );

    await vi.advanceTimersByTimeAsync(2_500);
    await rejection;
  });

  it("stops at the overall deadline even when each batch is individually healthy", async () => {
    vi.useFakeTimers();
    execute.mockImplementation(() => new Promise((resolve) => {
      setTimeout(() => resolve({ rowsAffected: 5_000, rows: [] }), 2_000);
    }));
    const result = cleanupExpiredDistributedRateLimits();

    await vi.advanceTimersByTimeAsync(10_000);
    await expect(result).resolves.toEqual({
      deletedRows: 25_000,
      batches: 5,
      backlogRemaining: true,
    });
    expect(execute).toHaveBeenCalledTimes(5);
  });

  it.each([0, -1, 100_001, 1.5, Number.NaN])(
    "rejects invalid cleanup bound %s before storage",
    async (limit) => {
      await expect(cleanupExpiredDistributedRateLimits(limit)).rejects.toThrow(
        "Invalid rate-limit cleanup bound",
      );
      expect(ensureSchema).not.toHaveBeenCalled();
      expect(execute).not.toHaveBeenCalled();
    },
  );
});
