import Link from "next/link";
import { Button } from "@/components/ui/button";

export function LandingPage() {
  return (
    <div className="space-y-24 py-12">

      {/* Hero */}
      <section className="text-center space-y-6 pt-8">
        <div className="text-6xl">✦</div>
        <h1 className="font-heading text-5xl sm:text-6xl font-medium tracking-tight">Astro Chaganti</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Vedic astrology consultations by Dr. Vinay Kumar Chaganti — grounded in
          classical tradition, precise sidereal calculation, and a researcher&apos;s rigor.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-2">
          <Link href="/auth/signin">
            <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-amber-950 font-semibold px-8">
              Generate Your Chart — Free
            </Button>
          </Link>
          <a href="mailto:astrochaganti@gmail.com">
            <Button size="lg" variant="outline" className="px-8 border-white/20 hover:bg-white/5">
              Request a Consultation
            </Button>
          </a>
        </div>
        <p className="text-xs text-muted-foreground">
          Sign in with Google · Up to 10 family profiles · No credit card
        </p>
      </section>

      {/* The journey: chart is the starting point, consultation is the destination */}
      <section className="max-w-3xl mx-auto text-center space-y-4">
        <p className="text-base text-foreground/80 leading-relaxed">
          This platform generates a complete Vedic birth chart for you and your family —
          free of charge. The chart is the foundation. What you do with it is where
          Dr. Chaganti&apos;s expertise comes in.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          A personal consultation goes beyond the printout: it synthesizes your chart
          against your specific life question, identifies the planetary forces at work,
          and gives you a grounded, research-based answer.
        </p>
      </section>

      {/* Consultation areas — the "why" */}
      <section className="max-w-4xl mx-auto">
        <h2 className="font-heading text-3xl font-medium mb-2 text-center">What people consult Dr. Chaganti about</h2>
        <p className="text-sm text-muted-foreground text-center mb-8 max-w-2xl mx-auto">
          Every consultation is anchored to the charts you create here. These are the most
          common areas where classical Vedic analysis makes a real difference.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            {
              icon: "💍",
              title: "Relationships & Marriage",
              points: [
                "Compatibility between two charts",
                "Auspicious marriage timing (Muhurtha)",
                "Family dynamics across multiple charts",
                "Upapada, 7th house, and Venus analysis",
              ],
            },
            {
              icon: "🎯",
              title: "Career & Education",
              points: [
                "D10 Dashamsha career architecture",
                "Which field suits your planetary makeup",
                "Timing opportunities via dasha cycles",
                "Education stream or professional pivot",
              ],
            },
            {
              icon: "⏳",
              title: "Life Timing & Events",
              points: [
                "Muhurtha for house-warming, travel, purchase",
                "Reading your current dasha period",
                "Transit impacts on your natal chart",
                "When to act — and when to wait",
              ],
            },
          ].map(({ icon, title, points }) => (
            <div key={title} className="border border-white/10 rounded-xl p-5 bg-white/5 flex flex-col gap-3">
              <div className="text-3xl">{icon}</div>
              <div className="font-semibold text-foreground text-base">{title}</div>
              <ul className="space-y-1.5">
                {points.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-amber-500 mt-0.5 shrink-0">·</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* How the process works */}
      <section className="max-w-3xl mx-auto">
        <h2 className="font-heading text-3xl font-medium mb-6">How it works</h2>
        <ol className="space-y-5">
          {[
            [
              "1",
              "Create your profiles — free",
              "Sign in with Google and add birth profiles for yourself and your family. The full Vedic chart is computed automatically for each profile: lagna, dashas, yogas, divisional charts, and more.",
            ],
            [
              "2",
              "Explore your charts",
              "Every section has a ⓘ button with the classical Vedic interpretation for your specific chart. Tap it to understand what each placement, yoga, or dasha means.",
            ],
            [
              "3",
              "Bring your question to Dr. Chaganti",
              "When you have a specific life question, email astrochaganti@gmail.com with your profiles and a structured Life Problem Statement. Dr. Chaganti reviews the context and confirms appointment fees and availability.",
            ],
            [
              "4",
              "The consultation",
              "A deep-dive research session built around your charts and your question — not a generic reading. You leave with a specific, actionable synthesis.",
            ],
          ].map(([n, title, body]) => (
            <li key={n} className="flex gap-4">
              <div className="shrink-0 w-9 h-9 rounded-full bg-amber-950/40 border border-amber-700/50 flex items-center justify-center font-bold text-amber-300">
                {n}
              </div>
              <div>
                <div className="font-semibold">{title}</div>
                <div className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{body}</div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* About the astrologer */}
      <section className="max-w-3xl mx-auto">
        <h2 className="font-heading text-3xl font-medium mb-4">About Dr. Chaganti</h2>
        <div className="border border-white/10 rounded-lg p-6 bg-white/5 space-y-4">
          <p className="text-base leading-relaxed">
            <span className="font-semibold">Dr. Vinay Kumar Chaganti </span>brings a
            researcher&apos;s discipline to his study and practice of Vedic astrology.
            His approach is methodical, grounded in the classical Parashari tradition, and
            attentive to the precision of sidereal calculations.
          </p>
          <p className="text-sm text-foreground/90 leading-relaxed">
            He treats each consultation as a careful research engagement, rooted in the
            specifics of the chart rather than generic prediction. The goal is not to tell
            you what will happen — but to decode the architecture of your situation and
            identify where your agency lies.
          </p>
          <p className="text-sm text-muted-foreground">
            This platform is a free tool he offers so that birth charts are easy to
            generate before a session. Consultations are available separately, by appointment.
          </p>
        </div>
      </section>

      {/* Family recommendation */}
      <section className="max-w-3xl mx-auto">
        <div className="border border-amber-700/40 rounded-lg p-6 bg-amber-950/20">
          <h2 className="font-heading text-2xl font-medium mb-3 text-amber-300">
            Build out your family&apos;s charts, not just your own
          </h2>
          <p className="text-sm text-foreground/90 leading-relaxed">
            Astrological forces act on a family as a unit. Before a consultation, create
            profiles for everyone relevant to your question — parents, spouse, children,
            siblings. A marriage compatibility question needs both charts. A family decision
            needs the full picture. The more context you bring, the more precise the reading.
          </p>
          <p className="text-sm text-muted-foreground mt-3">
            You can create up to 10 profiles at no cost.
          </p>
        </div>
      </section>

      {/* What the chart includes — collapsed, for those who want details */}
      <section className="max-w-3xl mx-auto">
        <details className="border border-white/10 rounded-lg bg-white/5 group">
          <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between font-heading text-lg font-medium">
            <span>What's computed in every chart</span>
            <span className="text-muted-foreground text-xs group-open:rotate-180 transition-transform">▾</span>
          </summary>
          <div className="px-5 pb-5 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                ["Lagna & 14 divisional charts", "Ascendant in D1 with vargas through D60."],
                ["Planetary positions", "Sign, degree, nakshatra, pada, dignity, retrograde, combust."],
                ["Vimshottari Dasha (5 levels)", "Maha → Antar → Pratyantar → Sukshma → Prana."],
                ["Yogas", "Major combinations with descriptions."],
                ["Panchang", "Tithi, Vara, Nakshatra, Yoga, Karana at birth."],
                ["Shadbala & Avasthas", "Six-fold strength and planetary state."],
                ["Jaimini & Karakamsha", "Atmakaraka, Karakamsha sign, Ishta Devata."],
                ["Ashtakavarga", "SAV totals and Bhinnashtakavarga."],
                ["Bhava Chalit & Graha Yuddha", "House shifts and planetary war."],
                ["Gandanta, Arudha Padas, Upapada", "Karmic junctions and relationship indicators."],
                ["Transit Analysis", "Current transits overlaid on natal chart."],
                ["Career Analysis (D10)", "Dashamsha-based career themes."],
              ].map(([title, body]) => (
                <div key={title} className="border border-white/10 rounded-lg p-3 bg-white/5">
                  <div className="font-semibold text-blue-300 text-xs">{title}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{body}</div>
                </div>
              ))}
            </div>
          </div>
        </details>
      </section>

      {/* FAQs */}
      <section className="max-w-3xl mx-auto">
        <h2 className="font-heading text-3xl font-medium mb-6">Frequently asked questions</h2>
        <div className="space-y-2">
          {[
            {
              q: "Which Ayanamsha and Zodiac system does this platform use?",
              a: "This platform strictly utilizes the Sidereal Zodiac with the Chitra Paksha (Lahiri) Ayanamsha, the gold standard for Vedic Astrology (Jyotish). By integrating the Swiss Ephemeris, we provide planetary positions with sub-second accuracy, ensuring that your divisional charts (Vargas) are calculated with the highest possible mathematical integrity.",
            },
            {
              q: "Why does my chart look different here compared to Western astrology apps?",
              a: "Western astrology uses the Tropical zodiac (based on seasons). Vedic astrology uses the Sidereal zodiac (fixed to the stars). Due to the Earth's axial precession, these systems are currently offset by approximately 24 degrees — meaning your planets and Lagna will likely fall nearly one full sign back compared to Western charts.",
            },
            {
              q: "What should I do if my exact birth village isn't listed?",
              a: "Our geocoder maps to a global database of cities and districts. If your specific location is missing, select the nearest recognized town or district headquarters. Coordinates within a 15–20 km radius are sufficient — they do not materially impact the Lagna or Varga calculations.",
            },
            {
              q: "How should I prepare for a consultation?",
              a: (
                <div className="space-y-2">
                  <p>Move away from vague questions toward a structured Life Problem Statement. Instead of "Which stream should I study?", try: "I am at a crossroads between Data Science and Management — does my chart support deep technical research or strategic leadership?"</p>
                  <p>Use a three-point framework: <span className="text-foreground/80">Observation</span> (what is happening), <span className="text-foreground/80">Constraint</span> (the main obstacle), <span className="text-foreground/80">Objective</span> (what success looks like). Include birth profiles of all relevant family members.</p>
                </div>
              ),
            },
            {
              q: "What is the cost, and how do I set up an appointment?",
              a: "Consultations are conducted as deep-dive research sessions, available by appointment — typically on weekends. Email astrochaganti@gmail.com with your Life Problem Statement and the names of your profiles. You will receive current fees and a calendar link once your context is reviewed.",
            },
            {
              q: "How is my personal birth data handled?",
              a: "Birth data is considered sacred and sensitive in the Vedic tradition. Your data is stored privately and is visible only to you. It is used by Dr. Chaganti solely for your requested consultation. We do not share data or engage in commercial profiling.",
            },
            {
              q: "How many profiles can I create?",
              a: "Up to 10 birth profiles, completely free. We encourage you to create profiles for your immediate family to bring a fuller picture to any consultation.",
            },
          ].map(({ q, a }) => (
            <details key={q} className="border border-white/10 rounded-lg bg-white/5 group">
              <summary className="cursor-pointer list-none px-4 py-3 font-medium flex items-center justify-between">
                <span>{q}</span>
                <span className="text-muted-foreground text-xs ml-3 group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <div className="px-4 pb-4 pt-1 text-sm text-muted-foreground leading-relaxed">{a}</div>
            </details>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="max-w-2xl mx-auto text-center space-y-4">
        <h2 className="font-heading text-3xl font-medium">Request a consultation</h2>
        <p className="text-sm text-muted-foreground">
          Email Dr. Chaganti with your profiles and your Life Problem Statement.
        </p>
        <a
          href="mailto:astrochaganti@gmail.com"
          className="inline-block border border-white/10 rounded-lg px-6 py-3 bg-white/5 hover:bg-white/10 font-mono text-base transition-colors"
        >
          astrochaganti@gmail.com
        </a>
        <p className="text-xs text-muted-foreground">
          Appointments are typically on weekends. Dr. Chaganti will confirm fees and share a calendar link.
        </p>
      </section>

    </div>
  );
}
