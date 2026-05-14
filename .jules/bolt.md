## 2024-05-13 - Memoizing markdown rendering for profile pages
**Learning:** `marked.parse` is called synchronously during SSR for every section explainer on the profile page (`app/profiles/[id]/page.tsx`), parsing the exact same markdown repeatedly across requests.
**Action:** Adding a simple `Map` cache in `lib/content/markdown.ts` for `renderMarkdown` provides a ~50x speedup for parsing explainers (from ~6.9ms down to ~0.13ms per request) with a negligible memory footprint, speeding up the time-to-first-byte for the profile view.
## 2026-05-14 - Nominatim API Staggered Happy Eyeballs

**Vulnerability:** N/A (Performance Issue)
**Learning:** Nominatim strictly limits requests to 1 req/sec. Executing fallbacks sequentially requires a user to endure maximum latency. Using Promise.any() to blindly parallelize fallbacks causes immediate rate-limiting/blacklisting. The solution is implementing a Happy Eyeballs staggered waterfall algorithm, which introduces a 1.1s delay between dispatching each fallback query, maximizing speed while obeying rate limits.
**Prevention:** Whenever consuming strict rate-limited APIs with fallbacks, avoid uncontrolled concurrency and always use time-staggered evaluations.
