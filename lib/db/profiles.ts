import { randomUUID } from "crypto";
import { z } from "zod";
import { getClient, ensureSchema } from "./client";

const ProfileSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  name: z.string(),
  date_of_birth: z.string(),
  time_of_birth: z.string(),
  place_of_birth: z.string(),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  timezone: z.string(),
  timezone_offset: z.coerce.number(),
  relationship: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  current_location: z.string().nullable().optional(),
  current_latitude: z.coerce.number().nullable().optional(),
  current_longitude: z.coerce.number().nullable().optional(),
  current_timezone: z.string().nullable().optional(),
  current_timezone_offset: z.coerce.number().nullable().optional(),
  created_at: z.string(),
});

const ProfileWithUserSchema = ProfileSchema.extend({
  user_name: z.string().nullable(),
  user_email: z.string().nullable(),
});

export type Profile = z.infer<typeof ProfileSchema>;
export type ProfileWithUser = z.infer<typeof ProfileWithUserSchema>;

export const profiles = {
  async list(userId: string): Promise<Profile[]> {
    await ensureSchema();
    const rs = await getClient().execute({
      sql: "SELECT * FROM profiles WHERE user_id = ? ORDER BY created_at ASC",
      args: [userId],
    });
    return rs.rows.map((r) => ProfileSchema.parse(r));
  },

  async count(userId: string): Promise<number> {
    await ensureSchema();
    const rs = await getClient().execute({
      sql: "SELECT COUNT(*) FROM profiles WHERE user_id = ?",
      args: [userId],
    });
    return Number(rs.rows[0]?.[0] ?? 0);
  },

  async listAll(): Promise<Profile[]> {
    await ensureSchema();
    const rs = await getClient().execute("SELECT * FROM profiles ORDER BY created_at DESC");
    return rs.rows.map((r) => ProfileSchema.parse(r));
  },

  async listAllWithUser(limit = 200): Promise<ProfileWithUser[]> {
    await ensureSchema();
    const rs = await getClient().execute({
      sql: `SELECT p.*, u.name AS user_name, u.email AS user_email
            FROM profiles p LEFT JOIN users u ON u.id = p.user_id
            ORDER BY p.created_at DESC LIMIT ?`,
      args: [limit],
    });
    return rs.rows.map((r) => ProfileWithUserSchema.parse(r));
  },

  async get(id: string, userId: string): Promise<Profile | undefined> {
    await ensureSchema();
    const rs = await getClient().execute({
      sql: "SELECT * FROM profiles WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
    return rs.rows[0] ? ProfileSchema.parse(rs.rows[0]) : undefined;
  },

  async getAny(id: string): Promise<Profile | undefined> {
    await ensureSchema();
    const rs = await getClient().execute({
      sql: "SELECT * FROM profiles WHERE id = ?",
      args: [id],
    });
    return rs.rows[0] ? ProfileSchema.parse(rs.rows[0]) : undefined;
  },

  async getMany(ids: string[], userId: string): Promise<Profile[]> {
    if (ids.length === 0) return [];
    await ensureSchema();
    const placeholders = ids.map(() => "?").join(",");
    const rs = await getClient().execute({
      sql: `SELECT * FROM profiles WHERE id IN (${placeholders}) AND user_id = ?`,
      args: [...ids, userId],
    });
    return rs.rows.map((r) => ProfileSchema.parse(r));
  },

  async getManyAny(ids: string[]): Promise<Profile[]> {
    if (ids.length === 0) return [];
    await ensureSchema();
    const placeholders = ids.map(() => "?").join(",");
    const rs = await getClient().execute({
      sql: `SELECT * FROM profiles WHERE id IN (${placeholders})`,
      args: [...ids],
    });
    return rs.rows.map((r) => ProfileSchema.parse(r));
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
