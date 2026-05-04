export type BaziInput = {
  date_of_birth: string;  // YYYY-MM-DD
  time_of_birth: string;  // HH:MM
  gender?: "male" | "female";
};

export type BaziOutput = {
  data: unknown;
  error?: string;
};

export async function fetchBazi(input: BaziInput): Promise<BaziOutput> {
  try {
    const { BaziCalculator } = await import("bazi-calculator-by-alvamind");
    const [year, month, day] = input.date_of_birth.split("-").map(Number);
    const [hour] = input.time_of_birth.split(":").map(Number);
    const gender = input.gender ?? "male";

    const calc = new BaziCalculator(year, month, day, hour, gender);
    const result = calc.getCompleteAnalysis();
    return { data: result };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
