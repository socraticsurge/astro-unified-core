"use client";

import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  Loader2,
  MapPin,
  MessageCircle,
  Moon,
  ShieldCheck,
  Sparkles,
  Users,
  Waypoints,
} from "lucide-react";

import type { Profile } from "@/lib/db";
import { addLocalDays, toLocalIsoDate } from "@/lib/local-date";
import toolStyles from "@/components/profiles/ToolPage.module.css";
import styles from "./TarabalamView.module.css";

type SectionExplainer = {
  title: string;
  gist?: string | null;
  bodyHtml: string;
  sources?: { text: string; chapter?: number | string; sloka?: number | string }[];
};

type ChandraMode = "stars" | "puja_ok" | "strict";
type ChandraVerdict = "good" | "puja" | "bad";

type ProfileTara = {
  number: number;
  name: string;
  auspicious: boolean;
  chandra?: {
    position: number;
    verdict: ChandraVerdict;
  };
};

type TaraRow = {
  date: string;
  vaaram: string;
  nakshatra: string;
  nakshatraUntil: string;
  tithi: string;
  profileTaras: Record<string, ProfileTara | undefined>;
  goodForAll: boolean;
};

type TarabalamResult = {
  profiles: Array<{
    id: string;
    name: string;
    birthNakshatra: string | null;
  }>;
  rows: TaraRow[];
  city: string;
  mode: ChandraMode;
  taraConvention: string;
  chandraConvention: string;
  evidence: {
    evaluated_factors: string[];
    not_evaluated: string[];
  };
  warnings: string[];
};

type ServiceResult = {
  profile_labels: Array<{ label: string; id: string; name: string }>;
  data: {
    janma_nakshatras: string[];
    city: string;
    tara_convention: string;
    chandra_convention: string;
    days: Array<{
      date: string;
      vaaram: string;
      nakshatra: string;
      nakshatra_until: string;
      tithi: string;
      taras: Array<{
        tara: number;
        name: string;
        auspicious: boolean;
        chandra?: {
          position: number;
          verdict: ChandraVerdict;
        };
      }>;
      good_for_all: boolean;
    }>;
  };
  evidence: {
    evaluated_factors: string[];
    not_evaluated: string[];
  };
  warnings: string[];
};

type Props = {
  profileId: string;
  profiles: Profile[];
  explainer?: SectionExplainer | null;
};

const TARA_CYCLE = [
  { number: 1, name: "Janma", supportive: false },
  { number: 2, name: "Sampat", supportive: true },
  { number: 3, name: "Vipat", supportive: false },
  { number: 4, name: "Kshema", supportive: true },
  { number: 5, name: "Pratyak", supportive: false },
  { number: 6, name: "Sadhana", supportive: true },
  { number: 7, name: "Naidhana", supportive: false },
  { number: 8, name: "Mitra", supportive: true },
  { number: 9, name: "Parama Mitra", supportive: true },
] as const;

const CHANDRA_MODES: Array<{
  value: ChandraMode;
  title: string;
  description: string;
}> = [
  {
    value: "stars",
    title: "Classic Tarabalam",
    description: "Shortlist by the birth-star relationship. Moon-house strength is still shown.",
  },
  {
    value: "puja_ok",
    title: "Exclude Moon cautions",
    description: "Require supportive Tara and remove Chandrabalam avoid positions.",
  },
  {
    value: "strict",
    title: "Strict Moon support",
    description: "Require both supportive Tara and strong Chandrabalam for everyone.",
  },
];

const EVIDENCE_LABELS: Record<string, string> = {
  tarabalam: "Tarabalam",
  chandrabalam: "Chandrabalam",
  natal_chart: "Complete natal-chart judgment",
  dasha: "Dasha context",
  activity_specific_muhurta: "Activity-specific Muhurtam",
};

function todayIso() {
  return toLocalIsoDate(new Date());
}

function addDaysToIso(iso: string, offset: number) {
  const [year, month, day] = iso.split("-").map(Number);
  const anchor = new Date(year, month - 1, day, 12);
  return toLocalIsoDate(addLocalDays(anchor, offset));
}

function formatDateParts(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return {
    day: new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      timeZone: "UTC",
    }).format(date),
    month: new Intl.DateTimeFormat("en-GB", {
      month: "short",
      timeZone: "UTC",
    }).format(date),
    weekday: new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      timeZone: "UTC",
    }).format(date),
    long: new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      weekday: "short",
      timeZone: "UTC",
    }).format(date),
  };
}

function chandraLabel(verdict: ChandraVerdict) {
  if (verdict === "good") return "Supportive Moon";
  if (verdict === "puja") return "Workable with remedy";
  return "Moon caution";
}

