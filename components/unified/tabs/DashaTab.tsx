"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight, Clock3 } from "lucide-react";
import { cn } from "@/lib/utils";
import toolStyles from "@/components/profiles/ToolPage.module.css";
import styles from "./DashaTab.module.css";

const DASHA_LEVELS = [
  { key: "maha", label: "Maha Dasha" },
  { key: "antar", label: "Antar Dasha" },
  { key: "pratyantar", label: "Pratyantar Dasha" },
  { key: "sukshma", label: "Sukshma Dasha" },
  { key: "prana", label: "Prana Dasha" },
] as const;

const VIMSHOTTARI_YEARS: Record<string, number> = {
  Sun: 6,
  Moon: 10,
  Mars: 7,
  Rahu: 18,
  Jupiter: 16,
  Saturn: 19,
  Mercury: 17,
  Ketu: 7,
  Venus: 20,
};

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

type DashaEntry = {
  planet?: string;
  start?: string;
  end?: string;
  days?: number;
  years?: number;
};

type ExactDashaEntry = Required<Pick<DashaEntry, "planet" | "start" | "end">> & {
  days?: number;
};

type DashaData = Record<(typeof DASHA_LEVELS)[number]["key"], DashaEntry | undefined> & {
  timeline?: DashaEntry[];
};

type ChartMetadata = {
  dob?: string;
  time?: string;
  timezone?: string;
  query_date?: string;
  ayanamsha?: string;
};

function formatDate(value?: string): string {
  if (!value) return "Not returned";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const [, year, month, day] = match;
  const monthName = MONTHS[Number(month) - 1];
  return monthName ? `${Number(day)} ${monthName} ${year}` : value;
}

function formatDuration(entry: DashaEntry): string {
  if (entry.years != null) {
    return `${Number(entry.years.toFixed(1))} ${entry.years === 1 ? "year" : "years"}`;
  }
  if (entry.days == null) return "";
  if (entry.days >= 365) return `${(entry.days / 365.2425).toFixed(1)} years`;
  if (entry.days >= 30) return `${(entry.days / 30.4369).toFixed(1)} months`;
  if (entry.days >= 1) return `${Number(entry.days.toFixed(1))} days`;
  return "Less than one day";
}

function timelineDuration(entry: DashaEntry): string {
  if (entry.days != null) return formatDuration(entry);
  const years = entry.planet ? VIMSHOTTARI_YEARS[entry.planet] : undefined;
  if (years == null) return "";
  return `${years} ${years === 1 ? "year" : "years"}`;
}

function isActive(entry: DashaEntry, queryDate?: string): boolean {
  return Boolean(
    queryDate
    && entry.start
    && entry.end
    && entry.start <= queryDate
    && queryDate < entry.end,
  );
}

function isSamePeriod(left: DashaEntry, right?: DashaEntry): boolean {
  return Boolean(
    right?.planet
    && left.planet === right.planet
    && left.start === right.start,
  );
}

interface TimelineBranchProps {
  entry: ExactDashaEntry;
  path: number[];
  depth: number;
  profileId: string;
  queryDate?: string;
  currentPeriods: Array<DashaEntry | undefined>;
}

