import { z } from "zod";
import { getClient, ensureSchema } from "./client";

const UserSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  image: z.string().nullable(),
  last_login: z.string().nullable(),
  created_at: z.string().nullable(),
});

export type User = z.infer<typeof UserSchema>;

export const users = {
  // Idempotent upsert keyed on email. CRITICAL: we do NOT overwrite the
  // existing row's `id` on conflict. The previous version did, which meant
  // every Google sign-in that returned a different `user.id` (e.g. after
  // an auth library bump, session strategy change, or any drift in how
  // NextAuth derived `user.id`) silently rewrote the user's primary key
  // and orphaned every `profiles.user_id` referencing the old value —
  // hence "I can't see my profiles anymore" after a deploy. Now `id` is
  // immutable per email; subsequent sign-ins only refresh metadata.
  async upsert(user: { id: string; name?: string | null; email?: string | null; image?: string | null }) {
    await ensureSchema();
    await getClient().execute({
      sql: `INSERT INTO users (id, name, email, image, last_login, created_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(email) DO UPDATE SET
           last_login = excluded.last_login,
           name = excluded.name,
           image = excluded.image`,
      args: [user.id, user.name || "", user.email || "", user.image || "", new Date().toISOString(), new Date().toISOString()],
    });
  },

  // Look up a user by email. Used by the session callback to resolve the
  // CANONICAL user.id (the one already stored in our DB) instead of
  // trusting `token.sub` which can drift across NextAuth upgrades.
  async getByEmail(email: string): Promise<User | undefined> {
    await ensureSchema();
    const rs = await getClient().execute({
      sql: "SELECT * FROM users WHERE email = ? LIMIT 1",
      args: [email],
    });
    return rs.rows[0] ? UserSchema.parse(rs.rows[0]) : undefined;
  },

  async getById(id: string): Promise<User | undefined> {
    await ensureSchema();
    const rs = await getClient().execute({
      sql: "SELECT * FROM users WHERE id = ? LIMIT 1",
      args: [id],
    });
    return rs.rows[0] ? UserSchema.parse(rs.rows[0]) : undefined;
  },

  async list(limit = 200): Promise<User[]> {
    await ensureSchema();
    const rs = await getClient().execute({
      sql: "SELECT * FROM users ORDER BY last_login DESC LIMIT ?",
      args: [limit],
    });
    return rs.rows.map((r) => UserSchema.parse(r));
  },
};
