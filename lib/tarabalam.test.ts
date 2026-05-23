import { describe, it, expect } from "vitest";
import {
  computeTara,
  computeTithi,
  extrapolateMoonLongitude,
  extrapolateMoonNakshatra,
  extrapolateSunLongitude,
  getNakshatraIndex,
  NAKSHATRAS_27,
  TARAS,
} from "./tarabalam";

describe("getNakshatraIndex", () => {
  it("returns exact index for known nakshatra names", () => {
    expect(getNakshatraIndex("Ashwini")).toBe(0);
    expect(getNakshatraIndex("Revati")).toBe(26);
    expect(getNakshatraIndex("Rohini")).toBe(3);
  });

  it("returns -1 for unknown names", () => {
    expect(getNakshatraIndex("")).toBe(-1);
    expect(getNakshatraIndex("Unknown")).toBe(-1);
  });

  it("matches by prefix (nakshatra with pada suffix)", () => {
    // Sidecar may append " Pada 1" etc.
    expect(getNakshatraIndex("Ashwini Pada 1")).toBe(0);
    expect(getNakshatraIndex("Rohini Pada 2")).toBe(3);
  });
});

describe("computeTara", () => {
  it("returns Janma (1) when transit nakshatra equals birth nakshatra", () => {
    const tara = computeTara("Ashwini", "Ashwini");
    expect(tara).not.toBeNull();
    expect(tara!.number).toBe(1);
    expect(tara!.name).toBe("Janma");
    expect(tara!.quality).toBe("inauspicious");
  });

  it("returns Sampat (2) for one step forward", () => {
    const tara = computeTara("Ashwini", "Bharani"); // 0 → 1
    expect(tara!.number).toBe(2);
    expect(tara!.name).toBe("Sampat");
    expect(tara!.quality).toBe("auspicious");
  });

  it("returns Parama Mitra (9) for 8 steps forward (0-indexed count = 9)", () => {
    const tara = computeTara("Ashwini", "Ashlesha"); // 0 → 8, count = 9
    expect(tara!.number).toBe(9);
    expect(tara!.name).toBe("Parama Mitra");
  });

  it("wraps the 27-nakshatra cycle into 1–9 correctly (10th step = Janma again)", () => {
    const tara = computeTara("Ashwini", "Magha"); // 0 → 9, count = 10, tara = (10-1)%9+1 = 1
    expect(tara!.number).toBe(1);
    expect(tara!.name).toBe("Janma");
  });

  it("handles wrap-around from last to first nakshatra", () => {
    // Revati (26) → Ashwini (0): count = ((0-26+27)%27)+1 = 2 = Sampat
    const tara = computeTara("Revati", "Ashwini");
    expect(tara!.number).toBe(2);
    expect(tara!.name).toBe("Sampat");
  });

  it("returns Parama Mitra for 26 steps forward (full cycle - 1)", () => {
    // Ashwini (0) → Revati (26): count = 27, tara = (27-1)%9+1 = 9
    const tara = computeTara("Ashwini", "Revati");
    expect(tara!.number).toBe(9);
    expect(tara!.name).toBe("Parama Mitra");
  });

  it("returns null for unknown nakshatra names", () => {
    expect(computeTara("Ashwini", "Unknown")).toBeNull();
    expect(computeTara("Unknown", "Ashwini")).toBeNull();
  });

  it("covers all 27 NAKSHATRAS_27 as transit without returning null", () => {
    for (const n of NAKSHATRAS_27) {
      expect(computeTara("Ashwini", n)).not.toBeNull();
    }
  });

  it("produces tara numbers only in range 1–9", () => {
    for (let b = 0; b < 27; b++) {
      for (let t = 0; t < 27; t++) {
        const tara = computeTara(NAKSHATRAS_27[b], NAKSHATRAS_27[t]);
        expect(tara).not.toBeNull();
        expect(tara!.number).toBeGreaterThanOrEqual(1);
        expect(tara!.number).toBeLessThanOrEqual(9);
      }
    }
  });
});