function TimelineBranch({
  entry,
  path,
  depth,
  profileId,
  queryDate,
  currentPeriods,
}: TimelineBranchProps) {
  const pathKey = path.join("-");
  const canExpand = depth < 4;
  const onCurrentPath = isSamePeriod(entry, currentPeriods[depth]);
  const [expanded, setExpanded] = useState(onCurrentPath && canExpand);
  const [children, setChildren] = useState<ExactDashaEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoLoadStarted = useRef(false);
  const abortController = useRef<AbortController | null>(null);

  const loadChildren = useCallback(async () => {
    if (!canExpand || children || loading) return;
    const requestPath = pathKey.split("-").map(Number);
    const controller = new AbortController();
    abortController.current?.abort();
    abortController.current = controller;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/readings/dashaflow/subperiods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile_id: profileId, path: requestPath }),
        signal: controller.signal,
      });
      const payload = await response.json() as {
        children?: ExactDashaEntry[];
        error?: string;
      };
      if (!response.ok || !payload.children) {
        throw new Error(payload.error ?? "This part of the timeline is unavailable.");
      }
      setChildren(payload.children);
    } catch (requestError) {
      if (controller.signal.aborted) return;
      setError(
        requestError instanceof Error
          ? requestError.message
          : "This part of the timeline is unavailable.",
      );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [canExpand, children, loading, pathKey, profileId]);

  useEffect(() => {
    if (!expanded || !canExpand || autoLoadStarted.current) return;
    autoLoadStarted.current = true;
    void loadChildren();
  }, [canExpand, expanded, loadChildren]);

  useEffect(() => () => {
    abortController.current?.abort();
  }, []);

  function toggle() {
    if (!canExpand) return;
    const nextExpanded = !expanded;
    if (nextExpanded && !children) autoLoadStarted.current = false;
    setExpanded(nextExpanded);
  }

  const rowContent = (
    <>
      <span className={styles.timelineChevron} aria-hidden="true">
        {canExpand && (
          <ChevronRight
            size={14}
            className={cn(styles.chevronIcon, expanded && styles.chevronOpen)}
          />
        )}
      </span>
      <span className={styles.timelineIdentity}>
        <strong>{entry.planet}</strong>
        {onCurrentPath && <span className={styles.nowBadge}>Current</span>}
      </span>
      <span className={styles.timelineRange}>
        {formatDate(entry.start)} – {formatDate(entry.end)}
      </span>
      <span className={styles.timelineDuration}>
        {timelineDuration(entry)}
      </span>
    </>
  );

  return (
    <li
      className={styles.timelineBranch}
      data-depth={depth}
      data-current={isActive(entry, queryDate) ? "true" : "false"}
    >
      {canExpand ? (
        <button
          type="button"
          className={styles.timelineRow}
          aria-expanded={expanded}
          aria-controls={`dasha-children-${pathKey}`}
          onClick={toggle}
        >
          {rowContent}
        </button>
      ) : (
        <div className={styles.timelineRow}>{rowContent}</div>
      )}

      {expanded && (
        <div id={`dasha-children-${pathKey}`} className={styles.timelineChildren}>
          {loading && (
            <p className={styles.timelineFeedback} role="status">
              Calculating exact {DASHA_LEVELS[depth + 1]?.label} periods…
            </p>
          )}
          {error && (
            <div className={styles.timelineFeedback} role="alert">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => {
                  autoLoadStarted.current = true;
                  void loadChildren();
                }}
              >
                Try again
              </button>
            </div>
          )}
          {children && (
            <ol aria-label={`${entry.planet} ${DASHA_LEVELS[depth + 1]?.label} periods`}>
              {children.map((child, index) => (
                <TimelineBranch
                  key={`${child.planet}-${child.start}-${index}`}
                  entry={child}
                  path={[...path, index]}
                  depth={depth + 1}
                  profileId={profileId}
                  queryDate={queryDate}
                  currentPeriods={currentPeriods}
                />
              ))}
            </ol>
          )}
        </div>
      )}
    </li>
  );
}

