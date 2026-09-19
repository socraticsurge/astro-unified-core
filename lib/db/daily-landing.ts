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

  // Idempotently bumps the attempt counter for a given date. Single atomic
  // UPSERT — earlier we had SELECT-then-INSERT which lost the race when two
  // cold-cache visitors hit simultaneously (UNIQUE constraint on ist_date).
  async recordAttempt(istDate: string): Promise<void> {
    await ensureSchema();
    const now = new Date().toISOString();
    await getClient().execute({
      sql: `INSERT INTO daily_landing (id, ist_date, attempts, last_attempt_at, created_at)
            VALUES (?, ?, 1, ?, ?)
            ON CONFLICT(ist_date) DO UPDATE SET
              attempts = daily_landing.attempts + 1,
              last_attempt_at = excluded.last_attempt_at`,
      args: [randomUUID(), istDate, now, now],
    });
  },

  // Writes the successful payload for the given date.
  async storeSuccess(istDate: string, payload: unknown): Promise<void> {
    await ensureSchema();
    const now = new Date().toISOString();
    await getClient().execute({
      sql: "UPDATE daily_landing SET payload = ?, generated_at = ? WHERE ist_date = ?",
      args: [JSON.stringify(payload), now, istDate],
    });
  },
};
