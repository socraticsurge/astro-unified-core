"use client";

import { ThumbsUp, ThumbsDown } from "lucide-react";
import type { ChatUsageStats } from "@/lib/db";

type Props = { stats: ChatUsageStats };

function formatRelative(iso: string): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-[var(--color-border)] rounded-lg p-4 bg-[var(--color-surface-1)] text-center">
      <div className="text-3xl font-bold tabular-nums">{value.toLocaleString()}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

export function ChatUsageTab({ stats }: Props) {
  const { overview, by_user, by_model, recent_sessions } = stats;

  if (overview.total_user_messages === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6">
        No chat activity yet. Stats will appear once users start sending messages.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-muted-foreground mb-3">
          Aggregated across all user chat sessions. Counts cover the lifetime of the table;
          &quot;This month&quot; resets at the start of each calendar month (UTC).
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl">
          <StatCard label="User messages" value={overview.total_user_messages} />
          <StatCard label="Unique users" value={overview.unique_users} />
          <StatCard label="Sessions" value={overview.sessions} />
          <StatCard label="This month" value={overview.this_month} />
        </div>

        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1 text-[var(--color-success)]">
            <ThumbsUp className="h-3 w-3" /> {overview.thumbs_up}
          </span>
          <span className="flex items-center gap-1 text-[var(--color-danger)]">
            <ThumbsDown className="h-3 w-3" /> {overview.thumbs_down}
          </span>
          <span>{overview.unrated_assistant} assistant replies unrated</span>
        </div>
      </div>

      {by_model.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-2">By model</h3>
          <div className="overflow-x-auto rounded-lg border border-[var(--color-border)] max-w-md">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-surface-1)] text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Model</th>
                  <th className="px-3 py-2 font-medium text-right">Assistant replies</th>
                </tr>
              </thead>
              <tbody>
                {by_model.map((m) => (
                  <tr key={m.model} className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]">
                    <td className="px-3 py-2 font-mono text-xs">{m.model}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{m.count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-medium mb-2">Top users (last activity)</h3>
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface-1)] text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">User</th>
                <th className="px-3 py-2 font-medium text-right">Messages</th>
                <th className="px-3 py-2 font-medium text-right">Last activity</th>
              </tr>
            </thead>
            <tbody>
              {by_user.map((u) => (
                <tr key={u.user_id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]">
                  <td className="px-3 py-2">
                    <div className="font-medium">{u.name ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{u.email ?? u.user_id}</div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{u.message_count.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-xs text-muted-foreground">{formatRelative(u.last_message_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-2">Recent sessions</h3>
        <p className="text-xs text-muted-foreground mb-2">
          Latest 30 sessions with a non-empty session id. Pre-v11 messages (no session id) are
          excluded here but counted in the overview totals.
        </p>
        <div className="overflow-x-auto rounded-lg border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-surface-1)] text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">User</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium text-right">Messages</th>
                <th className="px-3 py-2 font-medium text-right">Started</th>
                <th className="px-3 py-2 font-medium text-right">Last activity</th>
              </tr>
            </thead>
            <tbody>
              {recent_sessions.map((s) => (
                <tr key={s.session_id} className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface-hover)]">
                  <td className="px-3 py-2 text-xs">{s.user_email ?? s.user_id}</td>
                  <td className="px-3 py-2 text-xs capitalize">{s.session_type}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{s.message_count}</td>
                  <td className="px-3 py-2 text-right text-xs text-muted-foreground">{formatRelative(s.started_at)}</td>
                  <td className="px-3 py-2 text-right text-xs text-muted-foreground">{formatRelative(s.last_activity_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
