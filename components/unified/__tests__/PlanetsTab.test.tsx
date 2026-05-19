// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PlanetsTab } from "../tabs/PlanetsTab";

const mockOutput = {
  data: {
    planets: {
      Sun: {
        sign: "Leo", degree: 15.0, house: 5, nakshatra: "Purva Phalguni", pada: 2,
        dignity: "own", is_retrograde: false, is_combust: false,
        aspects: [11], nakshatra_lord: "Venus",
      },
      Moon: { sign: "Aries", degree: 3.0, house: 1, nakshatra: "Ashwini", pada: 1,
              dignity: "neutral", is_retrograde: false, is_combust: false, aspects: [7] },
      Mars: { sign: "Aries", degree: 20.0, house: 1, nakshatra: "Bharani", pada: 4,
              dignity: "own", is_retrograde: false, is_combust: false, aspects: [4,7,8] },
      Mercury: { sign: "Virgo", degree: 10, house: 6, nakshatra: "Hasta", pada: 2,
                 dignity: "exalted", is_retrograde: true, is_combust: false, aspects: [12] },
      Jupiter: { sign: "Cancer", degree: 5, house: 4, nakshatra: "Pushya", pada: 1,
                 dignity: "exalted", is_retrograde: false, is_combust: false, aspects: [8,10,12] },
      Venus:   { sign: "Libra", degree: 12, house: 7, nakshatra: "Swati", pada: 2,
                 dignity: "own", is_retrograde: false, is_combust: false, aspects: [1] },
      Saturn:  { sign: "Libra", degree: 20, house: 7, nakshatra: "Vishakha", pada: 1,
                 dignity: "exalted", is_retrograde: false, is_combust: false, aspects: [1,3,4] },
      Rahu:    { sign: "Gemini", degree: 15, house: 3, nakshatra: "Ardra", pada: 2,
                 dignity: "neutral", is_retrograde: false, is_combust: false, aspects: [9] },
      Ketu:    { sign: "Sagittarius", degree: 15, house: 9, nakshatra: "Purva Ashadha", pada: 1,
                 dignity: "neutral", is_retrograde: false, is_combust: false, aspects: [3] },
    },
    shadbala: {
      Sun: {
        sthana_bala: { total: 1.8 }, dig_bala: 0.6, kala_bala: 0.4,
        chesta_bala: 0.5, naisargika_bala: 0.6, drik_bala: 0.2,
        total_rupas: 4.1, required_rupas: 5.0, ishta_phala: 45, kashta_phala: 10,
        is_strong: false,
      },
    },
    avasthas: {
      Sun: { avastha: "Yuva", degree: 15.0, strength_factor: 1.0, description: "Prime state" },
    },
    yogas: [
      { name: "Budhaditya Yoga", formed_by: ["Sun", "Mercury"], description: "..." },
    ],
  },
};

describe("PlanetsTab", () => {
  it("renders 9 planet name cells in the positions table", () => {
    render(<PlanetsTab chartOutput={mockOutput} />);
    // Each planet appears as a bold cell in the positions table
    const planetNames = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];
    for (const name of planetNames) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    }
  });

  it("shows retrograde marker for Mercury", () => {
    render(<PlanetsTab chartOutput={mockOutput} />);
    expect(screen.getAllByText("℞").length).toBeGreaterThan(0);
  });

  it("shows shadbala total for Sun without any click", () => {
    render(<PlanetsTab chartOutput={mockOutput} />);
    // Shadbala table is always visible; Sun total_rupas = 4.1
    expect(screen.getByText("4.10")).toBeDefined();
  });

  it("shows yoga indicator badge on planet row", () => {
    render(<PlanetsTab chartOutput={mockOutput} />);
    // Yoga name appears as tooltip on the ✦ badge in the planet's row
    const badge = document.querySelector('[title="Budhaditya Yoga"]');
    expect(badge).not.toBeNull();
  });

  it("renders nothing when chartOutput is empty", () => {
    const { container } = render(<PlanetsTab chartOutput={{}} />);
    expect(container.querySelector("table")).toBeNull();
  });
});
