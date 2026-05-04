import Database from "better-sqlite3";
import path from "path";
import { randomUUID } from "crypto";

const DB_PATH = path.join(process.cwd(), "astrounified.db");

const globalForDb = global as typeof globalThis & { _db?: Database.Database };

export function getDb(): Database.Database {
  if (!globalForDb._db) {
    globalForDb._db = new Database(DB_PATH);
    globalForDb._db.pragma("journal_mode = WAL");
    globalForDb._db.pragma("foreign_keys = ON");
    initSchema(globalForDb._db);
  }
  return globalForDb._db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
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

    CREATE TABLE IF NOT EXISTS readings (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      engine TEXT NOT NULL,
      input_snapshot TEXT NOT NULL,
      output_data TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      profile_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      context_engines TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_readings_profile ON readings(profile_id);
    CREATE INDEX IF NOT EXISTS idx_readings_engine ON readings(engine);
    CREATE INDEX IF NOT EXISTS idx_chat_profile ON chat_messages(profile_id);
  `);
}

export type Profile = {
  id: string;
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

export type Reading = {
  id: string;
  profile_id: string;
  engine: string;
  input_snapshot: string;
  output_data: string;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  profile_id: string;
  role: "user" | "assistant";
  content: string;
  context_engines: string;
  created_at: string;
};

export const db = {
  profiles: {
    list(): Profile[] {
      return getDb()
        .prepare("SELECT * FROM profiles ORDER BY created_at DESC")
        .all() as Profile[];
    },
    get(id: string): Profile | undefined {
      return getDb()
        .prepare("SELECT * FROM profiles WHERE id = ?")
        .get(id) as Profile | undefined;
    },
    create(data: Omit<Profile, "id" | "created_at">): Profile {
      const id = randomUUID();
      const created_at = new Date().toISOString();
      getDb()
        .prepare(
          `INSERT INTO profiles (id, name, date_of_birth, time_of_birth, place_of_birth,
           latitude, longitude, timezone, timezone_offset, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          data.name,
          data.date_of_birth,
          data.time_of_birth,
          data.place_of_birth,
          data.latitude,
          data.longitude,
          data.timezone,
          data.timezone_offset,
          created_at
        );
      return { id, created_at, ...data };
    },
    delete(id: string): void {
      getDb().prepare("DELETE FROM profiles WHERE id = ?").run(id);
    },
  },
  readings: {
    listForProfile(profileId: string): Reading[] {
      return getDb()
        .prepare(
          "SELECT * FROM readings WHERE profile_id = ? ORDER BY created_at DESC"
        )
        .all(profileId) as Reading[];
    },
    latestPerEngine(profileId: string): Record<string, Reading> {
      const rows = getDb()
        .prepare(
          `SELECT r.* FROM readings r
           WHERE r.profile_id = ?
             AND r.created_at = (
               SELECT MAX(r2.created_at) FROM readings r2
               WHERE r2.profile_id = r.profile_id AND r2.engine = r.engine
             )`
        )
        .all(profileId) as Reading[];
      return Object.fromEntries(rows.map((r) => [r.engine, r]));
    },
    save(data: {
      profile_id: string;
      engine: string;
      input_snapshot: object;
      output_data: object;
    }): Reading {
      const id = randomUUID();
      const created_at = new Date().toISOString();
      getDb()
        .prepare(
          `INSERT INTO readings (id, profile_id, engine, input_snapshot, output_data, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          data.profile_id,
          data.engine,
          JSON.stringify(data.input_snapshot),
          JSON.stringify(data.output_data),
          created_at
        );
      return {
        id,
        profile_id: data.profile_id,
        engine: data.engine,
        input_snapshot: JSON.stringify(data.input_snapshot),
        output_data: JSON.stringify(data.output_data),
        created_at,
      };
    },
  },
  chat: {
    listForProfile(profileId: string): ChatMessage[] {
      return getDb()
        .prepare(
          "SELECT * FROM chat_messages WHERE profile_id = ? ORDER BY created_at ASC"
        )
        .all(profileId) as ChatMessage[];
    },
    save(data: {
      profile_id: string;
      role: "user" | "assistant";
      content: string;
      context_engines: string[];
    }): ChatMessage {
      const id = randomUUID();
      const created_at = new Date().toISOString();
      getDb()
        .prepare(
          `INSERT INTO chat_messages (id, profile_id, role, content, context_engines, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          data.profile_id,
          data.role,
          data.content,
          JSON.stringify(data.context_engines),
          created_at
        );
      return {
        id,
        profile_id: data.profile_id,
        role: data.role,
        content: data.content,
        context_engines: JSON.stringify(data.context_engines),
        created_at,
      };
    },
  },
};
