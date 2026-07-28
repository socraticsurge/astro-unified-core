"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  Loader2,
  MapPin,
  MessageCircle,
  MoonStar,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import type { Profile } from "@/lib/db";
import type { MuhurtamSlot } from "@/lib/panchangam/contracts";
import {
  MUHURTAM_ACTIVITY_GROUPS,
  muhurtamActivityLabel,
} from "@/lib/panchangam/activities";
import { addLocalDays, toLocalIsoDate } from "@/lib/local-date";
import toolStyles from "@/components/profiles/ToolPage.module.css";
import styles from "./MuhurthaView.module.css";

type SectionExplainer = {
  title: string;
  gist?: string | null;
  bodyHtml: string;
  sources?: { text: string; chapter?: number | string; sloka?: number | string }[];
};

type Props = {
  profileId: string;
  profiles: Profile[];
  explainer?: SectionExplainer | null;
};

type SearchMode = "general" | "personal";

type SearchResult = {
  data: {
    slots: MuhurtamSlot[];
    dropped_days?: Array<{ date: string; reason: string }>;
    disclaimer: string;
  };
  evidence: { evaluated_factors: string[]; not_evaluated: string[] };
  warnings: string[];
  validation_mode?: SearchMode;
};

const EVIDENCE_LABELS: Record<string, string> = {
  panchangam: "Daily Panchangam",
  activity_rules: "Event-specific rules",
  avoid_windows: "Restricted periods",
  slot_quality: "Time-window quality",
  tarabalam: "Tarabalam",
  chandrabalam: "Chandrabalam",
  lagna_from_supplied_context: "Lagna context",
  full_election_chart: "Complete election chart",
  dasha: "Dasha context",
  manual_prerequisites: "Event-specific prerequisites",
};

function evidenceList(items: string[]) {
  return items.map((item) => EVIDENCE_LABELS[item] ?? item.replaceAll("_", " "));
}

function displayShortDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) return { day: iso, rest: "" };
  const date = new Date(Date.UTC(year, month - 1, day));
  return {
    day: new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      timeZone: "UTC",
    }).format(date),
    rest: new Intl.DateTimeFormat("en-GB", {
      month: "short",
      weekday: "short",
      timeZone: "UTC",
    }).format(date),
  };
}

function slotDetails(slot: MuhurtamSlot) {
  return [
    ...slot.reason_groups.slot_quality,
    ...slot.reason_groups.day_quality,
    ...slot.reason_groups.group_fit,
    ...slot.reason_groups.activity_match,
  ];
}

