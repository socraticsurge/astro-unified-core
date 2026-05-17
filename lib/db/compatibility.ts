import { randomUUID } from "crypto";
import { getClient, ensureSchema } from "./client";

export type CompatibilityCheck = {
  id: string;
  user_id: string;
  profile_id_1: string;
  profile_id_2: string;
  score: number;
  result_json: string;
  created_at: string;
};

export type CompatibilityCheckWithDetails = CompatibilityCheck & {
  user_email: string | null;
  p1_name: string | null;
  p2_name: string | null;
};

export const compatibility = {
  async list(userId: string): Promise<CompatibilityCheck[]> {
    await ensureSchema();
    const rs = await getClient().execute({
      sql: "SELECT * FROM compatibility_checks WHERE user_id = ? ORDER BY created_at DESC",
      args: [userId],
    });
    return rs.rows as unknown as CompatibilityCheck[];
  },

  async listAllWithDetails(): Promise<CompatibilityCheckWithDetails[]> {
    await ensureSchema();
    const rs = await getClient().execute(`
      SELECT c.*,
             u.email as user_email,
             p1.name as p1_name,
             p2.name as p2_name
      FROM compatibility_checks c
      LEFT JOIN users u ON u.id = c.user_id
      LEFT JOIN profiles p1 ON p1.id = c.profile_id_1
      LEFT JOIN profiles p2 ON p2.id = c.profile_id_2
      ORDER BY c.created_at DESC
    `);
    return rs.rows as unknown as CompatibilityCheckWithDetails[];
  },

  async get(id: string, userId: string): Promise<CompatibilityCheck | undefined> {
    await ensureSchema();
    const rs = await getClient().execute({
      sql: "SELECT * FROM compatibility_checks WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    return rs.rows[0] as unknown as CompatibilityCheck | undefined;
  },

  async getAny(id: string): Promise<CompatibilityCheck | undefined> {
    await ensureSchema();
    const rs = await getClient().execute({
      sql: "SELECT * FROM compatibility_checks WHERE id = ?",
      args: [id],
    });
    return rs.rows[0] as unknown as CompatibilityCheck | undefined;
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

  async delete(id: string, userId: string): Promise<void> {
    await ensureSchema();
    await getClient().execute({
      sql: "DELETE FROM compatibility_checks WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
  },
};
