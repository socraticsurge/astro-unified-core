import { summarizeDashaflow } from "./chart-summary";

describe("summarizeDashaflow", () => {
  it("returns empty string if input is not an object", () => {
    expect(summarizeDashaflow(null)).toBe("");
    expect(summarizeDashaflow("string")).toBe("");
    expect(summarizeDashaflow(123)).toBe("");
    expect(summarizeDashaflow(undefined)).toBe("");
  });

  it("returns '(no data)' if data field is missing", () => {
    expect(summarizeDashaflow({})).toBe("(no data)");
    expect(summarizeDashaflow({ error: "something" })).toBe("(no data)");
  });

  it("formats ayanamsha correctly", () => {
    const out = {
      data: {
        metadata: {
          ayanamsha: "Lahiri",
          ayanamsha_degrees: 24.12345,
        },
      },
    };
    expect(summarizeDashaflow(out)).toBe("Ayanamsha: Lahiri (24.1234°)");

    const outNoDeg = {
      data: {
        metadata: {
          ayanamsha: "Lahiri",
        },
      },
    };
    expect(summarizeDashaflow(outNoDeg)).toBe("Ayanamsha: Lahiri");
  });

  it("formats lagna correctly", () => {
    const fullLagna = {
      data: {
        lagna: {
          sign: "Aries",
          degree: 15.567,
          nakshatra: "Ashwini",
          pada: 1,
        },
      },
    };
    expect(summarizeDashaflow(fullLagna)).toBe("Lagna: Aries 15.57° — Nakshatra Ashwini pada 1");

    const partialLagna = {
      data: {
        lagna: {
          sign: "Taurus",
          nakshatra: "Rohini",
        },
      },
    };
    expect(summarizeDashaflow(partialLagna)).toBe("Lagna: Taurus — Nakshatra Rohini");

    const minimalLagna = {
      data: {
        lagna: {
          sign: "Gemini",
        },
      },
    };
    expect(summarizeDashaflow(minimalLagna)).toBe("Lagna: Gemini");
  });

  it("formats panchanga correctly", () => {
    const out = {
      data: {
        panchang: {
          tithi: { name: "Prathama", paksha: "Shukla" },
          vara: { name: "Sunday" },
          nakshatra: { name: "Ashwini", pada: 1 },
          yoga: { name: "Vishkambha" },
          karana: "Bava",
        },
      },
    };
    expect(summarizeDashaflow(out)).toBe(
      "Panchanga: Tithi=Prathama (Shukla), Vara=Sunday, Nakshatra=Ashwini pada 1, Yoga=Vishkambha, Karana=Bava"
    );

    const partialPanchang = {
      data: {
        panchang: {
          vara: { name: "Monday" },
        },
      },
    };
    expect(summarizeDashaflow(partialPanchang)).toBe("Panchanga: Vara=Monday");

    const partialPanchang2 = {
      data: {
        panchang: {
          tithi: { name: "Prathama" },
          nakshatra: { name: "Ashwini" },
        },
      },
    };
    expect(summarizeDashaflow(partialPanchang2)).toBe("Panchanga: Tithi=Prathama, Nakshatra=Ashwini");

    const emptyPanchang = {
      data: {
        panchang: {},
      },
    };
    expect(summarizeDashaflow(emptyPanchang)).toBe("");
  });

  it("formats planets correctly", () => {
    const out = {
      data: {
        planets: {
          Sun: {
            sign: "Aries",
            degree: 10.5,
            house: 1,
            nakshatra: "Ashwini",
            dignity: "Exalted",
            is_retrograde: false,
          },
          Moon: {
            is_retrograde: true,
          },
          Mars: {},
        },
      },
    };
    const expected = [
      "",
      "Planets (sidereal):",
      "  Sun: Aries 10.50° — H1 — Nak Ashwini — Exalted",
      "  Moon: —  — retro",
      "  Mars: — ",
    ].join("\n");
    expect(summarizeDashaflow(out)).toBe(expected);
  });

  it("formats dashas correctly", () => {
    const out = {
      data: {
        dashas: {
          maha: { planet: "Venus", start: "2020-01-01", end: "2040-01-01" },
          antar: { planet: "Sun", start: "2020-01-01", end: "2021-01-01" },
          pratyantar: { planet: "Moon" }, // Missing start/end
          sukshma: {}, // Missing planet
        },
      },
    };
    const expected = [
      "",
      "Vimshottari current: maha=Venus (2020-01-01→2040-01-01); antar=Sun (2020-01-01→2021-01-01); pratyantar=Moon (?→?)",
    ].join("\n");
    expect(summarizeDashaflow(out)).toBe(expected);

    const emptyDashas = {
      data: {
        dashas: {},
      },
    };
    expect(summarizeDashaflow(emptyDashas)).toBe("");
  });

  it("formats yogas correctly", () => {
    const out = {
      data: {
        yogas: [{ name: "Gaja Kesari" }, { name: "Ruchaka" }, {}],
      },
    };
    expect(summarizeDashaflow(out)).toBe("Yogas: Gaja Kesari, Ruchaka");

    const emptyYogas = {
      data: {
        yogas: [],
      },
    };
    expect(summarizeDashaflow(emptyYogas)).toBe("");

    const yogasWithNoNames = {
      data: {
        yogas: [{}, {}],
      },
    };
    expect(summarizeDashaflow(yogasWithNoNames)).toBe("");
  });

  it("formats karakamsha correctly", () => {
    const out = {
      data: {
        karakamsha: {
          atmakaraka: "Sun",
          karakamsha_sign: "Aries",
          karakamsha_house_from_lagna: 5,
          ishta_devata_sign: "Leo",
          ishta_devata_lord: "Sun",
        },
      },
    };
    expect(summarizeDashaflow(out)).toBe(
      "Karakamsha: Atmakaraka=Sun; Karakamsha=Aries (H5 from lagna); Ishta Devata sign=Leo, lord=Sun"
    );

    const partialKarakamsha = {
      data: {
        karakamsha: {
          karakamsha_sign: "Pisces",
          ishta_devata_sign: "Cancer",
        },
      },
    };
    expect(summarizeDashaflow(partialKarakamsha)).toBe("Karakamsha: Karakamsha=Pisces; Ishta Devata sign=Cancer");

    const minimalKarakamsha = {
      data: {
        karakamsha: {
          karakamsha_sign: "Pisces",
        },
      },
    };
    expect(summarizeDashaflow(minimalKarakamsha)).toBe("Karakamsha: Karakamsha=Pisces");

    const emptyKarakamsha = {
      data: {
        karakamsha: {},
      },
    };
    expect(summarizeDashaflow(emptyKarakamsha)).toBe("");
  });

  it("handles a complex full output chart", () => {
    const out = {
      data: {
        metadata: {
          ayanamsha: "Lahiri",
          ayanamsha_degrees: 24.1,
        },
        lagna: {
          sign: "Aries",
          degree: 10,
        },
        planets: {
          Sun: { sign: "Aries" },
        },
        dashas: {
          maha: { planet: "Sun" },
        },
      },
    };

    const expected = [
      "Ayanamsha: Lahiri (24.1000°)",
      "Lagna: Aries 10.00°",
      "",
      "Planets (sidereal):",
      "  Sun: Aries ",
      "",
      "Vimshottari current: maha=Sun (?→?)",
    ].join("\n");

    expect(summarizeDashaflow(out)).toBe(expected);
  });
});
