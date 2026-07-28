import { describe, expect, it } from "vitest";
import {
  canonicalNakshatra,
  canonicalRasi,
  extractParticipantContext,
} from "./participant-context";

describe("participant context canonicalization", () => {
  it.each([
    ["Ashwini", "Ashvini"],
    ["Pushyami", "Pushya"],
    ["Moola", "Mula"],
    ["Uttara-Ashadha", "Uttara Ashadha"],
    ["Poorva Bhadrapada", "Purva Bhadrapada"],
  ])("maps DashaFlow nakshatra %s to %s", (input, expected) => {
    expect(canonicalNakshatra(input)).toBe(expected);
  });

  it.each([
    ["Aries", "Mesha"],
    ["Scorpio", "Vrischika"],
    ["Pisces", "Meena"],
  ])("maps DashaFlow sign %s to %s", (input, expected) => {
    expect(canonicalRasi(input)).toBe(expected);
  });

  it("extracts only the derived participant facts needed by Telugu Calendar", () => {
    expect(
      extractParticipantContext(
        {
          data: {
            planets: {
              Moon: { sign: "Aries", nakshatra: "Ashwini", degree: 12.5 },
            },
            lagna: { sign: "Cancer", degree: 2.1 },
          },
        },
        "p1",
      ),
    ).toEqual({
      label: "p1",
      janma_nakshatra: "Ashvini",
      janma_rasi: "Mesha",
      janma_lagna: "Karka",
    });
  });

  it("returns null when the chart has no supported birth Moon nakshatra", () => {
    expect(extractParticipantContext({ data: { planets: {} } }, "p1")).toBeNull();
    expect(
      extractParticipantContext(
        { data: { planets: { Moon: { nakshatra: "Unknown" } } } },
        "p1",
      ),
    ).toBeNull();
  });
});