function modeLabel(mode: ChandraMode) {
  return CHANDRA_MODES.find((item) => item.value === mode)?.title ?? "Classic Tarabalam";
}

function evidenceLabels(items: string[]) {
  return items.map((item) => EVIDENCE_LABELS[item] ?? item.replaceAll("_", " "));
}

export function TarabalamView({ profileId, profiles }: Props) {
  const activeProfile = profiles.find((profile) => profile.id === profileId);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set([profileId]),
  );
  const [startDate, setStartDate] = useState(todayIso);
  const [endDate, setEndDate] = useState(() => addDaysToIso(todayIso(), 13));
  const [chandraMode, setChandraMode] = useState<ChandraMode>("stars");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TarabalamResult | null>(null);
  const [showAllDays, setShowAllDays] = useState(false);

  const rangeDays = Math.floor(
    (Date.parse(`${endDate}T12:00:00Z`) - Date.parse(`${startDate}T12:00:00Z`))
      / 86_400_000,
  ) + 1;
  const rangeValid = Number.isFinite(rangeDays) && rangeDays >= 1 && rangeDays <= 90;
  const selectedProfileIds = [
    profileId,
    ...profiles
      .filter((profile) => profile.id !== profileId && selectedIds.has(profile.id))
      .map((profile) => profile.id),
  ];
  const supportiveRows = result?.rows.filter((row) => row.goodForAll) ?? [];
  const displayWarnings = result?.warnings.filter(
    (warning) => !warning.toLowerCase().includes("canonical lahiri tool path"),
  ) ?? [];
  const visibleRows = result
    ? showAllDays
      ? result.rows
      : result.rows.slice(0, 14)
    : [];

  function clearResult() {
    setResult(null);
    setError(null);
    setShowAllDays(false);
  }

  function toggleProfile(id: string) {
    if (id === profileId) return;
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 4) {
        next.add(id);
      }
      return next;
    });
    clearResult();
  }

  function chooseRange(days: number) {
    setEndDate(addDaysToIso(startDate, days - 1));
    clearResult();
  }

  async function handleSearch() {
    if (!rangeValid) {
      setError("Choose an inclusive date range from 1 to 90 days.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/readings/tarabalam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_ids: selectedProfileIds,
          start_date: startDate,
          end_date: endDate,
          chandra_mode: chandraMode,
        }),
      });
      const data = await response.json() as ServiceResult & { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "The Tarabalam calculation failed.");
      }

      const profilesByLabel = new Map(
        data.profile_labels.map((profile) => [profile.label, profile]),
      );
      setResult({
        profiles: data.profile_labels.map((profile, index) => ({
          id: profile.id,
          name: profile.name,
          birthNakshatra: data.data.janma_nakshatras[index] ?? null,
        })),
        rows: data.data.days.map((day) => ({
          date: day.date,
          vaaram: day.vaaram,
          nakshatra: day.nakshatra,
          nakshatraUntil: day.nakshatra_until,
          tithi: day.tithi,
          goodForAll: day.good_for_all,
          profileTaras: Object.fromEntries(
            day.taras.map((tara, index) => {
              const profile = profilesByLabel.get(`p${index + 1}`);
              return [
                profile?.id ?? `p${index + 1}`,
                {
                  number: tara.tara,
                  name: tara.name,
                  auspicious: tara.auspicious,
                  chandra: tara.chandra,
                } satisfies ProfileTara,
              ];
            }),
          ),
        })),
        city: data.data.city,
        mode: chandraMode,
        taraConvention: data.data.tara_convention,
        chandraConvention: data.data.chandra_convention,
        evidence: data.evidence,
        warnings: data.warnings,
      });
      setShowAllDays(false);
    } catch (searchError) {
      setError(
        searchError instanceof Error
          ? searchError.message
          : "The Tarabalam calculation failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  function shareOnWhatsApp() {
    if (!result) return;
    const dates = supportiveRows
      .slice(0, 8)
      .map((row) => formatDateParts(row.date).long)
      .join(", ");
    const names = result.profiles.map((profile) => profile.name).join(", ");
    const message = [
      `Tarabalam shortlist for ${names}`,
      `${modeLabel(result.mode)} · ${result.city}`,
      dates
        ? `Supportive dates: ${dates}${supportiveRows.length > 8 ? ` and ${supportiveRows.length - 8} more` : ""}`
        : "No date in this period supported every selected profile under this filter.",
      "Use Muhurtam next to choose a precise time and apply activity-specific rules.",
    ].join("\n\n");
    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <div className={toolStyles.root}>
      <section className={toolStyles.leadCard}>
        <div className={toolStyles.leadContent}>
          <span className={toolStyles.leadIcon}>
            <Waypoints size={19} aria-hidden="true" />
          </span>
          <div>
            <p className={toolStyles.leadEyebrow}>Personal day suitability</p>
            <h2 className={toolStyles.leadTitle}>
              Find the days that support everyone involved.
            </h2>
            <p className={toolStyles.leadText}>
              Compare each day&apos;s Moon star with up to four saved birth
              stars. Shortlist the days first; use Muhurtam next to choose the
              precise time and apply activity-specific rules.
            </p>
          </div>
        </div>
        <span className={styles.enginePill}>Exact Drik calculation</span>
      </section>

      <section className={styles.cycle} aria-labelledby="tara-cycle-title">
        <div className={styles.cycleHeading}>
          <div>
            <p className={toolStyles.leadEyebrow}>How Tarabalam works</p>
            <h3 id="tara-cycle-title">
              Nine repeating relationships connect a birth star to the daily Moon.
            </h3>
          </div>
          <p>
            Support and caution are always written explicitly; colour is only a
            secondary signal.
          </p>
        </div>
        <ol className={styles.cycleTrack}>
          {TARA_CYCLE.map((tara) => (
            <li
              key={tara.number}
              className={tara.supportive ? styles.supportive : styles.caution}
            >
              <span>{tara.number}</span>
              <strong>{tara.name}</strong>
              <small>{tara.supportive ? "Supportive" : "Caution"}</small>
            </li>
          ))}
        </ol>
      </section>

      <section className={toolStyles.section}>
        <div className={toolStyles.sectionHeader}>
          <h3 className={toolStyles.sectionTitle}>Build the comparison</h3>
          <p className={toolStyles.sectionHint}>
            The current profile anchors the place and is always included.
          </p>
        </div>

        <div className={styles.searchCard}>
          <div className={styles.locationRow}>
            <span><MapPin size={16} aria-hidden="true" /></span>
            <div>
              <small>Calculation place</small>
              <strong>{activeProfile?.current_location ?? "Current location required"}</strong>
              <p>{activeProfile?.current_timezone ?? "Edit the current profile to add it"}</p>
            </div>
          </div>

          <fieldset className={styles.profileFieldset}>
            <legend>
              <Users size={14} aria-hidden="true" />
              People to support
            </legend>
            <p>Select up to four saved profiles.</p>
            <div className={styles.profileGrid}>
              {profiles.map((profile) => {
                const isCurrent = profile.id === profileId;
                const selected = selectedIds.has(profile.id);
                const selectionFull = !selected && selectedIds.size >= 4;
                return (
                  <button
                    key={profile.id}
                    type="button"
                    aria-label={
                      isCurrent
                        ? `${profile.name}, current profile, included`
                        : `${profile.name}, ${profile.relationship ?? "saved profile"}`
                    }
                    aria-pressed={selected}
                    disabled={isCurrent || selectionFull}
                    onClick={() => toggleProfile(profile.id)}
                    className={selected ? styles.profileSelected : undefined}
                  >
                    <span className={styles.profileMonogram}>
                      {profile.name.charAt(0).toUpperCase()}
                    </span>
                    <span>
                      <strong>{profile.name}</strong>
                      <small>{isCurrent ? "Current · included" : profile.relationship ?? "Saved profile"}</small>
                    </span>
                    {selected && <Check size={15} aria-hidden="true" />}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className={styles.dateSection}>
            <div className={styles.dateFields}>
              <label>
                Start date
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => {
                    setStartDate(event.target.value);
                    clearResult();
                  }}
                />
              </label>
              <label>
                End date
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => {
                    setEndDate(event.target.value);
                    clearResult();
                  }}
                />
              </label>
            </div>
            <div className={styles.quickRanges} aria-label="Quick date ranges">
              {[7, 14, 30, 90].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => chooseRange(days)}
                  aria-pressed={rangeDays === days}
                >
                  {days} days
                </button>
              ))}
            </div>
            <div className={styles.rangeStatus} data-valid={rangeValid}>
              <CalendarDays size={15} aria-hidden="true" />
              <p>
                <strong>
                  {Number.isFinite(rangeDays) && rangeDays > 0
                    ? `${rangeDays} ${rangeDays === 1 ? "day" : "days"} selected`
                    : "Check the date order"}
                </strong>
                <span>The exact engine supports 1–90 inclusive days per search.</span>
              </p>
            </div>
          </div>

          <fieldset className={styles.modeFieldset}>
            <legend>
              <Moon size={14} aria-hidden="true" />
              How should Chandrabalam affect the shortlist?
            </legend>
            <div className={styles.modeGrid}>
              {CHANDRA_MODES.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  aria-pressed={chandraMode === mode.value}
                  onClick={() => {
                    setChandraMode(mode.value);
                    clearResult();
                  }}
                  className={chandraMode === mode.value ? styles.modeSelected : undefined}
                >
                  <span>{chandraMode === mode.value ? <Check size={13} /> : <Moon size={13} />}</span>
                  <strong>{mode.title}</strong>
                  <small>{mode.description}</small>
                </button>
              ))}
            </div>
          </fieldset>

          <div className={styles.searchActions}>
            <p>
              {selectedIds.size} {selectedIds.size === 1 ? "profile" : "profiles"} ·{" "}
              {rangeValid ? `${rangeDays} days` : "invalid range"} · {modeLabel(chandraMode)}
            </p>
            <button
              type="button"
              onClick={() => void handleSearch()}
              disabled={loading || !rangeValid || !activeProfile?.current_location}
              className={toolStyles.primaryButton}
            >
              {loading
                ? <Loader2 className="animate-spin" size={15} aria-hidden="true" />
                : <Sparkles size={15} aria-hidden="true" />}
              {loading ? "Calculating exact days…" : "Find supportive days"}
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className={styles.errorCard} role="alert">
          <strong>Couldn&apos;t calculate this period</strong>
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void handleSearch()}
            className={toolStyles.secondaryButton}
          >
            Try again
          </button>
        </div>
      )}

      {result && !loading && (
        <>
          <section className={styles.summaryCard}>
            <div className={styles.summaryHeading}>
              <div>
                <p className={toolStyles.leadEyebrow}>Your shortlist</p>
                <h3>
                  {supportiveRows.length > 0
                    ? `${supportiveRows.length} ${supportiveRows.length === 1 ? "day supports" : "days support"} everyone`
                    : "No day supports everyone under this filter"}
                </h3>
                <p>
                  {modeLabel(result.mode)} · {result.city} ·{" "}
                  {result.profiles.map((profile) => profile.name).join(", ")}
                </p>
              </div>
              <button
                type="button"
                onClick={shareOnWhatsApp}
                className={styles.whatsappButton}
              >
                <MessageCircle size={15} aria-hidden="true" />
                Share shortlist
              </button>
            </div>

            <div className={styles.metricGrid}>
              <div>
                <small>Supportive for all</small>
                <strong>{supportiveRows.length}</strong>
                <span>of {result.rows.length} days</span>
              </div>
              <div>
                <small>Profiles compared</small>
                <strong>{result.profiles.length}</strong>
                <span>Owned saved charts</span>
              </div>
              <div>
                <small>First supportive day</small>
                <strong>
                  {supportiveRows[0]
                    ? formatDateParts(supportiveRows[0].date).day
                    : "—"}
                </strong>
                <span>
                  {supportiveRows[0]
                    ? `${formatDateParts(supportiveRows[0].date).month} · ${formatDateParts(supportiveRows[0].date).weekday}`
                    : "Try another range"}
                </span>
              </div>
              <div>
                <small>Moon policy</small>
                <strong className={styles.metricText}>{modeLabel(result.mode)}</strong>
                <span>Applied to group suitability</span>
              </div>
            </div>

            {supportiveRows.length > 0 && (
              <div className={styles.dateShortlist}>
                <strong>Dates to explore next</strong>
                <div>
                  {supportiveRows.slice(0, 10).map((row) => (
                    <a key={row.date} href={`#tarabalam-${row.date}`}>
                      <Check size={12} aria-hidden="true" />
                      {formatDateParts(row.date).long}
                    </a>
                  ))}
                  {supportiveRows.length > 10 && (
                    <span>+{supportiveRows.length - 10} more below</span>
                  )}
                </div>
              </div>
            )}
          </section>

          <section className={styles.evidenceCard} aria-label="Tarabalam calculation evidence">
            <span><ShieldCheck size={18} aria-hidden="true" /></span>
            <div>
              <p className={toolStyles.leadEyebrow}>Calculation evidence</p>
              <h3>Exact daily Moon positions, private profile context.</h3>
              <dl>
                <div>
                  <dt>Checked</dt>
                  <dd>{evidenceLabels(result.evidence.evaluated_factors).join(" · ")}</dd>
                </div>
                <div>
                  <dt>Not checked here</dt>
                  <dd>{evidenceLabels(result.evidence.not_evaluated).join(" · ")}</dd>
                </div>
              </dl>
              <p>
                Profile names and birth details remain in Astro Chaganti. The
                calculation service receives only anonymous derived star and
                Moon-sign context.
              </p>
            </div>
          </section>

          {displayWarnings.length > 0 && (
            <div className={styles.warningList}>
              {displayWarnings.map((warning) => <p key={warning}>{warning}</p>)}
            </div>
          )}

          <section className={toolStyles.section}>
            <div className={styles.resultHeading}>
              <div>
                <p className={toolStyles.leadEyebrow}>Day-by-day comparison</p>
                <h3 id="tarabalam-comparison-title">Compare every day at a glance.</h3>
                <p>
                  Showing {visibleRows.length} of {result.rows.length} calculated days.
                </p>
              </div>
              <div className={styles.resultLegend}>
                <span><i data-tone="supportive" />Supports everyone</span>
                <span><i data-tone="caution" />Mixed or caution</span>
              </div>
            </div>

            <div
              className={styles.tableShell}
              role="region"
              aria-labelledby="tarabalam-comparison-title"
              tabIndex={0}
            >
              <table className={styles.comparisonTable}>
                <caption>
                  Tarabalam and Chandrabalam comparison for each calculated date
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className={styles.dateColumn}>Date</th>
                    <th scope="col">Moon and Tithi</th>
                    <th scope="col">Overall</th>
                    {result.profiles.map((profile) => (
                      <th scope="col" key={profile.id} className={styles.profileColumn}>
                        <span className={styles.profileHeading}>
                          <span className={styles.personMonogram}>
                            {profile.name.charAt(0).toUpperCase()}
                          </span>
                          <span>
                            <strong>{profile.name}</strong>
                            <small>{profile.birthNakshatra ?? "Birth star unavailable"}</small>
                          </span>
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => {
                    const date = formatDateParts(row.date);
                    return (
                      <tr
                        key={row.date}
                        id={`tarabalam-${row.date}`}
                        data-good={row.goodForAll}
                      >
                        <th scope="row" className={styles.dateColumn}>
                          <span className={styles.tableDate}>
                            <strong>{date.day}</strong>
                            <span>{date.month}</span>
                            <small>{row.vaaram || date.weekday}</small>
                          </span>
                        </th>
                        <td>
                          <span className={styles.moonCell}>
                            <strong>
                              {row.nakshatra}
                              {row.nakshatraUntil ? ` until ${row.nakshatraUntil}` : ""}
                            </strong>
                            <small>{row.tithi}</small>
                          </span>
                        </td>
                        <td>
                          <span className={styles.tableVerdict} data-good={row.goodForAll}>
                            {row.goodForAll
                              ? <Check size={13} aria-hidden="true" />
                              : <Moon size={13} aria-hidden="true" />}
                            {row.goodForAll ? "Supports everyone" : "Mixed or caution"}
                          </span>
                        </td>
                        {result.profiles.map((profile) => {
                          const tara = row.profileTaras[profile.id];
                          return (
                            <td key={profile.id}>
                              {tara ? (
                                <span className={styles.profileResult}>
                                  <span
                                    className={styles.taraLine}
                                    data-supportive={tara.auspicious}
                                  >
                                    <strong>{tara.number}</strong>
                                    <span>
                                      <b>{tara.name}</b>
                                      <small>
                                        {tara.auspicious ? "Supportive Tara" : "Tara caution"}
                                      </small>
                                    </span>
                                  </span>
                                  {tara.chandra && (
                                    <span
                                      className={styles.chandraResult}
                                      data-verdict={tara.chandra.verdict}
                                    >
                                      <Moon size={12} aria-hidden="true" />
                                      House {tara.chandra.position} · {chandraLabel(tara.chandra.verdict)}
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span className={styles.unavailable}>Calculation unavailable</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {!showAllDays && result.rows.length > 14 && (
              <button
                type="button"
                onClick={() => setShowAllDays(true)}
                className={styles.showAllButton}
              >
                Show all {result.rows.length} calculated days
                <ArrowRight size={14} aria-hidden="true" />
              </button>
            )}

            <details className={styles.conventions}>
              <summary>
                Calculation conventions
                <ChevronDown size={14} aria-hidden="true" />
              </summary>
              <p>{result.taraConvention}</p>
              <p>{result.chandraConvention}</p>
            </details>
          </section>
        </>
      )}

      {!result && !loading && !error && (
        <aside className={styles.helpCard}>
          <CalendarDays size={18} aria-hidden="true" />
          <div>
            <strong>Start with a useful date range.</strong>
            <p>
              Fourteen days is a practical first scan. Longer searches are
              available when plans are flexible.
            </p>
          </div>
        </aside>
      )}
    </div>
  );
}
