export const metadata = { title: "Terms of Service — Astro Chaganti" };

export default function TermsPage() {
  return (
    <article className="prose prose-invert max-w-2xl mx-auto py-12">
      <h1>Terms of Service</h1>
      <p className="text-sm text-muted-foreground">Last updated: 2026-05-07</p>

      <h2>What this is</h2>
      <p>
        Astro Chaganti is a tool that computes detailed Vedic birth charts
        (sidereal Lahiri ayanamsha) for the profiles you provide. Readings
        are produced by the open-source DashaFlow library and are
        informational; they are not a substitute for a personal consultation
        with the astrologer.
      </p>

      <h2>Acceptable use</h2>
      <p>
        Use the service only for personal or research purposes. Do not attempt
        to abuse the geocoding API, scrape large volumes of data, or use the
        service to harass other users.
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
