// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ChartTab } from "../tabs/ChartTab";

const mockOutput = {
  data: {
    panchang: {
      tithi:     { name: "Pratipada", number: 1, paksha: "Shukla" },
      vara:      { name: "Sunday", lord: "Sun" },
      nakshatra: { name: "Ashwini", pada: 1, lord: "Ketu" },
      yoga:      { name: "Vishkambha", index: 1 },
      karana:    "Bava",
    },
    lagna: {
      sign: "Aries", degree: 5.2, nakshatra: "Ashwini", pada: 1,
      d9_sign: "Capricorn", d10_sign: "Capricorn",
    },
    planets: {
      Sun:     { sign: "Leo",    degree: 15.0, house: 5, nakshatra: "Purva Phalguni", pada: 2, dignity: "own",   is_retrograde: false, is_combust: false, aspects: [11] },
      Moon:    { sign: "Aries",  degree: 3.0,  house: 1, nakshatra: "Ashwini",        pada: 1, dignity: "neutral", is_retrograde: false, is_combust: false, aspects: [7] },
      Mars:    { sign: "Aries",  degree: 20.0, house: 1, nakshatra: "Bharani",        pada: 4, dignity: "own",   is_retrograde: false, is_combust: false, aspects: [4,7,8] },
      Mercury: { sign: "Virgo",  degree: 10.0, house: 6, nakshatra: "Hasta",          pada: 2, dignity: "exalted", is_retrograde: true, is_combust: false, aspects: [12] },
      Jupiter: { sign: "Cancer", degree: 5.0,  house: 4, nakshatra: "Pushya",         pada: 1, dignity: "exalted", is_retrograde: false, is_combust: false, aspects: [8,10,12] },
      Venus:   { sign: "Libra",  degree: 12.0, house: 7, nakshatra: "Swati",          pada: 2, dignity: "own",   is_retrograde: false, is_combust: false, aspects: [1] },
      Saturn:  { sign: "Libra",  degree: 20.0, house: 7, nakshatra: "Vishakha",       pada: 1, dignity: "exalted", is_retrograde: false, is_combust: false, aspects: [1,3,4] },
      Rahu:    { sign: "Gemini", degree: 15.0, house: 3, nakshatra: "Ardra",          pada: 2, dignity: "neutral", is_retrograde: false, is_combust: false, aspects: [9] },
      Ketu:    { sign: "Sagittarius", degree: 15.0, house: 9, nakshatra: "Purva Ashadha", pada: 1, dignity: "neutral", is_retrograde: false, is_combust: false, aspects: [3] },
    },
  },
};

describe("ChartTab", () => {
  it("renders panchang tithi name", () => {
    render(<ChartTab chartOutput={mockOutput} />);
    expect(screen.getByText(/Pratipada/)).toBeDefined();
  });

  it("renders D9 lagna chip in varga strip", () => {
    render(<ChartTab chartOutput={mockOutput} />);
    expect(screen.getByText(/D9: Capricorn/)).toBeDefined();
  });

  it("renders all 9 planets in the table", () => {
    render(<ChartTab chartOutput={mockOutput} />);
    ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Rahu","Ketu"].forEach(p => {
      expect(screen.getAllByText(new RegExp(`^${p}$`)).length).toBeGreaterThan(0);
    });
  });

  it("shows retrograde marker for Mercury", () => {
    render(<ChartTab chartOutput={mockOutput} />);
    expect(screen.getAllByText(/℞/).length).toBeGreaterThan(0);
  });

  it("shows Aspects column header", () => {
    render(<ChartTab chartOutput={mockOutput} />);
    expect(screen.getByText(/Aspects/i)).toBeDefined();
  });

  it("shows formatted aspects for Mars (H4, H7, H8)", () => {
    render(<ChartTab chartOutput={mockOutput} />);
    expect(screen.getByText(/H4.*H7.*H8|H4, H7, H8/)).toBeDefined();
  });

  it("renders nothing when chartOutput is empty", () => {
    const { container } = render(<ChartTab chartOutput={{}} />);
    expect(container.querySelector("section")).toBeNull();
  });
});
