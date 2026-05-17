import { ChartSkeleton } from "@/components/ChartSkeleton";

/**
 * Route-level loading skeleton for the profile detail page.
 * Next.js App Router displays this automatically while the page
 * server component fetches data. Shown during navigation, not during
 * the chart data fetch (that's handled by ChartSkeleton inside the client).
 */
export default function ProfileDetailLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* PageHeader skeleton */}
      <div className="flex items-center gap-2 mb-6 animate-pulse">
        <div className="h-8 w-8 rounded-[var(--radius-sm)] bg-[var(--color-surface-hover)]" />
        <div className="h-6 w-48 rounded-full bg-[var(--color-surface-hover)]" />
      </div>

      {/* Profile header card skeleton */}
      <div className="mb-8 flex items-start gap-4 p-5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-1)] animate-pulse">
        <div className="shrink-0 h-16 w-16 rounded-full bg-[var(--color-surface-hover)]" />
        <div className="flex-1 space-y-3 pt-1">
          <div className="h-5 w-1/3 rounded-full bg-[var(--color-surface-hover)]" />
          <div className="flex gap-2">
            <div className="h-5 w-16 rounded-full bg-[var(--color-surface-hover)]" />
            <div className="h-5 w-20 rounded-full bg-[var(--color-surface-hover)]" />
          </div>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div className="h-12 rounded-[var(--radius-md)] bg-[var(--color-surface-hover)]" />
            <div className="h-12 rounded-[var(--radius-md)] bg-[var(--color-surface-hover)]" />
          </div>
        </div>
      </div>

      <ChartSkeleton />
    </div>
  );
}
