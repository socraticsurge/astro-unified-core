#!/usr/bin/env node
// Block dead internal route links — Link/href, router.push/replace/prefetch,
// and next/navigation redirect() calls that point at routes that do not
// exist in `app/`.
//
// This exists because of a real production incident: NavBar.tsx had a
// `<Link href="/settings">Account settings</Link>` that 404'd because no
// `app/settings/page.tsx` ever existed. Three testers hit it before we
// noticed. This guard makes that class of bug fail in CI.
//
// Scope:
//   - Enumerates routes from app/**/page.tsx (NOT api routes — those are
//     fetched, not linked).
//   - Treats `[foo]` segments as `[^/]+` wildcards.
//   - Treats `[...slug]` catch-all segments as `.+` wildcards.
//   - Scans .ts/.tsx in app/, components/, lib/ for string-literal hrefs
//     and navigations starting with `/`.
//   - Skips template literals containing `${...}` (can't statically verify).
//   - Skips external URLs (http(s)://, mailto:, tel:, etc.) and bare
//     anchors (`#foo`).
//   - Strips query strings and hashes before matching.
//
// Run via `npm run check:routes`. Exits 1 on any dead link.

import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

// ── Enumerate valid routes from app/**/page.tsx ──────────────────────────
const pageFiles = execSync('find app -name "page.tsx" -not -path "app/api/*"', {
  encoding: "utf8",
})
  .trim()
  .split("\n")
  .filter(Boolean);

// app/page.tsx → "/"; app/dashboard/page.tsx → "/dashboard";
// app/profiles/[id]/page.tsx → "/profiles/[^/]+"
const routePatterns = pageFiles.map((file) => {
  let route = file.replace(/^app/, "").replace(/\/page\.tsx$/, "");
  if (route === "") route = "/";
  // Dynamic segments. Catch-all first so `[...x]` doesn't get eaten by `[x]`.
  const regex = route
    .replace(/\[\.\.\.[^\]]+\]/g, ".+")
    .replace(/\[[^\]]+\]/g, "[^/]+");
  return new RegExp(`^${regex}$`);
});

// ── Grep for all internal route literals ─────────────────────────────────
// Combined pattern: anything that looks like a string-literal internal
// route. We accept "/..." and '/...' but not template literals because
// those can interpolate at runtime.
//
// Forms covered:
//   href="/foo"          (JSX prop or HTML attr)
//   href={"/foo"}        (JSX expression)
//   router.push("/foo")
//   router.replace("/foo")
//   router.prefetch("/foo")
//   redirect("/foo")
//   permanentRedirect("/foo")
//   Link href="/foo"     (subset of href="…", caught above)

const PATTERNS = [
  /\bhref\s*=\s*["'](\/[^"'`${}\s]*)["']/g,
  /\bhref\s*=\s*\{\s*["'](\/[^"'`${}\s]*)["']\s*\}/g,
  /\brouter\.(?:push|replace|prefetch)\s*\(\s*["'](\/[^"'`${}\s]*)["']/g,
  /\b(?:permanentRedirect|redirect)\s*\(\s*["'](\/[^"'`${}\s]*)["']/g,
];

const sourceFiles = execSync(
  // Skip tests + node_modules; the gate is about product code.
  "find app components lib -type f \\( -name '*.ts' -o -name '*.tsx' \\) " +
    "! -name '*.test.ts' ! -name '*.test.tsx' ! -name '*.spec.ts' ! -name '*.spec.tsx'",
  { encoding: "utf8" }
).trim().split("\n").filter(Boolean);

// ── Walk every source file, collect (file, line, href) tuples ────────────
const hits = [];

for (const file of sourceFiles) {
  const text = readFileSync(file, "utf8");
  const lines = text.split("\n");

  for (const pattern of PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const href = match[1];
      // Strip query and hash before matching against routes.
      const path = href.split(/[?#]/)[0] || "/";

      // Find line number from match index.
      const upto = text.slice(0, match.index);
      const lineNum = upto.split("\n").length;
      const lineText = lines[lineNum - 1]?.trim() ?? "";

      hits.push({ file, lineNum, lineText, href, path });
    }
  }
}

// ── Filter: keep only hits whose path doesn't match any route ────────────
const deadLinks = hits.filter(({ path }) => !routePatterns.some((re) => re.test(path)));

if (deadLinks.length > 0) {
  console.error("❌ Dead internal route links found.");
  console.error("   These point at routes that don't exist in app/.");
  console.error("   The /settings 404 link in NavBar was exactly this pattern.\n");
  for (const { file, lineNum, lineText, href } of deadLinks) {
    console.error(`   ${file}:${lineNum}  ${href}`);
    console.error(`     ${lineText}`);
  }
  console.error(
    `\n${deadLinks.length} dead link${deadLinks.length === 1 ? "" : "s"}.`
  );
  console.error("Fix by either creating the page, removing the link, or");
  console.error("(if intentional) using a template literal so this gate skips it.");
  process.exit(1);
}

console.log(`✓ All ${hits.length} internal route literals resolve to a real page.`);
