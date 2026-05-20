import { describe, it, expect } from "vitest";
import { birthDataChanged } from "../cache-validate";

const baseProfile = {
  date_of_birth: "1990-01-15",
  time_of_birth: "10:30",
  latitude: 12.97,
  longitude: 77.59,
  timezone: "Asia/Kolkata",
};

function snap(overrides: Partial<typeof baseProfile> = {}) {
  return JSON.stringify({ ...baseProfile, ...overrides });
}

describe("birthDataChanged", () => {
  it("returns false when every field matches", () => {
    expect(birthDataChanged(snap(), baseProfile)).toBe(false);
  });

  it("returns true when date_of_birth changes", () => {
    expect(birthDataChanged(snap({ date_of_birth: "1990-01-16" }), baseProfile)).toBe(true);
  });

  it("returns true when time_of_birth changes", () => {
    expect(birthDataChanged(snap({ time_of_birth: "11:30" }), baseProfile)).toBe(true);
  });

  it("returns true when latitude changes", () => {
    expect(birthDataChanged(snap({ latitude: 13.0 }), baseProfile)).toBe(true);
  });

  it("returns true when longitude changes", () => {
    expect(birthDataChanged(snap({ longitude: 78.0 }), baseProfile)).toBe(true);
  });

  it("returns true when timezone changes", () => {
    expect(birthDataChanged(snap({ timezone: "America/New_York" }), baseProfile)).toBe(true);
  });

  it("returns true when the snapshot is unparseable JSON", () => {
    expect(birthDataChanged("not json at all {", baseProfile)).toBe(true);
  });

  it("returns true when the snapshot is the empty string", () => {
    expect(birthDataChanged("", baseProfile)).toBe(true);
  });

  it("treats missing fields in the snapshot as a change", () => {
    expect(birthDataChanged(JSON.stringify({}), baseProfile)).toBe(true);
  });

  it("handles null current fields without throwing", () => {
    const allNullCurrent = {
      date_of_birth: null,
      time_of_birth: null,
      latitude: null,
      longitude: null,
      timezone: null,
    };
    expect(birthDataChanged(JSON.stringify(allNullCurrent), allNullCurrent)).toBe(false);
    expect(birthDataChanged(snap(), allNullCurrent)).toBe(true);
  });
});
