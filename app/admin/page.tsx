import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { isAdmin, ADMIN_EMAILS } from "@/lib/admin";
import { AdminTables } from "./AdminTables";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!isAdmin(session)) {
    redirect("/");
  }

  const [users, profiles, feedback, compatibilityChecks] = await Promise.all([
    db.users.list(),
    db.profiles.listAllWithUser(),
    db.feedback.list(),
    db.compatibility.listAllWithDetails(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Visible only to {ADMIN_EMAILS.join(", ")}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 max-w-2xl">
        <div className="border border-white/10 rounded-lg p-4 bg-white/5 text-center">
          <div className="text-3xl font-bold">{users.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Total Users</div>
        </div>
        <div className="border border-white/10 rounded-lg p-4 bg-white/5 text-center">
          <div className="text-3xl font-bold">{profiles.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Total Profiles</div>
        </div>
        <div className="border border-white/10 rounded-lg p-4 bg-white/5 text-center">
          <div className="text-3xl font-bold">{compatibilityChecks.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Compat Checks</div>
        </div>
        <div className="border border-white/10 rounded-lg p-4 bg-white/5 text-center">
          <div className="text-3xl font-bold">{feedback.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Feedback</div>
        </div>
      </div>

      <AdminTables users={users} profiles={profiles} feedback={feedback} compatibilityChecks={compatibilityChecks} />
    </div>
  );
}
