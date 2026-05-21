// @vitest-environment jsdom
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TimeTab } from "../tabs/TimeTab";

const mockChart = {
  data: {
    dashas: {
      maha:       { planet: "Saturn",  start: "2020-01-01", end: "2039-01-01" },
      antar:      { planet: "Mercury", start: "2024-01-01", end: "2026-07-01" },
      pratyantar: { planet: "Venus",   start: "2025-04-01", end: "2025-10-01" },
      sukshma:    { planet: "Sun",     start: "2025-07-01", end: "2025-08-01" },
      prana:      { planet: "Moon",    start: "2025-07-15", end: "2025-07-20" },
      timeline: [
        { planet: "Saturn",  start: "2020-01-01", end: "2039-01-01" },
        { planet: "Mercury", start: "2039-01-01", end: "2056-01-01" },
      ],
    },
  },
};

const mockTransit = {
  planets: {
    Sun: { sign: "Taurus", is_retrograde: false, house_from_lagna: 2, house_from_moon: 8, sav_points: 25 },
  },
  sade_sati: { active: false },
  rahu_ketu_axis: { rahu_sign: "Pisces", rahu_house_from_lagna: 12, ketu_sign: "Virgo", ketu_house_from_lagna: 6 },
};

const mockCareer = {
  tenth_house: { sign: "Capricorn", lord: "Saturn", lord_house: 7, lord_sign: "Libra" },
  career_themes: ["administration", "law"],
  primary_planets: ["Saturn", "Mercury"],
  strength_factors: ["10th lord in exaltation", "Benefic aspect on 10th"],
};

const defaultProps = {
  chartOutput: mockChart,
  transitOutput: mockTransit,
  careerOutput: mockCareer,
  isTransitLoading: false,
  isCareerLoading: false,
  onFetchTransit: vi.fn(),
  onFetchCareer: vi.fn(),
};

describe("TimeTab", () => {
  it("shows current Maha Dasha planet", () => {
    render(<TimeTab {...defaultProps} />);
    expect(screen.getAllByText(/Saturn/).length).toBeGreaterThan(0);
  });

  it("shows transit Sun sign after clicking Transits tab", () => {
    render(<TimeTab {...defaultProps} />);
    fireEvent.click(screen.getByRole("tab", { name: /transits/i }));
    expect(screen.getByText(/Taurus/)).toBeDefined();
  });

  it("shows career theme badge after clicking Career tab", () => {
    render(<TimeTab {...defaultProps} />);
    fireEvent.click(screen.getByRole("tab", { name: /career/i }));
    expect(screen.getByText(/administration/i)).toBeDefined();
  });

  it("renders nothing for transit when transitOutput is null", () => {
    render(<TimeTab {...defaultProps} transitOutput={null} isTransitLoading={false} />);
    fireEvent.click(screen.getByRole("tab", { name: /transits/i }));
    expect(screen.queryByText(/Taurus/)).toBeNull();
  });
});