describe("computeTithi", () => {
  it("returns tithi 30 (Amavasya) at conjunction (moonLon = sunLon)", () => {
    const t = computeTithi(90, 90);
    expect(t.number).toBe(30);
    expect(t.name).toBe("Amavasya");
    expect(t.paksha).toBeNull();
    expect(t.label).toBe("Amavasya");
  });

  it("returns tithi 15 (Purnima) at opposition (180° apart)", () => {
    const t = computeTithi(270, 90); // moon 180° ahead of sun
    expect(t.number).toBe(15);
    expect(t.name).toBe("Purnima");
    expect(t.paksha).toBeNull();
    expect(t.label).toBe("Purnima");
  });

  it("returns Shukla Pratipada (1) at 12° elongation", () => {
    const t = computeTithi(102, 90); // gap = 12
    expect(t.number).toBe(1);
    expect(t.name).toBe("Pratipada");
    expect(t.paksha).toBe("Shukla");
    expect(t.label).toBe("S·Pratipada");
  });

  it("returns Shukla Chaturdashi (14) at 168° elongation", () => {
    const t = computeTithi(258, 90); // gap = 168, ceil(168/12) = 14
    expect(t.number).toBe(14);
    expect(t.paksha).toBe("Shukla");
  });

  it("returns Krishna Pratipada (16) at 192° elongation", () => {
    const t = computeTithi(282, 90); // gap = 192, ceil(192/12) = 16
    expect(t.number).toBe(16);
    expect(t.paksha).toBe("Krishna");
    expect(t.label).toBe("K·Pratipada");
  });

  it("handles wrap-around when moon is behind sun in degrees", () => {
    // moon=0, sun=90 → gap = ((0-90)%360+360)%360 = 270, ceil(270/12)=23
    const t = computeTithi(0, 90);
    expect(t.number).toBe(23);
    expect(t.paksha).toBe("Krishna");
  });

  it("produces tithi numbers in range 1–30 for a full range of gaps", () => {
    for (let gap = 0; gap < 360; gap += 6) {
      const t = computeTithi(90 + gap, 90);
      expect(t.number).toBeGreaterThanOrEqual(1);
      expect(t.number).toBeLessThanOrEqual(30);
    }
  });
});

describe("extrapolateMoonLongitude", () => {
  it("returns the same longitude with 0 days offset", () => {
    expect(extrapolateMoonLongitude(120, 0)).toBe(120);
  });

  it("adds ~13.176° per day", () => {
    const result = extrapolateMoonLongitude(0, 1);
    expect(result).toBeCloseTo(13.176, 2);
  });

  it("wraps correctly past 360°", () => {
    const result = extrapolateMoonLongitude(355, 1); // 355 + 13.176 = 368.176 → 8.176
    expect(result).toBeCloseTo(8.176, 2);
  });

  it("handles negative days (past dates)", () => {
    const result = extrapolateMoonLongitude(10, -1); // 10 - 13.176 = -3.176 → 356.824
    expect(result).toBeCloseTo(356.824, 2);
  });

  it("completes a full cycle in ~27.32 days", () => {
    const start = 50;
    const end = extrapolateMoonLongitude(start, 27.321582); // sidereal month
    expect(Math.abs(end - start)).toBeLessThan(0.5); // back to ~same position
  });
});

describe("extrapolateMoonNakshatra", () => {
  const nakshatraSpan = 360 / 27; // ≈ 13.333°

  it("returns Ashwini for longitude 0", () => {
    expect(extrapolateMoonNakshatra(0, 0)).toBe("Ashwini");
  });

  it("returns Revati for longitude just before 360°", () => {
    expect(extrapolateMoonNakshatra(359, 0)).toBe("Revati");
  });

  it("returns the correct nakshatra for each 1/27 segment", () => {
    for (let i = 0; i < 27; i++) {
      const lon = i * nakshatraSpan + 0.5; // mid-span
      expect(extrapolateMoonNakshatra(lon, 0)).toBe(NAKSHATRAS_27[i]);
    }
  });

  it("advances nakshatra with positive days", () => {
    // Ashwini starts at 0°. One nakshatra span ≈ 13.33°. Moon moves 13.176°/day.
    // After 1 day from lon=13.1 → 13.1+13.176=26.276 → still Bharani (13.33–26.66)
    const n = extrapolateMoonNakshatra(13.1, 1);
    expect(n).toBe("Bharani");
  });
});

describe("extrapolateSunLongitude", () => {
  it("returns the same longitude with 0 days offset", () => {
    expect(extrapolateSunLongitude(45, 0)).toBe(45);
  });

  it("adds ~0.9856° per day (360/365.25)", () => {
    const result = extrapolateSunLongitude(0, 1);
    expect(result).toBeCloseTo(360 / 365.25, 4);
  });

  it("completes a full cycle in 365.25 days", () => {
    const start = 100;
    const end = extrapolateSunLongitude(start, 365.25);
    expect(Math.abs(end - start)).toBeLessThan(0.01);
  });

  it("wraps correctly past 360°", () => {
    const result = extrapolateSunLongitude(359.5, 1);
    expect(result).toBeLessThan(1);
    expect(result).toBeGreaterThanOrEqual(0);
  });
});

describe("TARAS constant", () => {
  it("has exactly 9 entries", () => {
    expect(TARAS).toHaveLength(9);
  });

  it("has correct qualities for odd/even taras", () => {
    // 1,3,5,7 are inauspicious; 2,4,6,8,9 are auspicious
    const inauspicious = [1, 3, 5, 7];
    for (const t of TARAS) {
      if (inauspicious.includes(t.number)) {
        expect(t.quality).toBe("inauspicious");
      } else {
        expect(t.quality).toBe("auspicious");
      }
    }
  });
});
