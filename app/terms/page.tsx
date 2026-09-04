export const metadata = { title: "Terms of Service — Astro Chaganti" };

export default function TermsPage() {
  return (
    <article className="prose prose-invert max-w-2xl mx-auto py-12">
      <h1>Terms of Service</h1>
      <p className="text-sm text-muted-foreground">Last updated: 2026-09-04</p>

      <h2>What this is</h2>
      <p>
        Astro Chaganti is a tool that computes detailed Vedic birth charts
        (sidereal Lahiri ayanamsha) for the profiles you provide. Readings
        are produced by the open-source DashaFlow library and are
        informational; they are not a substitute for a personal consultation
        with the astrologer.
      </p>

      <h2>Sources for the interpretive content</h2>
      <p>
        The classical verses shown alongside each chart are drawn from
        public-domain Sanskrit Vedic-astrology texts: Brihat Parasara Hora
        Sastra (BPHS), Phaladeepika by Mantreswara, Brihat Jataka by
        Varahamihira, Saravali by Kalyanavarman, the Jaimini Sutras, and
        Sripati Paddhati. The English renderings and several source-verse
        adaptations are derived from the open-source{" "}
        <a href="https://github.com/martin-pe/maitreya8" target="_blank" rel="noopener noreferrer">
          Maitreya project
        </a>{" "}
        by Martin Pettau, distributed under the GNU GPL v2.0 or later.
        Where authored rephrasings are shown, those are original work by
        Dr. Vinay Kumar Chaganti. See{" "}
        <a href="/credits">/credits</a> for the full attribution.
      </p>

      <h2>Acceptable use</h2>
      <p>
        Use the service only for personal or research purposes. Do not attempt
        to abuse the geocoding API, scrape large volumes of data, or use the
        service to harass other users.
      </p>

      <h2>Open-source licence and corresponding source</h2>
      <p>
        Astro Chaganti is licensed under the GNU Affero General Public License
        v3.0 or later. The corresponding source for this web application is
        available in the{" "}
        <a
          href="https://github.com/socraticsurge/astro-unified-core"
          target="_blank"
          rel="noopener noreferrer"
        >
          Astro Chaganti source repository
        </a>
        . Chart calculations are supplied by the separately deployed DashaFlow
        service; its exact deployed revision is identified by the service
        health response and source link.
      </p>

      <h2>No warranty</h2>
      <p>
        The service is provided as-is. Astrological calculations may contain
        errors, and we make no guarantees about availability or accuracy.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms. Continued use after changes constitutes
        acceptance. For questions, contact{" "}
        <a href="mailto:astrochaganti@gmail.com">astrochaganti@gmail.com</a>.
      </p>
    </article>
  );
}
