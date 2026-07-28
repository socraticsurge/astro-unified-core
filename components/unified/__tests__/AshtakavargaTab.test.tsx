// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AshtakavargaTab } from "../tabs/AshtakavargaTab";

const chartOutput = {
  data: {
    lagna: { sign: "Capricorn" },
    planets: {
      Moon: { sign: "Pisces", house: 3 },
      Venus: { sign: "Libra", house: 10 },
    },
    ashtakavarga: {
      sarvashtakavarga: {
        Aries: 26,
        Taurus: 29,
        Gemini: 32,
        Cancer: 32,
        Leo: 30,
        Virgo: 24,
        Libra: 31,
        Scorpio: 28,
        Sagittarius: 22,
        Capricorn: 33,
        Aquarius: 25,
        Pisces: 25,
      },
      bhinnashtakavarga: {
        Sun: {
          Aries: 5,
          Taurus: 5,
          Gemini: 5,
          Cancer: 4,
          Leo: 5,
          Virgo: 3,
          Libra: 5,
          Scorpio: 3,
          Sagittarius: 4,
          Capricorn: 4,
          Aquarius: 1,
          Pisces: 4,
        },
      },
    },
  },
};

describe("AshtakavargaTab", () => {
  it("maps SAV signs to houses and names the traditional life-area lens", () => {
    render(<AshtakavargaTab chartOutput={chartOutput} />);

    const table = screen.getByRole("table", {
      name: "Sarvashtakavarga house support",
    });
    const rows = within(table).getAllByRole("row");

    expect(rows[1]).toHaveTextContent("H1");
    expect(rows[1]).toHaveTextContent("Self & vitality");
    expect(rows[1]).toHaveTextContent("Capricorn");
    expect(rows[1]).toHaveTextContent("33");

    expect(rows[10]).toHaveTextContent("H10");
    expect(rows[10]).toHaveTextContent("Career, status & public action");
    expect(rows[10]).toHaveTextContent("Libra");
  });

  it("makes SAV points prominent with a non-colour support label", () => {
    render(<AshtakavargaTab chartOutput={chartOutput} />);

    expect(screen.getAllByLabelText(
      "House 1, Self & vitality: 33 SAV bindus, Higher support",
    ).length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText(
      "House 12, Retreat, expenses & liberation: 22 SAV bindus, Middle range",
    ).length).toBeGreaterThan(0);
    expect(screen.getByText(/This is comparison context/i))
      .toBeInTheDocument();
  });

  it("preserves the exact BAV values and calculated row total", () => {
    render(<AshtakavargaTab chartOutput={chartOutput} />);

    const table = screen.getByRole("table", {
      name: "Bhinnashtakavarga contributions",
    });
    const sunRow = within(table).getByRole("rowheader", {
      name: "Sun",
    }).closest("tr");

    expect(sunRow).toHaveTextContent("55545353441448");
    expect(within(table).getByLabelText("Sun in Aquarius: 1 bindus"))
      .toHaveTextContent("1");
  });

  it("shows an honest empty state when no Ashtakavarga data is returned", () => {
    render(<AshtakavargaTab chartOutput={{ data: {} }} />);

    expect(screen.getByText("Ashtakavarga data not available."))
      .toBeInTheDocument();
  });
});
