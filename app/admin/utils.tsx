"use client";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

/** String-key sort for admin tables. Stable under repeated calls. */
export function sortBy<T extends Record<string, unknown>>(arr: T[], col: string, dir: "asc" | "desc"): T[] {
  return [...arr].sort((a, b) => {
    const aVal = String(a[col as keyof T] ?? "");
    const bVal = String(b[col as keyof T] ?? "");
    const cmp = aVal.localeCompare(bVal);
    return dir === "asc" ? cmp : -cmp;
  });
}

/** Renders the up/down/neutral chevron next to a sortable column header. */
export function renderSortIcon(currentCol: string, sortCol: string, sortDir: string) {
  if (sortCol !== currentCol) return <ChevronsUpDown className="ml-1 h-3 w-3 inline opacity-30" />;
  return sortDir === "asc"
    ? <ChevronUp className="ml-1 h-3 w-3 inline" />
    : <ChevronDown className="ml-1 h-3 w-3 inline" />;
}

/** Resolve a JSON-encoded list of profile IDs to `{id, name}` objects. */
export function resolveProfileIds(
  profileIdsJson: string,
  profileNameMap: Map<string, string>,
): Array<{ id: string; name: string }> {
  try {
    const ids: string[] = JSON.parse(profileIdsJson);
    return ids.map((id) => ({ id, name: profileNameMap.get(id) ?? "Deleted" }));
  } catch {
    return [];
  }
}
