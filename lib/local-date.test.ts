import { describe, expect, it } from "vitest";
import { addLocalDays, toLocalIsoDate, toTimeZoneIsoDate } from "./local-date";

describe("local calendar dates", () => {
  it("uses local calendar fields instead of the UTC date", () => {
    const earlyIndiaMorning = new Date("2026-07-26T19:20:00.000Z");
    const localFieldDate = new Date(2026, 6, 27, 0, 50);

    expect(toLocalIsoDate(localFieldDate)).toBe("2026-07-27");
    expect(earlyIndiaMorning.toISOString().slice(0, 10)).toBe("2026-07-26");
  });

  it("adds days with calendar arithmetic", () => {
    const start = new Date(2026, 6, 27, 12, 0);
    expect(toLocalIsoDate(addLocalDays(start, 7))).toBe("2026-08-03");
  });

  it("resolves the calendar date in the profile timezone", () => {
    const utcEvening = new Date("2026-07-26T20:15:00.000Z");

    expect(toTimeZoneIsoDate(utcEvening, "Asia/Kolkata")).toBe("2026-07-27");
    expect(toTimeZoneIsoDate(utcEvening, "America/Los_Angeles")).toBe("2026-07-26");
  });
});
