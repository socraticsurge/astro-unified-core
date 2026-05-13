import { getClient, ensureSchema } from "./client";

export type AppSettings = {
  live_consultation_enabled: boolean;
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
      live_consultation_enabled: map["live_consultation_enabled"] === "true",
    };
  },

  async set(key: keyof AppSettings, value: boolean): Promise<void> {
    await ensureSchema();
    await getClient().execute({
      sql: `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)`,
      args: [key, String(value), new Date().toISOString()],
    });
  },
};
