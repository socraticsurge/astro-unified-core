import { assembleStatement, feeForMode, formatFee, WRITTEN_FEE_PAISE, LIVE_FEE_PAISE } from "../consultation";

describe("consultation library functions", () => {

  describe("feeForMode", () => {
    it("should return correct fee for written mode", () => {
      expect(feeForMode("written")).toBe(WRITTEN_FEE_PAISE);
    });

    it("should return correct fee for appointment mode", () => {
      expect(feeForMode("appointment")).toBe(LIVE_FEE_PAISE);
    });
  });

  describe("formatFee", () => {
    it("should format rupees correctly", () => {
      expect(formatFee(120000)).toBe("₹1,200");
    });

    it("should format large amounts with correct Indian number system commas", () => {
      expect(formatFee(10000000)).toBe("₹1,00,000"); // 1 lakh rupees
    });

    it("should format fractional rupees correctly if they exist", () => {
      expect(formatFee(120050)).toBe("₹1,200.5");
    });
  });

  describe("assembleStatement", () => {
    it("should assemble a statement with all parameters provided", () => {
      const result = assembleStatement("obs", "const", "obj", "opts");
      expect(result).toBe("obs const obj opts");
    });

    it("should handle omitted options", () => {
      const result = assembleStatement("obs", "const", "obj");
      expect(result).toBe("obs const obj");
    });

    it("should handle null options", () => {
      const result = assembleStatement("obs", "const", "obj", null);
      expect(result).toBe("obs const obj");
    });

    it("should handle empty strings", () => {
      const result = assembleStatement("", "const", "obj");
      expect(result).toBe("const obj");
    });

    it("should handle strings with only whitespace", () => {
      const result = assembleStatement("  ", "const", "obj");
      expect(result).toBe("const obj");
    });

    it("should trim strings before concatenating", () => {
      const result = assembleStatement(" obs ", " const ", " obj ");
      expect(result).toBe("obs const obj");
    });

    it("should filter out undefined options without leaving trailing spaces", () => {
       const result = assembleStatement("obs", "const", "obj", undefined);
       expect(result.endsWith(" ")).toBe(false);
       expect(result).toBe("obs const obj");
    });
  });
});
