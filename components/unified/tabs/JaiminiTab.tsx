"use client";

const KARAKA_ORDER = [
  "Atmakaraka", "Amatyakaraka", "Bhratrikaraka", "Matrikaraka",
  "Putrakaraka", "Gnatikaraka", "Darakaraka",
];

const th = "text-left py-1.5 px-2 text-xs font-medium text-muted-foreground uppercase tracking-wide";
const td = "py-1.5 px-2 text-xs text-[var(--color-ink-2)]";

type KarakaEntry = { planet?: string; description?: string };
type ArudhaPada  = { name?: string; sign?: string };

export function JaiminiTab({ chartOutput }: { chartOutput: Record<string, unknown> }) {
  const data = chartOutput?.data as Record<string, unknown> | undefined;

  const jaiminiKarakas = data?.jaimini_karakas as Record<string, KarakaEntry> | undefined;
  const karakamsha     = data?.karakamsha as {
    atmakaraka?: string; karakamsha_sign?: string; ishta_devata?: string;
    planets_in_karakamsha?: string[];
  } | undefined;
  const arudhaPadas    = data?.arudha_padas as Record<string, ArudhaPada> | undefined;
  const upapada        = data?.upapada as {
    sign?: string; lord?: string; second_from_ul?: string; description?: string;
  } | undefined;

  return (
    <div className="space-y-6">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
        Jaimini — Soul Indicators
      </h3>

      {/* Chara Karakas */}
      {jaiminiKarakas && (
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                {["Karaka", "Planet", "Description"].map(h => (
                  <th key={h} className={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {KARAKA_ORDER.map(k => {
                const entry = jaiminiKarakas[k];
                if (!entry) return null;
                return (
                  <tr key={k} className="border-b border-[var(--color-border)]/40">
                    <td className="py-1.5 px-2 text-xs font-semibold text-[var(--color-ink-2)]">{k}</td>
                    <td className={`${td} text-sky-300 font-semibold`}>{entry.planet}</td>
                    <td className={`${td} text-muted-foreground`}>{entry.description ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Karakamsha */}
      {karakamsha && (
        <div className="p-4 rounded-xl border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5">
          <p className="text-xs uppercase tracking-wider text-[var(--color-accent-dim)] font-bold mb-2">
            Karakamsha — Soul&apos;s Direction
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Atmakaraka</p>
              <p className="font-semibold text-[var(--color-ink-1)]">{karakamsha.atmakaraka}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Karakamsha sign</p>
              <p className="font-semibold text-[var(--color-ink-1)]">{karakamsha.karakamsha_sign}</p>
            </div>
            {karakamsha.ishta_devata && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground">Ishta Devata</p>
                <p className="font-semibold text-amber-300 text-base">{karakamsha.ishta_devata}</p>
              </div>
            )}
            {karakamsha.planets_in_karakamsha && karakamsha.planets_in_karakamsha.length > 0 && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground mb-1">Planets in Karakamsha</p>
                <div className="flex gap-1 flex-wrap">
                  {karakamsha.planets_in_karakamsha.map(p => (
                    <span key={p} className="px-1.5 py-0.5 rounded bg-[var(--color-surface-2)] text-xs font-medium text-[var(--color-ink-2)]">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Arudha Padas */}
      {arudhaPadas && (
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-2">Arudha Padas</p>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
            {Object.entries(arudhaPadas).map(([num, v]) => (
              <div key={num} className="p-2 rounded-lg bg-[var(--color-surface-1)] border border-[var(--color-border)] text-center">
                <p className="text-xs text-muted-foreground">{v.name ?? `A${num}`}</p>
                <p className="text-xs font-semibold text-[var(--color-ink-1)]">{v.sign}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upapada */}
      {upapada && (
        <div className="p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)]">
          <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold mb-1">
            Upapada (A12) — Spouse Indicator
          </p>
          <div className="flex gap-6 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">UL sign</p>
              <p className="font-semibold text-[var(--color-ink-1)]">{upapada.sign}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Lord</p>
              <p className="font-semibold text-sky-300">{upapada.lord}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">2nd from UL</p>
              <p className="font-semibold text-[var(--color-ink-2)]">{upapada.second_from_ul}</p>
            </div>
          </div>
          {upapada.description && (
            <p className="text-xs text-muted-foreground mt-2">{upapada.description}</p>
          )}
        </div>
      )}

      {!jaiminiKarakas && !karakamsha && !arudhaPadas && (
        <p className="text-xs text-muted-foreground italic">Jaimini data not available.</p>
      )}
    </div>
  );
}
