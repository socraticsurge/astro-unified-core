import { randomUUID } from "crypto";
import { getClient, ensureSchema } from "./client";

export type Feedback = {
  id: string;
  user_email: string | null;
  rating: string;
  message: string | null;
  page_url: string | null;
  created_at: string;
};

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

  async list(): Promise<Feedback[]> {
    await ensureSchema();
    const rs = await getClient().execute("SELECT * FROM feedback ORDER BY created_at DESC");
    return rs.rows as unknown as Feedback[];
  },
};
