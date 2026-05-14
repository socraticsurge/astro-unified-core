import { randomUUID } from "crypto";
import { getClient, ensureSchema } from "./client";

export type ConsultationSlot = {
  id: string;
  starts_at: string;  // ISO string, represents IST time
  is_booked: number;  // 0 = available, 1 = booked
};

export const consultationSlots = {
  async listUpcoming(): Promise<ConsultationSlot[]> {
    await ensureSchema();
    const rs = await getClient().execute({
      sql: "SELECT * FROM consultation_slots WHERE starts_at > ? ORDER BY starts_at ASC",
      args: [new Date().toISOString()],
    });
    return rs.rows as unknown as ConsultationSlot[];
  },

  async listAll(): Promise<ConsultationSlot[]> {
    await ensureSchema();
    const rs = await getClient().execute(
      "SELECT * FROM consultation_slots ORDER BY starts_at ASC"
    );
    return rs.rows as unknown as ConsultationSlot[];
  },

  async create(startsAt: string): Promise<ConsultationSlot> {
    await ensureSchema();
    const id = randomUUID();
    await getClient().execute({
      sql: "INSERT INTO consultation_slots (id, starts_at, is_booked) VALUES (?, ?, 0)",
      args: [id, startsAt],
    });
    return { id, starts_at: startsAt, is_booked: 0 };
  },

  async book(id: string): Promise<boolean> {
    await ensureSchema();
    const rs = await getClient().execute({
      sql: "UPDATE consultation_slots SET is_booked = 1 WHERE id = ? AND is_booked = 0",
      args: [id],
    });
    return (rs.rowsAffected ?? 0) > 0;
  },

  async getById(id: string): Promise<ConsultationSlot | undefined> {
    await ensureSchema();
    const rs = await getClient().execute({
      sql: "SELECT * FROM consultation_slots WHERE id = ?",
      args: [id],
    });
    return rs.rows[0] as unknown as ConsultationSlot | undefined;
  },

  async unbook(id: string): Promise<void> {
    await ensureSchema();
    await getClient().execute({
      sql: "UPDATE consultation_slots SET is_booked = 0 WHERE id = ?",
      args: [id],
    });
  },

  async delete(id: string): Promise<void> {
    await ensureSchema();
    await getClient().execute({
      sql: "DELETE FROM consultation_slots WHERE id = ? AND is_booked = 0",
      args: [id],
    });
  },
};
