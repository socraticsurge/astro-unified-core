// @vitest-environment jsdom
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TransitsTab } from "../tabs/TransitsTab";

const chartOutput = {
  data: {
    lagna: { sign: "Capricorn" },
    ashtakavarga: {
      sarvashtakavarga: {
        Capricorn: 33,
        Pisces: 25,
        Sagittarius: 22,
      },
    },
  },
};

const transitOutput = {
  transit_date: "2026-07-27",
  data: {
    planets: {
      Sun: {
        sign: "Cancer",
        house_from_lagna: 7,
        house_from_moon: 8,
        sav_points: 32,
      },
      Moon: {
        sign: "Sagittarius",
        house_from_lagna: 12,
        house_from_moon: 1,
        sav_points: 22,
      },
      Saturn: {
        sign: "Pisces",
        is_retrograde: true,
        house_from_lagna: 3,
        house_from_moon: 4,
        sav_points: 25,
      },
    },
    sade_sati: {
      active: true,
      phase: "peak (over Moon)",
    },
    rahu_ketu_axis: {
      rahu_sign: "Aquarius",
      rahu_house_from_lagna: 2,
      ketu_sign: "Leo",
      ketu_house_from_lagna: 8,
    },
  },
};

function renderTab(output: Record<string, unknown> | null = transitOutput) {
  const onFetchTransit = vi.fn();
  render(
    <TransitsTab
      chartOutput={chartOutput}
      transitOutput={output}
      isTransitLoading={false}
      transitError={null}
      onFetchTransit={onFetchTransit}
    />,
  );
  return onFetchTransit;
}

describe("TransitsTab", () => {
  it("keeps Sade Sati in one contextual card without a duplicate banner", () => {
    renderTab();

    expect(screen.getByLabelText("Sade Sati status: active"))
      .toHaveTextContent("Peak (over Moon)");
    expect(screen.queryByText("Sade Sati is active · Peak (over Moon)"))
      .not.toBeInTheDocument();
  });

  it("makes every returned planet's SAV points and house context explicit", () => {
    renderTab();

    const positions = screen.getByLabelText("Transit planet positions and SAV points");
    const sun = within(positions).getByLabelText(
      "Sun SAV support: 32 points, Higher support",
    );
    const moon = within(positions).getByLabelText(
      "Moon SAV support: 22 points, Middle range",
    );
    const saturn = within(positions).getByLabelText(
      "Saturn SAV support: 25 points, Middle range",
    );

    expect(sun).toHaveTextContent("32");
    expect(moon).toHaveTextContent("22");
    expect(saturn).toHaveTextContent("25");
    expect(within(positions).getByText(/Retrograde/)).toBeInTheDocument();
    expect(within(positions).getByText("House 12")).toBeInTheDocument();
    expect(screen.getByText(/not a complete prediction/i)).toBeInTheDocument();
  });

  it("shows the transit date and the Rahu-Ketu axis", () => {
    renderTab();

    expect(screen.getByText("27 Jul 2026")).toBeInTheDocument();
    const axis = screen.getByLabelText("Rahu Ketu transit axis");
    expect(axis).toHaveTextContent("Rahu Aquarius · H2");
    expect(axis).toHaveTextContent("Ketu Leo · H8");
  });

  it("refreshes on demand without deriving new transit data in the browser", () => {
    const onFetchTransit = renderTab();

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(onFetchTransit).toHaveBeenCalledWith(true);
  });

  it("shows a clear empty state if a transit response has no planets", () => {
    renderTab({
      transit_date: "2026-07-27",
      data: { sade_sati: { active: false } },
    });

    expect(screen.getByRole("status"))
      .toHaveTextContent("Planet positions were not returned");
    expect(screen.getByLabelText("Sade Sati status: not active"))
      .toHaveTextContent("Not active");
  });
});
