import { vi, describe, it, expect, beforeEach } from "vitest";
import { profiles } from "../db/profiles";
import { getClient, ensureSchema } from "../db/client";

vi.mock("../db/client");

describe("profiles db", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("update", () => {
    it("should throw when db throws in update", async () => {
      const mockExecute = vi.fn().mockRejectedValue(new Error("DB Connection Error"));
      vi.mocked(getClient).mockReturnValue({ execute: mockExecute } as ReturnType<typeof getClient>);
      vi.mocked(ensureSchema).mockResolvedValue(undefined);

      const updateData = {
        name: "Test Name",
        date_of_birth: "2000-01-01",
        time_of_birth: "12:00",
        place_of_birth: "Test City",
        latitude: 0,
        longitude: 0,
        timezone: "UTC",
        timezone_offset: 0,
      };

      await expect(profiles.update("profile123", "user123", updateData)).rejects.toThrow("DB Connection Error");

      expect(ensureSchema).toHaveBeenCalled();
      expect(mockExecute).toHaveBeenCalledTimes(1);
      expect(mockExecute).toHaveBeenCalledWith(expect.objectContaining({
        sql: expect.stringContaining("UPDATE profiles SET"),
      }));
    });
  });
});
