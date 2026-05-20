## 2025-05-17 - Cached loadAllSections to reduce disk I/O on profile page loads
**Learning:** `loadAllSections` in `lib/content/loader.ts` was doing synchronous `fs.readdirSync` on every single `/profiles/[id]` request.
**Action:** Introduced an in-memory variable `cachedSections` to store and reuse the parsed Markdown explainer results across requests in production, improving performance significantly for concurrent requests.
