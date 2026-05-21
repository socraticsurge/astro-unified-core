import { randomUUID } from "crypto";
import { z } from "zod";
import { getClient, ensureSchema } from "./client";

const ReadingSchema = z.object({
  id: z.string(),
  profile_id: z.string(),
  engine: z.string(),
  input_snapshot: z.string(),
  output_data: z.string(),
  created_at: z.string(),
  rating: z.coerce.number().nullable().optional(),
  rated_at: z.string().nullable().optional(),
});

export type Reading = z.infer<typeof ReadingSchema>;

export type AiInsightStat = {
  engine: string;
  total: number;
  thumbs_up: number;
  thumbs_down: number;
  unrated: number;
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

  async getById(id: string): Promise<Reading | undefined> {
    await ensureSchema();
    const rs = await getClient().execute({
      sql: "SELECT * FROM readings WHERE id = ? LIMIT 1",
      args: [id],
    });
    return rs.rows[0] ? ReadingSchema.parse(rs.rows[0]) : undefined;
  },

  async latestByEngine(profile_id: string, engine: string): Promise<Reading | undefined> {
    await ensureSchema();
    const rs = await getClient().execute({
      sql: "SELECT * FROM readings WHERE profile_id = ? AND engine = ? ORDER BY created_at DESC LIMIT 1",
      args: [profile_id, engine],
    });
    return rs.rows[0] ? ReadingSchema.parse(rs.rows[0]) : undefined;
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
    return rs.rows.map((r) => ReadingSchema.parse(r));
  },

  async deleteByProfile(profile_id: string): Promise<void> {
    await ensureSchema();
    await getClient().execute({
      sql: "DELETE FROM readings WHERE profile_id = ?",
      args: [profile_id],
    });
  },

  async rate(id: string, rating: 1 | -1 | null): Promise<void> {
    await ensureSchema();
    await getClient().execute({
      sql: "UPDATE readings SET rating = ?, rated_at = ? WHERE id = ?",
      args: [rating, rating !== null ? new Date().toISOString() : null, id],
    });
  },

  async aiInsightStats(): Promise<AiInsightStat[]> {
    await ensureSchema();
    const rs = await getClient().execute(`
      SELECT
        engine,
        COUNT(*) as total,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as thumbs_up,
        SUM(CASE WHEN rating = -1 THEN 1 ELSE 0 END) as thumbs_down,
        SUM(CASE WHEN rating IS NULL THEN 1 ELSE 0 END) as unrated
      FROM readings
      WHERE engine LIKE 'ai-%'
      GROUP BY engine
      ORDER BY engine
    `);
    return rs.rows.map((r) => ({
      engine: r[0] as string,
      total: Number(r[1]),
      thumbs_up: Number(r[2]),
      thumbs_down: Number(r[3]),
      unrated: Number(r[4]),
    }));
  },
};
