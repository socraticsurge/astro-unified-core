import { CosmicLanding } from "@/components/CosmicLanding";

// No force-dynamic + no session call → Next.js prerenders this as static HTML
// and Vercel's CDN serves it. The authed-user → /dashboard redirect lives in
// proxy.ts (NextAuth middleware) so the page can stay cacheable.
export default function HomePage() {
  return <CosmicLanding />;
}
