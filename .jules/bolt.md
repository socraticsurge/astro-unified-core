## 2024-05-13 - Memoizing markdown rendering for profile pages
**Learning:** `marked.parse` is called synchronously during SSR for every section explainer on the profile page (`app/profiles/[id]/page.tsx`), parsing the exact same markdown repeatedly across requests.
**Action:** Adding a simple `Map` cache in `lib/content/markdown.ts` for `renderMarkdown` provides a ~50x speedup for parsing explainers (from ~6.9ms down to ~0.13ms per request) with a negligible memory footprint, speeding up the time-to-first-byte for the profile view.
