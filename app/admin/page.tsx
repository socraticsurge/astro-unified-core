import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

const ADMIN_EMAIL = "cvk.atreya@gmail.com";

export default async function AdminPage() {
  const session = await getServerSession();

  if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
    redirect("/");
  }

  const [users, profiles] = await Promise.all([
    db.users.list(),
    db.profiles.listAll(),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold mb-1">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Visible only to {ADMIN_EMAIL}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 max-w-sm">
        <div className="border border-white/10 rounded-lg p-4 bg-white/5 text-center">
          <div className="text-3xl font-bold">{users.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Total Users</div>
        </div>
        <div className="border border-white/10 rounded-lg p-4 bg-white/5 text-center">
          <div className="text-3xl font-bold">{profiles.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Total Profiles</div>
        </div>
      </div>

      {/* Users table */}
      <section>
        <h2 className="text-lg font-semibold mb-3">Users ({users.length})</h2>
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Last Login</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={String(u.id)} className="border-t border-white/10 hover:bg-white/5">
                  <td className="px-3 py-2 font-medium">{String(u.name || "—")}</td>
                  <td className="px-3 py-2 text-muted-foreground">{String(u.email || "—")}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    {u.last_login ? new Date(String(u.last_login)).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">No users yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Profiles table */}
      <section>
        <h2 className="text-lg font-semibold mb-3">All Profiles ({profiles.length})</h2>
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Date of Birth</th>
                <th className="px-3 py-2 font-medium">Place</th>
                <th className="px-3 py-2 font-medium">User ID</th>
                <th className="px-3 py-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <tr key={p.id} className="border-t border-white/10 hover:bg-white/5">
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{p.date_of_birth}</td>
                  <td className="px-3 py-2 text-muted-foreground max-w-[16rem] truncate">{p.place_of_birth}</td>
                  <td className="px-3 py-2 text-muted-foreground font-mono text-xs">{p.user_id.slice(0, 12)}…</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    {new Date(p.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {profiles.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">No profiles yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
