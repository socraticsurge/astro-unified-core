import { randomUUID } from "crypto";
import { z } from "zod";
import { getClient, ensureSchema } from "./client";

const CompatibilityCheckSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  profile_id_1: z.string(),
  profile_id_2: z.string(),
  score: z.coerce.number(),
  result_json: z.string(),
  created_at: z.string(),
});

const CompatibilityCheckWithDetailsSchema = CompatibilityCheckSchema.extend({
  user_email: z.string().nullable(),
  p1_name: z.string().nullable(),
  p2_name: z.string().nullable(),
});

export type CompatibilityCheck = z.infer<typeof CompatibilityCheckSchema>;
export type CompatibilityCheckWithDetails = z.infer<typeof CompatibilityCheckWithDetailsSchema>;

export const compatibility = {
  async list(userId: string): Promise<CompatibilityCheck[]> {
    await ensureSchema();
    const rs = await getClient().execute({
      sql: "SELECT * FROM compatibility_checks WHERE user_id = ? ORDER BY created_at DESC",
      args: [userId],
    });
    return rs.rows.map((r) => CompatibilityCheckSchema.parse(r));
  },

  async countByUser(userId: string): Promise<number> {
    await ensureSchema();
    const rs = await getClient().execute({
      sql: "SELECT COUNT(*) FROM compatibility_checks WHERE user_id = ?",
      args: [userId],
    });
    return Number(rs.rows[0]?.[0] ?? 0);
  },

  async findDuplicate(userId: string, id1: string, id2: string): Promise<CompatibilityCheck | undefined> {
    await ensureSchema();
    const rs = await getClient().execute({
      sql: `SELECT * FROM compatibility_checks
            WHERE user_id = ?
            AND ((profile_id_1 = ? AND profile_id_2 = ?) OR (profile_id_1 = ? AND profile_id_2 = ?))
            LIMIT 1`,
      args: [userId, id1, id2, id2, id1],
    });
    return rs.rows[0] ? CompatibilityCheckSchema.parse(rs.rows[0]) : undefined;
  },

  async listAllWithDetails(limit = 200): Promise<CompatibilityCheckWithDetails[]> {
    await ensureSchema();
    const rs = await getClient().execute({
      sql: `SELECT c.*,
                   u.email as user_email,
                   p1.name as p1_name,
                   p2.name as p2_name
            FROM compatibility_checks c
            LEFT JOIN users u ON u.id = c.user_id
            LEFT JOIN profiles p1 ON p1.id = c.profile_id_1
            LEFT JOIN profiles p2 ON p2.id = c.profile_id_2
            ORDER BY c.created_at DESC LIMIT ?`,
      args: [limit],
    });
    return rs.rows.map((r) => CompatibilityCheckWithDetailsSchema.parse(r));
  },

  async get(id: string, userId: string): Promise<CompatibilityCheck | undefined> {
    await ensureSchema();
    const rs = await getClient().execute({
      sql: "SELECT * FROM compatibility_checks WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    return rs.rows[0] ? CompatibilityCheckSchema.parse(rs.rows[0]) : undefined;
  },

  async getAny(id: string): Promise<CompatibilityCheck | undefined> {
    await ensureSchema();
    const rs = await getClient().execute({
      sql: "SELECT * FROM compatibility_checks WHERE id = ?",
      args: [id],
    });
    return rs.rows[0] ? CompatibilityCheckSchema.parse(rs.rows[0]) : undefined;
  },

  async save(
    userId: string,
    data: Omit<CompatibilityCheck, "id" | "created_at" | "user_id">
  ): Promise<CompatibilityCheck> {
    await ensureSchema();
    const id = randomUUID();
    const created_at = new Date().toISOString();
    await getClient().execute({
      sql: `INSERT INTO compatibility_checks (id, user_id, profile_id_1, profile_id_2, score, result_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [id, userId, data.profile_id_1, data.profile_id_2, data.score, data.result_json, created_at],
    });
    return { id, user_id: userId, created_at, ...data };
  },
};
