import { randomUUID } from "crypto";
import { getClient, ensureSchema } from "./client";

export type Reading = {
  id: string;
  profile_id: string;
  engine: string;
  input_snapshot: string;
  output_data: string;
  created_at: string;
};

export const readings = {
  async save(data: {
    profile_id: string;
    engine: string;
    input_snapshot: unknown;
    output_data: unknown;
  }): Promise<Reading> {
    await ensureSchema();
    const id = randomUUID();
    const created_at = new Date().toISOString();
    await getClient().execute({
      sql: `INSERT INTO readings (id, profile_id, engine, input_snapshot, output_data, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, data.profile_id, data.engine, JSON.stringify(data.input_snapshot), JSON.stringify(data.output_data), created_at],
    });
    return { id, created_at, profile_id: data.profile_id, engine: data.engine, input_snapshot: JSON.stringify(data.input_snapshot), output_data: JSON.stringify(data.output_data) };
  },

  async latestByEngine(profile_id: string, engine: string): Promise<Reading | undefined> {
    await ensureSchema();
    const rs = await getClient().execute({
      sql: "SELECT * FROM readings WHERE profile_id = ? AND engine = ? ORDER BY created_at DESC LIMIT 1",
      args: [profile_id, engine],
    });
    return rs.rows[0] as unknown as Reading | undefined;
  },

  async deleteByProfile(profile_id: string): Promise<void> {
    await ensureSchema();
    await getClient().execute({
      sql: "DELETE FROM readings WHERE profile_id = ?",
      args: [profile_id],
    });
  },
};
