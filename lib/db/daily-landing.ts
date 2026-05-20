import { randomUUID } from "crypto";
import { z } from "zod";
import { getClient, ensureSchema } from "./client";

const RowSchema = z.object({
  id: z.string(),
  ist_date: z.string(),
  payload: z.string().nullable(),
  attempts: z.coerce.number(),
  last_attempt_at: z.string().nullable(),
  generated_at: z.string().nullable(),
  created_at: z.string(),
});

export type DailyLandingRow = z.infer<typeof RowSchema>;

export const dailyLanding = {
  async getByDate(istDate: string): Promise<DailyLandingRow | null> {
    await ensureSchema();
    const rs = await getClient().execute({
      sql: "SELECT * FROM daily_landing WHERE ist_date = ? LIMIT 1",
      args: [istDate],
    });
    return rs.rows[0] ? RowSchema.parse(rs.rows[0]) : null;
  },

  // Picks the most recent row where generation succeeded. Used to serve
  // yesterday's content when today's generation is failing.
  async getMostRecentSuccess(): Promise<DailyLandingRow | null> {
    await ensureSchema();
    const rs = await getClient().execute(
      "SELECT * FROM daily_landing WHERE payload IS NOT NULL ORDER BY ist_date DESC LIMIT 1"
    );
    return rs.rows[0] ? RowSchema.parse(rs.rows[0]) : null;
  },

  // Idempotently bumps the attempt counter for a given date. Inserts a row
  // with attempts=1 if missing; increments otherwise. Leaves payload alone.
  async recordAttempt(istDate: string): Promise<void> {
    await ensureSchema();
    const now = new Date().toISOString();
    const existing = await getClient().execute({
      sql: "SELECT id, attempts FROM daily_landing WHERE ist_date = ? LIMIT 1",
      args: [istDate],
    });
    if (existing.rows[0]) {
      const prev = Number(existing.rows[0][1] ?? 0);
      await getClient().execute({
        sql: "UPDATE daily_landing SET attempts = ?, last_attempt_at = ? WHERE ist_date = ?",
        args: [prev + 1, now, istDate],
      });
    } else {
      await getClient().execute({
        sql: `INSERT INTO daily_landing (id, ist_date, attempts, last_attempt_at, created_at)
              VALUES (?, ?, ?, ?, ?)`,
        args: [randomUUID(), istDate, 1, now, now],
      });
    }
  },

  // Writes the successful payload for the given date. Assumes recordAttempt
  // has already inserted the row.
  async storeSuccess(istDate: string, payload: unknown): Promise<void> {
    await ensureSchema();
    const now = new Date().toISOString();
    await getClient().execute({
      sql: "UPDATE daily_landing SET payload = ?, generated_at = ? WHERE ist_date = ?",
      args: [JSON.stringify(payload), now, istDate],
    });
  },
};
