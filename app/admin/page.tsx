import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { AdminTables } from "./AdminTables";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!isAdmin(session)) {
    redirect("/");
  }

  const [users, profiles, feedback, compatibilityChecks, consultationRequests, appSettings, consultationSlots, aiInsightStats] = await Promise.all([
    db.users.list(),
    db.profiles.listAllWithUser(),
    db.feedback.list(),
    db.compatibility.listAllWithDetails(),
    db.consultationRequests.listAllWithUser(),
    db.settings.getAll(),
    db.consultationSlots.listAll(),
    db.readings.aiInsightStats(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">Admin access only</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 max-w-4xl">
        <div className="border border-white/10 rounded-lg p-4 bg-white/5 text-center">
          <div className="text-3xl font-bold">{users.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Users</div>
        </div>
        <div className="border border-white/10 rounded-lg p-4 bg-white/5 text-center">
          <div className="text-3xl font-bold">{profiles.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Profiles</div>
        </div>
        <div className="border border-white/10 rounded-lg p-4 bg-white/5 text-center">
          <div className="text-3xl font-bold">{compatibilityChecks.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Compat Checks</div>
        </div>
        <div className="border border-white/10 rounded-lg p-4 bg-white/5 text-center">
          <div className="text-3xl font-bold">{feedback.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Feedback</div>
        </div>
        <div className="border border-white/10 rounded-lg p-4 bg-white/5 text-center">
          <div className="text-3xl font-bold">{consultationRequests.filter(r => r.delivery_mode === "written").length}</div>
          <div className="text-xs text-muted-foreground mt-1">Written Q&apos;s</div>
        </div>
        <div className="border border-white/10 rounded-lg p-4 bg-white/5 text-center">
          <div className="text-3xl font-bold">{consultationRequests.filter(r => r.delivery_mode === "appointment").length}</div>
          <div className="text-xs text-muted-foreground mt-1">Live Sessions</div>
        </div>
      </div>

      <AdminTables
        users={users}
        profiles={profiles}
        feedback={feedback}
        compatibilityChecks={compatibilityChecks}
        consultationRequests={consultationRequests}
        consultationSlots={consultationSlots}
        appSettings={appSettings}
        aiInsightStats={aiInsightStats}
      />
    </div>
  );
}
