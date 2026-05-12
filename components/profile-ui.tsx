/**
 * Shared profile UI primitives.
 *
 * These small components are used by both the Dashboard card grid
 * and the Chart Detail page header. Keeping them here means badge
 * colours, missing-info link text and birth-detail row layout are
 * defined once and both views stay in sync automatically.
 */
import Link from "next/link";

type BadgeProps = { profileId: string };

/** Amber pill for Relationship, or a red "Add" link when absent. */
export function RelationshipBadge({ value, profileId }: { value?: string | null } & BadgeProps) {
  if (value) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-900/40 px-2.5 py-0.5 text-[10px] font-medium text-amber-300 ring-1 ring-inset ring-amber-800/50">
        {value}
      </span>
    );
  }
  return (
    <Link
      href={`/profiles/${profileId}/edit`}
      className="inline-flex items-center rounded-full bg-red-950/30 px-2.5 py-0.5 text-[10px] font-medium text-red-400 ring-1 ring-inset ring-red-900/50 hover:bg-red-900/40 transition-colors"
    >
      + Add Relationship
    </Link>
  );
}

/** Blue pill for Gender, or a red "Add" link when absent. */
export function GenderBadge({ value, profileId }: { value?: string | null } & BadgeProps) {
  if (value) {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-900/30 px-2.5 py-0.5 text-[10px] font-medium text-blue-300 ring-1 ring-inset ring-blue-800/40">
        {value}
      </span>
    );
  }
  return (
    <Link
      href={`/profiles/${profileId}/edit`}
      className="inline-flex items-center rounded-full bg-red-950/30 px-2.5 py-0.5 text-[10px] font-medium text-red-400 ring-1 ring-inset ring-red-900/50 hover:bg-red-900/40 transition-colors"
    >
      + Add Gender
    </Link>
  );
}

/** Violet pill for Current Location, or a red "Add" link when absent. */
export function CurrentLocationBadge({ value, profileId }: { value?: string | null } & BadgeProps) {
  if (value) {
    return (
      <span className="inline-flex items-center rounded-full bg-violet-900/30 px-2.5 py-0.5 text-[10px] font-medium text-violet-300 ring-1 ring-inset ring-violet-800/40">
        📍 {value}
      </span>
    );
  }
  return (
    <Link
      href={`/profiles/${profileId}/edit`}
      className="inline-flex items-center rounded-full bg-red-950/30 px-2.5 py-0.5 text-[10px] font-medium text-red-400 ring-1 ring-inset ring-red-900/50 hover:bg-red-900/40 transition-colors"
    >
      + Add Current Location
    </Link>
  );
}

type BirthDetailsProps = {
  date_of_birth: string;
  time_of_birth: string;
  place_of_birth: string;
  timezone: string;
  timezone_offset: number;
};

/**
 * Labeled birth details rows with emoji icons.
 * Used in both the Dashboard card body and the Chart Detail header.
 */
export function BirthDetails({ date_of_birth, time_of_birth, place_of_birth, timezone, timezone_offset }: BirthDetailsProps) {
  const offsetStr = `UTC${timezone_offset >= 0 ? "+" : ""}${timezone_offset}`;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="text-base">📅</span>
        <span className="font-medium text-foreground/80">{date_of_birth}</span>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="text-base">⏰</span>
        <span className="font-medium text-foreground/80">{time_of_birth}</span>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground sm:col-span-2">
        <span className="text-base">🐣</span>
        <span className="font-medium text-foreground/80">{place_of_birth}</span>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground sm:col-span-2">
        <span className="text-base">🌐</span>
        <span className="font-medium text-foreground/80 text-xs">{timezone} ({offsetStr})</span>
      </div>
    </div>
  );
}

type CurrentLocationDetailsProps = {
  location: string;
  timezone: string;
  timezone_offset: number;
};

/**
 * Labeled current location details row.
 */
export function CurrentLocationDetails({ location, timezone, timezone_offset }: CurrentLocationDetailsProps) {
  const offsetStr = `UTC${timezone_offset >= 0 ? "+" : ""}${timezone_offset}`;
  return (
    <div className="mt-1.5 pt-1.5 border-t border-white/5 space-y-1.5 text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="text-base">🏠</span>
        <span className="font-medium text-foreground/80">Lives in {location}</span>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="text-base">🕒</span>
        <span className="font-medium text-foreground/80 text-xs">{timezone} ({offsetStr})</span>
      </div>
    </div>
  );
}
