"use client";
import Link from "next/link";
import type { Profile } from "@/lib/db";
import { NatalChartGrid } from "@/components/unified/NatalChartGrid";
import type { Planet, SignName } from "@/components/unified/types";

interface ProfileSidebarProps {
  profile: Profile;
  chartOutput: Record<string, unknown> | null;
}

export function ProfileSidebar({ profile, chartOutput }: ProfileSidebarProps) {
  const data     = chartOutput?.data as Record<string, unknown> | undefined;
  const panchang = data?.panchang as {
    tithi?:     { name?: string; paksha?: string };
    vara?:      { name?: string; lord?: string };
    nakshatra?: { name?: string; pada?: number };
    yoga?:      { name?: string };
    karana?:    string;
  } | undefined;
  const lagna   = data?.lagna   as Record<string, unknown> | undefined;
  const planets = data?.planets as Record<string, Planet>  | undefined;

  const lagnaSign   = lagna?.sign    as SignName | undefined;
  const lagnaD9Sign = lagna?.d9_sign as SignName | undefined;

  const panchangRows = panchang
    ? [
        { label: "Tithi",     value: `${panchang.tithi?.name ?? ""}${panchang.tithi?.paksha ? ` · ${panchang.tithi.paksha}` : ""}` },
        { label: "Vara",      value: panchang.vara?.name ?? "" },
        { label: "Nakshatra", value: `${panchang.nakshatra?.name ?? ""} P${panchang.nakshatra?.pada ?? ""}` },
        { label: "Yoga",      value: panchang.yoga?.name ?? "" },
        { label: "Karana",    value: panchang.karana ?? "" },
      ]
    : [];

  return (
    <aside className="w-80 flex-shrink-0 border-r border-[var(--color-border)] overflow-y-auto hidden md:flex flex-col">
      <div className="p-4 space-y-5">

        {/* Name + edit */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-[var(--color-ink-1)] leading-tight">
              {profile.name}
            </h2>
            {profile.relationship && (
              <p className="text-xs text-muted-foreground mt-0.5">{profile.relationship}</p>
            )}
          </div>
          <Link
            href={`/profiles/${profile.id}/edit`}
            className="shrink-0 text-xs text-muted-foreground hover:text-[var(--color-ink-1)] transition-colors"
          >
            Edit
          </Link>
        </div>

        {/* Birth info */}
        <div className="space-y-1 text-xs">
          <div className="flex gap-2">
            <span className="text-muted-foreground w-10 shrink-0">Date</span>
            <span className="text-[var(--color-ink-2)]">{profile.date_of_birth}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-muted-foreground w-10 shrink-0">Time</span>
            <span className="text-[var(--color-ink-2)]">{profile.time_of_birth}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-muted-foreground w-10 shrink-0">Place</span>
            <span className="text-[var(--color-ink-2)] leading-tight">{profile.place_of_birth}</span>
          </div>
        </div>

        {/* Panchang at birth */}
        {panchangRows.length > 0 && (
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Panchang at Birth
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {panchangRows.map(({ label, value }) => (
                <div
                  key={label}
                  className="px-2 py-1.5 rounded bg-[var(--color-surface-1)] border border-[var(--color-border)]"
                >
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground leading-none mb-0.5">
                    {label}
                  </p>
                  <p className="text-[11px] font-medium text-[var(--color-ink-1)] leading-tight">
                    {value || "—"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* D1 + D9 charts side by side */}
        {planets && (
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Birth Charts
            </p>
            <div className="grid grid-cols-2 gap-2">
              <NatalChartGrid
                planets={planets}
                lagnaSign={lagnaSign}
                signKey="sign"
                label="D1"
              />
              <NatalChartGrid
                planets={planets}
                lagnaSign={lagnaD9Sign}
                signKey="d9_sign"
                label="D9"
              />
            </div>
          </div>
        )}

      </div>
    </aside>
  );
}
