import Link from "next/link";
import { Button } from "@/components/ui/button";

export function LandingPage() {
  return (
    <div className="space-y-24 py-12">

      {/* Hero */}
      <section className="text-center space-y-6 pt-8">
        <div className="text-6xl">✦</div>
        <h1 className="font-heading text-6xl font-medium tracking-tight">Astro Chaganti</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Detailed Vedic birth charts, auspicious timing, and family-level astrological
          analysis — by Dr. Vinay Kumar Chaganti.
        </p>
        <div className="flex justify-center pt-2">
          <Link href="/auth/signin">
            <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-amber-950 font-semibold px-8">
              Sign In with Google
            </Button>
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          Free · No credit card · Up to 10 profiles
        </p>
      </section>

      {/* Three-column feature overview */}
      <section className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: "🪐",
              title: "Birth Chart Analysis",
              body: "Sidereal Lahiri charts with 14 divisional vargas, Panchang, Dashas, Yogas, Shadbala, Ashtakavarga, and more — all in one view.",
            },
            {
              icon: "📅",
              title: "Muhurtha",
              body: "Find auspicious windows for Marriage, House-warming, Travel, or any event — computed from your current location.",
            },
            {
              icon: "👨‍👩‍👧‍👦",
              title: "Family Tools",
              body: "Compatibility analysis between any two profiles. Create charts for your entire family and compare them side by side.",
            },
          ].map(({ icon, title, body }) => (
            <div key={title} className="border border-white/10 rounded-xl p-5 bg-white/5 flex flex-col gap-2">
              <div className="text-3xl">{icon}</div>
              <div className="font-semibold text-foreground">{title}</div>
              <div className="text-sm text-muted-foreground leading-relaxed">{body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* What this is — full feature grid */}
      <section className="max-w-4xl mx-auto">
        <h2 className="font-heading text-3xl font-medium mb-2">What's inside every chart</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-3xl">
          Every profile generates a complete Vedic analysis using Swiss Ephemeris calculations
          and the sidereal Lahiri ayanamsha.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            ["🔭 Lagna & 14 divisional charts", "Ascendant in D1 with all classical vargas through D60."],
            ["🪐 Planetary positions", "Sign, degree, nakshatra, pada, dignity, retrograde, combust — for all 9 grahas."],
            ["⏳ Vimshottari Dasha (5 levels)", "Maha → Antar → Pratyantar → Sukshma → Prana, with full timeline."],
            ["🌟 Yogas", "Major combinations — Malavya, Gajakesari, Raj, Lakshmi — with descriptions."],
            ["📅 Panchang", "Tithi, Vara, Nakshatra, Yoga, Karana at the moment of birth."],
            ["💪 Shadbala & Avasthas", "Six-fold planetary strength and planetary state (Bala → Mrita)."],
            ["🎯 Jaimini & Karakamsha", "Atmakaraka, Karakamsha sign, Ishta Devata."],
            ["📊 Ashtakavarga", "SAV totals and planet-wise Bhinnashtakavarga across all 12 signs."],
            ["🚶 Bhava Chalit & Graha Yuddha", "House-shift analysis and planetary war detection."],
            ["🌊 Gandanta & Arudha Padas", "Karmic junction planets and all 12 Arudha Padas."],
            ["🌙 Transit Analysis", "Current planetary transits overlaid on the natal chart, with Sade Sati status."],
            ["💼 Career Analysis (D10)", "Dashamsha-based career themes and planetary domain significations."],
          ].map(([title, body]) => (
            <div key={String(title)} className="border border-white/10 rounded-lg p-4 bg-white/5">
              <div className="font-semibold text-blue-300 text-sm">{title}</div>
              <div className="text-sm text-muted-foreground mt-1">{body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How to use it */}
      <section className="max-w-3xl mx-auto">
        <h2 className="font-heading text-3xl font-medium mb-6">How to use it</h2>
        <ol className="space-y-4">
          {[
            ["1", "Sign in with Google", "Your profiles are saved privately. Nothing is shared."],
            ["2", "Create birth profiles", "Add yourself, then your family — parents, spouse, children, siblings. Astrological forces work at the family level."],
            ["3", "Open any profile", "The full chart is computed automatically. Tap the ⓘ button on any section to read the classical Vedic interpretation for your specific chart."],
            ["4", "Use Compatibility & Muhurtha", "Compare any two profiles for relationship compatibility. Use Muhurtha to find auspicious dates for events."],
          ].map(([n, title, body]) => (
            <li key={n} className="flex gap-4">
              <div className="shrink-0 w-9 h-9 rounded-full bg-amber-950/40 border border-amber-700/50 flex items-center justify-center font-bold text-amber-300">
                {n}
              </div>
              <div>
                <div className="font-semibold">{title}</div>
                <div className="text-sm text-muted-foreground mt-0.5">{body}</div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* About the astrologer */}
      <section className="max-w-3xl mx-auto">
        <h2 className="font-heading text-3xl font-medium mb-4">About the astrologer</h2>
        <div className="border border-white/10 rounded-lg p-6 bg-white/5 space-y-4">
          <p className="text-base leading-relaxed">
            <span className="font-semibold">Dr. Vinay Kumar Chaganti </span>brings a
            researcher&apos;s discipline to his study and practice of Vedic astrology.
            His approach is methodical, grounded in the classical tradition, and
            attentive to the precision of sidereal calculations.
          </p>
          <p className="text-sm text-foreground/90 leading-relaxed">
            He treats each consultation as a careful research engagement, rooted in the
            specifics of the chart rather than generic prediction.
          </p>
          <p className="text-sm text-muted-foreground">
            This site is a free tool he offers to make detailed birth charts easy to
            generate. Personal consultations are available separately, by appointment.
          </p>
        </div>
      </section>

      {/* Family recommendation */}
      <section className="max-w-3xl mx-auto">
        <div className="border border-amber-700/40 rounded-lg p-6 bg-amber-950/20">
          <h2 className="font-heading text-2xl font-medium mb-3 text-amber-300">
            Dr. Chaganti recommends: build out your family&apos;s chart, not just your own
          </h2>
          <p className="text-sm text-foreground/90 leading-relaxed">
            Astrological forces affect a family as a unit, not just an individual.
            For a fuller picture, create profiles for everyone whose chart matters to
            your situation — parents, spouse, children, siblings, and anyone else
            relevant to the question you want to ask.
          </p>
          <p className="text-sm text-foreground/90 leading-relaxed mt-3">
            Before requesting a consultation, please share your context and question
            in as much detail as you can. The more specific the question, the more
            useful the reading will be.
          </p>
        </div>
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
              a: "Western astrology typically uses the Tropical zodiac, which is based on the seasons. Vedic astrology uses the Sidereal zodiac, which is fixed to the stars. Due to the Earth's axial precession, these two systems are currently offset by approximately 24 degrees. This \"shift\" (Ayanamsha) means your planets and Ascendant (Lagna) will likely move back by nearly one full sign compared to Western charts.",
            },
            {
              q: "What should I do if my exact birth village isn't listed in the search?",
              a: "Our geocoder maps to a global database of cities and districts. If your specific location is missing, please select the nearest recognized town or district headquarters. From a mathematical standpoint, coordinates within a 15–20 km radius are sufficient; they do not impact the Lagna or Varga calculations significantly.",
            },
            {
              q: "What defines Dr. Chaganti's approach to a reading?",
              a: "Dr. Chaganti approaches astrology as a systemic research engagement rather than a generic predictive service. By applying systems thinking to classical Parashari principles, the goal is to decode the underlying architecture of your life. We define success within your karmic constraints, focusing on planetary strengths and dasha timing. We work our way collaboratively.",
            },
            {
              q: "How should I prepare my context for a consultation?",
              a: (
                <div className="space-y-3">
                  <p>
                    To prepare for a consultation, it is best to move away from vague, passive questions and toward a structured Life Problem Statement.
                  </p>
                  <p>
                    For example, instead of asking a broad question like "Which stream should I study?", a high-value inquiry would be: "I am currently at a crossroads between pursuing Data Science or Management; based on my chart, does my intellectual architecture support a career in deep technical research, or am I better aligned for a leadership path involving strategic growth?" This is effective because it identifies the specific options you are considering and allows the analysis to focus on your inherent strengths and the timing of your dasha cycles.
                  </p>
                  <p>
                    Try using a three-point framework: the Observation (what is happening now), the Constraint (the main obstacle you face), and the Objective (what success looks like to you).
                  </p>
                </div>
              ),
            },
            {
              q: "What is the cost, and how do I set up an appointment?",
              a: "Personal consultations are conducted as deep-dive research sessions and are available by appointment, typically on weekends. To initiate the process, please email astrochaganti@gmail.com with your specific Life Problem Statement and the names of the profiles you have created on the platform. Once your context is reviewed, you will receive a response with current professional fees and a calendar link to book your session.",
            },
            {
              q: "How is my personal birth data handled?",
              a: "In the Vedic tradition, birth data is considered sacred and sensitive. Your data is stored in a private, secure environment. It is visible only to you and is used by Dr. Chaganti solely for the purpose of your requested research or consultation. We do not engage in data sharing or commercial profiling.",
            },
            {
              q: "How many profiles can I create?",
              a: "You can generate up to 10 birth profiles completely free of cost. We encourage you to create profiles for yourself and your immediate family members to get a fuller astrological picture.",
            },
          ].map(({ q, a }) => (
            <details
              key={q}
              className="border border-white/10 rounded-lg bg-white/5 group"
            >
              <summary className="cursor-pointer list-none px-4 py-3 font-medium flex items-center justify-between">
                <span>{q}</span>
                <span className="text-muted-foreground text-xs ml-3 group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <div className="px-4 pb-4 pt-1 text-sm text-muted-foreground leading-relaxed">
                {a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="max-w-2xl mx-auto text-center">
        <h2 className="font-heading text-3xl font-medium mb-3">Contact</h2>
        <p className="text-sm text-muted-foreground mb-4">
          For appointments, questions, or anything else:
        </p>
        <a
          href="mailto:astrochaganti@gmail.com"
          className="inline-block border border-white/10 rounded-lg px-6 py-3 bg-white/5 hover:bg-white/10 font-mono text-base transition-colors"
        >
          astrochaganti@gmail.com
        </a>
        <p className="text-xs text-muted-foreground mt-4">
          Email is the best way to reach Dr. Chaganti. Ask for a calendar link to set up an
          appointment.
        </p>
      </section>

    </div>
  );
}
