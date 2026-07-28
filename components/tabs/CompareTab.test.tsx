// @vitest-environment jsdom

import { fireEvent, render, screen, within } from "@testing-library/react"
import { useState } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { CompatibilityCheck, Profile } from "@/lib/db"
import { CompareTab } from "./CompareTab"

const profiles: Profile[] = [
  {
    id: "vinay",
    user_id: "owner",
    name: "Vinay",
    date_of_birth: "1984-10-08",
    time_of_birth: "14:50",
    place_of_birth: "Hyderabad",
    latitude: 17.385,
    longitude: 78.4867,
    timezone: "Asia/Kolkata",
    timezone_offset: 5.5,
    relationship: "Self",
    gender: "male",
    created_at: "2026-07-22T00:00:00.000Z",
  },
  {
    id: "tara",
    user_id: "owner",
    name: "Tara",
    date_of_birth: "1990-01-01",
    time_of_birth: "08:00",
    place_of_birth: "Hyderabad",
    latitude: 17.385,
    longitude: 78.4867,
    timezone: "Asia/Kolkata",
    timezone_offset: 5.5,
    relationship: "Family",
    gender: "female",
    created_at: "2026-07-22T00:00:00.000Z",
  },
]

const resultData = {
  total_score: 28,
  scores: {
    Varna: 1,
    Vashya: 0.5,
    Tara: 1.5,
    Yoni: 2,
    GrahaMaitri: 3,
    Gana: 5,
    Bhakoot: 7,
    Nadi: 8,
  },
  male_details: {
    moon_sign: "Pisces",
    nakshatra: "Uttara Bhadrapada",
    gana: "Manushya",
    nadi: "Madhya",
    yoni: "Cow",
  },
  female_details: {
    moon_sign: "Capricorn",
    nakshatra: "Shravana",
    gana: "Deva",
    nadi: "Antya",
    yoni: "Monkey",
  },
  kuja_dosha: {
    male: {
      is_manglik: true,
      breakdown: {
        Mars: { house: 12, sign: "Sagittarius", score: 35 },
      },
    },
    female: {
      is_manglik: true,
      breakdown: {
        Ketu: { house: 12, sign: "Libra", score: 30 },
      },
    },
    compatibility: {
      result: "good",
      description: "Kuja Dosha balanced between partners.",
    },
  },
  additional_kutas: {
    Mahendra: { result: "bad" },
    Vedha: {
      result: "good",
      description: "No Vedha obstruction returned.",
    },
  },
  exceptions: ["A returned mitigation applies to this comparison."],
}

const compatibilityCheck: CompatibilityCheck = {
  id: "check-1",
  user_id: "owner",
  profile_id_1: "vinay",
  profile_id_2: "tara",
  score: 28,
  result_json: JSON.stringify(resultData),
  created_at: "2026-07-27T00:00:00.000Z",
}

function ControlledCompare({
  initialSelected = "",
  initialResult = null,
}: {
  initialSelected?: string
  initialResult?: CompatibilityCheck | null
}) {
  const [selectedId, setSelectedId] = useState(initialSelected)
  const [result, setResult] = useState<CompatibilityCheck | null>(
    initialResult,
  )

  return (
    <CompareTab
      activeProfile={profiles[0]}
      allProfiles={profiles}
      selectedId={selectedId}
      onSelectedId={setSelectedId}
      result={result}
      onResult={setResult}
    />
  )
}

describe("CompareTab", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("makes profile choice deliberate and does not calculate on selection", () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    render(<ControlledCompare />)

    expect(
      screen.getByRole("heading", {
        name: "Compare the charts, then read the conditions.",
      }),
    ).toBeInTheDocument()
    expect(screen.getByText(/score is evidence—not a verdict/i))
      .toBeInTheDocument()

    fireEvent.click(
      screen.getByRole("button", { name: "Tara, Bride, Family" }),
    )

    expect(fetchMock).not.toHaveBeenCalled()
    expect(
      screen.getByRole("button", { name: "Calculate compatibility" }),
    ).toBeInTheDocument()
  })

  it("calculates with the two owned profile IDs and reveals the full evidence", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => compatibilityCheck,
      })),
    )
    render(<ControlledCompare />)

    fireEvent.click(
      screen.getByRole("button", { name: "Tara, Bride, Family" }),
    )
    fireEvent.click(
      screen.getByRole("button", { name: "Calculate compatibility" }),
    )

    const overview = await screen.findByRole("region", {
      name: "Vinay & Tara",
    })
    expect(overview).toHaveTextContent("28out of 36Excellent")
    expect(
      screen.getByRole("progressbar", { name: "28 of 36 Guna points" }),
    ).toBeInTheDocument()

    const kootaTable = screen.getByRole("table", {
      name: "Eight-Koota compatibility score",
    })
    expect(within(kootaTable).getByRole("rowheader", {
      name: "Graha Maitri",
    })).toBeInTheDocument()
    expect(screen.getByText("Kuja Dosha balanced between partners."))
      .toBeInTheDocument()
    expect(screen.getByRole("table", {
      name: "Kuja Dosha contributing placements",
    })).toHaveTextContent("House 12 · Sagittarius")
    expect(screen.getByRole("table", {
      name: "Additional Kuta results",
    })).toHaveTextContent("No Vedha obstruction returned.")
    expect(screen.getByText(/starting point, not a decision/i))
      .toBeInTheDocument()

    expect(fetch).toHaveBeenCalledWith(
      "/api/compatibility",
      expect.objectContaining({
        body: JSON.stringify({
          profile_id_1: "vinay",
          profile_id_2: "tara",
        }),
      }),
    )
  })

  it("renders a saved comparison immediately without recalculating", () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    render(
      <ControlledCompare
        initialSelected="tara"
        initialResult={compatibilityCheck}
      />,
    )

    expect(screen.getByRole("region", { name: "Vinay & Tara" }))
      .toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("surfaces engine errors without hiding the selected profiles", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        json: async () => ({ error: "Compatibility engine unavailable" }),
      })),
    )
    render(<ControlledCompare />)

    fireEvent.click(
      screen.getByRole("button", { name: "Tara, Bride, Family" }),
    )
    fireEvent.click(
      screen.getByRole("button", { name: "Calculate compatibility" }),
    )

    expect(await screen.findByRole("alert"))
      .toHaveTextContent("Compatibility engine unavailable")
    expect(
      screen.getByRole("button", { name: "Tara, Bride, Family" }),
    ).toHaveAttribute("aria-pressed", "true")
  })
})
