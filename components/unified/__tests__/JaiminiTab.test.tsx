// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { JaiminiTab } from "../tabs/JaiminiTab";

const chartOutput = {
  data: {
    jaimini_karakas: {
      Darakaraka: {
        planet: "Moon",
        description: "Significator of spouse and marriage partner.",
      },
      Atmakaraka: {
        planet: "Venus",
        description: "Represents the soul's primary life lesson.",
      },
      Amatyakaraka: {
        planet: "Sun",
        description: "Represents career and contribution.",
      },
    },
    karakamsha: {
      atmakaraka: "Venus",
      karakamsha_sign: "Aries",
      planets_in_karakamsha: ["Venus", "Saturn"],
    },
    arudha_padas: {
      1: { name: "Arudha Lagna (AL)", sign: "Libra" },
      2: { name: "Dhana Pada (A2)", sign: "Gemini" },
      12: { name: "Upapada (UL)", sign: "Virgo" },
    },
    upapada: {
      sign: "Virgo",
      lord: "Mercury",
      second_from_ul: "Libra",
      description: "Upapada in Virgo with Mercury as lord.",
    },
  },
};

describe("JaiminiTab", () => {
  it("leads with Atmakaraka and Karakamsha without changing engine values", () => {
    render(<JaiminiTab chartOutput={chartOutput} />);

    expect(screen.getByRole("heading", {
      name: "Atmakaraka & Karakamsha",
    })).toBeInTheDocument();
    expect(screen.getByText("Aries")).toBeInTheDocument();

    const occupants = screen.getByRole("list", {
      name: "Planets in Karakamsha",
    });
    expect(within(occupants).getByText("Venus")).toBeInTheDocument();
    expect(within(occupants).getByText("Saturn")).toBeInTheDocument();
  });

  it("keeps the seven-karaka reading order in a semantic table", () => {
    render(<JaiminiTab chartOutput={chartOutput} />);

    const table = screen.getByRole("table", { name: "Chara Karakas" });
    expect(within(table).getByRole("columnheader", {
      name: "What it signifies",
    })).toBeInTheDocument();
    expect(within(table).getAllByRole("rowheader").map((cell) =>
      cell.querySelector("strong")?.textContent,
    )).toEqual(["Atmakaraka", "Amatyakaraka", "Darakaraka"]);
  });

  it("shows Arudha and Upapada as distinct outward and relationship contexts", () => {
    render(<JaiminiTab chartOutput={chartOutput} />);

    expect(screen.getByRole("heading", { name: "Arudha Padas" }))
      .toBeInTheDocument();
    expect(screen.getAllByText("Arudha Lagna (AL)").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Dhana Pada (A2)").length).toBeGreaterThan(0);

    const upapadaHeading = screen.getByRole("heading", {
      name: "Upapada (A12)",
    });
    const upapadaSection = upapadaHeading.closest("section");
    expect(upapadaSection).not.toBeNull();
    expect(within(upapadaSection!).getByText("Mercury"))
      .toBeInTheDocument();
    expect(within(upapadaSection!).getByText(
      "Upapada in Virgo with Mercury as lord.",
    )).toBeInTheDocument();
  });

  it("shows an honest empty state when the engine returns no Jaimini data", () => {
    render(<JaiminiTab chartOutput={{ data: {} }} />);

    expect(screen.getByText("Jaimini data not available."))
      .toBeInTheDocument();
  });
});