export function MuhurthaView({ profileId, profiles }: Props) {
  const activeProfile = profiles.find((profile) => profile.id === profileId);
  const [loadingMode, setLoadingMode] = useState<SearchMode | null>(null);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [resultMode, setResultMode] = useState<SearchMode | null>(null);
  const [lastAttemptMode, setLastAttemptMode] = useState<SearchMode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [showAllSlots, setShowAllSlots] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set([profileId]));
  const [form, setForm] = useState(() => {
    const now = new Date();
    return {
      activity: "wedding",
      start_date: toLocalIsoDate(now),
      end_date: toLocalIsoDate(addLocalDays(now, 7)),
      include_night: false,
    };
  });

  const searchDays = Math.floor(
    (Date.parse(`${form.end_date}T12:00:00Z`) - Date.parse(`${form.start_date}T12:00:00Z`))
      / 86_400_000,
  ) + 1;
  const datesValid = Number.isFinite(searchDays) && searchDays >= 1 && searchDays <= 14;
  const visibleSlots = result
    ? showAllSlots
      ? result.data.slots
      : result.data.slots.slice(0, 6)
    : [];

  function updateForm<Key extends keyof typeof form>(
    key: Key,
    value: (typeof form)[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setResult(null);
    setResultMode(null);
    setError(null);
  }

  function toggleProfile(id: string) {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else if (next.size < 4) {
        next.add(id);
      }
      return next;
    });
    setResult(null);
    setResultMode(null);
  }

  async function handleSearch(mode: SearchMode) {
    if (!datesValid) {
      setError("Choose an inclusive date range from 1 to 14 days.");
      setStep(2);
      return;
    }
    setLastAttemptMode(mode);
    setLoadingMode(mode);
    setError(null);
    try {
      const response = await fetch("/api/readings/muhurtam", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile_ids: mode === "general" ? [profileId] : Array.from(selectedIds),
          ...form,
          validation_mode: mode,
          chandra_mode: "stars",
        }),
      });
      const data = await response.json() as SearchResult & { error?: string };
      if (!response.ok) throw new Error(data.error || "The timing search failed.");
      setResult(data);
      setResultMode(data.validation_mode ?? mode);
      setShowAllSlots(false);
    } catch (searchError) {
      setError(
        searchError instanceof Error
          ? searchError.message
          : "The timing search failed.",
      );
    } finally {
      setLoadingMode(null);
    }
  }

  function shareOnWhatsApp() {
    if (!result || !resultMode) return;
    const windows = result.data.slots.slice(0, 3).map((slot) =>
      `${slot.date}: ${slot.start}–${slot.end} (${slot.tier})`,
    ).join("\n");
    const selectedNames = profiles
      .filter((profile) => selectedIds.has(profile.id))
      .map((profile) => profile.name)
      .join(", ");
    const message = [
      `${muhurtamActivityLabel(form.activity)} timings`,
      resultMode === "personal"
        ? `Profile validation for: ${selectedNames}`
        : `General calculation for ${activeProfile?.current_location ?? "the selected location"}`,
      windows || "No recommended window passed every active filter.",
      "Calculated in Astro Chaganti. A complete election chart may still require astrologer review.",
    ].join("\n\n");
    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  function returnToProfileChoice() {
    setStep(3);
    document.getElementById("muhurtam-workflow")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <div className={toolStyles.root}>
      <section className={toolStyles.leadCard}>
        <div className={toolStyles.leadContent}>
          <span className={toolStyles.leadIcon}>
            <CalendarClock size={19} aria-hidden="true" />
          </span>
          <div>
            <p className={toolStyles.leadEyebrow}>Muhurtam finder</p>
            <h2 className={toolStyles.leadTitle}>
              Find the general window first. Then make it personal.
            </h2>
            <p className={toolStyles.leadText}>
              Begin with the same electional search available publicly. Your
              saved profiles can then add Tarabalam, Chandrabalam and derived
              Lagna context without re-entering birth details.
            </p>
          </div>
        </div>
        <span className={styles.enginePill}>Telugu Calendar engine</span>
      </section>

      <section className={toolStyles.section} id="muhurtam-workflow">
        <div className={toolStyles.sectionHeader}>
          <h3 className={toolStyles.sectionTitle}>Build the search</h3>
          <p className={toolStyles.sectionHint}>
            Occasion, dates, then the level of validation you need.
          </p>
        </div>

        <div className={styles.workflow}>
          <div className={styles.steps} aria-label="Muhurtam search steps">
            {[
              { number: 1 as const, label: "Choose occasion", detail: muhurtamActivityLabel(form.activity) },
              { number: 2 as const, label: "Set place & dates", detail: `${searchDays || "—"} days` },
              { number: 3 as const, label: "Choose validation", detail: "General or personal" },
            ].map(({ number, label, detail }) => (
              <button
                key={number}
                type="button"
                onClick={() => {
                  if (number === 1 || datesValid) setStep(number);
                }}
                className={step === number ? styles.stepActive : undefined}
                aria-current={step === number ? "step" : undefined}
              >
                <span>{number}</span>
                <div>
                  <strong>{label}</strong>
                  <small>{detail}</small>
                </div>
              </button>
            ))}
          </div>

          <div className={styles.panel}>
            {step === 1 && (
              <>
                <div className={styles.panelHeading}>
                  <div>
                    <p className={styles.panelEyebrow}>Step 1 · The occasion</p>
                    <h4>What are you planning?</h4>
                    <p>The occasion selects the classical rule profile used by the engine.</p>
                  </div>
                  <strong className={styles.selectionSummary}>
                    {muhurtamActivityLabel(form.activity)}
                  </strong>
                </div>
                <div className={styles.activityCatalog}>
                  {MUHURTAM_ACTIVITY_GROUPS.map((group) => (
                    <fieldset key={group.label}>
                      <legend>{group.label}</legend>
                      <div>
                        {group.items.map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            aria-pressed={form.activity === value}
                            onClick={() => updateForm("activity", value)}
                            className={form.activity === value ? styles.activityActive : undefined}
                          >
                            {form.activity === value && <Check size={12} aria-hidden="true" />}
                            {label}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                  ))}
                </div>
                <div className={styles.panelActions}>
                  <span />
                  <button type="button" onClick={() => setStep(2)} className={toolStyles.primaryButton}>
                    Choose dates
                    <ArrowRight size={14} aria-hidden="true" />
                  </button>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className={styles.panelHeading}>
                  <div>
                    <p className={styles.panelEyebrow}>Step 2 · Search context</p>
                    <h4>Where and across which dates?</h4>
                    <p>The active profile supplies the event location and timezone.</p>
                  </div>
                </div>
                <div className={styles.locationCard}>
                  <span><MapPin size={16} aria-hidden="true" /></span>
                  <div>
                    <small>Event location</small>
                    <strong>{activeProfile?.current_location ?? "Current location required"}</strong>
                    <p>{activeProfile?.current_timezone ?? "Edit the profile to add a current timezone."}</p>
                  </div>
                </div>
                <div className={styles.dateGrid}>
                  <label>
                    Start date
                    <input
                      type="date"
                      value={form.start_date}
                      onChange={(event) => updateForm("start_date", event.target.value)}
                    />
                  </label>
                  <label>
                    End date
                    <input
                      type="date"
                      value={form.end_date}
                      onChange={(event) => updateForm("end_date", event.target.value)}
                    />
                  </label>
                  <label className={styles.nightControl}>
                    <input
                      type="checkbox"
                      checked={form.include_night}
                      onChange={(event) => updateForm("include_night", event.target.checked)}
                    />
                    <MoonStar size={15} aria-hidden="true" />
                    <span>
                      <strong>Include night windows</strong>
                      <small>Where the activity allows them</small>
                    </span>
                  </label>
                </div>
                <div className={styles.rangeNote} data-valid={datesValid ? "true" : "false"}>
                  <CalendarClock size={15} aria-hidden="true" />
                  <p>
                    <strong>{datesValid ? `${searchDays} days selected` : "Date range needs attention"}</strong>
                    <span>
                      The live Muhurtam engine evaluates 1–14 inclusive days per
                      search. For a longer horizon, run adjacent searches.
                    </span>
                  </p>
                </div>
                {!datesValid && (
                  <p className={styles.inlineError} role="alert">
                    Choose an inclusive date range from 1 to 14 days.
                  </p>
                )}
                <div className={styles.panelActions}>
                  <button type="button" onClick={() => setStep(1)} className={toolStyles.secondaryButton}>
                    <ArrowLeft size={13} aria-hidden="true" />
                    Occasion
                  </button>
                  <button
                    type="button"
                    disabled={!datesValid}
                    onClick={() => setStep(3)}
                    className={toolStyles.primaryButton}
                  >
                    Choose validation
                    <ArrowRight size={14} aria-hidden="true" />
                  </button>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <div className={styles.panelHeading}>
                  <div>
                    <p className={styles.panelEyebrow}>Step 3 · Result depth</p>
                    <h4>Begin general, or validate the people involved</h4>
                    <p>Both paths use the same occasion, location and dates.</p>
                  </div>
                </div>
                <div className={styles.choiceGrid}>
                  <article className={styles.choiceCard}>
                    <span className={styles.choiceIcon}><Sparkles size={17} aria-hidden="true" /></span>
                    <p className={styles.panelEyebrow}>General election</p>
                    <h5>Show the public baseline</h5>
                    <p>
                      Rank Panchangam, activity rules, restricted periods and
                      time-window quality without using a birth chart.
                    </p>
                    <ul>
                      <li>Useful without personal details</li>
                      <li>The same foundation as the public finder</li>
                    </ul>
                    <button
                      type="button"
                      onClick={() => void handleSearch("general")}
                      disabled={loadingMode !== null}
                      className={toolStyles.primaryButton}
                    >
                      {loadingMode === "general" ? <Loader2 className="animate-spin" size={15} /> : <Sparkles size={15} />}
                      Show general timings
                    </button>
                  </article>

                  <article className={`${styles.choiceCard} ${styles.personalChoice}`}>
                    <span className={styles.choiceIcon}><ShieldCheck size={17} aria-hidden="true" /></span>
                    <p className={styles.panelEyebrow}>Profile validation</p>
                    <h5>Check the people involved</h5>
                    <p>
                      Add the saved chart context that can change which general
                      windows remain suitable.
                    </p>
                    <div className={styles.profileChoices} aria-label="Profiles for Muhurtam validation">
                      {profiles.map((profile) => {
                        const selected = selectedIds.has(profile.id);
                        return (
                          <button
                            key={profile.id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => toggleProfile(profile.id)}
                            className={selected ? styles.profileSelected : undefined}
                          >
                            {selected && <Check size={12} aria-hidden="true" />}
                            {profile.name}
                            {profile.id === profileId ? " · active" : ""}
                          </button>
                        );
                      })}
                    </div>
                    <small className={styles.profileLimit}>
                      Select one to four profiles · {selectedIds.size} selected
                    </small>
                    <button
                      type="button"
                      onClick={() => void handleSearch("personal")}
                      disabled={loadingMode !== null}
                      className={toolStyles.primaryButton}
                    >
                      {loadingMode === "personal" ? <Loader2 className="animate-spin" size={15} /> : <ShieldCheck size={15} />}
                      Validate for {selectedIds.size} {selectedIds.size === 1 ? "profile" : "profiles"}
                    </button>
                  </article>
                </div>
                <div className={styles.panelActions}>
                  <button type="button" onClick={() => setStep(2)} className={toolStyles.secondaryButton}>
                    <ArrowLeft size={13} aria-hidden="true" />
                    Dates
                  </button>
                  <p className={styles.reviewSummary}>
                    <strong>{muhurtamActivityLabel(form.activity)}</strong>
                    <span>
                      {form.start_date}–{form.end_date} · {activeProfile?.current_location ?? "location required"}
                    </span>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {error && (
        <div className={styles.errorCard} role="alert">
          <strong>Couldn&apos;t complete this search</strong>
          <span>{error}</span>
          <button
            type="button"
            onClick={() => lastAttemptMode && void handleSearch(lastAttemptMode)}
            disabled={!lastAttemptMode}
            className={toolStyles.secondaryButton}
          >
            Try again
          </button>
        </div>
      )}

      {result && resultMode && (
        <>
          <section className={styles.evidenceCard} aria-label="Muhurtam validation evidence">
            <div>
              <span className={styles.choiceIcon}>
                {resultMode === "personal"
                  ? <ShieldCheck size={17} aria-hidden="true" />
                  : <Sparkles size={17} aria-hidden="true" />}
              </span>
              <div>
                <p className={styles.panelEyebrow}>
                  {resultMode === "personal" ? "Profile validation applied" : "General election calculated"}
                </p>
                <h3>
                  {resultMode === "personal"
                    ? `${selectedIds.size} saved ${selectedIds.size === 1 ? "profile" : "profiles"} informed this ranking`
                    : "No birth-chart factors were used"}
                </h3>
              </div>
            </div>
            <dl>
              <div>
                <dt>Checked</dt>
                <dd>{evidenceList(result.evidence.evaluated_factors).join(" · ") || "Returned calculation factors"}</dd>
              </div>
              <div>
                <dt>Still requires review</dt>
                <dd>{evidenceList(result.evidence.not_evaluated).join(" · ") || "None stated by the engine"}</dd>
              </div>
            </dl>
          </section>

          <section className={toolStyles.section}>
            <div className={styles.resultHeading}>
              <div>
                <p className={styles.panelEyebrow}>
                  Showing {visibleSlots.length} of {result.data.slots.length} ranked windows
                </p>
                <h3>
                  {resultMode === "personal"
                    ? "Best profile-validated timings"
                    : "Best general timings"}
                </h3>
                <p>
                  {result.data.dropped_days?.length ?? 0}{" "}
                  {(result.data.dropped_days?.length ?? 0) === 1
                    ? "day was"
                    : "days were"}{" "}
                  excluded by
                  hard filters before ranking.
                </p>
              </div>
              <button type="button" onClick={shareOnWhatsApp} className={styles.whatsappButton}>
                <MessageCircle size={15} aria-hidden="true" />
                Share on WhatsApp
              </button>
            </div>

            {visibleSlots.length > 0 ? (
              <div className={styles.slotList}>
                {visibleSlots.map((slot, index) => {
                  const date = displayShortDate(slot.date);
                  const details = slotDetails(slot);
                  return (
                    <article
                      key={`${slot.date}-${slot.start}-${slot.end}-${index}`}
                      className={styles.slotCard}
                    >
                      <div className={styles.slotDate}>
                        <strong>{date.day}</strong>
                        <span>{date.rest}</span>
                      </div>
                      <div className={styles.slotBody}>
                        <p className={styles.slotTier}>{slot.tier} · score {slot.score}</p>
                        <h4>{slot.start}–{slot.end}</h4>
                        <p>{slot.reasons.slice(0, 3).join(" · ")}</p>
                        {(details.length > 0 || slot.reason_groups.notes.length > 0) && (
                          <details>
                            <summary>What was checked?</summary>
                            {details.length > 0 && (
                              <ul>
                                {details.map((reason) => <li key={reason}>{reason}</li>)}
                              </ul>
                            )}
                            {slot.reason_groups.notes.map((note) => <p key={note}>{note}</p>)}
                          </details>
                        )}
                      </div>
                    </article>
                  );
                })}
                {!showAllSlots && result.data.slots.length > 6 && (
                  <button
                    type="button"
                    onClick={() => setShowAllSlots(true)}
                    className={styles.showAllButton}
                  >
                    Show all {result.data.slots.length} timings
                    <ArrowRight size={14} aria-hidden="true" />
                  </button>
                )}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <CalendarClock size={21} aria-hidden="true" />
                <h3>No suitable window passed every hard filter</h3>
                <p>
                  Try another start date, the full 14-day range, or a different
                  occasion. A rejected day is not turned into a recommendation.
                </p>
              </div>
            )}

            {result.warnings.length > 0 && (
              <div className={styles.warningList}>
                {result.warnings.map((warning) => <p key={warning}>{warning}</p>)}
              </div>
            )}

            <details className={styles.disclaimer}>
              <summary>Calculation method and limits</summary>
              <p>
                {result.data.disclaimer} Full election-chart and manual
                prerequisite checks remain matters for astrologer review when
                listed by the engine.
              </p>
            </details>
          </section>

          {resultMode === "general" && (
            <aside className={styles.upgradeCard}>
              <div>
                <p className={styles.panelEyebrow}>Next level · Personal validation</p>
                <h3>Are these windows right for the people involved?</h3>
                <p>
                  Keep this search and add the selected profiles&apos;
                  Tarabalam, Chandrabalam and derived Lagna context.
                </p>
              </div>
              <div>
                <button
                  type="button"
                  onClick={returnToProfileChoice}
                  className={toolStyles.secondaryButton}
                >
                  <Users size={14} aria-hidden="true" />
                  Choose profiles
                </button>
                <button
                  type="button"
                  onClick={() => void handleSearch("personal")}
                  disabled={loadingMode !== null}
                  className={toolStyles.primaryButton}
                >
                  {loadingMode === "personal"
                    ? <Loader2 className="animate-spin" size={15} />
                    : <ShieldCheck size={15} />}
                  Validate these timings
                </button>
              </div>
            </aside>
          )}
        </>
      )}
    </div>
  );
}
