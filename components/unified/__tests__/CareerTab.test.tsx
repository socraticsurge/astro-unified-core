// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CareerTab } from "../tabs/CareerTab";

const chartOutput = {
  data: {
    lagna: { d10_sign: "Gemini" },
    planets: {
      Sun: { d10_sign: "Sagittarius" },
      Venus: { d10_sign: "Taurus" },
      Saturn: { d10_sign: "Taurus" },
    },
  },
};

const careerOutput = {
  data: {
    tenth_house: {
      sign: "Libra",
      lord: "Venus",
      lord_house: 10,
      lord_sign: "Libra",
      lord_d10: "Taurus",
      lord_dignity: "own_sign",
      occupants: ["Venus", "Saturn"],
    },
    d10_indicators: {
      Sun: {
        d10_sign: "Sagittarius",
        d10_lord: "Jupiter",
        d10_strong: false,
      },
      Venus: {
        d10_sign: "Taurus",
        d10_lord: "Venus",
        d10_strong: true,
      },
      Saturn: {
        d10_sign: "Taurus",
        d10_lord: "Venus",
        d10_strong: false,
      },
    },
    career_themes: ["arts", "banking", "luxury_goods"],
    primary_planets: ["Venus", "Saturn"],
    d10_strong_planets: ["Venus"],
    strength_factors: [
      "10th lord Venus in own_sign — strong career foundation",
      "10th lord Venus in kendra (house 10) — career prominence",
      "Saturn retrograde in 10th — unconventional career path",
    ],
  },
};

function renderCareer(output: Record<string, unknown> | null = careerOutput) {
  const onFetchCareer = vi.fn();
  render(
    <CareerTab
      chartOutput={chartOutput}
      careerOutput={output}
      isCareerLoading={false}
      careerError={null}
      onFetchCareer={onFetchCareer}
    />,
  );
  return onFetchCareer;
}

describe("CareerTab", () => {
  it("leads with the exact 10th-house foundation and D10 chart", () => {
    renderCareer();

    const foundation = screen.getByRole("region", {
      name: "Career foundation",
    });
    expect(foundation).toHaveTextContent("Libra");
    expect(foundation).toHaveTextContent("Venus");
    expect(foundation).toHaveTextContent("House 10 · Libra");
    expect(foundation).toHaveTextContent("Venus, Saturn");
    expect(screen.getByRole("figure", {
      name: "D10 — Dashamsha South Indian chart",
    })).toBeInTheDocument();
  });

  it("keeps every returned D10 indicator and avoids calling unflagged planets weak", () => {
    renderCareer();

    const table = screen.getByRole("table", {
      name: "Complete D10 professional emphasis map",
    });
    const sunRow = within(table).getByRole("rowheader", {
      name: /Sun/,
    }).closest("tr");
    const venusRow = within(table).getByRole("rowheader", {
      name: /Venus/,
    }).closest("tr");

    expect(sunRow).toHaveTextContent("Sagittarius");
    expect(sunRow).toHaveTextContent("Jupiter");
    expect(sunRow).toHaveTextContent("No strong-sign flag");
    expect(venusRow).toHaveTextContent("10th lord");
    expect(venusRow).toHaveTextContent("10th occupant");
    expect(venusRow).toHaveTextContent("Strong sign returned");
    expect(screen.getByText(/not a weakness verdict/i))
      .toBeInTheDocument();
  });

  it("separates exact supportive and complicating engine factors", () => {
    renderCareer();

    const evidence = screen.getByRole("region", {
      name: "Calculated career evidence",
    });
    expect(evidence).toHaveTextContent(
      "10th lord Venus in own_sign — strong career foundation",
    );
    expect(evidence).toHaveTextContent(
      "Saturn retrograde in 10th — unconventional career path",
    );
    expect(evidence).toHaveTextContent("Supportive factors2");
    expect(evidence).toHaveTextContent("Complexities returned1");
  });

  it("does not invent a challenge when the engine returns none", () => {
    renderCareer({
      data: {
        ...careerOutput.data,
        strength_factors: [
          "10th lord Venus in own_sign — strong career foundation",
        ],
      },
    });

    expect(screen.getByText(
      "No explicit career challenge was returned for this chart.",
    )).toBeInTheDocument();
    expect(screen.getByText(/not proof that professional life has no challenges/i))
      .toBeInTheDocument();
  });

  it("shows every returned domain as unranked vocabulary", () => {
    renderCareer();

    const section = screen.getByRole("region", {
      name: "Returned domain vocabulary",
    });
    expect(section).toHaveTextContent("3 alphabetical domains");
    expect(section).toHaveTextContent("arts");
    expect(section).toHaveTextContent("banking");
    expect(section).toHaveTextContent("luxury goods");
    expect(section).toHaveTextContent("not a ranking");
  });

  it("shows explicit error and empty states", () => {
    const { rerender } = render(
      <CareerTab
        chartOutput={chartOutput}
        careerOutput={null}
        isCareerLoading={false}
        careerError="Sidecar unavailable"
        onFetchCareer={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Sidecar unavailable",
    );

    rerender(
      <CareerTab
        chartOutput={chartOutput}
        careerOutput={{}}
        isCareerLoading={false}
        careerError={null}
        onFetchCareer={vi.fn()}
      />,
    );

    expect(screen.getByText(
      "Career analysis has not been returned yet.",
    )).toBeInTheDocument();
  });
});
