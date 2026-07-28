// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { YogasTab } from "../tabs/YogasTab";

const chartOutput = {
  data: {
    yogas: [
      {
        name: "Amala Yoga",
        formed_by: ["Venus"],
        description: "Venus in the tenth from Lagna.",
      },
      {
        name: "Shasha Yoga",
        formed_by: ["Saturn"],
        description: "Saturn in dignity in a kendra.",
      },
      {
        name: "Gajakesari Yoga",
        formed_by: ["Jupiter", "Moon"],
        description: "Jupiter in a kendra from the Moon.",
      },
    ],
    graha_yuddha: [
      {
        winner: "Venus",
        loser: "Saturn",
        description: "Venus gains relative strength in the close conjunction.",
      },
    ],
  },
};

describe("YogasTab", () => {
  it("puts major yogas first and presents forming planets with semantic lists", () => {
    const { container } = render(<YogasTab chartOutput={chartOutput} />);

    expect(screen.getByRole("heading", { name: "Major yogas" }))
      .toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Other chart combinations" }))
      .toBeInTheDocument();
    expect(screen.getByRole("list", {
      name: "Gajakesari Yoga forming planets",
    })).toHaveTextContent("JupiterMoon");

    const pageText = container.textContent ?? "";
    expect(pageText.indexOf("Shasha Yoga"))
      .toBeLessThan(pageText.indexOf("Amala Yoga"));
    expect(screen.getAllByText("Major yoga")).toHaveLength(2);
  });

  it("keeps conditions separate and states the interpretation boundary", () => {
    render(<YogasTab chartOutput={chartOutput} />);

    expect(screen.getByRole("heading", {
      name: "Doshas and junction conditions",
    })).toBeInTheDocument();
    expect(screen.getByText(/Presence is not a standalone prediction/i))
      .toBeInTheDocument();
    expect(screen.getByText(/dignity, aspects, house ownership/i))
      .toBeInTheDocument();
    const planetaryWar = screen.getByRole("article", {
      name: "Graha Yuddha",
    });
    expect(within(planetaryWar).getByText("Venus")).toBeInTheDocument();
    expect(within(planetaryWar).getByText("Saturn")).toBeInTheDocument();
  });

  it("shows an honest empty state when the engine returns no combinations", () => {
    render(<YogasTab chartOutput={{ data: {} }} />);

    expect(screen.getByText("Yoga and dosha data not available."))
      .toBeInTheDocument();
  });
});
