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

  async latestByEngineMany(profile_ids: string[], engine: string): Promise<Reading[]> {
    if (profile_ids.length === 0) return [];
    await ensureSchema();
    const placeholders = profile_ids.map(() => "?").join(",");
    const rs = await getClient().execute({
      sql: `
        SELECT r.*
        FROM readings r
        INNER JOIN (
          SELECT profile_id, engine, MAX(created_at) as max_created_at
          FROM readings
          WHERE engine = ? AND profile_id IN (${placeholders})
          GROUP BY profile_id, engine
        ) latest
        ON r.profile_id = latest.profile_id
        AND r.engine = latest.engine
        AND r.created_at = latest.max_created_at
      `,
      args: [engine, ...profile_ids],
    });
    return rs.rows as unknown as Reading[];
  },

  async deleteByProfile(profile_id: string): Promise<void> {
    await ensureSchema();
    await getClient().execute({
      sql: "DELETE FROM readings WHERE profile_id = ?",
      args: [profile_id],
    });
  },
};
