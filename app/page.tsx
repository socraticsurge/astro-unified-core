import type { Metadata } from "next";
import { CosmicLanding } from "@/components/CosmicLanding";
import { UnifiedPublicHome } from "@/components/public/UnifiedPublicHome";
import { getUnificationReleaseConfig } from "@/lib/unification-release";

// The release mode is resolved at build time. Legacy, rehearsal and an approved
// release remain CDN-served documents; live calculations happen client-side.
export const dynamic = "force-static";

export function generateMetadata(): Metadata {
  const release = getUnificationReleaseConfig();
  if (release.mode === "legacy") return {};
  return {
    title: "Daily Horoscope, Panchangam and Muhurtam | Astro Chaganti",
    description:
      "Begin with today’s Moon-sign guidance, explore the complete daily Panchangam, and find public Muhurtam timings with optional profile-based validation.",
    alternates: { canonical: "https://astrochaganti.com" },
    ...(release.mode === "rehearsal"
      ? { robots: { index: false, follow: false } }
      : {}),
  };
}

// No force-dynamic + no session call → Next.js prerenders this as static HTML
// and Vercel's CDN serves it. The authed-user → /dashboard redirect lives in
// proxy.ts (NextAuth middleware) so the page can stay cacheable.
export default function HomePage() {
  const release = getUnificationReleaseConfig();
  if (release.mode !== "legacy") {
    return <UnifiedPublicHome showPreviewBanner={release.mode === "rehearsal"} />;
  }
  return <CosmicLanding />;
}
