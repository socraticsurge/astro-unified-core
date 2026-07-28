"use client";

import { ArrowLeft, Clock3, LockKeyhole, MapPin, Orbit, UserRound } from "lucide-react";
import { InlineCreateForm } from "@/components/profiles/ProfileSidebar";
import styles from "./ProfileCreateExperience.module.css";

type Props = {
  onCancel?: () => void;
};

const steps = [
  {
    icon: UserRound,
    title: "Who is this chart for?",
    body: "A name and relationship keep every reading clearly attached to the right person.",
  },
  {
    icon: Clock3,
    title: "When were they born?",
    body: "Date and exact birth time establish the Ascendant, houses, and planetary positions.",
  },
  {
    icon: MapPin,
    title: "Where were they born?",
    body: "Birthplace anchors the chart; current location supports today’s local timing.",
  },
];

export function ProfileCreateExperience({ onCancel }: Props) {
  return (
    <main className={styles.root}>
      <div className={styles.orbitField} aria-hidden="true">
        <span className={styles.orbitOne} />
        <span className={styles.orbitTwo} />
        <span className={styles.orbitDot} />
      </div>

      <div className={styles.shell}>
        <header className={styles.intro}>
          {onCancel && (
            <button type="button" onClick={onCancel} className={styles.backButton}>
              <ArrowLeft size={14} aria-hidden="true" />
              Back to profiles
            </button>
          )}
          <p className={styles.eyebrow}>Create a personal astrology profile</p>
          <h1 className={styles.title}>A chart begins with one precise moment.</h1>
          <p className={styles.description}>
            Add the birth details once. Astro Chaganti will use them for the natal chart,
            personal transits, Tarabalam, Muhurtam validation, and future guidance.
          </p>
        </header>

        <div className={styles.workspace}>
          <aside className={styles.guide} aria-label="Profile creation guide">
            <div className={styles.guideMark}>
              <Orbit size={20} aria-hidden="true" />
            </div>
            <div>
              <p className={styles.guideEyebrow}>What happens next</p>
              <h2 className={styles.guideTitle}>From details to a living chart</h2>
            </div>
            <ol className={styles.steps}>
              {steps.map(({ icon: Icon, title, body }, index) => (
                <li key={title} className={styles.step}>
                  <span className={styles.stepIcon}>
                    <Icon size={15} aria-hidden="true" />
                  </span>
                  <span>
                    <strong>{index + 1}. {title}</strong>
                    <small>{body}</small>
                  </span>
                </li>
              ))}
            </ol>
            <div className={styles.privacy}>
              <LockKeyhole size={15} aria-hidden="true" />
              <p>
                <strong>Private by design.</strong>
                Birth details remain inside your account and are never shown publicly.
              </p>
            </div>
          </aside>

          <section className={styles.formCard} aria-labelledby="profile-form-title">
            <div className={styles.formHeading}>
              <p className={styles.formStep}>Profile details</p>
              <h2 id="profile-form-title">Tell us about this person</h2>
              <p>All fields marked by the browser as required must be completed.</p>
            </div>
            <InlineCreateForm onCancel={onCancel} />
          </section>
        </div>
      </div>
    </main>
  );
}
