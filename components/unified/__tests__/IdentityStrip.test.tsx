// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { IdentityStrip } from "../IdentityStrip";

const mockChart = {
  data: {
    lagna: { sign: "Scorpio", degree: 14.5, nakshatra: "Anuradha", pada: 2 },
    planets: {
      Moon: { sign: "Aries",  nakshatra: "Ashwini",          pada: 3 },
      Sun:  { sign: "Leo",    nakshatra: "Purva Phalguni",   pada: 1 },
    },
    dashas: {
      maha:  { planet: "Saturn"  },
      antar: { planet: "Mercury" },
    },
  },
};

const mockTransitActive = {
  data: { sade_sati: { active: true, phase: "peak" } },
};

const mockTransitInactive = {
  data: { sade_sati: { active: false, phase: null } },
};

describe("IdentityStrip", () => {
  it("shows lagna sign", () => {
    render(<IdentityStrip chartOutput={mockChart} transitOutput={null} />);
    expect(screen.getByTestId("identity-lagna").textContent).toContain("Scorpio");
  });

  it("shows moon sign and nakshatra", () => {
    render(<IdentityStrip chartOutput={mockChart} transitOutput={null} />);
    const moon = screen.getByTestId("identity-moon");
    expect(moon.textContent).toContain("Aries");
    expect(moon.textContent).toContain("Ashwini");
  });

  it("shows sun sign", () => {
    render(<IdentityStrip chartOutput={mockChart} transitOutput={null} />);
    expect(screen.getByTestId("identity-sun").textContent).toContain("Leo");
  });

  it("shows maha and antar dasha", () => {
    render(<IdentityStrip chartOutput={mockChart} transitOutput={null} />);
    const dasha = screen.getByTestId("identity-dasha");
    expect(dasha.textContent).toContain("Saturn");
    expect(dasha.textContent).toContain("Mercury");
  });

  it("shows sade sati badge when active", () => {
    render(<IdentityStrip chartOutput={mockChart} transitOutput={mockTransitActive} />);
    expect(screen.getByTestId("identity-sadesati")).toBeDefined();
    expect(screen.getByTestId("identity-sadesati").textContent).toContain("peak");
  });

  it("does not show sade sati badge when inactive", () => {
    render(<IdentityStrip chartOutput={mockChart} transitOutput={mockTransitInactive} />);
    expect(screen.queryByTestId("identity-sadesati")).toBeNull();
  });

  it("renders without crashing when transitOutput is null", () => {
    render(<IdentityStrip chartOutput={mockChart} transitOutput={null} />);
    expect(screen.getByTestId("identity-lagna")).toBeDefined();
  });
});
