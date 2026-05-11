import { createClient, type Client } from "@libsql/client";
import { randomUUID } from "crypto";

let clientInstance: Client | null = null;

function getClient() {
  if (clientInstance) return clientInstance;
  
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    console.warn("TURSO_DATABASE_URL is not set");
  }

  clientInstance = createClient({
    url: url || "file:dummy.db",
    authToken: authToken,
  });
  return clientInstance;
}

let schemaInitialized = false;

export async function ensureSchema() {
  if (schemaInitialized) return;
  
  const client = getClient();
  try {
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

    // Migrations for newly added columns
    try { await client.execute("ALTER TABLE profiles ADD COLUMN relationship TEXT;"); } catch {}
    try { await client.execute("ALTER TABLE profiles ADD COLUMN gender TEXT;"); } catch {}

    await client.execute(`
      CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles(user_id);
      CREATE INDEX IF NOT EXISTS idx_readings_profile ON readings(profile_id);
    `);
    
    schemaInitialized = true;
  } catch (e) {
    console.error("Failed to initialize schema:", e);
  }
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
  relationship?: string | null;
  gender?: string | null;
  created_at: string;
};

export const db = {
  users: {
    async upsert(user: { id: string; name?: string | null; email?: string | null; image?: string | null }) {
      await ensureSchema();
      await getClient().execute({
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
      const rs = await getClient().execute("SELECT * FROM users ORDER BY last_login DESC");
      return rs.rows;
    }
  },
  profiles: {
    async list(userId: string): Promise<Profile[]> {
      await ensureSchema();
      const rs = await getClient().execute({
        sql: "SELECT * FROM profiles WHERE user_id = ? ORDER BY created_at DESC",
        args: [userId],
      });
      return rs.rows as unknown as Profile[];
    },
    async listAll(): Promise<Profile[]> {
      await ensureSchema();
      const rs = await getClient().execute("SELECT * FROM profiles ORDER BY created_at DESC");
      return rs.rows as unknown as Profile[];
    },
    async listAllWithUser(): Promise<(Profile & { user_name: string | null; user_email: string | null })[]> {
      await ensureSchema();
      const rs = await getClient().execute(`
        SELECT p.*, u.name AS user_name, u.email AS user_email
        FROM profiles p LEFT JOIN users u ON u.id = p.user_id
        ORDER BY p.created_at DESC
      `);
      return rs.rows as unknown as (Profile & { user_name: string | null; user_email: string | null })[];
    },
    async get(id: string, userId: string): Promise<Profile | undefined> {
      await ensureSchema();
      const rs = await getClient().execute({
        sql: "SELECT * FROM profiles WHERE id = ? AND user_id = ?",
        args: [id, userId],
      });
      return rs.rows[0] as unknown as Profile | undefined;
    },
    async getAny(id: string): Promise<Profile | undefined> {
      await ensureSchema();
      const rs = await getClient().execute({
        sql: "SELECT * FROM profiles WHERE id = ?",
        args: [id],
      });
      return rs.rows[0] as unknown as Profile | undefined;
    },
    async create(userId: string, data: Omit<Profile, "id" | "created_at" | "user_id">): Promise<Profile> {
      await ensureSchema();
      const id = randomUUID();
      const created_at = new Date().toISOString();
      await getClient().execute({
        sql: `INSERT INTO profiles (id, user_id, name, date_of_birth, time_of_birth, place_of_birth,
             latitude, longitude, timezone, timezone_offset, relationship, gender, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          data.relationship || null,
          data.gender || null,
          created_at,
        ],
      });
      return { id, user_id: userId, created_at, ...data };
    },
    async update(id: string, userId: string, data: Omit<Profile, "id" | "created_at" | "user_id">): Promise<void> {
      await ensureSchema();
      await getClient().execute({
        sql: `UPDATE profiles SET 
              name = ?, date_of_birth = ?, time_of_birth = ?, place_of_birth = ?,
              latitude = ?, longitude = ?, timezone = ?, timezone_offset = ?,
              relationship = ?, gender = ?
              WHERE id = ? AND user_id = ?`,
        args: [
          data.name,
          data.date_of_birth,
          data.time_of_birth,
          data.place_of_birth,
          data.latitude,
          data.longitude,
          data.timezone,
          data.timezone_offset,
          data.relationship || null,
          data.gender || null,
          id,
          userId,
        ],
      });
    },
    async delete(id: string, userId: string): Promise<void> {
      await ensureSchema();
      await getClient().execute({
        sql: "DELETE FROM profiles WHERE id = ? AND user_id = ?",
        args: [id, userId],
      });
    },
  },
  readings: {
    async save(data: { profile_id: string, engine: string, input_snapshot: unknown, output_data: unknown }) {
      await ensureSchema();
      const id = randomUUID();
      const created_at = new Date().toISOString();
      await getClient().execute({
        sql: `INSERT INTO readings (id, profile_id, engine, input_snapshot, output_data, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
        args: [
          id,
          data.profile_id,
          data.engine,
          JSON.stringify(data.input_snapshot),
          JSON.stringify(data.output_data),
          created_at,
        ],
      });
      return { id, created_at, ...data };
    },
    async latestByEngine(profile_id: string, engine: string) {
      await ensureSchema();
      const rs = await getClient().execute({
        sql: "SELECT * FROM readings WHERE profile_id = ? AND engine = ? ORDER BY created_at DESC LIMIT 1",
        args: [profile_id, engine],
      });
      return rs.rows[0];
    },
    async deleteByProfile(profile_id: string) {
      await ensureSchema();
      await getClient().execute({
        sql: "DELETE FROM readings WHERE profile_id = ?",
        args: [profile_id],
      });
    },
  },
};
