import { generateConsultationNote } from "./consultation";

describe("generateConsultationNote", () => {
  it("generates a basic consultation note with empty data", () => {
    const note = generateConsultationNote({}, {}, {});

    expect(note).toContain("--- ASTROUNIFIED CONSULTATION NOTE ---");
    expect(note).toContain("Profile: undefined | undefined | undefined");
    expect(note).toContain("1. FUNDAMENTALS");
    expect(note).toContain("Lagna: undefined (undefined°)");
    expect(note).toContain("Tithi: N/A ()");
    expect(note).toContain("Vara: N/A");
    expect(note).toContain("Nakshatra: N/A (Pada ?)");
    expect(note).toContain("2. PLANETARY POSITIONS (D1)");
    expect(note).toContain("3. DASHA STATUS");
    expect(note).not.toContain("4. YOGAS & DOSHAS");
    expect(note).not.toContain("5. CAREER INSIGHTS (D10)");
    expect(note).not.toContain("6. TRANSIT SNAPSHOT");
    expect(note).toContain("--- END OF NOTE ---");
  });

  it("handles null or undefined inputs gracefully", () => {
    const note = generateConsultationNote(null, undefined, null);

    expect(note).toContain("--- ASTROUNIFIED CONSULTATION NOTE ---");
    expect(note).toContain("Profile: undefined | undefined | undefined");
    expect(note).toContain("--- END OF NOTE ---");
  });

  it("includes profile metadata correctly", () => {
    const chart = {
      data: {
        metadata: {
          dob: "1990-01-01",
          time: "12:00",
          timezone: "UTC"
        }
      }
    };
    const note = generateConsultationNote(chart, {}, {});
    expect(note).toContain("Profile: 1990-01-01 | 12:00 | UTC");
  });

  it("includes lagna and panchang details correctly", () => {
    const chart = {
      data: {
        lagna: {
          sign: "Aries",
          degree: 15.5
        },
        panchang: {
          tithi: { name: "Pratipada", paksha: "Shukla" },
          vara: { name: "Sunday" },
          nakshatra: { name: "Ashwini", pada: 1 }
        }
      }
    };
    const note = generateConsultationNote(chart, {}, {});
    expect(note).toContain("Lagna: Aries (15.50°)");
    expect(note).toContain("Tithi: Pratipada (Shukla)");
    expect(note).toContain("Vara: Sunday");
    expect(note).toContain("Nakshatra: Ashwini (Pada 1)");
  });

  it("includes planetary positions (D1) correctly", () => {
    const chart = {
      data: {
        planets: {
          Sun: { sign: "Leo", degree: 10.25, house: 5, dignity: "Own House", is_retrograde: false },
          Jupiter: { sign: "Sagittarius", degree: 5.5, house: 9, dignity: "Own House", is_retrograde: true }
        }
      }
    };
    const note = generateConsultationNote(chart, {}, {});
    expect(note).toContain("Sun     : Leo          |  10.25° | House 5 | Own House");
    expect(note).toContain("Jupiter : Sagittarius  |   5.50° | House 9 | Own House (R)");
    // Should not include planets not in data
    expect(note).not.toContain("Moon    :");
  });

  it("includes dasha status correctly", () => {
    const chart = {
      data: {
        dashas: {
          maha: { planet: "Venus", end: "2030-05-15" },
          antar: { planet: "Sun", end: "2025-01-10" }
        }
      }
    };
    const note = generateConsultationNote(chart, {}, {});
    expect(note).toContain("Mahadasha: Venus (until 2030-05-15)");
    expect(note).toContain("Antardasha: Sun (until 2025-01-10)");
  });

  it("includes Kaal Sarpa details when present", () => {
    const chart = {
      data: {
        kaal_sarpa: {
          present: true,
          type: "Anant",
          rahu_sign: "Aries",
          ketu_sign: "Libra"
        }
      }
    };
    const note = generateConsultationNote(chart, {}, {});
    expect(note).toContain("4. YOGAS & DOSHAS");
    expect(note).toContain("Kaal Sarpa: Anant in Aries-Libra");
  });

  it("includes career insights (D10) correctly", () => {
    const career = {
      data: {
        tenth_house: { lord: "Saturn", lord_house: 11 },
        career_themes: ["Technology", "Leadership"]
      }
    };
    const note = generateConsultationNote({}, {}, career);
    expect(note).toContain("5. CAREER INSIGHTS (D10)");
    expect(note).toContain("10th Lord: Saturn in House 11");
    expect(note).toContain("Themes: Technology, Leadership");
  });

  it("includes career insights without themes correctly", () => {
    const career = {
      data: {
        tenth_house: { lord: "Saturn", lord_house: 11 }
      }
    };
    const note = generateConsultationNote({}, {}, career);
    expect(note).toContain("5. CAREER INSIGHTS (D10)");
    expect(note).toContain("10th Lord: Saturn in House 11");
    expect(note).not.toContain("Themes:");
  });

  it("includes transit snapshot correctly", () => {
    const transit = {
      data: {
        planets: {
          Saturn: { sign: "Aquarius", house_from_moon: 3, vedha_status: "No Vedha" },
          Jupiter: { sign: "Taurus", house_from_moon: 6, vedha_status: "Vedha by Sun" }
        }
      }
    };
    const note = generateConsultationNote({}, transit, {}, "2024-05-14");
    expect(note).toContain("6. TRANSIT SNAPSHOT (2024-05-14)");
    expect(note).toContain("Saturn  : Aquarius     (House 3 from Moon) | No Vedha");
    expect(note).toContain("Jupiter : Taurus       (House 6 from Moon) | Vedha by Sun");
  });

  it("includes transit snapshot with default date", () => {
    const transit = {
      data: {
        planets: {}
      }
    };
    const note = generateConsultationNote({}, transit, {});
    expect(note).toContain("6. TRANSIT SNAPSHOT (Current)");
  });
});
