/**
 * Skeleton placeholder for the Dashaflow chart sections.
 * Shown while chart data is being fetched from the sidecar.
 * Mirrors the visual weight of actual chart sections so the
 * layout doesn't jump when content arrives.
 */
export function ChartSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Loading chart…">
      {/* Toolbar placeholder */}
      <div className="flex items-center justify-between py-3 border-b border-[var(--color-border)]">
        <div className="h-3 w-32 rounded-full bg-[var(--color-surface-hover)]" />
        <div className="flex gap-2">
          <div className="h-7 w-16 rounded-[var(--radius-sm)] bg-[var(--color-surface-hover)]" />
          <div className="h-7 w-16 rounded-[var(--radius-sm)] bg-[var(--color-surface-hover)]" />
        </div>
      </div>

      {/* Hint strip placeholder */}
      <div className="h-9 rounded-[var(--radius-md)] bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)]" />

      {/* Chart section blocks — mirrors the Dashaflow section card structure */}
      {[80, 60, 100, 75, 90, 65].map((width, i) => (
        <div
          key={i}
          className="p-5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-1)] space-y-3"
        >
          {/* Section header */}
          <div className="flex items-center justify-between">
            <div className="h-4 rounded-full bg-[var(--color-surface-hover)]" style={{ width: `${width * 0.4}%` }} />
            <div className="h-6 w-6 rounded-full bg-[var(--color-surface-hover)]" />
          </div>
          {/* Content rows */}
          <div className="h-3 rounded-full bg-[var(--color-surface-hover)]" style={{ width: `${width}%` }} />
          <div className="h-3 rounded-full bg-[var(--color-surface-hover)]" style={{ width: `${width * 0.75}%` }} />
          {i % 2 === 0 && (
            <div className="h-3 rounded-full bg-[var(--color-surface-hover)]" style={{ width: `${width * 0.55}%` }} />
          )}
        </div>
      ))}
    </div>
  );
}
