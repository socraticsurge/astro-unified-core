## 2024-05-13 - Memoizing markdown rendering for profile pages
**Learning:** `marked.parse` is called synchronously during SSR for every section explainer on the profile page (`app/profiles/[id]/page.tsx`), parsing the exact same markdown repeatedly across requests.
**Action:** Adding a simple `Map` cache in `lib/content/markdown.ts` for `renderMarkdown` provides a ~50x speedup for parsing explainers (from ~6.9ms down to ~0.13ms per request) with a negligible memory footprint, speeding up the time-to-first-byte for the profile view.
## 2024-05-14 - Batch Fetching Explanations

**Context:** Loading explainer modals in the UI often involves fetching multiple chart-specific verses sequentially or concurrently via `Promise.all`. This causes high network overhead and duplicate session validation logic on the Next.js server.
**Learning:** Optimizing performance by migrating multiple single requests (e.g. `/api/content/[type]/[key]`) into a unified batch request (e.g. `/api/content/batch?q=type:key,type2:key2`) greatly reduces network latency and redundant server-side executions (NextAuth session checks).
**Strategy:** Separate entries into a cached list vs uncached query list. Pass the uncached requests via a single fetch and merge the results into the original index order. Keep `encodeURIComponent(query)` in mind for safety, even if simple slugs are generally safe.
