import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { LandingPage } from "@/components/LandingPage";

// Server-rendered landing page.
// - Authenticated visitors are redirected to /dashboard server-side.
// - Unauthenticated visitors get the marketing markup in the initial
//   HTML response — no React hydration cost, no JS to download for
//   the page itself (just the small <Analytics />/<SpeedInsights />
//   client islands and the auth provider).
export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect("/dashboard");
  }
  return <LandingPage />;
}
