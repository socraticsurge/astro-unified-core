import { getClient, ensureSchema } from "./client";

export type User = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  last_login: string | null;
  created_at: string | null;
};

export const users = {
  async upsert(user: { id: string; name?: string | null; email?: string | null; image?: string | null }) {
    await ensureSchema();
    await getClient().execute({
      sql: `INSERT INTO users (id, name, email, image, last_login, created_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(email) DO UPDATE SET
           id = excluded.id,
           last_login = excluded.last_login,
           name = excluded.name,
           image = excluded.image`,
      args: [user.id, user.name || "", user.email || "", user.image || "", new Date().toISOString(), new Date().toISOString()],
    });
  },

  async list(): Promise<User[]> {
    await ensureSchema();
    const rs = await getClient().execute("SELECT * FROM users ORDER BY last_login DESC");
    return rs.rows as unknown as User[];
  },
};
