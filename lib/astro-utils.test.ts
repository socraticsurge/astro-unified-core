import {
  longitudeToSign,
  longitudeToDegreesInSign,
  longitudeToNakshatra,
  parseVedAstroPlanets,
  houseNumberToName,
  dignityBadgeColor,
} from "./astro-utils";

describe("astro-utils", () => {
  describe("longitudeToSign", () => {
    it("returns correct sign for 0 degrees", () => {
      expect(longitudeToSign(0)).toBe("Aries");
    });

    it("returns correct sign for exactly 30 degrees", () => {
      expect(longitudeToSign(30)).toBe("Taurus");
    });

    it("returns correct sign for 359 degrees", () => {
      expect(longitudeToSign(359)).toBe("Pisces");
    });

    it("handles values >= 360", () => {
      expect(longitudeToSign(360)).toBe("Aries");
      expect(longitudeToSign(390)).toBe("Taurus");
    });

    it("handles negative values", () => {
      expect(longitudeToSign(-1)).toBe("Pisces"); // 359
      expect(longitudeToSign(-30)).toBe("Pisces"); // 330
      expect(longitudeToSign(-360)).toBe("Aries"); // 0
    });
  });

  describe("longitudeToDegreesInSign", () => {
    it("returns correctly formatted degrees and minutes", () => {
      expect(longitudeToDegreesInSign(0)).toBe("0°00′");
      expect(longitudeToDegreesInSign(15.5)).toBe("15°30′");
      expect(longitudeToDegreesInSign(29.99)).toBe("29°59′");
    });

    it("normalizes longitudes before formatting", () => {
      expect(longitudeToDegreesInSign(30)).toBe("0°00′"); // 30 is 0 in Taurus
      expect(longitudeToDegreesInSign(45.25)).toBe("15°15′"); // Taurus 15.25
      expect(longitudeToDegreesInSign(375.5)).toBe("15°30′"); // 375.5 is 15.5 in Aries
    });

    it("handles negative values", () => {
      expect(longitudeToDegreesInSign(-14.5)).toBe("15°30′"); // 345.5 is 15.5 in Pisces
    });
  });

  describe("longitudeToNakshatra", () => {
    it("returns Ashwini for 0 degrees", () => {
      expect(longitudeToNakshatra(0)).toBe("Ashwini");
    });

    it("returns Bharani for 13°20′", () => {
      expect(longitudeToNakshatra(13.33333334)).toBe("Bharani");
    });

    it("returns Revati for 359 degrees", () => {
      expect(longitudeToNakshatra(359)).toBe("Revati");
    });

    it("handles normalized values", () => {
      expect(longitudeToNakshatra(360)).toBe("Ashwini");
      expect(longitudeToNakshatra(-1)).toBe("Revati");
    });
  });

  describe("parseVedAstroPlanets", () => {
    it("parses empty string", () => {
      expect(parseVedAstroPlanets("")).toEqual([]);
    });

    it("parses single planet", () => {
      const result = parseVedAstroPlanets("Sun - 15.5");
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: "Sun",
        longitude: 15.5,
        sign: "Aries",
        degrees: "15°30′",
        nakshatra: "Bharani"
      });
    });

    it("parses multiple planets", () => {
      const result = parseVedAstroPlanets("Sun - 15.5, Moon - 45.25");
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Sun");
      expect(result[1]).toEqual({
        name: "Moon",
        longitude: 45.25,
        sign: "Taurus",
        degrees: "15°15′",
        nakshatra: "Rohini"
      });
    });

    it("ignores empty entries", () => {
      const result = parseVedAstroPlanets("Sun - 15.5,, Moon - 45.25,  ");
      expect(result).toHaveLength(2);
    });
  });

  describe("houseNumberToName", () => {
    it("formats 1st House", () => {
      expect(houseNumberToName("House1")).toBe("1st House");
    });

    it("formats 2nd House", () => {
      expect(houseNumberToName("House2")).toBe("2nd House");
    });

    it("formats 3rd House", () => {
      expect(houseNumberToName("House3")).toBe("3rd House");
    });

    it("formats 4th House", () => {
      expect(houseNumberToName("House4")).toBe("4th House");
    });

    it("formats 12th House", () => {
      expect(houseNumberToName("House12")).toBe("12th House");
    });
  });

  describe("dignityBadgeColor", () => {
    // Migrated 2026-05-21 from raw Tailwind palette (emerald / blue / red /
    // teal / orange / gray) to theme tokens so the badges adapt to the
    // Vellum light theme. See scripts/check-no-raw-palette.sh.
    it("returns theme-token classes for each dignity", () => {
      expect(dignityBadgeColor("Exalted")).toContain("var(--color-success");
      expect(dignityBadgeColor("OwnSign")).toContain("var(--color-accent");
      expect(dignityBadgeColor("Debilitated")).toContain("var(--color-danger");
      expect(dignityBadgeColor("Friend")).toContain("var(--color-cool");
      expect(dignityBadgeColor("Enemy")).toContain("var(--color-warning");
    });

    it("returns muted token for unknown dignity", () => {
      expect(dignityBadgeColor("Unknown")).toContain("var(--color-ink-4");
    });
  });
});
