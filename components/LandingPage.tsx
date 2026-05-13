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
          Vedic astrology consultations by Dr. Vinay Kumar Chaganti — rooted in
          classical tradition, precise calculation, and real insight into your
          specific situation.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-2">
          <Link href="/auth/signin">
            <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-amber-950 font-semibold px-8">
              Explore Your Chart — Free
            </Button>
          </Link>
          <Link href="/auth/signin">
            <Button size="lg" variant="outline" className="px-8 border-white/20 hover:bg-white/5">
              Ask a Question
            </Button>
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          Sign in with Google · Up to 10 family profiles · No credit card required
        </p>
      </section>

      {/* The journey */}
      <section className="max-w-3xl mx-auto text-center space-y-4">
        <p className="text-base text-foreground/80 leading-relaxed">
          This platform generates a complete Vedic birth chart for you and your
          family — free of charge. The chart is the foundation. What you do with
          it is where Dr. Chaganti&apos;s expertise comes in.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Once your profiles are set up, you can submit a question directly in
          the app. Dr. Chaganti reviews your chart alongside your specific
          situation and responds in writing — a focused answer, not a generic
          reading.
        </p>
      </section>

      {/* Consultation areas — all 8 life areas */}
      <section className="max-w-4xl mx-auto">
        <h2 className="font-heading text-3xl font-medium mb-2 text-center">What people ask Dr. Chaganti about</h2>
        <p className="text-sm text-muted-foreground text-center mb-8 max-w-2xl mx-auto">
          Every consultation is anchored to the charts you create here. These
          are the eight life areas where classical Vedic analysis makes a real
          difference.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: "🎯",
              title: "Career & Profession",
              body: "Your birth chart holds clues about the kind of work where you'll thrive and when career moves are best timed. The D10 Dashamsha reveals your professional landscape — whether to stay, switch roles, or build something of your own.",
            },
            {
              icon: "💰",
              title: "Wealth & Finances",
              body: "Not everyone accumulates wealth the same way — your chart points to the right vehicle and the right timing. Some charts favour employment, others business, others investments. Find out what your dasha cycles say about financial growth.",
            },
            {
              icon: "💍",
              title: "Marriage & Partnership",
              body: "Timing, compatibility, and the kind of partner your chart draws in — Vedic astrology has specific tools for all three. Whether you're assessing a relationship or wondering when marriage is likely, the 7th house and Navamsha tell the story.",
            },
            {
              icon: "🏡",
              title: "Family & Children",
              body: "Questions about starting a family, timing children, or understanding family friction often have clear planetary signatures. The 5th house and family charts together give Dr. Chaganti a precise lens on your situation.",
            },
            {
              icon: "🌿",
              title: "Health & Wellbeing",
              body: "Vedic astrology can identify which dasha periods are low-energy or high-risk and when things are likely to improve. If you're navigating a recurring health challenge, your chart may have something meaningful to say about the timing.",
            },
            {
              icon: "📚",
              title: "Education & Skills",
              body: "Your 5th house reveals the subjects and skill domains that come naturally to you, and when your mind is sharpest for study. If you're deciding between paths — or preparing for an important exam — timing matters more than effort alone.",
            },
            {
              icon: "✈️",
              title: "Travel & Relocation",
              body: "Some charts are built for foreign settlement; others are better served by staying rooted. The 9th and 12th houses combined with your current dashas show whether a move is auspicious now — and which direction favours you.",
            },
            {
              icon: "🔥",
              title: "Dharma & Life Purpose",
              body: "When a major life pivot feels necessary but unclear, the Atmakaraka and 9th house often illuminate what you're here to do. Dr. Chaganti can help you distinguish between a genuine calling and a passing restlessness.",
            },
          ].map(({ icon, title, body }) => (
            <div key={title} className="border border-white/10 rounded-xl p-4 bg-white/5 flex flex-col gap-3">
              <div className="text-2xl">{icon}</div>
              <div className="font-semibold text-foreground text-sm">{title}</div>
              <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        {/* Compatibility callout */}
        <div className="mt-6 rounded-lg border border-amber-700/40 p-5 bg-amber-950/20">
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0">💞</span>
            <div>
              <div className="font-semibold text-amber-300 text-sm">Checking compatibility before marriage?</div>
              <p className="text-sm text-foreground/80 mt-1 leading-relaxed">
                The platform includes a free Ashtakoota Milan calculator — the
                classical Vedic method for matching two charts before marriage.
                Compare any two registered profiles across all 36 compatibility
                parameters, including Kuja Dosha analysis. No extra consultation
                needed for the score itself.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-3xl mx-auto">
        <h2 className="font-heading text-3xl font-medium mb-6">How it works</h2>
        <ol className="space-y-5">
          {[
            [
              "1",
              "Create your profiles — free",
              "Sign in with Google and add birth profiles for yourself and your family. The full Vedic chart is computed automatically: lagna, dashas, yogas, divisional charts, transits, and more. Up to 10 profiles at no cost.",
            ],
            [
              "2",
              "Explore your charts",
              "Every section has a ⓘ button with the classical Vedic interpretation for your specific placements. Tap it to understand what each yoga, dasha period, or divisional chart means for you.",
            ],
            [
              "3",
              "Submit your question in the app",
              "When you have a specific life question, use Ask a Question in the navigation. Choose a life area, select the relevant profiles, and describe your situation using the four-part Life Problem Statement — the form guides you through it. No email needed.",
            ],
            [
              "4",
              "Receive Dr. Chaganti's answer",
              "A written answer built around your charts and your specific question — not a generic reading. You can view it in your question history and submit a follow-up once it is marked complete.",
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

      {/* What's computed — moved up for credibility */}
      <section className="max-w-3xl mx-auto">
        <details className="border border-white/10 rounded-lg bg-white/5 group">
          <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between font-heading text-lg font-medium">
            <span>What&apos;s computed in every chart</span>
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

      {/* About the astrologer */}
      <section className="max-w-3xl mx-auto">
        <h2 className="font-heading text-3xl font-medium mb-4">About Dr. Chaganti</h2>
        <div className="border border-white/10 rounded-lg p-6 bg-white/5 space-y-4">
          <p className="text-base leading-relaxed">
            <span className="font-semibold">Dr. Vinay Kumar Chaganti </span>has
            studied and practised Vedic astrology with the seriousness it
            deserves. His approach is methodical, rooted in the classical
            Parashari tradition, and precise about the calculations that
            underpin every reading.
          </p>
          <p className="text-sm text-foreground/90 leading-relaxed">
            He works from your actual chart — not a template — and his answers
            are specific to your situation and your question. The goal isn&apos;t
            to predict the future; it&apos;s to give you a clearer picture of
            where you stand and what your options look like.
          </p>
          <p className="text-sm text-muted-foreground">
            This platform is a free tool he built so that anyone can generate
            and explore their chart before reaching out. Written consultations
            are available through the app, with limited spots each month.
          </p>
        </div>
      </section>

      {/* Family recommendation */}
      <section className="max-w-3xl mx-auto">
        <div className="border border-amber-700/40 rounded-lg p-6 bg-amber-950/20">
          <h2 className="font-heading text-2xl font-medium mb-3 text-amber-300">
            Build your family&apos;s charts, not just your own
          </h2>
          <p className="text-sm text-foreground/90 leading-relaxed">
            Astrological forces act on a family as a unit. Before submitting a
            question, create profiles for everyone relevant — parents, spouse,
            children, siblings. A marriage question needs both charts. A family
            decision needs the full picture. The more context you bring, the
            more precise the answer.
          </p>
          <p className="text-sm text-muted-foreground mt-3">
            You can create up to 10 profiles at no cost.
          </p>
        </div>
      </section>

      {/* FAQs */}
      <section className="max-w-3xl mx-auto">
        <h2 className="font-heading text-3xl font-medium mb-6">Frequently asked questions</h2>
        <div className="space-y-2">
          {[
            {
              q: "What is the difference between the free chart and a personal consultation?",
              a: "The free chart platform generates a complete, accurate Vedic birth chart — every section includes a classical interpretation specific to your placements, designed for self-study and chart literacy. A personal consultation is different: Dr. Chaganti takes your specific life question, brings together the relevant chart layers (natal, dasha, transits, divisional charts), and gives you a specific, focused answer. The chart is your data — the consultation is the analysis.",
            },
            {
              q: "How does the in-app question submission work?",
              a: "Once you sign in and create at least one profile, the Ask a Question link in the navigation takes you to a structured submission form. You choose a life area, select the relevant profile(s), and describe your situation using a four-part Life Problem Statement: what is happening, what is blocking you, what success looks like, and what options you are considering. Dr. Chaganti reviews your submission and responds in writing. You can have one active question at a time — once it is answered, you can submit the next.",
            },
            {
              q: "How should I prepare my question?",
              a: (
                <div className="space-y-2">
                  <p>The Ask a Question form in the app walks you through this step by step with area-specific guidance. The four-part framework is:</p>
                  <ul className="space-y-1 ml-2">
                    <li><span className="text-foreground/80">Observation</span> — what is currently happening (the factual situation)</li>
                    <li><span className="text-foreground/80">Constraint</span> — the main obstacle or uncertainty you face</li>
                    <li><span className="text-foreground/80">Objective</span> — what success looks like for you</li>
                    <li><span className="text-foreground/80">Options</span> — the specific choices you are weighing, or what paths have been suggested</li>
                  </ul>
                  <p>Where relevant, add profiles for all family members involved. A marriage question needs both charts; a family question benefits from parent and sibling profiles.</p>
                </div>
              ),
            },
            {
              q: "What is the cost, and how does the process work?",
              a: "Chart generation and exploration are entirely free. Consultations with Dr. Chaganti are conducted as written responses via the in-app Ask a Question feature — submit your question, and Dr. Chaganti reviews the context and responds in writing. For live appointment availability and current fees, email astrochaganti@gmail.com.",
            },
            {
              q: "Which Ayanamsha and Zodiac system does this platform use?",
              a: "This platform uses the Sidereal Zodiac with the Chitra Paksha (Lahiri) Ayanamsha — the standard for Vedic astrology (Jyotish). Planetary positions are calculated via the Swiss Ephemeris, so divisional charts (Vargas) are as accurate as the data allows.",
            },
            {
              q: "Why does my chart look different here compared to Western astrology apps?",
              a: "Western astrology uses the Tropical zodiac (based on seasons). Vedic astrology uses the Sidereal zodiac (fixed to the stars). Due to the Earth's axial precession, these systems are currently offset by approximately 24 degrees — meaning your planets and Lagna will likely fall nearly one full sign back compared to Western charts. This is expected and correct.",
            },
            {
              q: "What should I do if my exact birth village is not listed?",
              a: "Our geocoder maps to a global database of cities and districts. If your specific location is missing, select the nearest recognised town or district headquarters. Coordinates within a 15–20 km radius are sufficient and do not materially affect Lagna or Varga calculations.",
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

      {/* Bottom CTA */}
      <section className="max-w-2xl mx-auto text-center space-y-4">
        <h2 className="font-heading text-3xl font-medium">Ready to begin?</h2>
        <p className="text-sm text-muted-foreground">
          Create your chart in minutes. Submit your question when you&apos;re
          ready — Dr. Chaganti responds in writing, directly in the app.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link href="/auth/signin">
            <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-amber-950 font-semibold px-8">
              Sign in with Google — Free
            </Button>
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          For general enquiries:{" "}
          <a href="mailto:astrochaganti@gmail.com" className="hover:text-foreground transition-colors underline underline-offset-2">
            astrochaganti@gmail.com
          </a>
        </p>
      </section>

    </div>
  );
}
