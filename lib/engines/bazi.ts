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
  return {
    data: null,
    error: "Bazi calculator is temporarily disabled in this build.",
  };
}
