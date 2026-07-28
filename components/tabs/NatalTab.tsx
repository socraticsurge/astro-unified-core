"use client"

import { useState } from "react"
import {
  CalendarDays,
  ChartPie,
  Clock3,
  MapPin,
  Maximize2,
  Pencil,
  Sparkles,
} from "lucide-react"
import { ProfileEditForm } from "@/components/profile/ProfileEditForm"
import { NatalChartGrid } from "@/components/unified/NatalChartGrid"
import type { Planet, SignName } from "@/components/unified/types"
import type { Profile } from "@/lib/db"
import { formatName, formatPlace } from "@/lib/display"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { ReadingActions } from "./ReadingActions"
import toolStyles from "@/components/profiles/ToolPage.module.css"
import styles from "./NatalTab.module.css"

interface NatalReadingMeta {
  natal: { id: string | null; rating: 1 | -1 | null }
}

interface NatalTabProps {
  profile?: Profile
  todayReadingOutput?: {
    chart_reading?: string
    meta?: NatalReadingMeta
  } | null
  isTodayReadingLoading?: boolean
  onExploreWithAI?: () => void
  initiallyEditing?: boolean
  chartOutput?: Record<string, unknown> | null
}

const INTERPRETATION_PREVIEW =
  "A complete written interpretation will begin with the chart’s central pattern, then connect the Ascendant, Moon, planetary strengths, major life themes, and important tensions. This preview shows the intended reading experience; it is not a reading calculated from this chart."

