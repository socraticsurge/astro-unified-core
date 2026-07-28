"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Clock3, Copy, MapPin, MoonStar, RefreshCw, Sparkles } from "lucide-react";
import {
  type PanchangamData,
  type Rasi,
  type RasiPhalaluData,
  type ServiceEnvelope,
} from "@/lib/panchangam/contracts";
import { toast } from "@/components/ui/Toast";
import styles from "./DailyCommons.module.css";

type Loadable<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

type HoroscopeLoadable = Loadable<ServiceEnvelope<RasiPhalaluData>> & {
  rasi: Rasi | null;
};

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

function todayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function locationCity(location?: string | null) {
  const city = location?.split(",")[0]?.trim();
  return city || "Hyderabad";
}

function feedSlug(value: string) {
  return value.toLowerCase().replace(/\s+/g, "-").replace(/,/g, "");
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
}

type Props = {
  currentLocation?: string | null;
  janmaRasi: Rasi | null;
  profileName: string;
};

export function DailyCommons({ currentLocation, janmaRasi, profileName }: Props) {
  const date = useMemo(() => todayIso(), []);
  const city = useMemo(() => locationCity(currentLocation), [currentLocation]);
  const [day, setDay] = useState<Loadable<ServiceEnvelope<PanchangamData>>>({
    data: null,
    loading: true,
    error: null,
  });
  const [reading, setReading] = useState<HoroscopeLoadable>({
    data: null,
    loading: false,
    error: null,
    rasi: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({
      date,
      city,
      system: "drik",
      ayanamsa: "lahiri",
    });
    fetch(`/api/public/panchangam?${query}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Panchangam is temporarily unavailable.");
        return payload as ServiceEnvelope<PanchangamData>;
      })
      .then((payload) => setDay({ data: payload, loading: false, error: null }))
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setDay({ data: null, loading: false, error: error instanceof Error ? error.message : "Panchangam is temporarily unavailable." });
      });
    return () => controller.abort();
  }, [city, date]);

  useEffect(() => {
    if (!janmaRasi) return;

    const controller = new AbortController();
    const query = new URLSearchParams({
      date,
      city,
      rasi: janmaRasi,
      ayanamsa: "lahiri",
    });
    fetch(`/api/public/horoscope?${query}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Daily horoscope is temporarily unavailable.");
        return payload as ServiceEnvelope<RasiPhalaluData>;
      })
      .then((payload) => setReading({
        data: payload,
        loading: false,
        error: null,
        rasi: janmaRasi,
      }))
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setReading({
          data: null,
          loading: false,
          error: error instanceof Error ? error.message : "Daily horoscope is temporarily unavailable.",
          rasi: janmaRasi,
        });
      });
    return () => controller.abort();
  }, [city, date, janmaRasi]);

  const panchangam = day.data?.data;
  const readingMatchesProfile = Boolean(janmaRasi && reading.rasi === janmaRasi);
  const horoscope = readingMatchesProfile ? reading.data?.data : null;
  const readingLoading = Boolean(janmaRasi) && (!readingMatchesProfile || reading.loading);
  const readingError = janmaRasi
    ? (readingMatchesProfile ? reading.error : null)
    : "Janma Rasi is unavailable until the birth chart is refreshed.";
  const feedUrl = `https://panchangam.astrochaganti.com/feeds/${feedSlug(city)}-drik.ics`;

  async function copyFeed() {
    try {
      await navigator.clipboard.writeText(feedUrl);
      toast("Calendar subscription URL copied", "success");
    } catch {
      toast("Could not copy the calendar URL", "error");
    }
  }

  const traditionalLine = panchangam
    ? [
        `${panchangam.metadata.samvatsara} Nama Samvatsara`,
        panchangam.metadata.ayanam,
        `${panchangam.metadata.rituvu} Rituvu`,
        `${panchangam.metadata.maasam} Maasam`,
        `${panchangam.metadata.paksham} Paksham`,
        panchangam.metadata.vaaram,
      ].join(" · ")
    : "";

  return (
    <section className={styles.root} aria-labelledby="daily-commons-title">
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>Shared daily guidance</p>
          <h2 id="daily-commons-title">The day beyond the personal chart</h2>
          <p>
            The Panchangam is shared for the selected place. Moon-sign guidance
            automatically uses {profileName}&apos;s Janma Rasi from the birth chart.
          </p>
        </div>
        <div className={styles.dayContext}>
          <CalendarDays size={15} aria-hidden="true" />
          <span><strong>{formatDate(date)}</strong>{city} · Drik Ganita</span>
        </div>
      </header>

      <div className={styles.grid}>
        <article className={styles.horoscope}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}><MoonStar size={17} aria-hidden="true" /></span>
            <div>
              <p className={styles.cardEyebrow}>Your daily moon-sign guidance</p>
              <h3>{profileName}&apos;s Janma Rasi</h3>
            </div>
          </div>
          {janmaRasi && (
            <p className={styles.rasiContext}>
              <span>{RASI_SYMBOLS[janmaRasi]}</span>
              <strong>{janmaRasi}</strong>
              <small>Derived from the selected birth chart</small>
            </p>
          )}
          {readingLoading && (
            <p className={styles.state}><RefreshCw size={13} className={styles.spin} aria-hidden="true" />Reading today&apos;s sky…</p>
          )}
          {readingError && <p className={styles.error} role="status">{readingError}</p>}
          {horoscope && (
            <div className={styles.reading}>
              <div className={styles.readingMetric}>
                <span>{janmaRasi ? RASI_SYMBOLS[janmaRasi] : "◌"}</span>
                <p><strong>{horoscope.day_quality}</strong>Day quality · Moon in house {horoscope.moon_house}</p>
              </div>
              <p>{horoscope.lines.slice(0, 4).join(" ")}</p>
              {horoscope.lines.length > 4 && (
                <Link className={styles.moreGuidance} href="/#today">
                  Read the complete daily guidance →
                </Link>
              )}
            </div>
          )}
        </article>

        <article className={styles.panchangam}>
          <div className={styles.cardHeader}>
            <span className={styles.cardIcon}><Clock3 size={17} aria-hidden="true" /></span>
            <div>
              <p className={styles.cardEyebrow}>Daily Panchangam</p>
              <h3>Today&apos;s five limbs</h3>
            </div>
          </div>

          {day.loading && <p className={styles.state}>Calculating today&apos;s Panchangam…</p>}
          {day.error && (
            <p className={styles.error} role="status">
              {day.error}
            </p>
          )}
          {panchangam && (
            <>
              <p className={styles.traditional}>{traditionalLine}</p>
              <dl className={styles.fiveLimbs}>
                <div><dt>Tithi</dt><dd>{panchangam.pancha_anga.tithi.name}</dd></div>
                <div><dt>Nakshatra</dt><dd>{panchangam.pancha_anga.nakshatra.name}</dd></div>
                <div><dt>Yoga</dt><dd>{panchangam.pancha_anga.yoga.name}</dd></div>
                <div><dt>Karana</dt><dd>{panchangam.pancha_anga.karana[0]?.name ?? "—"}</dd></div>
              </dl>
              <div className={styles.windows}>
                <span><strong>Abhijit</strong>{panchangam.auspicious.abhijit_muhurta?.start ?? "—"}–{panchangam.auspicious.abhijit_muhurta?.end ?? "—"}</span>
                <span><strong>Rahu Kalam</strong>{panchangam.inauspicious.rahu_kalam?.start ?? "—"}–{panchangam.inauspicious.rahu_kalam?.end ?? "—"}</span>
              </div>
            </>
          )}
        </article>
      </div>

      <article className={styles.calendar}>
        <span className={styles.calendarIcon}><Sparkles size={18} aria-hidden="true" /></span>
        <div>
          <p className={styles.cardEyebrow}>Calendar subscription</p>
          <h3>Carry the Panchangam into the calendar you already use.</h3>
          <p>
            Subscribe once for {city}. Daily Tithi, Nakshatra, Muhurtas, festivals,
            and observances continue updating automatically.
          </p>
        </div>
        <button type="button" onClick={() => void copyFeed()} className={styles.copyButton}>
          <Copy size={14} aria-hidden="true" />
          Copy subscription URL
        </button>
        <a className={styles.openButton} href={feedUrl.replace("https://", "webcal://")}>
          <MapPin size={14} aria-hidden="true" />
          Open in calendar
        </a>
      </article>
    </section>
  );
}
