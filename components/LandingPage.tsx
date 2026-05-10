// Server component — pure markup, no React state. Server-rendered to
// the initial HTML response so unauthenticated visitors see the hero
// immediately without waiting for client-side hydration.
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function LandingPage() {
  return (
    <div className="space-y-24 py-12">
      {/* Hero */}
      <section className="text-center space-y-6 pt-8">
        <div className="text-6xl">✦</div>
        <h1 className="font-heading text-6xl font-medium tracking-tight">Astro Chaganti</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Detailed Vedic birth charts, by Dr. Vinay Kumar Chaganti.
        </p>
        <div className="flex justify-center pt-2">
          <Link href="/auth/signin">
            <Button size="lg">Sign In with Google</Button>
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          Sign in to create profiles for yourself and your family.
        </p>
      </section>

      {/* What this is */}
      <section className="max-w-4xl mx-auto">
        <h2 className="font-heading text-3xl font-medium mb-2">What this is</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-3xl">
          Astro Chaganti generates a detailed Vedic birth chart for every profile you
          create, using the sidereal Lahiri ayanamsha and Swiss Ephemeris calculations.
          Each chart includes:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            ["Lagna & 14 divisional charts", "Ascendant in D1 with all classical vargas through D60."],
            ["Planetary positions", "Sign, degrees, nakshatra, pada, dignity, retrograde, combust."],
            ["Vimshottari Dasha (5 levels)", "Mahadasha → Antardasha → Pratyantardasha → Sukshma → Prana, with full timeline."],
            ["Yogas (planetary combinations)", "Major yogas like Malavya, Shasha, Gajakesari, Raj, Lakshmi — with explanations."],
            ["Panchang", "Tithi, Vara, Nakshatra, Yoga, Karana for the moment of birth."],
            ["Shadbala & strengths", "Six-fold planetary strength — Sthana, Dig, Kala, Chesta, Naisargika, Drik."],
            ["Jaimini & Karakamsha", "Atmakaraka, karakamsha sign, Ishta Devata."],
            ["More", "Avasthas, Bhava Chalit, Graha Yuddha, Gandanta, Arudha Padas, Upapada, Ashtakavarga."],
          ].map(([title, body]) => (
            <div key={title} className="border border-white/10 rounded-lg p-4 bg-white/5">
              <div className="font-semibold text-blue-300">{title}</div>
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
            ["1", "Sign in with Google", "Use the Sign In button in the top-right corner. Your profiles are saved privately to your account."],
            [
              "2",
              "Create profiles",
              "Add yourself, your family members, and anyone else relevant for an astrological conversation.",
            ],
            [
              "3",
              "Open any profile",
              "The full chart is generated automatically. Refresh anytime to recompute.",
            ],
          ].map(([n, title, body]) => (
            <li key={n} className="flex gap-4">
              <div className="shrink-0 w-9 h-9 rounded-full bg-blue-950/40 border border-blue-700/50 flex items-center justify-center font-bold text-blue-300">
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
            <span className="font-semibold">Dr. Vinay Kumar Chaganti </span>brings a researcher&apos;s discipline to his study and practice of Vedic astrology.
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
              q: "My birth place isn't found, or the chart looks wrong.",
              a: "Try the nearest larger city or district headquarters — small villages and towns are often missing from the geocoder. Coordinates within 10–20 km rarely affect the Lagna calculation, so the nearest recognised city is usually a safe substitute.",
            },
            {
              q: "Can I get a personal reading from Dr. Chaganti?",
              a: "Yes. Email astrochaganti@gmail.com and ask for a calendar link. Appointments are chargeable.",
            },
            {
              q: "When is the astrologer available?",
              a: "Typically on weekends.",
            },
            {
              q: "What does it cost?",
              a: "Contact astrochaganti@gmail.com for current pricing.",
            },
            {
              q: "How do I prepare for an appointment?",
              a: "Generate profiles for yourself and everyone relevant to your question (family members, partner, anyone whose chart bears on the situation), then write a detailed note describing your context and what you want to ask. The more specific, the better the reading.",
            },
            {
              q: "Why does this chart show different signs than other astrology apps?",
              a: "This site uses the Vedic sidereal zodiac with the Lahiri ayanamsha. Western or tropical astrology apps use a different reference frame, and the two are offset by roughly 24° — enough to shift the Lagna and several planets by a sign. Both can be internally consistent; they're answering different questions.",
            },
            {
              q: "Is my data private?",
              a: "Only you and Dr. Chaganti, the astrologer, can see the profiles you create. Your data is never sold or shared with anyone else.",
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
