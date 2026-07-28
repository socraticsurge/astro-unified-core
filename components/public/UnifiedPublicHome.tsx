"use client";

import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  MapPin,
  MessageCircle,
  Settings2,
  Sparkles,
} from "lucide-react";
import {
  type CSSProperties,
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  RASIS,
  type MuhurtamData,
  type PanchangamData,
  type RasiPhalaluData,
  type ServiceEnvelope,
  type TimeWindow,
} from "@/lib/panchangam/contracts";
import {
  MUHURTAM_ACTIVITY_GROUPS as ACTIVITY_GROUPS,
  muhurtamActivityLabel as activityLabel,
} from "@/lib/panchangam/activities";
import styles from "./UnifiedPublicHome.module.css";

type Rasi = (typeof RASIS)[number];
type CalendarApp = "google" | "apple" | "outlook";
type FeedVariant = "" | "festivals" | "observances";

const CITIES = [
  { name: "Hyderabad", timeZone: "Asia/Kolkata" },
  { name: "Vijayawada", timeZone: "Asia/Kolkata" },
  { name: "Visakhapatnam", timeZone: "Asia/Kolkata" },
  { name: "Tirupati", timeZone: "Asia/Kolkata" },
  { name: "Warangal", timeZone: "Asia/Kolkata" },
  { name: "Guntur", timeZone: "Asia/Kolkata" },
  { name: "Rajahmundry", timeZone: "Asia/Kolkata" },
  { name: "Nizamabad", timeZone: "Asia/Kolkata" },
  { name: "Kurnool", timeZone: "Asia/Kolkata" },
  { name: "Nellore", timeZone: "Asia/Kolkata" },
  { name: "Bengaluru", timeZone: "Asia/Kolkata" },
  { name: "Chennai", timeZone: "Asia/Kolkata" },
  { name: "Mumbai", timeZone: "Asia/Kolkata" },
  { name: "Delhi", timeZone: "Asia/Kolkata" },
  { name: "Dallas", timeZone: "America/Chicago" },
  { name: "San Jose", timeZone: "America/Los_Angeles" },
  { name: "San Francisco", timeZone: "America/Los_Angeles" },
  { name: "Edison", timeZone: "America/New_York" },
  { name: "New York", timeZone: "America/New_York" },
  { name: "London", timeZone: "Europe/London" },
  { name: "Sydney", timeZone: "Australia/Sydney" },
  { name: "Dubai", timeZone: "Asia/Dubai" },
] as const;

const TIMEZONE_CITY: Record<string, string> = {
  "America/Chicago": "Dallas",
  "America/Los_Angeles": "San Jose",
  "America/New_York": "New York",
  "Europe/London": "London",
  "Australia/Sydney": "Sydney",
  "Asia/Dubai": "Dubai",
  "Asia/Kolkata": "Hyderabad",
  "Asia/Calcutta": "Hyderabad",
};

const FEED_SYSTEMS = [
  ["drik", "Drik Ganita"],
  ["surya-siddhanta", "Surya Siddhanta"],
  ["vakya", "Vakya"],
] as const;

const FEED_VARIANTS: {
  value: FeedVariant;
  title: string;
  detail: string;
}[] = [
  {
    value: "",
    title: "Full daily Panchangam",
    detail: "Every day: Pancha Anga, Muhurtas, festivals and observances.",
  },
  {
    value: "festivals",
    title: "Festivals only",
    detail: "Named festivals such as Ugadi, Deepavali and Maha Shivaratri.",
  },
  {
    value: "observances",
    title: "Tithi observances",
    detail: "Ekadashi, Pournami, Amavasya and Pradosham vrat days.",
  },
];

const CALENDAR_INSTRUCTIONS: Record<
  CalendarApp,
  { label: string; steps: string[] }
> = {
  google: {
    label: "Google Calendar",
    steps: [
      "Open Google Calendar in a web browser.",
      "Beside Other calendars, choose + and then From URL.",
      "Paste the subscription URL and choose Add calendar.",
      "Use that calendar’s Settings and sharing page to add notifications.",
    ],
  },
  apple: {
    label: "Apple Calendar",
    steps: [
      "On a Mac, open Calendar and choose File → New Calendar Subscription.",
      "Paste the subscription URL and choose Subscribe.",
      "Set Auto-refresh to Daily, then choose OK.",
      "On iPhone or iPad, adjust all-day alerts under Calendar settings if wanted.",
    ],
  },
  outlook: {
    label: "Outlook",
    steps: [
      "Open Outlook on the web and choose Add calendar.",
      "Choose Subscribe from web.",
      "Paste the subscription URL and give the calendar a name.",
      "Choose Import; Outlook will refresh it automatically.",
    ],
  },
};

function feedSlug(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "-").replace(/,/g, "");
}

const RASI_SYMBOLS: Record<Rasi, string> = {
  Mesha: "♈︎",
  Vrishabha: "♉︎",
  Mithuna: "♊︎",
  Karka: "♋︎",
  Simha: "♌︎",
  Kanya: "♍︎",
  Tula: "♎︎",
  Vrischika: "♏︎",
  Dhanu: "♐︎",
  Makara: "♑︎",
  Kumbha: "♒︎",
  Meena: "♓︎",
};

const GOOD_CHOGHADIYA = new Set(["Amrit", "Shubh", "Labh"]);
const NEUTRAL_CHOGHADIYA = new Set(["Char"]);

type LoadState<T> = {
  data: ServiceEnvelope<T> | null;
  loading: boolean;
  error: string | null;
};

const emptyState = <T,>(): LoadState<T> => ({
  data: null,
  loading: false,
  error: null,
});