export function DashaTab({
  chartOutput,
  profileId,
}: {
  chartOutput: Record<string, unknown>;
  profileId: string;
}) {
  const data = chartOutput?.data as Record<string, unknown> | undefined;
  const dashas = data?.dashas as DashaData | undefined;
  const metadata = data?.metadata as ChartMetadata | undefined;
  const currentPeriods = DASHA_LEVELS
    .map((level, index) => ({ ...level, index, entry: dashas?.[level.key] }))
    .filter((period): period is typeof period & { entry: DashaEntry } =>
      Boolean(period.entry?.planet)
    );
  const currentPath = DASHA_LEVELS.map(level => dashas?.[level.key]);
  const timeline = dashas?.timeline?.filter(
    (entry): entry is ExactDashaEntry =>
      Boolean(entry.planet && entry.start && entry.end),
  ) ?? [];

  return (
    <div className={toolStyles.root}>
      <section className={toolStyles.leadCard}>
        <div className={toolStyles.leadContent}>
          <span className={toolStyles.leadIcon}>
            <Clock3 size={19} aria-hidden="true" />
          </span>
          <div>
            <p className={toolStyles.leadEyebrow}>Vimshottari timing</p>
            <h2 className={toolStyles.leadTitle}>The period carrying the present moment</h2>
            <p className={toolStyles.leadText}>
              Begin with the broad Mahadasha and move toward the immediate
              Prana period. Dates on this page come from one DashaFlow
              calculation source.
            </p>
          </div>
        </div>
        <span className={styles.sourcePill}>DashaFlow · Lahiri</span>
      </section>

      <section className={styles.calculationBasis} aria-label="Dasha calculation basis">
        <div>
          <span>Birth input</span>
          <strong>
            {formatDate(metadata?.dob)}
            {metadata?.time ? ` · ${metadata.time}` : ""}
          </strong>
        </div>
        <div>
          <span>Profile timezone</span>
          <strong>{metadata?.timezone ?? "Not returned"}</strong>
        </div>
        <div>
          <span>Calculated for</span>
          <strong>{formatDate(metadata?.query_date)}</strong>
        </div>
      </section>

      <section className={toolStyles.section} aria-labelledby="current-dasha-title">
        <div className={toolStyles.sectionHeader}>
          <h2 id="current-dasha-title" className={toolStyles.sectionTitle}>Current sequence</h2>
          <p className={toolStyles.sectionHint}>
            Broadest influence to the most immediate active period.
          </p>
        </div>
        {currentPeriods.length > 0 ? (
          <div className={styles.currentGrid}>
            {currentPeriods.map(({ key, label, index, entry }) => (
              <article
                key={key}
                className={cn(styles.currentCard, index === 0 && styles.currentCardPrimary)}
                aria-label={`${label}: ${entry.planet}`}
              >
                <div className={styles.currentCardTop}>
                  <span className={styles.currentStep}>{String(index + 1).padStart(2, "0")}</span>
                  <span className={styles.currentLevel}>{label}</span>
                </div>
                <strong>{entry.planet}</strong>
                <span className={styles.currentRange}>
                  {formatDate(entry.start)} – {formatDate(entry.end)}
                </span>
                {formatDuration(entry) && (
                  <span className={styles.currentDuration}>{formatDuration(entry)}</span>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState} role="status">
            Current Dasha periods were not returned for this chart.
          </div>
        )}
      </section>

      <section className={toolStyles.section} aria-labelledby="mahadasha-timeline-title">
        <div className={toolStyles.sectionHeader}>
          <h2 id="mahadasha-timeline-title" className={toolStyles.sectionTitle}>
            Explore the full timeline
          </h2>
          <p className={toolStyles.sectionHint}>
            Open any period to follow its exact sub-periods down to Prana Dasha.
          </p>
        </div>
        {timeline.length > 0 ? (
          <ol className={styles.timelineList} aria-label="Vimshottari Dasha timeline">
            {timeline.map((entry, index) => (
              <TimelineBranch
                key={`${entry.planet}-${entry.start}-${index}`}
                entry={entry}
                path={[index]}
                depth={0}
                profileId={profileId}
                queryDate={metadata?.query_date}
                currentPeriods={currentPath}
              />
            ))}
          </ol>
        ) : (
          <div className={styles.emptyState} role="status">
            The Mahadasha timeline is unavailable for this chart.
          </div>
        )}
      </section>

      <section className={styles.provenanceNote} aria-label="Dasha date provenance">
        <p>One source of truth</p>
        <span>
          Current periods and accordion dates use DashaFlow&apos;s exact
          server-side period builder. No Dasha dates are proportioned or
          reconstructed in the browser.
        </span>
      </section>
    </div>
  );
}
