import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { profiles } from "./profiles";
import { getClient, ensureSchema } from "./client";

vi.mock("./client", () => ({
  getClient: vi.fn(),
  ensureSchema: vi.fn(),
}));

describe("profiles.create", () => {
  let mockExecute: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockExecute = vi.fn();
    vi.mocked(getClient).mockReturnValue({ execute: mockExecute } as ReturnType<typeof getClient>);
    vi.mocked(ensureSchema).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should create a profile with required fields", async () => {
    const userId = "test-user-id";
    const data = {
      name: "John Doe",
      date_of_birth: "1990-01-01",
      time_of_birth: "12:00",
      place_of_birth: "New York, USA",
      latitude: 40.7128,
      longitude: -74.006,
      timezone: "America/New_York",
      timezone_offset: -5,
    };

    const result = await profiles.create(userId, data);

    expect(ensureSchema).toHaveBeenCalled();
    expect(mockExecute).toHaveBeenCalledTimes(1);

    const callArgs = mockExecute.mock.calls[0][0];
    expect(callArgs.sql).toContain("INSERT INTO profiles");

    expect(callArgs.args[1]).toBe(userId);
    expect(callArgs.args[2]).toBe(data.name);
    expect(callArgs.args[3]).toBe(data.date_of_birth);
    expect(callArgs.args[4]).toBe(data.time_of_birth);
    expect(callArgs.args[5]).toBe(data.place_of_birth);
    expect(callArgs.args[6]).toBe(data.latitude);
    expect(callArgs.args[7]).toBe(data.longitude);
    expect(callArgs.args[8]).toBe(data.timezone);
    expect(callArgs.args[9]).toBe(data.timezone_offset);
    expect(callArgs.args[10]).toBeNull(); // relationship
    expect(callArgs.args[11]).toBeNull(); // gender
    // args[12] is created_at
    expect(callArgs.args[13]).toBeNull(); // current_location
    expect(callArgs.args[14]).toBeNull(); // current_latitude
    expect(callArgs.args[15]).toBeNull(); // current_longitude
    expect(callArgs.args[16]).toBeNull(); // current_timezone
    expect(callArgs.args[17]).toBeNull(); // current_timezone_offset

    expect(result).toMatchObject({ user_id: userId, ...data });
    expect(typeof result.id).toBe("string");
    expect(typeof result.created_at).toBe("string");
  });

  it("should create a profile with all optional fields", async () => {
    const userId = "test-user-id";
    const data = {
      name: "Jane Doe",
      date_of_birth: "1992-05-15",
      time_of_birth: "08:30",
      place_of_birth: "London, UK",
      latitude: 51.5074,
      longitude: -0.1278,
      timezone: "Europe/London",
      timezone_offset: 0,
      relationship: "Self",
      gender: "Female",
      current_location: "Paris, France",
      current_latitude: 48.8566,
      current_longitude: 2.3522,
      current_timezone: "Europe/Paris",
      current_timezone_offset: 1,
    };

    const result = await profiles.create(userId, data);

    expect(ensureSchema).toHaveBeenCalled();
    expect(mockExecute).toHaveBeenCalledTimes(1);

    const callArgs = mockExecute.mock.calls[0][0];

    expect(callArgs.args[10]).toBe(data.relationship);
    expect(callArgs.args[11]).toBe(data.gender);
    expect(callArgs.args[13]).toBe(data.current_location);
    expect(callArgs.args[14]).toBe(data.current_latitude);
    expect(callArgs.args[15]).toBe(data.current_longitude);
    expect(callArgs.args[16]).toBe(data.current_timezone);
    expect(callArgs.args[17]).toBe(data.current_timezone_offset);

    expect(result).toMatchObject({ user_id: userId, ...data });
  });
});
