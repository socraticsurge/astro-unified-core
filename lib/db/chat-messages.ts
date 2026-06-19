import { randomUUID } from "crypto";
import { z } from "zod";
import { getClient, ensureSchema } from "./client";

const ChatMessageSchema = z.object({
  id: z.string(),
  session_id: z.string(),
  user_id: z.string(),
  profile_id: z.string().nullable(),
  check_id: z.string().nullable(),
  session_type: z.enum(["profile", "compat"]),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  model: z.string().nullable(),
  rating: z.number().nullable(),
  rated_at: z.string().nullable(),
  created_at: z.string(),
});

export type ChatMessageRecord = z.infer<typeof ChatMessageSchema>;

export const chatMessages = {
  async save(data: {
    session_id: string;
    user_id: string;
    profile_id?: string | null;
    check_id?: string | null;
    session_type: "profile" | "compat";
    role: "user" | "assistant";
    content: string;
    model?: string | null;
  }): Promise<ChatMessageRecord> {
    await ensureSchema();
    const id = randomUUID();
    const created_at = new Date().toISOString();
    await getClient().execute({
      sql: `INSERT INTO chat_messages (id, session_id, user_id, profile_id, check_id, session_type, role, content, model, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        data.session_id,
        data.user_id,
        data.profile_id ?? null,
        data.check_id ?? null,
        data.session_type,
        data.role,
        data.content,
        data.model ?? null,
        created_at,
      ],
    });
    return {
      id,
      session_id: data.session_id,
      user_id: data.user_id,
      profile_id: data.profile_id ?? null,
      check_id: data.check_id ?? null,
      session_type: data.session_type,
      role: data.role,
      content: data.content,
      model: data.model ?? null,
      rating: null,
      rated_at: null,
      created_at,
    };
  },

  // Count user-sent messages in the current calendar month (for quota enforcement).
  async countUserMonthly(user_id: string): Promise<number> {
    await ensureSchema();
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const rs = await getClient().execute({
      sql: `SELECT COUNT(*) FROM chat_messages WHERE user_id = ? AND role = 'user' AND created_at >= ?`,
      args: [user_id, monthStart.toISOString()],
    });
    return Number(rs.rows[0]?.[0] ?? 0);
  },

  async rate(id: string, user_id: string, rating: 1 | -1 | null): Promise<void> {
    await ensureSchema();
    await getClient().execute({
      sql: `UPDATE chat_messages SET rating = ?, rated_at = ? WHERE id = ? AND user_id = ?`,
      args: [rating, rating !== null ? new Date().toISOString() : null, id, user_id],
    });
  },

  async listByUser(user_id: string, limit = 200): Promise<ChatMessageRecord[]> {
    await ensureSchema();
    const rs = await getClient().execute({
      sql: `SELECT id, user_id, profile_id, check_id, session_type, role, content, model, rating, rated_at, created_at
            FROM chat_messages WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
      args: [user_id, limit],
    });
    return rs.rows.map(r => ChatMessageSchema.parse(r));
  },

  async listAll(limit = 500): Promise<ChatMessageRecord[]> {
    await ensureSchema();
    const rs = await getClient().execute({
      sql: `SELECT id, user_id, profile_id, check_id, session_type, role, content, model, rating, rated_at, created_at
            FROM chat_messages ORDER BY created_at DESC LIMIT ?`,
      args: [limit],
    });
    return rs.rows.map(r => ChatMessageSchema.parse(r));
  },
};
