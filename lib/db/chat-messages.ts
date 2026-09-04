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

export type ChatUsageStats = {
  overview: {
    total_user_messages: number;
    unique_users: number;
    sessions: number;
    this_month: number;
    thumbs_up: number;
    thumbs_down: number;
    unrated_assistant: number;
  };
  by_user: Array<{
    user_id: string;
    email: string | null;
    name: string | null;
    message_count: number;
    last_message_at: string;
  }>;
  by_model: Array<{
    model: string;
    count: number;
  }>;
  recent_sessions: Array<{
    session_id: string;
    user_id: string;
    user_email: string | null;
    session_type: "profile" | "compat";
    message_count: number;
    started_at: string;
    last_activity_at: string;
  }>;
};

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
      sql: `SELECT id, session_id, user_id, profile_id, check_id, session_type, role, content, model, rating, rated_at, created_at
            FROM chat_messages WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
      args: [user_id, limit],
    });
    return rs.rows.map(r => ChatMessageSchema.parse(r));
  },

  async listAll(limit = 500): Promise<ChatMessageRecord[]> {
    await ensureSchema();
    const rs = await getClient().execute({
      sql: `SELECT id, session_id, user_id, profile_id, check_id, session_type, role, content, model, rating, rated_at, created_at
            FROM chat_messages ORDER BY created_at DESC LIMIT ?`,
      args: [limit],
    });
    return rs.rows.map(r => ChatMessageSchema.parse(r));
  },

  // Aggregated usage stats for the admin dashboard. Four parallel SQL queries
  // — overview totals, top users, per-model breakdown, and recent sessions.
  // Counts are bounded (top 20 users, top 30 sessions) so the response stays
  // small even if chat_messages grows large.
  async stats(): Promise<ChatUsageStats> {
    await ensureSchema();
    const client = getClient();

    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const monthStartISO = monthStart.toISOString();

    const [overviewRs, byUserRs, byModelRs, recentRs] = await Promise.all([
      client.execute({
        sql: `
          SELECT
            COUNT(CASE WHEN role = 'user' THEN 1 END) AS total_user_messages,
            COUNT(DISTINCT user_id)                   AS unique_users,
            COUNT(DISTINCT NULLIF(session_id, ''))    AS sessions,
            COUNT(CASE WHEN role = 'user' AND created_at >= ? THEN 1 END) AS this_month,
            COUNT(CASE WHEN rating = 1  THEN 1 END)   AS thumbs_up,
            COUNT(CASE WHEN rating = -1 THEN 1 END)   AS thumbs_down,
            COUNT(CASE WHEN role = 'assistant' AND rating IS NULL THEN 1 END) AS unrated_assistant
          FROM chat_messages
        `,
        args: [monthStartISO],
      }),
      client.execute(`
        SELECT cm.user_id, u.email, u.name, COUNT(*) AS cnt, MAX(cm.created_at) AS last_at
        FROM chat_messages cm
        LEFT JOIN users u ON u.id = cm.user_id
        WHERE cm.role = 'user'
        GROUP BY cm.user_id
        ORDER BY cnt DESC
        LIMIT 20
      `),
      client.execute(`
        SELECT model, COUNT(*) AS cnt
        FROM chat_messages
        WHERE role = 'assistant' AND model IS NOT NULL AND model != ''
        GROUP BY model
        ORDER BY cnt DESC
      `),
      client.execute(`
        SELECT cm.session_id, cm.user_id, u.email, cm.session_type,
               COUNT(*) AS cnt, MIN(cm.created_at) AS started_at, MAX(cm.created_at) AS last_at
        FROM chat_messages cm
        LEFT JOIN users u ON u.id = cm.user_id
        WHERE cm.session_id != ''
        GROUP BY cm.session_id
        ORDER BY last_at DESC
        LIMIT 30
      `),
    ]);

    const o = overviewRs.rows[0] ?? [];
    return {
      overview: {
        total_user_messages: Number(o[0] ?? 0),
        unique_users:        Number(o[1] ?? 0),
        sessions:            Number(o[2] ?? 0),
        this_month:          Number(o[3] ?? 0),
        thumbs_up:           Number(o[4] ?? 0),
        thumbs_down:         Number(o[5] ?? 0),
        unrated_assistant:   Number(o[6] ?? 0),
      },
      by_user: byUserRs.rows.map(r => ({
        user_id:         String(r[0]),
        email:           (r[1] as string | null) ?? null,
        name:            (r[2] as string | null) ?? null,
        message_count:   Number(r[3]),
        last_message_at: String(r[4]),
      })),
      by_model: byModelRs.rows.map(r => ({
        model: String(r[0]),
        count: Number(r[1]),
      })),
      recent_sessions: recentRs.rows.map(r => ({
        session_id:        String(r[0]),
        user_id:           String(r[1]),
        user_email:        (r[2] as string | null) ?? null,
        session_type:      (r[3] as "profile" | "compat"),
        message_count:     Number(r[4]),
        started_at:        String(r[5]),
        last_activity_at:  String(r[6]),
      })),
    };
  },
};
