import { createClient } from "@libsql/client";
import { randomUUID } from "crypto";

const url = process.env.TURSO_DATABASE_URL!;
const authToken = process.env.TURSO_AUTH_TOKEN!;

const client = createClient({
  url: url,
  authToken: authToken,
});

let schemaInitialized = false;

export async function ensureSchema() {
  if (schemaInitialized) return;
  
  await client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE,
      image TEXT,
      last_login TEXT
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      date_of_birth TEXT NOT NULL,
      time_of_birth TEXT NOT NULL,
      place_of_birth TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      timezone TEXT NOT NULL,
      timezone_offset REAL NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS readings (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL,
      engine TEXT NOT NULL,
      input_snapshot TEXT NOT NULL,
      output_data TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles(user_id);
    CREATE INDEX IF NOT EXISTS idx_readings_profile ON readings(profile_id);
  `);
  
  schemaInitialized = true;
}

export type Profile = {
  id: string;
  user_id: string;
  name: string;
  date_of_birth: string;
  time_of_birth: string;
  place_of_birth: string;
  latitude: number;
  longitude: number;
  timezone: string;
  timezone_offset: number;
  created_at: string;
};

export const db = {
  users: {
    async upsert(user: { id: string; name?: string | null; email?: string | null; image?: string | null }) {
      await ensureSchema();
      await client.execute({
        sql: `INSERT INTO users (id, name, email, image, last_login) 
             VALUES (?, ?, ?, ?, ?)
             ON CONFLICT(email) DO UPDATE SET 
             last_login = excluded.last_login,
             name = excluded.name,
             image = excluded.image`,
        args: [user.id, user.name || "", user.email || "", user.image || "", new Date().toISOString()],
      });
    },
    async list() {
      await ensureSchema();
      const rs = await client.execute("SELECT * FROM users ORDER BY last_login DESC");
      return rs.rows;
    }
  },
  profiles: {
    async list(userId: string): Promise<Profile[]> {
      await ensureSchema();
      const rs = await client.execute({
        sql: "SELECT * FROM profiles WHERE user_id = ? ORDER BY created_at DESC",
        args: [userId],
      });
      return rs.rows as unknown as Profile[];
    },
    async get(id: string, userId: string): Promise<Profile | undefined> {
      await ensureSchema();
      const rs = await client.execute({
        sql: "SELECT * FROM profiles WHERE id = ? AND user_id = ?",
        args: [id, userId],
      });
      return rs.rows[0] as unknown as Profile | undefined;
    },
    async create(userId: string, data: Omit<Profile, "id" | "created_at" | "user_id">): Promise<Profile> {
      await ensureSchema();
      const id = randomUUID();
      const created_at = new Date().toISOString();
      await client.execute({
        sql: `INSERT INTO profiles (id, user_id, name, date_of_birth, time_of_birth, place_of_birth,
             latitude, longitude, timezone, timezone_offset, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          userId,
          data.name,
          data.date_of_birth,
          data.time_of_birth,
          data.place_of_birth,
          data.latitude,
          data.longitude,
          data.timezone,
          data.timezone_offset,
          created_at,
        ],
      });
      return { id, user_id: userId, created_at, ...data };
    },
    async delete(id: string, userId: string): Promise<void> {
      await ensureSchema();
      await client.execute({
        sql: "DELETE FROM profiles WHERE id = ? AND user_id = ?",
        args: [id, userId],
      });
    },
  },
};