function todayForTimeZone(timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function displayDate(iso: string): string {
  if (!iso) return "Today";
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T12:00:00Z`));
}

function displayShortDate(iso: string): { day: string; rest: string } {
  const date = new Date(`${iso}T12:00:00Z`);
  return {
    day: new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      timeZone: "UTC",
    }).format(date),
    rest: new Intl.DateTimeFormat("en-IN", {
      weekday: "short",
      month: "short",
      timeZone: "UTC",
    }).format(date),
  };
}

function windowText(window: TimeWindow | null | undefined): string {
  if (!window) return "Not present";
  return `${window.start}–${window.end}`;
}

function choghadiyaClass(name: string): string {
  if (GOOD_CHOGHADIYA.has(name)) return styles.choghadiyaGood;
  if (NEUTRAL_CHOGHADIYA.has(name)) return styles.choghadiyaNeutral;
  return styles.choghadiyaAvoid;
}

function choghadiyaNature(name: string): string {
  if (GOOD_CHOGHADIYA.has(name)) return "Favourable";
  if (NEUTRAL_CHOGHADIYA.has(name)) return "Movable";
  return "Caution";
}

async function fetchEnvelope<T>(url: string): Promise<ServiceEnvelope<T>> {
  const response = await fetch(url, { cache: "no-store" });
  const payload = (await response.json().catch(() => null)) as
    | ServiceEnvelope<T>
    | { error?: string }
    | null;
  if (!response.ok) {
    throw new Error(
      payload && "error" in payload && payload.error
        ? payload.error
        : "This calculation is temporarily unavailable.",
    );
  }
  return payload as ServiceEnvelope<T>;
}

function LoadingCard({ label }: { label: string }) {
  return (
    <div className={styles.loadingCard} role="status">
      <span className={styles.loadingOrb} aria-hidden="true" />
      Calculating {label}…
    </div>
  );
}

function ErrorCard({
  message,
  retry,
}: {
  message: string;
  retry: () => void;
}) {
  return (
    <div className={styles.errorCard} role="alert">
      <strong>We couldn’t complete this calculation.</strong>
      <span>{message}</span>
      <button type="button" onClick={retry}>
        Try again
      </button>
    </div>
  );
}

export function UnifiedPublicHome({
  showPreviewBanner = false,
}: {
  showPreviewBanner?: boolean;
}) {
  const [date, setDate] = useState("");
  const [city, setCity] = useState<string>("Hyderabad");
  const [system, setSystem] = useState("drik");
  const [rasi, setRasi] = useState<Rasi>("Mesha");
  const [activity, setActivity] = useState("travel");
  const [muhurtamStart, setMuhurtamStart] = useState("");
  const [muhurtamDays, setMuhurtamDays] = useState(7);
  const [includeNight, setIncludeNight] = useState(false);
  const [dayState, setDayState] =
    useState<LoadState<PanchangamData>>(emptyState);
  const [rasiState, setRasiState] =
    useState<LoadState<RasiPhalaluData>>(emptyState);
  const [muhurtamState, setMuhurtamState] =
    useState<LoadState<MuhurtamData>>(emptyState);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [lastMuhurtamQuery, setLastMuhurtamQuery] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [muhurtamStep, setMuhurtamStep] = useState<1 | 2 | 3>(1);
  const [showAllSlots, setShowAllSlots] = useState(false);
  const [feedCity, setFeedCity] = useState("Hyderabad");
  const [feedSystem, setFeedSystem] = useState("drik");
  const [feedVariant, setFeedVariant] = useState<FeedVariant>("");
  const [calendarApp, setCalendarApp] = useState<CalendarApp>("google");
  const [feedCopyStatus, setFeedCopyStatus] = useState<string | null>(null);
  const didInferLocation = useRef(false);

  const currentMuhurtamQuery = [
    activity,
    city,
    muhurtamStart,
    muhurtamDays,
    includeNight,
    system,
  ].join("|");
  const muhurtamNeedsRefresh =
    lastMuhurtamQuery !== null && lastMuhurtamQuery !== currentMuhurtamQuery;

  useEffect(() => {
    if (didInferLocation.current) return;
    didInferLocation.current = true;
    const storedCity = window.localStorage.getItem("astro-public-city");
    const inferredTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const inferredCity =
      storedCity && CITIES.some((item) => item.name === storedCity)
        ? storedCity
        : (TIMEZONE_CITY[inferredTimeZone] ?? "Hyderabad");
    const definition =
      CITIES.find((item) => item.name === inferredCity) ?? CITIES[0];
    const localToday = todayForTimeZone(definition.timeZone);
    if (inferredCity !== city) {
      setCity(inferredCity);
    }
    setFeedCity(inferredCity);
    setDate(localToday);
    setMuhurtamStart(addDays(localToday, 1));
    const storedRasi = window.localStorage.getItem("astro-public-rasi");
    if (storedRasi && RASIS.includes(storedRasi as Rasi)) {
      setRasi(storedRasi as Rasi);
    }
  }, [city]);

  const loadDay = useCallback(async () => {
    if (!date) return;
    setDayState((current) => ({ ...current, loading: true, error: null }));
    const query = new URLSearchParams({
      date,
      city,
      system,
      ayanamsa: "lahiri",
    });
    try {
      const data = await fetchEnvelope<PanchangamData>(
        `/api/public/panchangam?${query}`,
      );
      setDayState({ data, loading: false, error: null });
    } catch (error) {
      setDayState((current) => ({
        ...current,
        loading: false,
        error:
          error instanceof Error ? error.message : "Calculation unavailable.",
      }));
    }
  }, [city, date, system]);

  const loadRasi = useCallback(async () => {
    if (!date) return;
    setRasiState((current) => ({ ...current, loading: true, error: null }));
    const query = new URLSearchParams({
      date,
      city,
      rasi,
      ayanamsa: "lahiri",
    });
    try {
      const data = await fetchEnvelope<RasiPhalaluData>(
        `/api/public/horoscope?${query}`,
      );
      setRasiState({ data, loading: false, error: null });
    } catch (error) {
      setRasiState((current) => ({
        ...current,
        loading: false,
        error:
          error instanceof Error ? error.message : "Calculation unavailable.",
      }));
    }
  }, [city, date, rasi]);

  const loadMuhurtam = useCallback(async () => {
    if (!muhurtamStart) return;
    const queryKey = [
      activity,
      city,
      muhurtamStart,
      muhurtamDays,
      includeNight,
      system,
    ].join("|");
    setMuhurtamState((current) => ({
      ...current,
      loading: true,
      error: null,
    }));
    const query = new URLSearchParams({
      start_date: muhurtamStart,
      days: String(muhurtamDays),
      activity,
      city,
      system,
      ayanamsa: "lahiri",
      include_night: String(includeNight),
    });
    try {
      const data = await fetchEnvelope<MuhurtamData>(
        `/api/public/muhurtam?${query}`,
      );
      setMuhurtamState({ data, loading: false, error: null });
      setLastMuhurtamQuery(queryKey);
      setShowAllSlots(false);
    } catch (error) {
      setMuhurtamState((current) => ({
        ...current,
        loading: false,
        error:
          error instanceof Error ? error.message : "Calculation unavailable.",
      }));
    }
  }, [
    activity,
    city,
    includeNight,
    muhurtamDays,
    muhurtamStart,
    system,
  ]);

  useEffect(() => {
    void loadDay();
  }, [loadDay]);

  useEffect(() => {
    void loadRasi();
  }, [loadRasi]);

  function chooseCity(nextCity: string) {
    const definition =
      CITIES.find((item) => item.name === nextCity) ?? CITIES[0];
    const localToday = todayForTimeZone(definition.timeZone);
    setCity(nextCity);
    setDate(localToday);
    setMuhurtamStart(addDays(localToday, 1));
    window.localStorage.setItem("astro-public-city", nextCity);
  }

  function chooseRasi(nextRasi: Rasi) {
    setRasi(nextRasi);
    window.localStorage.setItem("astro-public-rasi", nextRasi);
  }

  function findMuhurtam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadMuhurtam();
  }

  async function shareDailyGuidance() {
    const reading = rasiState.data?.data;
    const text = reading
      ? `${reading.janma_rasi} today: ${reading.lines.slice(0, 2).join(" ")}`
      : `Daily Moon-sign guidance for ${displayDate(date)} in ${city}.`;
    const shareData = {
      title: `${rasi} daily horoscope | Astro Chaganti`,
      text,
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareStatus("Shared");
      } else {
        await navigator.clipboard.writeText(
          `${shareData.title}\n${shareData.text}\n${shareData.url}`,
        );
        setShareStatus("Guidance copied");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setShareStatus("Could not share");
    }
  }

  async function copyFeedUrl() {
    try {
      await navigator.clipboard.writeText(feedUrl);
      setFeedCopyStatus("Subscription URL copied");
    } catch {
      setFeedCopyStatus("Could not copy—select the URL and copy it manually");
    }
  }

  function shareMuhurtamOnWhatsApp() {
    const result = muhurtamState.data?.data;
    if (!result) return;
    const windows = result.slots
      .slice(0, 3)
      .map(
        (slot) =>
          `${displayShortDate(slot.date).day} ${displayShortDate(slot.date).rest}: ${slot.start}–${slot.end} (${slot.tier})`,
      )
      .join("\n");
    const text = [
      `${activityLabel(activity)} timings for ${city}`,
      windows || "No recommended public window in this search.",
      "Public Panchangam baseline; participant suitability requires saved profiles.",
      window.location.href,
    ].join("\n\n");
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  const day = dayState.data?.data;
  const reading = rasiState.data?.data;
  const muhurtam = muhurtamState.data?.data;
  const sunPosition = reading?.sky_positions?.find(
    (position) => position.graha === "Surya",
  );
  const moonPosition = reading?.sky_positions?.find(
    (position) => position.graha === "Chandra",
  );
  const visibleMuhurtamSlots = muhurtam
    ? showAllSlots
      ? muhurtam.slots
      : muhurtam.slots.slice(0, 6)
    : [];
  const dayHoras = day?.horas.slice(0, 12) ?? [];
  const nightHoras = day?.horas.slice(12, 24) ?? [];
  const lagnaSplitIndex = Math.ceil((day?.lagna_transitions.length ?? 0) / 2);
  const feedSuffix = feedVariant ? `-${feedVariant}` : "";
  const feedFilename = `${feedSlug(feedCity)}-${feedSystem}${feedSuffix}.ics`;
  const feedUrl = `https://panchangam.astrochaganti.com/feeds/${feedFilename}`;
  const webcalUrl = feedUrl.replace("https://", "webcal://");
  const auspiciousWindows = day
    ? [
        ["Brahma Muhurta", day.auspicious.brahma_muhurta],
        ["Abhijit Muhurta", day.auspicious.abhijit_muhurta],
        ...(day.auspicious.amrita_kalam ?? []).map(
          (window, index) =>
            [`Amrita Kalam${index ? ` ${index + 1}` : ""}`, window] as const,
        ),
      ].filter((item): item is [string, TimeWindow] => Boolean(item[1]))
    : [];
  const inauspiciousWindows = day
    ? [
        ["Rahu Kalam", day.inauspicious.rahu_kalam],
        ["Gulika Kalam", day.inauspicious.gulika_kalam],
        ["Yamagandam", day.inauspicious.yamagandam],
        ...(day.inauspicious.varjyam ?? []).map(
          (window, index) =>
            [`Varjyam${index ? ` ${index + 1}` : ""}`, window] as const,
        ),
        ...(day.inauspicious.durmuhurtham ?? []).map(
          (window, index) =>
            [`Durmuhurtham${index ? ` ${index + 1}` : ""}`, window] as const,
        ),
      ].filter((item): item is [string, TimeWindow] => Boolean(item[1]))
    : [];
  const traditionalDayItems = day
    ? [
        `${day.metadata.samvatsara} Nama Samvatsara`,
        day.metadata.ayanam,
        `${day.metadata.rituvu} Rituvu`,
        `${day.metadata.maasam} Maasam`,
        `${day.metadata.paksham} Paksham`,
        day.metadata.vaaram,
      ]
    : [];

  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#unified-main">
        Skip to today’s guidance
      </a>
      {showPreviewBanner && (
        <div className={styles.previewBanner} role="note">
          Safe review · synthetic profiles · no production traffic
        </div>
      )}

      <div id="unified-main">
        <header className={styles.dayContext} id="daily-settings">
          <div>
            <span>Today across Astro Chaganti</span>
            <time dateTime={date || undefined}>{displayDate(date)}</time>
          </div>
          <button
            className={styles.contextControl}
            type="button"
            aria-expanded={settingsOpen}
            aria-controls="page-context-editor"
            aria-label={settingsOpen ? "Close day settings" : "Edit day settings"}
            onClick={() => setSettingsOpen((open) => !open)}
          >
            <MapPin aria-hidden="true" size={15} />
            {city}
            <span>· {system === "drik" ? "Drik" : system}</span>
            <Settings2 aria-hidden="true" size={14} />
            <small>{settingsOpen ? "Close" : "Edit"}</small>
          </button>
          {settingsOpen && (
            <div className={styles.contextEditor} id="page-context-editor">
              <label>
                Location
                <select
                  value={city}
                  onChange={(event) => chooseCity(event.target.value)}
                >
                  {CITIES.map((item) => (
                    <option key={item.name}>{item.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Date
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </label>
              <label>
                Calculation system
                <select
                  value={system}
                  onChange={(event) => setSystem(event.target.value)}
                >
                  <option value="drik">Drik</option>
                  <option value="surya_siddhanta">Surya Siddhanta</option>
                  <option value="vakya">Vakya</option>
                </select>
              </label>
            </div>
          )}
        </header>

        <section
          className={styles.hero}
          id="today"
          aria-labelledby="unified-title"
        >
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Daily Rasi Phalalu</p>
            <h1 id="unified-title">
              Your Moon sign, <em>today.</em>
            </h1>
            <p className={styles.lede}>
              Choose your Janma Rasi for a practical daily reading built from
              the Moon’s house and today’s computed planetary transits.
            </p>

            <div
              className={styles.heroSignPicker}
              role="group"
              aria-label="Choose your Moon sign"
            >
              {RASIS.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={rasi === item}
                  className={rasi === item ? styles.signActive : undefined}
                  onClick={() => chooseRasi(item)}
                >
                  <span aria-hidden="true">{RASI_SYMBOLS[item]}</span>
                  {item}
                </button>
              ))}
            </div>

            {rasiState.loading && !reading && (
              <LoadingCard label="today’s Moon-sign guidance" />
            )}
            {rasiState.error && !reading && (
              <ErrorCard message={rasiState.error} retry={loadRasi} />
            )}
            {reading && (
              <div className={styles.heroReading} aria-live="polite">
                <p className={styles.heroLead}>{reading.lines[0]}</p>
                {reading.lines.slice(1, 4).map((line, index) => (
                  <p key={`${index}-${line}`}>{line}</p>
                ))}
                <p className={styles.disclosure}>{reading.disclaimer}</p>
              </div>
            )}

            <div className={styles.heroActions}>
              <Link className={styles.primaryButton} href="/auth/signin">
                Add your birth profile
                <ChevronRight aria-hidden="true" size={16} />
              </Link>
              <button
                className={styles.shareButton}
                type="button"
                onClick={() => void shareDailyGuidance()}
              >
                <MessageCircle aria-hidden="true" size={16} />
                Share today
              </button>
              {shareStatus && (
                <span className={styles.shareStatus} role="status">
                  {shareStatus}
                </span>
              )}
            </div>
          </div>

          <div className={styles.skyStage}>
            <div className={styles.skyPortrait} aria-hidden="true">
              <span className={`${styles.skyStar} ${styles.skyStarOne}`} />
              <span className={`${styles.skyStar} ${styles.skyStarTwo}`} />
              <span className={`${styles.skyStar} ${styles.skyStarThree}`} />
              <div className={styles.skyGlow} />
              <div className={styles.zodiacWheel}>
                {RASIS.map((sign) => (
                  <span
                    className={rasi === sign ? styles.zodiacActive : undefined}
                    key={sign}
                  >
                    {RASI_SYMBOLS[sign]}
                  </span>
                ))}
              </div>
              <div className={styles.orbitSweep} />
              <span
                className={styles.orbitSun}
                style={
                  {
                    "--graha-angle": `${sunPosition?.longitude ?? 0}deg`,
                  } as CSSProperties
                }
              >
                ☉
              </span>
              <span
                className={styles.orbitMoon}
                style={
                  {
                    "--graha-angle": `${moonPosition?.longitude ?? 180}deg`,
                  } as CSSProperties
                }
              >
                ☾
              </span>
              <div className={styles.skyCore}>
                <small>Today for</small>
                <strong aria-label={rasi}>{RASI_SYMBOLS[rasi]}</strong>
                <span>{rasi}</span>
                <em>{reading?.day_quality ?? "Reading the sky"}</em>
              </div>
            </div>
            <div className={styles.heroMetricRail}>
              <span>
                <small>Day quality</small>
                <strong>{reading?.day_quality ?? "—"}</strong>
              </span>
              <span>
                <small>Moon house</small>
                <strong>{reading?.moon_house ?? "—"}</strong>
              </span>
              <span>
                <small>Favourable grahas</small>
                <strong>{reading?.favourable_count ?? "—"}</strong>
              </span>
            </div>
            <p className={styles.heroEvidence}>
              {sunPosition && moonPosition
                ? `Sun ${sunPosition.rasi} ${sunPosition.longitude.toFixed(1)}° · Moon ${moonPosition.rasi} ${moonPosition.longitude.toFixed(1)}° · Lahiri sidereal positions at sunrise`
                : "Computing the Sun and Moon positions at sunrise…"}
              <span>Generic Moon-sign guidance, not a natal-chart reading.</span>
            </p>
          </div>
        </section>

        <section
          className={styles.section}
          id="panchangam"
          aria-labelledby="panchangam-title"
        >
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>Daily Panchangam</p>
              <h2 id="panchangam-title">Today’s Panchangam</h2>
            </div>
            {dayState.data && (
              <span className={styles.computedBadge}>
                Computed · {dayState.data.engine.version}
              </span>
            )}
          </div>

          {dayState.loading && !day && (
            <LoadingCard label="today’s Panchangam" />
          )}
          {dayState.error && !day && (
            <ErrorCard message={dayState.error} retry={loadDay} />
          )}
          {day && (
            <>
              <div className={styles.traditionalContext}>
                <span>Today in the traditional calendar</span>
                <p className={styles.traditionalLine}>
                  {traditionalDayItems.map((item) => (
                    <strong key={item}>{item}</strong>
                  ))}
                </p>
              </div>
              <div className={styles.panchangamLayout}>
                <article className={styles.card}>
                  <div className={styles.cardHeading}>
                    <div>
                      <p className={styles.eyebrow}>Pancha Anga</p>
                      <h3>The five limbs</h3>
                    </div>
                  </div>
                  <div className={styles.angaGrid}>
                    <div>
                      <span>Tithi</span>
                      <strong>{day.pancha_anga.tithi.name}</strong>
                      <small>until {day.pancha_anga.tithi.end}</small>
                    </div>
                    <div>
                      <span>Nakshatra</span>
                      <strong>{day.pancha_anga.nakshatra.name}</strong>
                      <small>
                        Pada {day.pancha_anga.nakshatra_pada} · until{" "}
                        {day.pancha_anga.nakshatra.end}
                      </small>
                    </div>
                    <div>
                      <span>Yoga</span>
                      <strong>{day.pancha_anga.yoga.name}</strong>
                      <small>until {day.pancha_anga.yoga.end}</small>
                    </div>
                    <div>
                      <span>Karana</span>
                      <strong>{day.pancha_anga.karana[0]?.name ?? "—"}</strong>
                      <small>
                        until {day.pancha_anga.karana[0]?.end ?? "—"}
                      </small>
                    </div>
                    <div>
                      <span>Vara</span>
                      <strong>{day.metadata.vaaram}</strong>
                      <small>{day.metadata.lunar_sign} Moon</small>
                    </div>
                  </div>
                  {day.special_days.length > 0 && (
                    <p className={styles.specialDays}>
                      <Sparkles aria-hidden="true" size={16} />
                      <strong>Special today:</strong>{" "}
                      {day.special_days.join(" · ")}
                    </p>
                  )}
                </article>

                <aside className={styles.daySnapshot}>
                  <div>
                    <small>Sunrise</small>
                    <strong>{day.sky.sunrise}</strong>
                  </div>
                  <div>
                    <small>Sunset</small>
                    <strong>{day.sky.sunset}</strong>
                  </div>
                  <div>
                    <small>Moonrise</small>
                    <strong>{day.sky.moonrise}</strong>
                  </div>
                  <div>
                    <small>Moonset</small>
                    <strong>{day.sky.moonset}</strong>
                  </div>
                  <div>
                    <small>Solar sign</small>
                    <strong>{day.metadata.solar_sign}</strong>
                  </div>
                  <div>
                    <small>Lunar sign</small>
                    <strong>{day.metadata.lunar_sign}</strong>
                  </div>
                </aside>
              </div>

              <div className={styles.windowColumns}>
                <article className={styles.windowPanel}>
                  <div className={styles.windowPanelHeading}>
                    <span className={styles.considerDot} />
                    <div>
                      <p className={styles.eyebrow}>Supportive windows</p>
                      <h3>Consider</h3>
                    </div>
                  </div>
                  <div className={styles.windowList}>
                    {auspiciousWindows.map(([name, window]) => (
                      <p key={`${name}-${window.start}`}>
                        <strong>{name}</strong>
                        <span>{windowText(window)}</span>
                      </p>
                    ))}
                  </div>
                </article>
                <article className={styles.windowPanel}>
                  <div className={styles.windowPanelHeading}>
                    <span className={styles.avoidDot} />
                    <div>
                      <p className={styles.eyebrow}>Caution windows</p>
                      <h3>Avoid</h3>
                    </div>
                  </div>
                  <div className={styles.windowList}>
                    {inauspiciousWindows.map(([name, window]) => (
                      <p key={`${name}-${window.start}`}>
                        <strong>{name}</strong>
                        <span>{windowText(window)}</span>
                      </p>
                    ))}
                  </div>
                </article>
              </div>

              <div className={styles.timingSection}>
                <div className={styles.timingHeading}>
                  <div>
                    <p className={styles.eyebrow}>Planetary hours</p>
                    <h3>Planetary Horas</h3>
                  </div>
                  <span>12 by day · 12 by night</span>
                </div>
                <div className={styles.timingColumns}>
                  <article>
                    <h4>Day Horas</h4>
                    <div className={styles.timingRows}>
                      {dayHoras.map((hora) => (
                        <p key={`${hora.name}-${hora.start}`}>
                          <strong>
                            {(hora.name ?? "Planet").replace(" Hora", "")}
                          </strong>
                          <span>{windowText(hora)}</span>
                        </p>
                      ))}
                    </div>
                  </article>
                  <article>
                    <h4>Night Horas</h4>
                    <div className={styles.timingRows}>
                      {nightHoras.map((hora) => (
                        <p key={`${hora.name}-${hora.start}`}>
                          <strong>
                            {(hora.name ?? "Planet").replace(" Hora", "")}
                          </strong>
                          <span>{windowText(hora)}</span>
                        </p>
                      ))}
                    </div>
                  </article>
                </div>
              </div>

              <div className={styles.timingSection}>
                <div className={styles.timingHeading}>
                  <div>
                    <p className={styles.eyebrow}>Eight divisions each</p>
                    <h3>Choghadiya</h3>
                  </div>
                  <div className={styles.choghadiyaLegend}>
                    <span className={styles.choghadiyaGood}>Favourable</span>
                    <span className={styles.choghadiyaNeutral}>Movable</span>
                    <span className={styles.choghadiyaAvoid}>Caution</span>
                  </div>
                </div>
                <div className={styles.timingColumns}>
                  <article>
                    <h4>Day Choghadiya</h4>
                    <div className={styles.timingRows}>
                      {day.choghadiya.map((window) => (
                        <p
                          className={choghadiyaClass(window.name ?? "")}
                          key={`${window.name}-${window.start}`}
                        >
                          <strong>
                            {window.name}
                            <small>
                              {choghadiyaNature(window.name ?? "")}
                            </small>
                          </strong>
                          <span>{windowText(window)}</span>
                        </p>
                      ))}
                    </div>
                  </article>
                  <article>
                    <h4>Night Choghadiya</h4>
                    <div className={styles.timingRows}>
                      {day.choghadiya_night.map((window) => (
                        <p
                          className={choghadiyaClass(window.name ?? "")}
                          key={`${window.name}-${window.start}`}
                        >
                          <strong>
                            {window.name}
                            <small>
                              {choghadiyaNature(window.name ?? "")}
                            </small>
                          </strong>
                          <span>{windowText(window)}</span>
                        </p>
                      ))}
                    </div>
                  </article>
                </div>
              </div>

              <div className={styles.timingSection}>
                <div className={styles.timingHeading}>
                  <div>
                    <p className={styles.eyebrow}>Rising signs through the day</p>
                    <h3>Lagna transitions</h3>
                  </div>
                  <span>{day.lagna_transitions.length} transitions</span>
                </div>
                <div className={styles.timingColumns}>
                  <article>
                    <h4>From sunrise</h4>
                    <div className={styles.timingRows}>
                      {day.lagna_transitions
                        .slice(0, lagnaSplitIndex)
                        .map((lagna) => (
                          <p key={`${lagna.name}-${lagna.start}`}>
                            <strong>{lagna.name}</strong>
                            <span>{windowText(lagna)}</span>
                          </p>
                        ))}
                    </div>
                  </article>
                  <article>
                    <h4>Later transitions</h4>
                    <div className={styles.timingRows}>
                      {day.lagna_transitions
                        .slice(lagnaSplitIndex)
                        .map((lagna) => (
                          <p key={`${lagna.name}-${lagna.start}`}>
                            <strong>{lagna.name}</strong>
                            <span>{windowText(lagna)}</span>
                          </p>
                        ))}
                    </div>
                  </article>
                </div>
              </div>
            </>
          )}
        </section>

        <section
          className={`${styles.section} ${styles.washSection}`}
          id="muhurtam"
          aria-labelledby="muhurtam-title"
        >
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>Public Muhurtam finder</p>
              <h2 id="muhurtam-title">When should we act?</h2>
              <p>
                Choose the real occasion. We rank general windows first and
                state clearly what requires a saved profile.
              </p>
            </div>
            <span className={styles.publicBadge}>No sign-in needed</span>
          </div>

          <div
            className={styles.finderSteps}
            role="tablist"
            aria-label="Muhurtam search steps"
          >
            {[
              {
                step: 1 as const,
                label: "Choose occasion",
                detail: activityLabel(activity),
              },
              {
                step: 2 as const,
                label: "Set place & dates",
                detail: `${city} · ${muhurtamDays} days`,
              },
              {
                step: 3 as const,
                label: "People & results",
                detail: "General or profile-validated",
              },
            ].map(({ step, label, detail }) => (
              <button
                key={step}
                type="button"
                role="tab"
                aria-selected={muhurtamStep === step}
                className={
                  muhurtamStep === step ? styles.finderStepActive : undefined
                }
                onClick={() => setMuhurtamStep(step)}
              >
                <span>{step}</span>
                <div>
                  <strong>{label}</strong>
                  <small>{detail}</small>
                </div>
              </button>
            ))}
          </div>

          <form className={styles.muhurtamForm} onSubmit={findMuhurtam}>
            {muhurtamStep === 1 && (
              <div className={styles.flowPanel} role="tabpanel">
                <div className={styles.activityCatalog}>
                  {ACTIVITY_GROUPS.map((group) => (
                    <fieldset key={group.label}>
                      <legend>{group.label}</legend>
                      <div>
                        {group.items.map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            aria-pressed={activity === value}
                            className={
                              activity === value
                                ? styles.activityActive
                                : undefined
                            }
                            onClick={() => setActivity(value)}
                          >
                            {activity === value && (
                              <Check aria-hidden="true" size={13} />
                            )}
                            {label}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                  ))}
                </div>
                <div className={styles.flowActions}>
                  <p>
                    Selected: <strong>{activityLabel(activity)}</strong>
                  </p>
                  <button
                    className={styles.primaryButton}
                    type="button"
                    onClick={() => setMuhurtamStep(2)}
                  >
                    Choose place and dates
                    <ChevronRight aria-hidden="true" size={16} />
                  </button>
                </div>
              </div>
            )}

            {muhurtamStep === 2 && (
              <div className={styles.flowPanel} role="tabpanel">
                <div className={styles.searchOptions}>
                  <div>
                    <label>
                      Event location
                      <select
                        value={city}
                        onChange={(event) => chooseCity(event.target.value)}
                      >
                        {CITIES.map((item) => (
                          <option key={item.name}>{item.name}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Starting date
                      <input
                        type="date"
                        value={muhurtamStart}
                        onChange={(event) =>
                          setMuhurtamStart(event.target.value)
                        }
                      />
                    </label>
                    <label>
                      Search length
                      <select
                        value={muhurtamDays}
                        onChange={(event) =>
                          setMuhurtamDays(Number(event.target.value))
                        }
                      >
                        <option value={3}>3 days</option>
                        <option value={7}>7 days</option>
                        <option value={14}>14 days</option>
                      </select>
                    </label>
                    <label className={styles.checkLabel}>
                      <input
                        type="checkbox"
                        checked={includeNight}
                        onChange={(event) =>
                          setIncludeNight(event.target.checked)
                        }
                      />
                      Include suitable night windows
                    </label>
                  </div>
                </div>
                <div className={styles.flowActions}>
                  <button
                    className={styles.previousButton}
                    type="button"
                    onClick={() => setMuhurtamStep(1)}
                  >
                    Back to occasion
                  </button>
                  <button
                    className={styles.primaryButton}
                    type="button"
                    onClick={() => setMuhurtamStep(3)}
                  >
                    Continue to people
                    <ChevronRight aria-hidden="true" size={16} />
                  </button>
                </div>
              </div>
            )}

            {muhurtamStep === 3 && (
              <div className={styles.flowPanel} role="tabpanel">
                <div className={styles.participantStep}>
                  <div>
                    <p className={styles.eyebrow}>General public calculation</p>
                    <h3>Continue without personal details</h3>
                    <p>
                      We can rank the Panchangam and activity rules now. No
                      names or birth details are required.
                    </p>
                  </div>
                  <div>
                    <p className={styles.eyebrow}>Validate the people involved</p>
                    <h3>Use saved birth profiles</h3>
                    <p>
                      Sign in to add Tarabalam, Chandrabalam, birth Rasi, Lagna
                      and approved chart cautions for each participant.
                    </p>
                    <Link className={styles.textLink} href="/auth/signin">
                      Sign in to add people →
                    </Link>
                  </div>
                </div>
                <div className={styles.finderAction}>
                  <button
                    className={styles.previousButton}
                    type="button"
                    onClick={() => setMuhurtamStep(2)}
                  >
                    Back to dates
                  </button>
                  <div>
                    <small>Ready to calculate</small>
                    <strong>{activityLabel(activity)}</strong>
                    <span>
                      {city} · {muhurtamDays} days ·{" "}
                      {includeNight ? "day and night" : "daytime"}
                    </span>
                  </div>
                  <button
                    className={`${styles.primaryButton} ${
                      muhurtamNeedsRefresh ? styles.refreshAttention : ""
                    }`}
                    type="submit"
                    disabled={muhurtamState.loading}
                  >
                    {muhurtamState.loading
                      ? "Calculating…"
                      : "Show general timings"}
                    <ChevronRight aria-hidden="true" size={16} />
                  </button>
                </div>
              </div>
            )}
          </form>

          <div className={styles.results} aria-live="polite">
            {muhurtamState.loading && !muhurtam && (
              <LoadingCard label="public Muhurtam windows" />
            )}
            {muhurtamState.error && (
              <ErrorCard
                message={muhurtamState.error}
                retry={() => void loadMuhurtam()}
              />
            )}
            {muhurtam && (
              <>
                <div className={styles.resultHeading}>
                  <div>
                    <p className={styles.eyebrow}>
                      Showing {visibleMuhurtamSlots.length} of{" "}
                      {muhurtam.slots.length} general windows
                    </p>
                    <h3>Best public results</h3>
                  </div>
                  <button
                    className={styles.whatsappButton}
                    type="button"
                    onClick={shareMuhurtamOnWhatsApp}
                  >
                    <MessageCircle aria-hidden="true" size={17} />
                    Share on WhatsApp
                  </button>
                </div>
                <div className={styles.slotList}>
                  {visibleMuhurtamSlots.map((slot) => {
                    const slotDate = displayShortDate(slot.date);
                    return (
                      <article
                        className={styles.slotCard}
                        key={`${slot.date}-${slot.start}-${slot.end}`}
                      >
                        <div className={styles.slotDate}>
                          <strong>{slotDate.day}</strong>
                          <span>{slotDate.rest}</span>
                        </div>
                        <div>
                          <span className={styles.tier}>
                            {slot.tier} · score {slot.score}
                          </span>
                          <h4>
                            {slot.start}–{slot.end}
                          </h4>
                          <p>{slot.reasons.slice(0, 3).join(" · ")}</p>
                          <details>
                            <summary>What was checked?</summary>
                            <ul>
                              {[
                                ...slot.reason_groups.slot_quality,
                                ...slot.reason_groups.day_quality,
                                ...slot.reason_groups.activity_match,
                              ].map((reason) => (
                                <li key={reason}>{reason}</li>
                              ))}
                            </ul>
                            {slot.reason_groups.notes.map((note) => (
                              <p key={note}>{note}</p>
                            ))}
                          </details>
                        </div>
                      </article>
                    );
                  })}
                </div>
                {!showAllSlots && muhurtam.slots.length > 6 && (
                  <button
                    className={styles.showAllButton}
                    type="button"
                    onClick={() => setShowAllSlots(true)}
                  >
                    Show all {muhurtam.slots.length} timings
                    <ChevronRight aria-hidden="true" size={16} />
                  </button>
                )}
                {muhurtam.slots.length === 0 && (
                  <div className={styles.emptyResults}>
                    <h3>No suitable general window was found</h3>
                    <p>
                      Try a longer range or another start date. We won’t turn a
                      rejected day into a recommendation.
                    </p>
                  </div>
                )}
                <aside className={styles.upgradeCard}>
                  <div>
                    <p className={styles.eyebrow}>Make this personal</p>
                    <h3>Are these timings right for the people involved?</h3>
                    <p>
                      Saved profiles can add Tarabalam, Chandrabalam, birth
                      Rasi, Lagna and approved chart cautions without asking you
                      to re-enter birth details.
                    </p>
                  </div>
                  <Link className={styles.primaryButton} href="/auth/signin">
                    Add profile validation
                    <ChevronRight aria-hidden="true" size={16} />
                  </Link>
                </aside>
              </>
            )}
          </div>
        </section>

        <section
          className={styles.about}
          id="about"
          aria-labelledby="about-title"
        >
          <figure className={styles.portraitFrame}>
            <Image
              className={styles.portraitImage}
              src="/images/vinay-chaganti-portrait.webp"
              alt="Dr. Vinay Kumar Chaganti"
              width={1122}
              height={1402}
              sizes="(max-width: 736px) 100vw, 36vw"
            />
            <figcaption>Astrologer · Researcher · Practitioner</figcaption>
          </figure>
          <div className={styles.aboutCopy}>
            <p className={styles.eyebrow}>The astrologer behind the work</p>
            <h2 id="about-title">Dr. Vinay Kumar Chaganti</h2>
            <div className={styles.aboutBody}>
              <p>
                Vinay has studied and practised Vedic astrology for more than
                14 years and has offered over 400 consultations. His approach
                brings classical source context together with transparent
                computation—and states clearly where a calculation ends and
                considered judgement must begin.
              </p>
              <p>
                His wider academic work includes a PhD in Interpersonal
                Communication, a UGC Dr. Sarvepalli Radhakrishnan Post-Doctoral
                Fellowship at Osmania University, 20 journal publications and
                two authored books. That research discipline shapes how Astro
                Chaganti explains evidence, uncertainty and personal context.
              </p>
            </div>
            <div
              className={styles.practiceStats}
              aria-label="Astrology practice experience"
            >
              <span>
                <strong>14+</strong>
                <small>years studying and practising astrology</small>
              </span>
              <span>
                <strong>400+</strong>
                <small>consultations offered</small>
              </span>
            </div>
            <div className={styles.sourcePills}>
              <span>Classical-source context</span>
              <span>Calculation transparency</span>
              <span>Personal consultation pathway</span>
            </div>
            <Link className={styles.textLink} href="/auth/signin">
              Create your profile to begin →
            </Link>
          </div>
        </section>

        <section
          className={styles.subscribe}
          id="calendar"
          aria-labelledby="calendar-title"
        >
          <div className={styles.subscribeIntro}>
            <p className={styles.eyebrow}>A daily service, not another reminder</p>
            <h2 id="calendar-title">Carry the Panchangam in your calendar</h2>
            <p>
              Subscribe once and each day’s Tithi, Nakshatra, Muhurtas and
              special observances appear inside the calendar you already use.
              The feed keeps updating—there is nothing to download again.
            </p>
          </div>
          <div className={styles.calendarBenefits}>
            <article>
              <CalendarDays aria-hidden="true" size={21} />
              <strong>Google, Apple or Outlook</strong>
              <span>Use a standard calendar subscription.</span>
            </article>
            <article>
              <Clock3 aria-hidden="true" size={21} />
              <strong>Updated automatically</strong>
              <span>Daily context stays in your calendar.</span>
            </article>
            <article>
              <Check aria-hidden="true" size={21} />
              <strong>No account required</strong>
              <span>Subscribe once; feeds extend 18 months ahead.</span>
            </article>
          </div>

          <div className={styles.feedBuilder}>
            <div className={styles.feedBuilderHeading}>
              <div>
                <p className={styles.eyebrow}>1 · Choose your feed</p>
                <h3>What should appear in your calendar?</h3>
              </div>
              <span>22 cities · 3 calculation systems</span>
            </div>

            <div className={styles.feedSelectors}>
              <label>
                Location
                <select
                  value={feedCity}
                  onChange={(event) => {
                    setFeedCity(event.target.value);
                    setFeedCopyStatus(null);
                  }}
                >
                  {CITIES.map((item) => (
                    <option key={item.name}>{item.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Calculation system
                <select
                  value={feedSystem}
                  onChange={(event) => {
                    setFeedSystem(event.target.value);
                    setFeedCopyStatus(null);
                  }}
                >
                  {FEED_SYSTEMS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <fieldset className={styles.feedVariants}>
              <legend>Feed contents</legend>
              {FEED_VARIANTS.map((variant) => (
                <label key={variant.value || "full"}>
                  <input
                    type="radio"
                    name="calendar-feed-variant"
                    value={variant.value}
                    checked={feedVariant === variant.value}
                    onChange={() => {
                      setFeedVariant(variant.value);
                      setFeedCopyStatus(null);
                    }}
                  />
                  <span>
                    <strong>{variant.title}</strong>
                    <small>{variant.detail}</small>
                  </span>
                </label>
              ))}
            </fieldset>

            <div className={styles.feedUrlBlock}>
              <label htmlFor="calendar-feed-url">
                2 · Copy this subscription URL
              </label>
              <div className={styles.feedUrlRow}>
                <input
                  id="calendar-feed-url"
                  type="url"
                  value={feedUrl}
                  readOnly
                  onFocus={(event) => event.currentTarget.select()}
                />
                <button
                  className={styles.primaryButton}
                  type="button"
                  onClick={() => void copyFeedUrl()}
                >
                  <Copy aria-hidden="true" size={15} />
                  Copy URL
                </button>
                <a className={styles.secondaryButton} href={webcalUrl}>
                  Open in calendar
                </a>
              </div>
              {feedCopyStatus && (
                <p className={styles.feedCopyStatus} role="status">
                  {feedCopyStatus}
                </p>
              )}
              <p>
                The feed address remains stable so existing subscriptions keep
                updating even as the website experience moves here.
              </p>
            </div>

            <div className={styles.calendarInstructions}>
              <div>
                <p className={styles.eyebrow}>3 · Add it to your calendar</p>
                <div className={styles.calendarAppTabs} role="tablist">
                  {(Object.keys(CALENDAR_INSTRUCTIONS) as CalendarApp[]).map(
                    (app) => (
                      <button
                        key={app}
                        type="button"
                        role="tab"
                        aria-selected={calendarApp === app}
                        className={
                          calendarApp === app ? styles.calendarAppActive : undefined
                        }
                        onClick={() => setCalendarApp(app)}
                      >
                        {CALENDAR_INSTRUCTIONS[app].label}
                      </button>
                    ),
                  )}
                </div>
              </div>
              <div className={styles.calendarInstructionPanel} role="tabpanel">
                <h4>{CALENDAR_INSTRUCTIONS[calendarApp].label}</h4>
                <ol>
                  {CALENDAR_INSTRUCTIONS[calendarApp].steps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ol>
              </div>
            </div>
          </div>

          <p className={styles.developerNote}>
            For developers: the same calculation engine is available as{" "}
            <a
              href="https://pypi.org/project/mcp-server-panchangam/"
              target="_blank"
              rel="noreferrer"
            >
              mcp-server-panchangam on PyPI
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
