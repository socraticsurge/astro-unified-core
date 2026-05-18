import { randomUUID } from "crypto";
import { getClient, ensureSchema } from "./client";
import type { User } from "./users";

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
  current_location?: string | null;
  current_latitude?: number | null;
  current_longitude?: number | null;
  current_timezone?: string | null;
  current_timezone_offset?: number | null;
  created_at: string;
};

export type ProfileWithUser = Profile & {
  user_name: string | null;
  user_email: string | null;
};

export const profiles = {
  async list(userId: string): Promise<Profile[]> {
    await ensureSchema();
    const rs = await getClient().execute({
      sql: "SELECT * FROM profiles WHERE user_id = ? ORDER BY created_at ASC",
      args: [userId],
    });
    return rs.rows as unknown as Profile[];
  },

  async listAll(): Promise<Profile[]> {
    await ensureSchema();
    const rs = await getClient().execute("SELECT * FROM profiles ORDER BY created_at DESC");
    return rs.rows as unknown as Profile[];
  },

  async listAllWithUser(): Promise<ProfileWithUser[]> {
    await ensureSchema();
    const rs = await getClient().execute(`
      SELECT p.*, u.name AS user_name, u.email AS user_email
      FROM profiles p LEFT JOIN users u ON u.id = p.user_id
      ORDER BY p.created_at DESC
    `);
    return rs.rows as unknown as ProfileWithUser[];
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

  async getMany(ids: string[], userId: string): Promise<Profile[]> {
    if (ids.length === 0) return [];
    await ensureSchema();
    const placeholders = ids.map(() => "?").join(",");
    const rs = await getClient().execute({
      sql: `SELECT * FROM profiles WHERE id IN (${placeholders}) AND user_id = ?`,
      args: [...ids, userId],
    });
    return rs.rows as unknown as Profile[];
  },

  async getManyAny(ids: string[]): Promise<Profile[]> {
    if (ids.length === 0) return [];
    await ensureSchema();
    const placeholders = ids.map(() => "?").join(",");
    const rs = await getClient().execute({
      sql: `SELECT * FROM profiles WHERE id IN (${placeholders})`,
      args: [...ids],
    });
    return rs.rows as unknown as Profile[];
  },

  async create(userId: string, data: Omit<Profile, "id" | "created_at" | "user_id">): Promise<Profile> {
    await ensureSchema();
    const id = randomUUID();
    const created_at = new Date().toISOString();
    await getClient().execute({
      sql: `INSERT INTO profiles (id, user_id, name, date_of_birth, time_of_birth, place_of_birth,
           latitude, longitude, timezone, timezone_offset, relationship, gender, created_at,
           current_location, current_latitude, current_longitude, current_timezone, current_timezone_offset)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id, userId, data.name, data.date_of_birth, data.time_of_birth, data.place_of_birth,
        data.latitude, data.longitude, data.timezone, data.timezone_offset,
        data.relationship || null, data.gender || null, created_at,
        data.current_location || null, data.current_latitude || null,
        data.current_longitude || null, data.current_timezone || null,
        data.current_timezone_offset || null,
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
            relationship = ?, gender = ?,
            current_location = ?, current_latitude = ?, current_longitude = ?,
            current_timezone = ?, current_timezone_offset = ?
            WHERE id = ? AND user_id = ?`,
      args: [
        data.name, data.date_of_birth, data.time_of_birth, data.place_of_birth,
        data.latitude, data.longitude, data.timezone, data.timezone_offset,
        data.relationship || null, data.gender || null,
        data.current_location || null, data.current_latitude || null,
        data.current_longitude || null, data.current_timezone || null,
        data.current_timezone_offset || null,
        id, userId,
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
};
