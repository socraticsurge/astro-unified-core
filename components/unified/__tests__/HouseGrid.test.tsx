// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { HouseGrid } from "../HouseGrid";

const mockPlanets = {
  Sun:     { house: 1, sign: "Aries",       d9_sign: "Leo"         },
  Moon:    { house: 4, sign: "Cancer",      d9_sign: "Scorpio"     },
  Mars:    { house: 1, sign: "Aries",       d9_sign: "Aries"       },
  Mercury: { house: 3, sign: "Gemini",      d9_sign: "Virgo"       },
  Jupiter: { house: 9, sign: "Sagittarius", d9_sign: "Pisces"      },
  Venus:   { house: 2, sign: "Taurus",      d9_sign: "Libra"       },
  Saturn:  { house: 7, sign: "Libra",       d9_sign: "Capricorn"   },
  Rahu:    { house: 11, sign: "Aquarius",   d9_sign: "Gemini"      },
  Ketu:    { house: 5, sign: "Leo",         d9_sign: "Sagittarius" },
};

describe("HouseGrid", () => {
  it("renders all 12 D1 house cells", () => {
    render(<HouseGrid planets={mockPlanets} lagnaSign="Aries" d9LagnaSign="Aries" />);
    for (let i = 1; i <= 12; i++) {
      expect(screen.getByTestId(`house-d1-${i}`)).toBeDefined();
    }
  });

  it("renders all 12 D9 house cells", () => {
    render(<HouseGrid planets={mockPlanets} lagnaSign="Aries" d9LagnaSign="Aries" />);
    for (let i = 1; i <= 12; i++) {
      expect(screen.getByTestId(`house-d9-${i}`)).toBeDefined();
    }
  });

  it("places Sun and Mars in D1 house 1", () => {
    render(<HouseGrid planets={mockPlanets} lagnaSign="Aries" d9LagnaSign="Aries" />);
    const house1 = screen.getByTestId("house-d1-1");
    expect(house1.textContent).toContain("Su");
    expect(house1.textContent).toContain("Ma");
  });

  it("places Moon in D1 house 4", () => {
    render(<HouseGrid planets={mockPlanets} lagnaSign="Aries" d9LagnaSign="Aries" />);
    const house4 = screen.getByTestId("house-d1-4");
    expect(house4.textContent).toContain("Mo");
  });

  it("places Mars (d9_sign=Aries) in D9 house 1 when d9LagnaSign=Aries", () => {
    render(<HouseGrid planets={mockPlanets} lagnaSign="Aries" d9LagnaSign="Aries" />);
    const d9h1 = screen.getByTestId("house-d9-1");
    expect(d9h1.textContent).toContain("Ma");
  });

  it("renders without crashing when planets is empty", () => {
    render(<HouseGrid planets={{}} lagnaSign="Aries" d9LagnaSign="Aries" />);
    expect(screen.getByTestId("house-d1-1")).toBeDefined();
  });
});
