import { randomUUID } from "crypto";
import { getClient, ensureSchema } from "./client";

export type ConsultationRequest = {
  id: string;
  user_id: string;
  profile_ids: string;   // JSON array of profile id strings
  life_area: string;
  observation: string;
  constraint_text: string;
  objective: string;
  delivery_mode: "written" | "appointment";
  status: "pending" | "answered";
  admin_note: string | null;
  created_at: string;
  answered_at: string | null;
};

export type ConsultationRequestWithUser = ConsultationRequest & {
  user_email: string | null;
  user_name: string | null;
};

export const consultationRequests = {
  async getPending(userId: string): Promise<ConsultationRequest | undefined> {
    await ensureSchema();
    const rs = await getClient().execute({
      sql: "SELECT * FROM consultation_requests WHERE user_id = ? AND status = 'pending' LIMIT 1",
      args: [userId],
    });
    return rs.rows[0] as unknown as ConsultationRequest | undefined;
  },

  async listByUser(userId: string): Promise<ConsultationRequest[]> {
    await ensureSchema();
    const rs = await getClient().execute({
      sql: "SELECT * FROM consultation_requests WHERE user_id = ? ORDER BY created_at DESC",
      args: [userId],
    });
    return rs.rows as unknown as ConsultationRequest[];
  },

  async listAllWithUser(): Promise<ConsultationRequestWithUser[]> {
    await ensureSchema();
    const rs = await getClient().execute(`
      SELECT cr.*, u.email AS user_email, u.name AS user_name
      FROM consultation_requests cr
      LEFT JOIN users u ON u.id = cr.user_id
      ORDER BY cr.created_at DESC
    `);
    return rs.rows as unknown as ConsultationRequestWithUser[];
  },

  async create(
    userId: string,
    data: Pick<ConsultationRequest, "profile_ids" | "life_area" | "observation" | "constraint_text" | "objective" | "delivery_mode">
  ): Promise<ConsultationRequest> {
    await ensureSchema();
    const id = randomUUID();
    const created_at = new Date().toISOString();
    await getClient().execute({
      sql: `INSERT INTO consultation_requests
            (id, user_id, profile_ids, life_area, observation, constraint_text, objective, delivery_mode, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      args: [id, userId, data.profile_ids, data.life_area, data.observation, data.constraint_text, data.objective, data.delivery_mode, created_at],
    });
    return { id, user_id: userId, status: "pending", admin_note: null, answered_at: null, created_at, ...data };
  },

  async markAnswered(id: string, adminNote?: string): Promise<void> {
    await ensureSchema();
    await getClient().execute({
      sql: `UPDATE consultation_requests SET status = 'answered', answered_at = ?, admin_note = ? WHERE id = ?`,
      args: [new Date().toISOString(), adminNote || null, id],
    });
  },
};
