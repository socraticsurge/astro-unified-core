// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashaTab } from "../tabs/DashaTab";

const chartOutput = {
  data: {
    metadata: {
      dob: "1984-10-08",
      time: "14:05",
      timezone: "Asia/Kolkata",
      query_date: "2026-07-27",
      ayanamsha: "Lahiri",
    },
    dashas: {
      maha: {
        planet: "Ketu", start: "2020-02-28", end: "2027-02-28",
        years: 7, days: 2556.6975,
      },
      antar: {
        planet: "Mercury", start: "2026-03-02", end: "2027-02-27",
        days: 362.2,
      },
      pratyantar: {
        planet: "Sun", start: "2026-07-12", end: "2026-07-30",
        days: 18.11,
      },
      sukshma: {
        planet: "Venus", start: "2026-07-27", end: "2026-07-30",
        days: 3.02,
      },
      prana: {
        planet: "Mars", start: "2026-07-27", end: "2026-07-28",
        days: 0.18,
      },
      timeline: [
        { planet: "Saturn", start: "1984-10-08", end: "2003-02-28" },
        { planet: "Mercury", start: "2003-02-28", end: "2020-02-28" },
        { planet: "Ketu", start: "2020-02-28", end: "2027-02-28" },
      ],
    },
  },
};

const exactChildren = [
  {
    planet: "Venus",
    start: "1984-10-08",
    end: "1987-11-02",
    days: 1120.42,
  },
];

describe("DashaTab", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ children: exactChildren }),
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders the five current engine periods without changing their dates", () => {
    render(<DashaTab chartOutput={chartOutput} profileId="profile-1" />);

    expect(screen.getByLabelText("Maha Dasha: Ketu"))
      .toHaveTextContent("28 Feb 2020 – 28 Feb 2027");
    expect(screen.getByLabelText("Antar Dasha: Mercury"))
      .toHaveTextContent("2 Mar 2026 – 27 Feb 2027");
    expect(screen.getByLabelText("Pratyantar Dasha: Sun"))
      .toHaveTextContent("12 Jul 2026 – 30 Jul 2026");
    expect(screen.getByLabelText("Sukshma Dasha: Venus"))
      .toHaveTextContent("27 Jul 2026 – 30 Jul 2026");
    expect(screen.getByLabelText("Prana Dasha: Mars"))
      .toHaveTextContent("27 Jul 2026 – 28 Jul 2026");
  });

  it("shows the exact calculation input and query date", () => {
    render(<DashaTab chartOutput={chartOutput} profileId="profile-1" />);

    const basis = screen.getByLabelText("Dasha calculation basis");
    expect(basis).toHaveTextContent("8 Oct 1984 · 14:05");
    expect(basis).toHaveTextContent("Asia/Kolkata");
    expect(basis).toHaveTextContent("27 Jul 2026");
  });

  it("restores lazy accordions without sending birth data to the browser route", async () => {
    render(<DashaTab chartOutput={chartOutput} profileId="profile-1" />);

    const timeline = screen.getByRole("list", { name: "Vimshottari Dasha timeline" });
    const saturn = within(timeline).getByRole("button", { name: /Saturn/i });
    expect(saturn).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(saturn);
    expect(saturn).toHaveAttribute("aria-expanded", "true");
    const saturnChildren = await screen.findByRole("list", {
      name: "Saturn Antar Dasha periods",
    });
    expect(within(saturnChildren).getByText(/2 Nov 1987/)).toBeInTheDocument();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/readings/dashaflow/subperiods",
        expect.objectContaining({
          body: JSON.stringify({ profile_id: "profile-1", path: [0] }),
        }),
      );
    });
    expect(screen.queryByText("2026-07-13")).not.toBeInTheDocument();
  });

  it("opens the current Mahadasha and requests its exact children", async () => {
    render(<DashaTab chartOutput={chartOutput} profileId="profile-1" />);

    const ketu = screen.getByRole("button", { name: /Ketu/i });
    expect(ketu).toHaveAttribute("aria-expanded", "true");
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/readings/dashaflow/subperiods",
        expect.objectContaining({
          body: JSON.stringify({ profile_id: "profile-1", path: [2] }),
        }),
      );
    });
  });

  it("states that the browser does not derive any Dasha dates", () => {
    render(<DashaTab chartOutput={chartOutput} profileId="profile-1" />);

    expect(screen.getByLabelText("Dasha date provenance"))
      .toHaveTextContent("No Dasha dates are proportioned or reconstructed in the browser");
  });

  it("shows clear unavailable states when Dasha data is missing", () => {
    render(<DashaTab chartOutput={{ data: {} }} profileId="profile-1" />);

    expect(screen.getAllByRole("status")).toHaveLength(2);
    expect(screen.getByText(/Current Dasha periods were not returned/i)).toBeInTheDocument();
    expect(screen.getByText(/Mahadasha timeline is unavailable/i)).toBeInTheDocument();
  });
});
