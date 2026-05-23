import { randomUUID } from "crypto";
import { z } from "zod";
import { getClient, ensureSchema } from "./client";

const FeedbackSchema = z.object({
  id: z.string(),
  user_email: z.string().nullable(),
  rating: z.string(),
  message: z.string().nullable(),
  page_url: z.string().nullable(),
  created_at: z.string(),
});

export type Feedback = z.infer<typeof FeedbackSchema>;

export const feedback = {
  async save(data: {
    user_email?: string | null;
    rating: string;
    message?: string | null;
    page_url?: string | null;
  }): Promise<Feedback> {
    await ensureSchema();
    const id = randomUUID();
    const created_at = new Date().toISOString();
    await getClient().execute({
      sql: `INSERT INTO feedback (id, user_email, rating, message, page_url, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, data.user_email || null, data.rating, data.message || null, data.page_url || null, created_at],
    });
    return { id, created_at, user_email: data.user_email || null, rating: data.rating, message: data.message || null, page_url: data.page_url || null };
  },

  async list(limit = 200): Promise<Feedback[]> {
    await ensureSchema();
    const rs = await getClient().execute({
      sql: "SELECT * FROM feedback ORDER BY created_at DESC LIMIT ?",
      args: [limit],
    });
    return rs.rows.map((r) => FeedbackSchema.parse(r));
  },
};
