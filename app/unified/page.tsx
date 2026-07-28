import type { Metadata } from "next";
import { UnifiedPublicHome } from "@/components/public/UnifiedPublicHome";

export const metadata: Metadata = {
  title: "Today’s Panchangam, Rasi Phalalu and Muhurtam | Astro Chaganti",
  description:
    "Explore today’s Panchangam, daily Moon-sign guidance and public Muhurtam timings before adding an optional birth profile for deeper validation.",
  robots: { index: false, follow: false },
};

export default function UnifiedPreviewPage() {
  return <UnifiedPublicHome showPreviewBanner />;
}
