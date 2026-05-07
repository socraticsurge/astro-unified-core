export const metadata = { title: "Privacy Policy — AstroUnified" };

export default function PrivacyPage() {
  return (
    <article className="prose prose-invert max-w-2xl mx-auto py-12">
      <h1>Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">Last updated: 2026-05-07</p>

      <h2>What we collect</h2>
      <p>
        When you sign in with Google, we receive your name, email address, and
        profile picture. When you create a birth profile, we store the name,
        date, time, and place of birth you provide, along with the resolved
        latitude, longitude, and timezone.
      </p>

      <h2>How we use it</h2>
      <p>
        Your account information is used solely to identify you within the app
        and link saved profiles to your account. Birth profiles are used to
        compute astrological readings on demand and are stored so you can view
        them again later. We do not sell, share, or use your data for
        advertising.
      </p>

      <h2>Third parties</h2>
      <ul>
        <li>Google — for sign-in.</li>
        <li>OpenStreetMap Nominatim — for geocoding place names.</li>
        <li>Turso (libSQL) — for database hosting.</li>
        <li>Vercel — for application hosting.</li>
      </ul>

      <h2>Your choices</h2>
      <p>
        You can delete any saved profile at any time from your dashboard. To
        delete your account entirely, email{" "}
        <a href="mailto:cvk.atreya@gmail.com">cvk.atreya@gmail.com</a>.
      </p>
    </article>
  );
}
