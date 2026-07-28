// @vitest-environment jsdom

import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import type { Profile } from "@/lib/db"
import { NatalTab } from "./NatalTab"

const chartOutput = {
  data: {
    lagna: { sign: "Aries", d9_sign: "Cancer" },
    planets: {
      Sun: {
        sign: "Leo",
        d9_sign: "Sagittarius",
        is_retrograde: false,
        dignity: "own",
      },
    },
  },
}

const profile: Profile = {
  id: "profile-1",
  user_id: "user-1",
  name: "Vinay",
  date_of_birth: "1980-01-02",
  time_of_birth: "03:04",
  place_of_birth: "Hyderabad, India",
  latitude: 17.385,
  longitude: 78.4867,
  timezone: "Asia/Kolkata",
  timezone_offset: 5.5,
  relationship: "Self",
  gender: "Male",
  current_location: "Bengaluru, India",
  created_at: "2026-01-01T00:00:00.000Z",
}

describe("NatalTab", () => {
  it("leads with interpretation, then foundation, then charts", () => {
    render(
      <NatalTab
        profile={profile}
        chartOutput={chartOutput}
        todayReadingOutput={null}
      />,
    )

    const interpretation = screen.getByRole("heading", {
      name: "Understand the chart before studying it",
    })
    const foundation = screen.getByRole("heading", { name: "Vinay’s birth context" })
    const charts = screen.getByRole("heading", { name: "D1 and D9 charts" })

    expect(
      interpretation.compareDocumentPosition(foundation) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(
      foundation.compareDocumentPosition(charts) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
  })

  it("keeps computed birth charts visible when the optional narrative fails", () => {
    render(
      <NatalTab
        chartOutput={chartOutput}
        todayReadingOutput={null}
        isTodayReadingLoading={false}
      />,
    )

    expect(screen.getByText("D1 — Rasi")).toBeInTheDocument()
    expect(screen.getByText("D9 — Navamsa")).toBeInTheDocument()
    expect(screen.getByText("Interpretation preview")).toBeInTheDocument()
    expect(screen.getByText(/not a reading calculated from this chart/i)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /try interpretation/i })).not.toBeInTheDocument()
  })

  it("preserves generated interpretation paragraphs for long-form reading", () => {
    render(
      <NatalTab
        chartOutput={chartOutput}
        todayReadingOutput={{
          chart_reading: "The first paragraph establishes the central pattern.\n\nThe second paragraph develops the supporting themes.",
        }}
      />,
    )

    const firstParagraph = screen.getByText("The first paragraph establishes the central pattern.")
    const secondParagraph = screen.getByText("The second paragraph develops the supporting themes.")

    expect(firstParagraph.tagName).toBe("P")
    expect(secondParagraph.tagName).toBe("P")
    expect(firstParagraph.parentElement).toBe(secondParagraph.parentElement)
    expect(firstParagraph.parentElement).toHaveClass("ac-reading")
  })

  it("opens profile editing inside the birth foundation", async () => {
    const user = userEvent.setup()
    render(
      <NatalTab
        profile={profile}
        chartOutput={chartOutput}
        todayReadingOutput={null}
      />,
    )

    expect(screen.getByText("Vinay’s birth context")).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Edit details" }))

    expect(screen.getByRole("form")).toBeInTheDocument()
    expect(screen.getByLabelText("Date of birth")).toHaveValue("1980-01-02")
    expect(screen.getByText(/recalculates the chart, birth Panchangam/i)).toBeInTheDocument()
  })
})
