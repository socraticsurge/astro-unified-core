// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ShadabalaTab } from "../tabs/ShadabalaTab";

const chartOutput = {
  data: {
    shadbala: {
      Sun: {
        sthana_bala: { total: 32.55 },
        dig_bala: 50,
        kala_bala: 79.44,
        chesta_bala: 30,
        naisargika_bala: 60,
        drik_bala: 45,
        total_rupas: 4.95,
        required_rupas: 6.5,
        is_strong: false,
        strength_ratio: 0.7615,
        ishta_phala: 13.55,
        kashta_phala: 40.2,
      },
      Venus: {
        sthana_bala: { total: 99.01 },
        dig_bala: 0,
        kala_bala: 130.56,
        chesta_bala: 44.74,
        naisargika_bala: 42.86,
        drik_bala: 41.25,
        total_rupas: 5.97,
        required_rupas: 5.5,
        is_strong: true,
        strength_ratio: 1.085,
        ishta_phala: 19.27,
        kashta_phala: 28.09,
      },
    },
    bhava_chalit: {
      Sun: {
        rashi_house: 9,
        bhava_house: 9,
        shifted: false,
      },
      Venus: {
        rashi_house: 10,
        bhava_house: 9,
        shifted: true,
      },
    },
  },
};

describe("ShadabalaTab", () => {
  it("leads with exact total and required Rupas plus a written threshold", () => {
    render(<ShadabalaTab chartOutput={chartOutput} />);

    const table = screen.getByRole("table", {
      name: "Planetary Shadbala strength compared with required Rupas",
    });
    const sunRow = within(table).getByRole("rowheader", {
      name: /Sun/,
    }).closest("tr");
    const venusRow = within(table).getByRole("rowheader", {
      name: /Venus/,
    }).closest("tr");

    expect(sunRow).toHaveTextContent("4.95");
    expect(sunRow).toHaveTextContent("6.50");
    expect(sunRow).toHaveTextContent("Below requirement");
    expect(sunRow).toHaveTextContent("76%");

    expect(venusRow).toHaveTextContent("5.97");
    expect(venusRow).toHaveTextContent("5.50");
    expect(venusRow).toHaveTextContent("Meets requirement");
    expect(venusRow).toHaveTextContent("109%");
  });

  it("preserves all six exact component values and states their unit", () => {
    render(<ShadabalaTab chartOutput={chartOutput} />);

    const table = screen.getByRole("table", {
      name: "Six Shadbala component values in Virupas",
    });
    const venusRow = within(table).getByRole("rowheader", {
      name: "Venus",
    }).closest("tr");

    expect(venusRow).toHaveTextContent("99.01");
    expect(venusRow).toHaveTextContent("0.00");
    expect(venusRow).toHaveTextContent("130.56");
    expect(venusRow).toHaveTextContent("44.74");
    expect(venusRow).toHaveTextContent("42.86");
    expect(venusRow).toHaveTextContent("41.25");
    expect(screen.getByText(/sixty Virupas equal one Rupa/i))
      .toBeInTheDocument();
  });

  it("keeps Ishta and Kashta separate from strength interpretation", () => {
    render(<ShadabalaTab chartOutput={chartOutput} />);

    expect(screen.getByLabelText(
      "Sun: Ishta Phala 13.55, Kashta Phala 40.20",
    )).toBeInTheDocument();
    expect(screen.getByText(/Strength is not beneficence/i))
      .toBeInTheDocument();
    expect(screen.getByText(/not another strength threshold/i))
      .toBeInTheDocument();
  });

  it("shows only real Bhava Chalit shifts as secondary context", () => {
    render(<ShadabalaTab chartOutput={chartOutput} />);

    expect(screen.getByLabelText(
      "Venus: Rasi house 10, Bhava Chalit house 9",
    )).toBeInTheDocument();
    expect(screen.queryByLabelText(
      "Sun: Rasi house 9, Bhava Chalit house 9",
    )).not.toBeInTheDocument();
    expect(screen.getByText(/changes house context, not the Shadbala total/i))
      .toBeInTheDocument();
  });

  it("shows an honest empty state when Shadbala is not returned", () => {
    render(<ShadabalaTab chartOutput={{ data: {} }} />);

    expect(screen.getByText("Shadbala data not available."))
      .toBeInTheDocument();
  });
});
