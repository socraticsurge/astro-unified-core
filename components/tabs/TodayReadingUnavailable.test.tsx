import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { NatalTab } from "./NatalTab";
import { TodayTab } from "./TodayTab";

const unavailable = "Personal reading is temporarily unavailable. Please try again.";

describe("personal reading unavailable states", () => {
  it("keeps deterministic Today content visible while offering a retry", () => {
    const html = renderToStaticMarkup(
      <TodayTab
        profileName="Vinay"
        chartOutput={{ data: { dashas: {} } }}
        transitOutput={null}
        todayReadingOutput={null}
        isTodayReadingLoading={false}
        todayReadingError={unavailable}
        onRetryTodayReading={vi.fn()}
        onAsk={vi.fn()}
        onExplore={vi.fn()}
        onNavigate={vi.fn()}
      />,
    );

    expect(html).toContain("Personal reading temporarily unavailable");
    expect(html).toContain("Your calculated chart and current periods remain available");
    expect(html).toContain("Try again");
  });

  it("keeps the honest preview without inventing a natal retry workflow", () => {
    const html = renderToStaticMarkup(
      <NatalTab
        todayReadingOutput={null}
        isTodayReadingLoading={false}
        chartOutput={{ data: {} }}
      />,
    );

    expect(html).toContain("Interpretation preview");
    expect(html).toContain("not a reading calculated from this chart");
    expect(html).not.toContain("Try interpretation");
  });
});
