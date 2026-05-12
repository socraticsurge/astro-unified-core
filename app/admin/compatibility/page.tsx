import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { authOptions } from "@/lib/auth";
import { isAdmin, ADMIN_EMAILS } from "@/lib/admin";
import { ChevronLeft, Calendar } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminCompatibilityPage() {
  const session = await getServerSession(authOptions);

  if (!isAdmin(session)) {
    redirect("/");
  }

  const checks = await db.compatibility.listAllWithDetails();

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-6 px-4">
      <div>
        <Link href="/admin" className="text-sm text-sky-400 hover:underline flex items-center mb-4">
          <ChevronLeft className="h-4 w-4 mr-1" /> Back to Admin
        </Link>
        <h1 className="text-2xl font-bold mb-1">Compatibility Checks Tracker</h1>
        <p className="text-sm text-muted-foreground">
          Log of all Ashtakoota Milan checks performed by users.
        </p>
      </div>

      <div className="border border-white/10 rounded-lg overflow-x-auto bg-white/5">
        <table className="w-full text-sm text-left">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>
              <th className="px-4 py-3 font-medium text-muted-foreground">User</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Profile 1 (Male)</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Profile 2 (Female)</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Score</th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Date</th>
              <th className="px-4 py-3 font-medium text-muted-foreground text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {checks.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground italic">
                  No compatibility checks recorded yet.
                </td>
              </tr>
            ) : (
              checks.map((check) => (
                <tr key={check.id} className="hover:bg-white/5">
                  <td className="px-4 py-3 font-medium text-white">{check.user_email || "Unknown User"}</td>
                  <td className="px-4 py-3">{check.p1_name || "Deleted Profile"}</td>
                  <td className="px-4 py-3">{check.p2_name || "Deleted Profile"}</td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${check.score >= 18 ? "text-green-400" : "text-amber-400"}`}>
                      {check.score}/36
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      {new Date(check.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <details className="relative">
                      <summary className="text-xs text-sky-400 hover:text-sky-300 cursor-pointer list-none">View JSON</summary>
                      <div className="absolute right-0 top-full mt-2 w-96 max-h-96 overflow-y-auto bg-zinc-950 border border-white/10 rounded-lg p-4 z-50 text-[10px] font-mono text-left shadow-2xl">
                        <pre className="whitespace-pre-wrap text-muted-foreground">{JSON.stringify(JSON.parse(check.result_json), null, 2)}</pre>
                      </div>
                    </details>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
