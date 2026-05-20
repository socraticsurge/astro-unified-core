import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

import {
  lookupPlanetInHouse,
  lookupDashaPair,
  lookupNakshatra,
  lookupAscendant,
  lookupHouseLordship,
} from "./lookup";
import * as loader from "./loader";

vi.mock("./loader", () => ({
  loadByTypeAndKey: vi.fn(),
}));

describe("lookup utility tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("lookupPlanetInHouse", () => {
    it("returns null if planet or house is missing", () => {
      expect(lookupPlanetInHouse("", 1)).toBeNull();
      expect(lookupPlanetInHouse("Sun", 0)).toBeNull();
    });

    it("returns null if loadByTypeAndKey returns null", () => {
      vi.mocked(loader.loadByTypeAndKey).mockReturnValue(null);
      expect(lookupPlanetInHouse("Sun", 1)).toBeNull();
    });

    it("returns null if loadByTypeAndKey returns incorrect type", () => {
      vi.mocked(loader.loadByTypeAndKey).mockReturnValue({
        type: "ascendant",
        key: "sun-1",
        title: "Test",
        factors: { sign: "Aries" },
        sources: [],
        rendering_status: "pending",
        body: "",
      });
      expect(lookupPlanetInHouse("Sun", 1)).toBeNull();
    });

    it("returns entry on success and formats key correctly", () => {
      const mockEntry = {
        type: "planet-in-house" as const,
        key: "sun-1",
        title: "Sun in 1st House",
        factors: { planet: "Sun", house: 1 },
        sources: [],
        body: "Test body",
      };
      vi.mocked(loader.loadByTypeAndKey).mockReturnValue(mockEntry);

      const result = lookupPlanetInHouse("  Sun  ", 1);

      expect(loader.loadByTypeAndKey).toHaveBeenCalledWith("planet-in-house", "sun-1");
      expect(result).toEqual(mockEntry);
    });
  });

  describe("lookupDashaPair", () => {
    it("returns null if mahadasha or antardasha is missing", () => {
      expect(lookupDashaPair("", "Moon")).toBeNull();
      expect(lookupDashaPair("Sun", "")).toBeNull();
    });

    it("returns null if loadByTypeAndKey returns null", () => {
      vi.mocked(loader.loadByTypeAndKey).mockReturnValue(null);
      expect(lookupDashaPair("Sun", "Moon")).toBeNull();
    });

    it("returns null if loadByTypeAndKey returns incorrect type", () => {
      vi.mocked(loader.loadByTypeAndKey).mockReturnValue({
        type: "ascendant",
        key: "sun-moon",
        title: "Test",
        factors: { sign: "Aries" },
        sources: [],
        rendering_status: "pending",
        body: "",
      });
      expect(lookupDashaPair("Sun", "Moon")).toBeNull();
    });

    it("returns entry on success and formats key correctly", () => {
      const mockEntry = {
        type: "dasha-pair" as const,
        key: "sun-moon",
        title: "Sun-Moon",
        factors: { mahadasha: "Sun", antardasha: "Moon" },
        sources: [],
        rendering_status: "pending" as const,
        body: "Test body",
      };
      vi.mocked(loader.loadByTypeAndKey).mockReturnValue(mockEntry);

      const result = lookupDashaPair(" Sun ", " Moon ");

      expect(loader.loadByTypeAndKey).toHaveBeenCalledWith("dasha-pair", "sun-moon");
      expect(result).toEqual(mockEntry);
    });
  });

  describe("lookupNakshatra", () => {
    it("returns null if nakshatra is missing", () => {
      expect(lookupNakshatra("")).toBeNull();
    });

    it("returns null if loadByTypeAndKey returns null", () => {
      vi.mocked(loader.loadByTypeAndKey).mockReturnValue(null);
      expect(lookupNakshatra("Ashwini")).toBeNull();
    });

    it("returns null if loadByTypeAndKey returns incorrect type", () => {
      vi.mocked(loader.loadByTypeAndKey).mockReturnValue({
        type: "ascendant",
        key: "ashwini",
        title: "Test",
        factors: { sign: "Aries" },
        sources: [],
        rendering_status: "pending",
        body: "",
      });
      expect(lookupNakshatra("Ashwini")).toBeNull();
    });

    it("returns entry on success and formats key correctly", () => {
      const mockEntry = {
        type: "nakshatra" as const,
        key: "ashwini",
        title: "Ashwini",
        factors: { nakshatra: "Ashwini" },
        sources: [],
        rendering_status: "pending" as const,
        body: "Test body",
      };
      vi.mocked(loader.loadByTypeAndKey).mockReturnValue(mockEntry);

      const result = lookupNakshatra(" Ashwini ");

      expect(loader.loadByTypeAndKey).toHaveBeenCalledWith("nakshatra", "ashwini");
      expect(result).toEqual(mockEntry);
    });
  });

  describe("lookupAscendant", () => {
    it("returns null if sign is missing", () => {
      expect(lookupAscendant("")).toBeNull();
    });

    it("returns null if loadByTypeAndKey returns null", () => {
      vi.mocked(loader.loadByTypeAndKey).mockReturnValue(null);
      expect(lookupAscendant("Aries")).toBeNull();
    });

    it("returns null if loadByTypeAndKey returns incorrect type", () => {
      vi.mocked(loader.loadByTypeAndKey).mockReturnValue({
        type: "nakshatra",
        key: "aries",
        title: "Test",
        factors: { nakshatra: "Ashwini" },
        sources: [],
        rendering_status: "pending",
        body: "",
      });
      expect(lookupAscendant("Aries")).toBeNull();
    });

    it("returns entry on success and formats key correctly", () => {
      const mockEntry = {
        type: "ascendant" as const,
        key: "aries",
        title: "Aries",
        factors: { sign: "Aries" },
        sources: [],
        rendering_status: "pending" as const,
        body: "Test body",
      };
      vi.mocked(loader.loadByTypeAndKey).mockReturnValue(mockEntry);

      const result = lookupAscendant(" Aries ");

      expect(loader.loadByTypeAndKey).toHaveBeenCalledWith("ascendant", "aries");
      expect(result).toEqual(mockEntry);
    });
  });

  describe("lookupHouseLordship", () => {
    it("returns null if lordOfHouse or placedInHouse is missing", () => {
      expect(lookupHouseLordship(0, 2)).toBeNull();
      expect(lookupHouseLordship(1, 0)).toBeNull();
    });

    it("returns null if loadByTypeAndKey returns null", () => {
      vi.mocked(loader.loadByTypeAndKey).mockReturnValue(null);
      expect(lookupHouseLordship(1, 2)).toBeNull();
    });

    it("returns null if loadByTypeAndKey returns incorrect type", () => {
      vi.mocked(loader.loadByTypeAndKey).mockReturnValue({
        type: "ascendant",
        key: "1-in-2",
        title: "Test",
        factors: { sign: "Aries" },
        sources: [],
        rendering_status: "pending",
        body: "",
      });
      expect(lookupHouseLordship(1, 2)).toBeNull();
    });

    it("returns entry on success and formats key correctly", () => {
      const mockEntry = {
        type: "house-lordship" as const,
        key: "1-in-2",
        title: "1st Lord in 2nd House",
        factors: { lord_of_house: 1, placed_in_house: 2 },
        sources: [],
        rendering_status: "pending" as const,
        body: "Test body",
      };
      vi.mocked(loader.loadByTypeAndKey).mockReturnValue(mockEntry);

      const result = lookupHouseLordship(1, 2);

      expect(loader.loadByTypeAndKey).toHaveBeenCalledWith("house-lordship", "1-in-2");
      expect(result).toEqual(mockEntry);
    });
  });
});
