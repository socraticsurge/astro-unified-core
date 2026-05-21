import { getClient, ensureSchema } from "./client";

export type AppSettings = {
  written_consultation_enabled: boolean;
  live_consultation_enabled: boolean;
  written_fee_paise: number;
  live_fee_paise: number;
};

export type AiInsightsLlmConfig = {
  temperature: number;
  max_tokens: number;
  custom_instructions: string;
};

export type ChatLlmConfig = {
  temperature: number;
  max_tokens: number;
  top_p: number;
  custom_instructions: string;
};

export type DraftLlmConfig = {
  temperature: number;
  max_tokens: number;
  custom_instructions: string;
};

export type TodayReadingLlmConfig = {
  temperature: number;
  max_tokens: number;
  custom_instructions: string;
};

const AI_INSIGHTS_LLM_DEFAULTS: AiInsightsLlmConfig = {
  temperature: 0.5,
  max_tokens: 4096,
  custom_instructions: "",
};

const CHAT_LLM_DEFAULTS: ChatLlmConfig = {
  temperature: 0.65,
  max_tokens: 8192,
  top_p: 0.9,
  custom_instructions: "",
};

const DRAFT_LLM_DEFAULTS: DraftLlmConfig = {
  temperature: 0.55,
  max_tokens: 4096,
  custom_instructions: "",
};

const TODAY_READING_LLM_DEFAULTS: TodayReadingLlmConfig = {
  temperature: 0.55,
  max_tokens: 1024,
  custom_instructions: "",
};

export const settings = {
  async getAll(): Promise<AppSettings> {
    await ensureSchema();
    const rs = await getClient().execute("SELECT key, value FROM settings");
    const map: Record<string, string> = {};
    for (const row of rs.rows) {
      map[row[0] as string] = row[1] as string;
    }
    return {
      written_consultation_enabled: map["written_consultation_enabled"] !== "false",
      live_consultation_enabled: map["live_consultation_enabled"] === "true",
      written_fee_paise: parseInt(map["written_fee_paise"] ?? "120000", 10),
      live_fee_paise: parseInt(map["live_fee_paise"] ?? "500000", 10),
    };
  },

  async set(key: keyof AppSettings, value: boolean | number): Promise<void> {
    await ensureSchema();
    await getClient().execute({
      sql: `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)`,
      args: [key, String(value), new Date().toISOString()],
    });
  },

  async getAiInsightsLlm(): Promise<AiInsightsLlmConfig> {
    await ensureSchema();
    const rs = await getClient().execute({
      sql: "SELECT value FROM settings WHERE key = ?",
      args: ["ai_insights_llm"],
    });
    if (!rs.rows.length) return { ...AI_INSIGHTS_LLM_DEFAULTS };
    try {
      return { ...AI_INSIGHTS_LLM_DEFAULTS, ...JSON.parse(rs.rows[0][0] as string) };
    } catch {
      return { ...AI_INSIGHTS_LLM_DEFAULTS };
    }
  },

  async setAiInsightsLlm(config: Partial<AiInsightsLlmConfig>): Promise<AiInsightsLlmConfig> {
    await ensureSchema();
    const current = await this.getAiInsightsLlm();
    const next = { ...current, ...config };
    await getClient().execute({
      sql: "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
      args: ["ai_insights_llm", JSON.stringify(next), new Date().toISOString()],
    });
    return next;
  },

  async getChatLlm(): Promise<ChatLlmConfig> {
    await ensureSchema();
    const rs = await getClient().execute({
      sql: "SELECT value FROM settings WHERE key = ?",
      args: ["chat_llm"],
    });
    if (!rs.rows.length) return { ...CHAT_LLM_DEFAULTS };
    try {
      return { ...CHAT_LLM_DEFAULTS, ...JSON.parse(rs.rows[0][0] as string) };
    } catch {
      return { ...CHAT_LLM_DEFAULTS };
    }
  },

  async setChatLlm(config: Partial<ChatLlmConfig>): Promise<ChatLlmConfig> {
    await ensureSchema();
    const current = await this.getChatLlm();
    const next = { ...current, ...config };
    await getClient().execute({
      sql: "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
      args: ["chat_llm", JSON.stringify(next), new Date().toISOString()],
    });
    return next;
  },

  async getDraftLlm(): Promise<DraftLlmConfig> {
    await ensureSchema();
    const rs = await getClient().execute({
      sql: "SELECT value FROM settings WHERE key = ?",
      args: ["draft_llm"],
    });
    if (!rs.rows.length) return { ...DRAFT_LLM_DEFAULTS };
    try {
      return { ...DRAFT_LLM_DEFAULTS, ...JSON.parse(rs.rows[0][0] as string) };
    } catch {
      return { ...DRAFT_LLM_DEFAULTS };
    }
  },

  async setDraftLlm(config: Partial<DraftLlmConfig>): Promise<DraftLlmConfig> {
    await ensureSchema();
    const current = await this.getDraftLlm();
    const next = { ...current, ...config };
    await getClient().execute({
      sql: "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
      args: ["draft_llm", JSON.stringify(next), new Date().toISOString()],
    });
    return next;
  },

  async getTodayReadingLlm(): Promise<TodayReadingLlmConfig> {
    await ensureSchema();
    const rs = await getClient().execute({
      sql: "SELECT value FROM settings WHERE key = ?",
      args: ["today_reading_llm"],
    });
    if (!rs.rows.length) return { ...TODAY_READING_LLM_DEFAULTS };
    try {
      return { ...TODAY_READING_LLM_DEFAULTS, ...JSON.parse(rs.rows[0][0] as string) };
    } catch {
      return { ...TODAY_READING_LLM_DEFAULTS };
    }
  },

  async setTodayReadingLlm(config: Partial<TodayReadingLlmConfig>): Promise<TodayReadingLlmConfig> {
    await ensureSchema();
    const current = await this.getTodayReadingLlm();
    const next = { ...current, ...config };
    await getClient().execute({
      sql: "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)",
      args: ["today_reading_llm", JSON.stringify(next), new Date().toISOString()],
    });
    return next;
  },
};
