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

// Per-Lambda-instance flag. ensureSchema() already creates this table during
// version migration, but if schema_version ever drifted ahead of the table
// (partial migration, manual DB ops), we'd be stuck with no way to recover.
// Self-creating here makes this module independently robust.
let tableEnsured = false;
async function ensureTable() {
  if (tableEnsured) return;
  await ensureSchema(); // still call the main one so other tables exist too
  await getClient().execute(`
    CREATE TABLE IF NOT EXISTS daily_landing (
      id TEXT PRIMARY KEY,
      ist_date TEXT UNIQUE NOT NULL,
      payload TEXT,
      attempts INTEGER NOT NULL DEFAULT 0,
      last_attempt_at TEXT,
      generated_at TEXT,
      created_at TEXT NOT NULL
    );
  `);
  await getClient().execute(
    "CREATE INDEX IF NOT EXISTS idx_daily_landing_generated ON daily_landing (generated_at);"
  );
  tableEnsured = true;
}

export const dailyLanding = {
  async getByDate(istDate: string): Promise<DailyLandingRow | null> {
    await ensureTable();
    const rs = await getClient().execute({
      sql: "SELECT * FROM daily_landing WHERE ist_date = ? LIMIT 1",
      args: [istDate],
    });
    return rs.rows[0] ? RowSchema.parse(rs.rows[0]) : null;
  },

  // Picks the most recent row where generation succeeded. Used to serve
  // yesterday's content when today's generation is failing.
  async getMostRecentSuccess(): Promise<DailyLandingRow | null> {
    await ensureTable();
    const rs = await getClient().execute(
      "SELECT * FROM daily_landing WHERE payload IS NOT NULL ORDER BY ist_date DESC LIMIT 1"
    );
    return rs.rows[0] ? RowSchema.parse(rs.rows[0]) : null;
  },

  // Idempotently bumps the attempt counter for a given date. Single atomic
  // UPSERT — earlier we had SELECT-then-INSERT which lost the race when two
  // cold-cache visitors hit simultaneously (UNIQUE constraint on ist_date).
  async recordAttempt(istDate: string): Promise<void> {
    await ensureTable();
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
    await ensureTable();
    const now = new Date().toISOString();
    await getClient().execute({
      sql: "UPDATE daily_landing SET payload = ?, generated_at = ? WHERE ist_date = ?",
      args: [JSON.stringify(payload), now, istDate],
    });
  },
};
