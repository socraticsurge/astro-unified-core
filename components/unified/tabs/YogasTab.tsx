"use client";

const MAJOR_YOGAS = new Set([
  "Malavya Yoga", "Shasha Yoga", "Bhadra Yoga", "Hamsa Yoga", "Ruchaka Yoga",
  "Gajakesari Yoga", "Raj Yoga", "Lakshmi Yoga", "Adhi Yoga",
]);

type Yoga        = { name: string; formed_by?: string[]; description?: string };
type GrahaYuddha = { winner?: string; loser?: string; description?: string };
type Gandanta    = { planet?: string; sign?: string; degree?: number; nakshatra?: string; description?: string };

export function YogasTab({ chartOutput }: { chartOutput: Record<string, unknown> }) {
  const data = chartOutput?.data as Record<string, unknown> | undefined;

  const yogas       = (data?.yogas       as Yoga[]        | undefined) ?? [];
  const kaalSarpa   = data?.kaal_sarpa   as { type?: string; direction?: string; description?: string } | undefined;
  const grahaYuddha = (data?.graha_yuddha as GrahaYuddha[] | undefined) ?? [];
  const gandanta    = (data?.gandanta    as Gandanta[]     | undefined) ?? [];

  return (
    <div className="space-y-8">

      {/* Yogas */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
          Yogas ({yogas.length})
        </h3>
        {yogas.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No yoga data available.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {yogas.map((y, i) => (
              <div
                key={`${y.name}-${i}`}
                className={`p-3 rounded-lg border ${
                  MAJOR_YOGAS.has(y.name)
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "border-[var(--color-border)] bg-[var(--color-surface-1)]"
                }`}
              >
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`font-semibold text-sm ${MAJOR_YOGAS.has(y.name) ? "text-amber-300" : "text-[var(--color-ink-1)]"}`}>
                    {y.name}
                    {MAJOR_YOGAS.has(y.name) && (
                      <span className="ml-1.5 text-xs bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full uppercase font-bold tracking-wide">
                        Major
                      </span>
                    )}
                  </span>
                  <div className="flex gap-1 flex-wrap">
                    {y.formed_by?.map(p => (
                      <span key={p} className="px-1.5 py-0.5 rounded bg-[var(--color-surface-2)] text-xs text-[var(--color-ink-3)] font-medium">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
                {y.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed">{y.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Doshas */}
      <section>
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Doshas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className={`p-3 rounded-lg border ${kaalSarpa ? "border-red-500/40 bg-red-500/5" : "border-[var(--color-border)] bg-[var(--color-surface-1)]"}`}>
            <p className="font-semibold text-sm text-[var(--color-ink-1)]">Kaal Sarpa</p>
            {kaalSarpa ? (
              <>
                <p className="text-xs text-red-300 mt-0.5">{kaalSarpa.type} · {kaalSarpa.direction}</p>
                {kaalSarpa.description && (
                  <p className="text-xs text-muted-foreground mt-1">{kaalSarpa.description}</p>
                )}
              </>
            ) : (
              <p className="text-xs text-emerald-400 mt-0.5">Not detected</p>
            )}
          </div>

          {grahaYuddha.length > 0 && (
            <div className="p-3 rounded-lg border border-orange-500/30 bg-orange-500/5">
              <p className="font-semibold text-sm text-[var(--color-ink-1)] mb-2">
                Graha Yuddha — Planetary Wars ({grahaYuddha.length})
              </p>
              {grahaYuddha.map((gw, i) => (
                <div key={i} className="text-xs text-muted-foreground mb-1">
                  <span className="text-orange-300 font-semibold">{gw.winner}</span>
                  <span className="mx-1">defeats</span>
                  <span className="text-red-400">{gw.loser}</span>
                  {gw.description && (
                    <span className="ml-2 text-muted-foreground/60">({gw.description})</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {gandanta.length > 0 && (
            <div className="p-3 rounded-lg border border-purple-500/30 bg-purple-500/5">
              <p className="font-semibold text-sm text-[var(--color-ink-1)] mb-2">
                Gandanta — Karmic Junctions ({gandanta.length})
              </p>
              {gandanta.map((g, i) => (
                <p key={i} className="text-xs text-muted-foreground">
                  <span className="text-purple-300 font-semibold">{g.planet}</span>
                  {" "}{g.sign} {g.degree?.toFixed(2)}° · {g.nakshatra}
                  {g.description && (
                    <span className="ml-2 text-muted-foreground/60">({g.description})</span>
                  )}
                </p>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
