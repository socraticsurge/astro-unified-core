"use client";

export function IdentityStrip({
  chartOutput,
  transitOutput,
}: {
  chartOutput: Record<string, unknown>;
  transitOutput: Record<string, unknown> | null;
}) {
  const data = chartOutput?.data as Record<string, unknown> | undefined;
  const lagna  = data?.lagna  as { sign?: string; degree?: number; nakshatra?: string; pada?: number } | undefined;
  const planets = data?.planets as Record<string, { sign?: string; nakshatra?: string; pada?: number }> | undefined;
  const dashas = data?.dashas  as { maha?: { planet?: string }; antar?: { planet?: string } } | undefined;
  const moon = planets?.Moon;
  const sun  = planets?.Sun;
  const maha  = dashas?.maha;
  const antar = dashas?.antar;

  const transitRaw = (transitOutput?.data ?? transitOutput) as Record<string, unknown> | null;
  const sadeSati = transitRaw?.sade_sati as { active?: boolean; phase?: string } | undefined;

  return (
    <div className="mb-5 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-1)] flex flex-wrap gap-x-6 gap-y-2 items-center text-sm">
      {lagna && (
        <div className="flex flex-col" data-testid="identity-lagna">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Lagna</span>
          <span className="font-semibold text-[var(--color-ink-1)]">
            {lagna.sign}
            <span className="text-muted-foreground font-normal text-xs ml-1">
              {lagna.degree?.toFixed(1)}° · {lagna.nakshatra} P{lagna.pada}
            </span>
          </span>
        </div>
      )}

      {moon && (
        <div className="flex flex-col" data-testid="identity-moon">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Moon</span>
          <span className="font-semibold text-planet-name">
            {moon.sign}
            <span className="text-muted-foreground font-normal text-xs ml-1">
              {moon.nakshatra} P{moon.pada}
            </span>
          </span>
        </div>
      )}

      {sun && (
        <div className="flex flex-col" data-testid="identity-sun">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Sun</span>
          <span className="font-semibold text-[var(--color-accent)]">{sun.sign}</span>
        </div>
      )}

      {(maha || antar) && (
        <div className="flex flex-col" data-testid="identity-dasha">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Current Dasha</span>
          <span className="font-semibold text-[var(--color-ink-2)]">
            {maha?.planet}
            {antar && (
              <span className="text-muted-foreground font-normal"> → {antar.planet}</span>
            )}
          </span>
        </div>
      )}

      {sadeSati?.active && (
        <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning/15 border border-warning/30 text-warning text-xs font-semibold" data-testid="identity-sadesati">
          <span className="h-1.5 w-1.5 rounded-full bg-warning animate-pulse" />
          Sade Sati · {sadeSati.phase}
        </div>
      )}
    </div>
  );
}