export function NatalTab({
  profile,
  todayReadingOutput,
  isTodayReadingLoading = false,
  onExploreWithAI,
  initiallyEditing = false,
  chartOutput,
}: NatalTabProps) {
  const [focusedChart, setFocusedChart] = useState<"d1" | "d9" | null>(null)
  const [isEditing, setIsEditing] = useState(initiallyEditing)

  const data = chartOutput?.data as Record<string, unknown> | undefined
  const planets = data?.planets as Record<string, Planet> | undefined
  const lagna = data?.lagna as Record<string, unknown> | undefined
  const lagnaSign = lagna?.sign as SignName | undefined
  const lagnaD9Sign = lagna?.d9_sign as SignName | undefined
  const panchang = data?.panchang as {
    tithi?: { name?: string; paksha?: string }
    vara?: { name?: string }
    nakshatra?: { name?: string; pada?: number }
    yoga?: { name?: string }
    karana?: string
  } | undefined

  const panchangContext = [
    {
      label: "Tithi",
      value: [panchang?.tithi?.name, panchang?.tithi?.paksha].filter(Boolean).join(" · "),
    },
    { label: "Vara", value: panchang?.vara?.name },
    {
      label: "Nakshatra",
      value: panchang?.nakshatra?.name
        ? `${panchang.nakshatra.name} · Pada ${panchang.nakshatra.pada ?? "—"}`
        : undefined,
    },
    { label: "Yoga", value: panchang?.yoga?.name },
    { label: "Karana", value: panchang?.karana },
  ]

  const generatedInterpretation = todayReadingOutput?.chart_reading?.trim() ?? ""
  const interpretationParagraphs = generatedInterpretation
    .split(/\n\s*\n/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean)
  const hasGeneratedInterpretation = interpretationParagraphs.length > 0

  return (
    <div className={toolStyles.root}>
      <section className={styles.interpretationSection} aria-labelledby="interpretation-title">
        <div className={styles.interpretationHeader}>
          <div>
            <p className={toolStyles.leadEyebrow}>Written first</p>
            <h2 id="interpretation-title" className={styles.interpretationTitle}>
              Understand the chart before studying it
            </h2>
          </div>
          <span
            className={styles.interpretationStatus}
            data-generated={hasGeneratedInterpretation ? "true" : "false"}
          >
            {hasGeneratedInterpretation
              ? "Generated for this chart"
              : isTodayReadingLoading
                ? "Interpretation preparing"
                : "Clearly marked preview"}
          </span>
        </div>

        <article className={styles.interpretationCard}>
          {hasGeneratedInterpretation ? (
            <>
              <div className={`ac-reading ${styles.generatedReading}`}>
                {interpretationParagraphs.map((paragraph, index) => (
                  <p key={`${index}-${paragraph.slice(0, 24)}`}>{paragraph}</p>
                ))}
              </div>
              <ReadingActions
                text={generatedInterpretation}
                readingId={todayReadingOutput?.meta?.natal.id ?? null}
                initialRating={todayReadingOutput?.meta?.natal.rating ?? null}
                engine="today-natal"
                shareTitle="My natal chart reading — Astro Chaganti"
              />
            </>
          ) : (
            <>
              <p className={styles.previewLabel}>Interpretation preview</p>
              <p className={`ac-reading ${styles.previewReading}`}>{INTERPRETATION_PREVIEW}</p>
              <p className={styles.previewDisclosure}>
                No personal astrological claims are being generated in this placeholder.
              </p>
            </>
          )}

          <div className={styles.interpretationActions}>
            {onExploreWithAI && (
              <button type="button" onClick={onExploreWithAI} className={styles.aiAction}>
                <Sparkles size={15} aria-hidden="true" />
                Explore this chart with AI
              </button>
            )}
          </div>
        </article>
      </section>

      <section className={styles.foundationCard} aria-labelledby="birth-foundation-title">
        <div className={styles.foundationHeader}>
          <div className={styles.foundationHeading}>
            <span className={toolStyles.leadIcon}>
              <ChartPie size={19} aria-hidden="true" />
            </span>
            <div>
              <p className={toolStyles.leadEyebrow}>Birth foundation</p>
              <h2 id="birth-foundation-title" className={styles.foundationTitle}>
                {profile ? `${formatName(profile.name)}’s birth context` : "Birth context"}
              </h2>
              <p className={styles.foundationDescription}>
                These source details establish every personal calculation shown in this workspace.
              </p>
            </div>
          </div>

          {profile && (
            <button
              type="button"
              onClick={() => setIsEditing(current => !current)}
              className={styles.editDetailsButton}
              aria-expanded={isEditing}
              aria-controls="natal-profile-edit"
            >
              <Pencil size={14} aria-hidden="true" />
              {isEditing ? "Close edit" : "Edit details"}
            </button>
          )}
        </div>

        {profile && !isEditing && (
          <div className={styles.birthFacts}>
            <div className={styles.birthFact}>
              <CalendarDays size={15} aria-hidden="true" />
              <span>
                <small>Date of birth</small>
                <strong>{profile.date_of_birth}</strong>
              </span>
            </div>
            <div className={styles.birthFact}>
              <Clock3 size={15} aria-hidden="true" />
              <span>
                <small>Time of birth</small>
                <strong>{profile.time_of_birth}</strong>
              </span>
            </div>
            <div className={styles.birthFact}>
              <MapPin size={15} aria-hidden="true" />
              <span>
                <small>Place of birth</small>
                <strong>{formatPlace(profile.place_of_birth)}</strong>
              </span>
            </div>
            <div className={styles.birthFact}>
              <MapPin size={15} aria-hidden="true" />
              <span>
                <small>Current location</small>
                <strong>
                  {profile.current_location ? formatPlace(profile.current_location) : "Not set"}
                </strong>
              </span>
            </div>
          </div>
        )}

        {profile && isEditing && (
          <div id="natal-profile-edit" className={styles.inlineEdit}>
            <div className={styles.inlineEditIntro}>
              <p className={styles.inlineEditTitle}>Edit birth details</p>
              <p>
                Saving changes recalculates the chart, birth Panchangam, and every
                profile-based result.
              </p>
            </div>
            <ProfileEditForm profile={profile} onCancel={() => setIsEditing(false)} />
          </div>
        )}

        <div className={styles.panchangBlock}>
          <div className={styles.subsectionHeading}>
            <p className={styles.subsectionEyebrow}>Panchangam at birth</p>
            <p className={styles.subsectionHint}>
              The lunar-day context computed from the birth details above.
            </p>
          </div>
          {panchang ? (
            <dl className={styles.panchangGrid}>
              {panchangContext.map(item => (
                <div key={item.label} className={styles.panchangItem}>
                  <dt>{item.label}</dt>
                  <dd>{item.value || "—"}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className={styles.pendingText}>Calculating the birth Panchangam…</p>
          )}
        </div>
      </section>

      <section className={toolStyles.section} aria-labelledby="natal-charts-title">
        <div className={toolStyles.sectionHeader}>
          <h2 id="natal-charts-title" className={toolStyles.sectionTitle}>D1 and D9 charts</h2>
          <p className={toolStyles.sectionHint}>
            Rasi is the natal foundation; Navamsa refines strength and dharma.
          </p>
        </div>

        {planets ? (
          <div className={toolStyles.chartGrid}>
            <div className={`${toolStyles.chartCard} ${styles.chartCard}`}>
              <button
                type="button"
                className={styles.focusButton}
                onClick={() => setFocusedChart("d1")}
                aria-label="Open D1 Rasi chart in focused view"
              >
                <Maximize2 size={14} aria-hidden="true" />
                Focus
              </button>
              <NatalChartGrid
                planets={planets}
                lagnaSign={lagnaSign}
                signKey="sign"
                label="D1 — Rasi"
              />
            </div>
            <div className={`${toolStyles.chartCard} ${styles.chartCard}`}>
              <button
                type="button"
                className={styles.focusButton}
                onClick={() => setFocusedChart("d9")}
                aria-label="Open D9 Navamsa chart in focused view"
              >
                <Maximize2 size={14} aria-hidden="true" />
                Focus
              </button>
              <NatalChartGrid
                planets={planets}
                lagnaSign={lagnaD9Sign}
                signKey="d9_sign"
                label="D9 — Navamsa"
              />
            </div>
          </div>
        ) : (
          <div className={styles.chartPending}>Loading the calculated birth charts…</div>
        )}
      </section>

      <Dialog
        open={focusedChart !== null}
        onOpenChange={open => {
          if (!open) setFocusedChart(null)
        }}
      >
        <DialogContent className={styles.focusDialog}>
          <div className={styles.focusHeader}>
            <p className={toolStyles.leadEyebrow}>Focused chart</p>
            <DialogTitle className={styles.focusTitle}>
              {focusedChart === "d9" ? "D9 · Navamsa" : "D1 · Rasi"}
            </DialogTitle>
            <p className={styles.focusHint}>
              {profile ? `${formatName(profile.name)} · ` : ""}
              {focusedChart === "d9"
                ? "planetary strength and relationship dharma"
                : "natal signs, houses, and planetary placements"}
            </p>
          </div>
          {planets && focusedChart && (
            <div className={styles.focusChart}>
              <NatalChartGrid
                planets={planets}
                lagnaSign={focusedChart === "d9" ? lagnaD9Sign : lagnaSign}
                signKey={focusedChart === "d9" ? "d9_sign" : "sign"}
                label={focusedChart === "d9" ? "D9 — Navamsa" : "D1 — Rasi"}
                expanded
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
