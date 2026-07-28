// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PlanetsTab } from "../tabs/PlanetsTab";

const mockOutput = {
  data: {
    lagna: {
      sign: "Aries", degree: 10.0, nakshatra: "Ashwini", pada: 3,
    },
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
  it("renders the complete nine-graha table from the D1 payload", () => {
    render(<PlanetsTab chartOutput={mockOutput} />);

    expect(screen.getByText("DashaFlow · Sidereal D1")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: /Sidereal D1 positions/i })).toBeInTheDocument();
    const planetNames = ["Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu"];
    for (const name of planetNames) {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    }
  });

  it("uses Ascendant, Sun, and Moon as orientation anchors without ranking planets", () => {
    render(<PlanetsTab chartOutput={mockOutput} />);

    const heading = screen.getByRole("heading", { name: "Chart anchors" });
    const section = heading.closest("section");
    expect(section).not.toBeNull();

    const anchors = within(section as HTMLElement);
    expect(anchors.getByText("Ascendant")).toBeInTheDocument();
    expect(anchors.getByText("Sun")).toBeInTheDocument();
    expect(anchors.getByText("Moon")).toBeInTheDocument();
    expect(anchors.queryByText("Jupiter")).not.toBeInTheDocument();
    expect(anchors.queryByText("Saturn")).not.toBeInTheDocument();
    expect(anchors.getByText(/Orientation anchors, not a ranking/i)).toBeInTheDocument();
  });

  it("describes retrograde motion in words for Mercury", () => {
    render(<PlanetsTab chartOutput={mockOutput} />);
    expect(screen.getAllByText("Retrograde").length).toBeGreaterThan(0);
  });

  it("does not render shadbala data (moved to ShadabalaTab)", () => {
    render(<PlanetsTab chartOutput={mockOutput} />);
    // Shadbala is now in ShadabalaTab; PlanetsTab should not show total_rupas
    expect(document.querySelector("[data-shadbala]")).toBeNull();
  });

  it("shows yoga indicator badge on planet row", () => {
    render(<PlanetsTab chartOutput={mockOutput} />);
    // Yoga name appears as tooltip on the ✦ badge in the planet's row
    const badge = document.querySelector('[title="Budhaditya Yoga"]');
    expect(badge).not.toBeNull();
  });

  it("does not manufacture functional benefic or malefic classifications", () => {
    render(<PlanetsTab chartOutput={mockOutput} />);
    expect(
      screen.getByRole("heading", { name: "Benefic and malefic labels are not inferred" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/current calculation does not return that classification/i)).toBeInTheDocument();
  });

  it("renders nothing when chartOutput is empty", () => {
    const { container } = render(<PlanetsTab chartOutput={{}} />);
    expect(container.querySelector("table")).toBeNull();
  });
});
