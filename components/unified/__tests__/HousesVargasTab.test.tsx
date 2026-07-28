// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HousesVargasTab } from "../tabs/HousesVargasTab";

const planetNames = [
  "Sun", "Moon", "Mars", "Mercury", "Jupiter", "Venus", "Saturn", "Rahu", "Ketu",
] as const;

const divisionalSigns = {
  d2_sign: "Cancer",
  d3_sign: "Taurus",
  d4_sign: "Aries",
  d7_sign: "Libra",
  d12_sign: "Gemini",
  d16_sign: "Scorpio",
  d20_sign: "Capricorn",
  d24_sign: "Gemini",
  d27_sign: "Leo",
  d30_sign: "Sagittarius",
  d40_sign: "Taurus",
  d60_sign: "Sagittarius",
};

const chartOutput = {
  data: {
    planets: Object.fromEntries(
      planetNames.map((name, index) => [
        name,
        {
          sign: "Aries",
          degree: index + 1,
          is_retrograde: name === "Rahu" || name === "Ketu",
          ...divisionalSigns,
        },
      ]),
    ),
    lagna: divisionalSigns,
  },
};

describe("HousesVargasTab", () => {
  it("renders all 12 returned Vargas from the chart payload", () => {
    render(<HousesVargasTab chartOutput={chartOutput} />);

    expect(screen.getByText("DashaFlow · 12 Vargas")).toBeInTheDocument();
    expect(screen.getAllByRole("figure")).toHaveLength(12);
    expect(
      screen.getByRole("figure", { name: "D2 — Hora South Indian chart" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("figure", { name: "D60 — Shashtiamsha South Indian chart" }),
    ).toBeInTheDocument();
  });

  it("states the traditional purpose of each divisional chart", () => {
    render(<HousesVargasTab chartOutput={chartOutput} />);

    const hora = screen.getByRole("heading", { name: "Hora" }).closest("article");
    expect(hora).not.toBeNull();
    expect(
      within(hora as HTMLElement).getByText("Resources, wealth, and material stewardship"),
    ).toBeInTheDocument();

    const shashtiamsha = screen
      .getByRole("heading", { name: "Shashtiamsha" })
      .closest("article");
    expect(shashtiamsha).not.toBeNull();
    expect(
      within(shashtiamsha as HTMLElement).getByText(/highly birth-time sensitive/i),
    ).toBeInTheDocument();
  });

  it("keeps the D9 location note concise and avoids a redundant reading block", () => {
    render(<HousesVargasTab chartOutput={chartOutput} />);

    expect(screen.getByText(/D9 Navamsha remains beside D1/i)).toBeInTheDocument();
    expect(screen.queryByText("Reading discipline")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Promise first, refinement second" }),
    ).not.toBeInTheDocument();
  });

  it("shows one shared chart key instead of repeating a legend for every chart", () => {
    render(<HousesVargasTab chartOutput={chartOutput} />);

    const key = screen.getByLabelText("Divisional chart key");
    expect(within(key).getByText("Ascendant")).toBeInTheDocument();
    expect(within(key).getByText("Retrograde")).toBeInTheDocument();
    expect(screen.getAllByText("Ascendant")).toHaveLength(1);
  });

  it("shows a useful unavailable state when Vargas are missing", () => {
    render(<HousesVargasTab chartOutput={{ data: {} }} />);

    expect(screen.getByRole("status")).toHaveTextContent("Divisional charts are unavailable");
    expect(screen.queryByRole("figure")).not.toBeInTheDocument();
  });
});
