import { profiles } from "../db/profiles";
import { getClient, ensureSchema } from "../db/client";

jest.mock("../db/client");

describe("profiles db", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("update", () => {
    it("should throw when db throws in update", async () => {
      const mockExecute = jest.fn().mockRejectedValue(new Error("DB Connection Error"));
      (getClient as jest.Mock).mockReturnValue({ execute: mockExecute });
      (ensureSchema as jest.Mock).mockResolvedValue(undefined);

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
        sql: expect.stringContaining("UPDATE profiles SET")
      }));
    });
  });
});
