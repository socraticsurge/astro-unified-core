"use client";
import { Section } from "@/components/Section";

type KeyFigures = {
  hearth_desire_number?: number;
  personality_number?: number;
  destiny_number?: number;
  expression_number?: number;
  active_number?: number;
  legacy_number?: number;
  full_name_numbers?: Record<string, number>;
  full_name_missing_numbers?: number[];
  birthdate?: string;
  life_path_number?: number;
  life_path_number_alternative?: number;
  birthdate_day_num?: number;
  birthdate_month_num?: number;
  birthdate_year_num?: number;
  power_number?: number;
};
type Interpretation = {
  name?: string;
  number?: string | number;
  meaning?: { title?: string; description?: string };
};
type Interpretations = {
  life_path_number?: Interpretation | null;
  destiny_number?: Interpretation | null;
};
type System = {
  key_figures?: KeyFigures;
  interpretations?: Interpretations;
};
type Data = {
  name?: { first_name?: string; last_name?: string; full_name?: string };
  birthdate?: string;
  pythagorean?: System;
  chaldean?: System;
};

type Props = { output: Record<string, unknown> };

export function NumerologyView({ output }: Props) {
  const data = output.data as Data | undefined;
  if (!data)
    return (
      <p className="text-muted-foreground text-sm p-4">
        {output.error ? String(output.error) : "No data"}
      </p>
    );

  const py = data.pythagorean;
  const ch = data.chaldean;
  const accent = "text-emerald-400";
  const card = "bg-emerald-950/20 border border-emerald-800/30 rounded-lg p-3";
  const th = "text-left py-1.5 pr-3 font-medium text-xs text-muted-foreground";
  const row = "border-b border-white/10 hover:bg-white/5";

  const pyKf = py?.key_figures;
  const pyInterp = py?.interpretations;
  const chKf = ch?.key_figures;

  const lifePathMeaning = pyInterp?.life_path_number?.meaning;

  const coreNumbers = [
    {
      key: "life_path_number" as const,
      label: "Life Path",
      desc: "Your core purpose and the path you walk in this lifetime",
      featured: true,
    },
    {
      key: "destiny_number" as const,
      label: "Destiny",
      desc: "Your overall life mission and what you are meant to accomplish",
      featured: false,
    },
    {
      key: "expression_number" as const,
      label: "Expression",
      desc: "Your natural talents and the way you express yourself in the world",
      featured: false,
    },
    {
      key: "hearth_desire_number" as const,
      label: "Soul Urge",
      desc: "What your heart truly desires — the inner motivation behind your actions",
      featured: false,
    },
    {
      key: "personality_number" as const,
      label: "Personality",
      desc: "How you appear to others and the face you show the world",
      featured: false,
    },
    {
      key: "power_number" as const,
      label: "Power Number",
      desc: "Your combined Life Path + Expression: the power you accumulate over time",
      featured: false,
    },
  ];

  const comparisonRows = [
    { label: "Life Path", pyKey: "life_path_number" as const, chKey: "life_path_number" as const },
    { label: "Destiny", pyKey: "destiny_number" as const, chKey: "destiny_number" as const },
    { label: "Expression", pyKey: "expression_number" as const, chKey: "expression_number" as const },
    { label: "Soul Urge", pyKey: "hearth_desire_number" as const, chKey: "hearth_desire_number" as const },
    { label: "Personality", pyKey: "personality_number" as const, chKey: "personality_number" as const },
  ];

  return (
    <div>
      {/* Section 1: Core Numbers */}
      {pyKf && (
        <Section title="Core Numbers — Pythagorean" accent={accent}>
          {/* Featured: Life Path with interpretation */}
          {pyKf.life_path_number !== undefined && (
            <div className="mt-3 mb-4 bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-5">
              <div className="flex items-start gap-5">
                <div className="text-center min-w-[4rem]">
                  <p className="text-xs text-emerald-400/70 uppercase tracking-wide mb-1">Life Path</p>
                  <p className="text-6xl font-bold text-emerald-300 leading-none">{pyKf.life_path_number}</p>
                </div>
                <div className="flex-1">
                  {lifePathMeaning?.title && (
                    <p className="text-base font-semibold text-emerald-200 mb-1">{lifePathMeaning.title}</p>
                  )}
                  {lifePathMeaning?.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{lifePathMeaning.description}</p>
                  )}
                  {!lifePathMeaning && (
                    <p className="text-sm text-muted-foreground">Your core purpose and the path you walk in this lifetime.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Remaining core numbers in a grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {coreNumbers
              .filter(n => !n.featured && pyKf[n.key] !== undefined)
              .map(({ key, label, desc }) => (
                <div key={key} className={card}>
                  <p className="text-xs text-emerald-400/70 uppercase tracking-wide">{label}</p>
                  <p className="text-4xl font-bold text-emerald-300 mt-1 mb-1">{pyKf[key]}</p>
                  <p className="text-xs text-muted-foreground leading-snug">{desc}</p>
                </div>
              ))}
          </div>
        </Section>
      )}

      {/* Section 2: Birthdate Numbers */}
      {pyKf && (
        <Section title="Birthdate Numbers" accent={accent}>
          <div className="grid grid-cols-3 gap-3 mt-2">
            {[
              { label: "Day", value: pyKf.birthdate_day_num, desc: "Day of birth reduced" },
              { label: "Month", value: pyKf.birthdate_month_num, desc: "Month of birth reduced" },
              { label: "Year", value: pyKf.birthdate_year_num, desc: "Year of birth reduced" },
            ]
              .filter(x => x.value !== undefined)
              .map(({ label, value, desc }) => (
                <div key={label} className={card + " text-center"}>
                  <p className="text-xs text-emerald-400/70 uppercase tracking-wide">{label}</p>
                  <p className="text-4xl font-bold text-emerald-300 mt-1">{value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{desc}</p>
                </div>
              ))}
          </div>
        </Section>
      )}

      {/* Section 3: Name Number Frequencies */}
      {pyKf?.full_name_numbers && (
        <Section title="Name Number Frequencies" accent={accent} defaultOpen={false}>
          <div className="mt-3 space-y-2">
            <p className="text-xs text-muted-foreground mb-3">
              Each letter in your full name maps to a digit 1–9. The bar shows how many times each digit
              appears. Missing digits are highlighted — they represent qualities to develop.
            </p>
            {Array.from({ length: 9 }, (_, i) => i + 1).map(digit => {
              const count = pyKf.full_name_numbers?.[String(digit)] ?? 0;
              const isMissing = pyKf.full_name_missing_numbers?.includes(digit);
              const maxCount = Math.max(...Object.values(pyKf.full_name_numbers ?? {}).map(Number), 1);
              const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
              return (
                <div key={digit} className="flex items-center gap-3">
                  <span
                    className={`text-xs font-bold w-5 text-center ${
                      isMissing ? "text-orange-400" : "text-emerald-400"
                    }`}
                  >
                    {digit}
                  </span>
                  <div className="flex-1 bg-white/10 rounded-full h-3 overflow-hidden">
                    {count > 0 && (
                      <div
                        className="h-3 rounded-full bg-emerald-500"
                        style={{ width: `${pct}%` }}
                      />
                    )}
                  </div>
                  <span className="text-xs font-mono text-muted-foreground w-6 text-right">{count}</span>
                  {isMissing && (
                    <span className="text-xs text-orange-400 font-medium">missing</span>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Section 4: Chaldean Comparison */}
      {pyKf && chKf && (
        <Section title="Chaldean Comparison" accent={accent} defaultOpen={false}>
          <p className="text-xs text-muted-foreground mt-2 mb-4 leading-relaxed max-w-2xl">
            <span className="text-emerald-400 font-semibold">Pythagorean</span> uses a sequential
            A=1, B=2 ... I=9, J=1 ... mapping.{" "}
            <span className="text-teal-400 font-semibold">Chaldean</span> uses an ancient Babylonian
            system where A=1, B=2, C=3, D=4, E=5, U/V/W=6, Z=7, H/F=8 — and 9 is considered sacred,
            never assigned to a letter. Differences between the two systems can reveal additional layers
            of meaning.
          </p>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className={th}>Number</th>
                <th className={`${th} text-emerald-400`}>Pythagorean</th>
                <th className={`${th} text-teal-400`}>Chaldean</th>
                <th className={th}>Difference</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map(({ label, pyKey, chKey }) => {
                const pyVal = pyKf[pyKey];
                const chVal = chKf[chKey];
                const diff =
                  pyVal !== undefined && chVal !== undefined && pyVal !== chVal;
                return (
                  <tr key={label} className={row}>
                    <td className="py-2 pr-3 text-muted-foreground text-xs font-medium">{label}</td>
                    <td className="py-2 pr-3 font-bold text-emerald-300">
                      {pyVal ?? "—"}
                    </td>
                    <td className="py-2 pr-3 font-bold text-teal-300">
                      {chVal ?? "—"}
                    </td>
                    <td className="py-2 text-xs">
                      {diff ? (
                        <span className="text-orange-400 font-medium">differs</span>
                      ) : (
                        <span className="text-emerald-600">same</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Section>
      )}
    </div>
  );
}
