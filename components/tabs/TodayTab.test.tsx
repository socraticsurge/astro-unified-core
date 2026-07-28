// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { TodayTab } from "./TodayTab"

const chartOutput = {
  data: {
    planets: {
      Moon: { sign: "Pisces", nakshatra: "Revati" },
    },
    dashas: {
      maha: { planet: "Saturn", start: "2020-01-01", end: "2039-01-01" },
      antar: { planet: "Venus", start: "2025-01-01", end: "2028-01-01" },
      pratyantar: { planet: "Mercury", start: "2026-06-01", end: "2026-11-01" },
    },
  },
}

function renderToday(onNavigate = vi.fn()) {
  render(
    <TodayTab
      profileName="Vinay"
      chartOutput={chartOutput}
      transitOutput={null}
      todayReadingOutput={null}
      isTodayReadingLoading={false}
      todayReadingError={null}
      onRetryTodayReading={vi.fn()}
      onAsk={vi.fn()}
      onExplore={vi.fn()}
      onNavigate={onNavigate}
    />,
  )
  return onNavigate
}

describe("TodayTab workspace", () => {
  it("starts with a personal, action-oriented overview", () => {
    renderToday()

    expect(screen.getByText("Vinay, here is what your current period means.")).toBeInTheDocument()
    expect(screen.getByText("What would you like to do next?")).toBeInTheDocument()
    expect(screen.getByText("Choose a time")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /explore dashas/i })).toBeInTheDocument()
    expect(screen.getByText("Birth chart")).toBeInTheDocument()
  })

  it("opens a deeper tool from a quick action", () => {
    const onNavigate = renderToday()

    fireEvent.click(screen.getByRole("button", { name: /choose a time/i }))
    expect(onNavigate).toHaveBeenCalledWith("muhurtha")
  })

  it("makes the current dasha the primary deeper destination", () => {
    const onNavigate = renderToday()

    fireEvent.click(screen.getByRole("button", { name: /explore dashas/i }))
    expect(onNavigate).toHaveBeenCalledWith("dasha")
  })

  it("derives Janma Rasi from the selected chart without asking the user", () => {
    renderToday()

    expect(screen.getByText("Vinay's Janma Rasi")).toBeInTheDocument()
    expect(screen.getByText("Meena")).toBeInTheDocument()
    expect(screen.queryByRole("combobox", { name: /moon sign/i })).not.toBeInTheDocument()
  })

  it("lets mobile layouts expand the full personal interpretation", () => {
    render(
      <TodayTab
        profileName="Vinay"
        chartOutput={chartOutput}
        transitOutput={null}
        todayReadingOutput={{
          dasha_reading: "A detailed current-period interpretation.",
          chart_reading: "",
        }}
        isTodayReadingLoading={false}
        todayReadingError={null}
        onRetryTodayReading={vi.fn()}
        onAsk={vi.fn()}
        onExplore={vi.fn()}
        onNavigate={vi.fn()}
      />,
    )

    const toggle = screen.getByRole("button", { name: "Read full interpretation" })
    expect(screen.getByText("A detailed current-period interpretation.")).toHaveClass("ac-reading")
    expect(toggle).toHaveAttribute("aria-expanded", "false")
    fireEvent.click(toggle)
    expect(screen.getByRole("button", { name: "Show less" })).toHaveAttribute("aria-expanded", "true")
  })
})
