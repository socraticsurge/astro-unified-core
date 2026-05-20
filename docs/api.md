# API Reference

All routes require an authenticated session (Google OAuth via NextAuth) unless noted.
Auth failures return `401 { error: "Unauthorized" }`.

---

## Profiles

### `GET /api/profiles`
Returns all profiles owned by the current user.

**Response:** `Profile[]`

---

### `POST /api/profiles`
Creates a new profile. Rate-limited to 5 per minute. Max 10 profiles per user.

**Body:**
```json
{
  "name": "string (required)",
  "date_of_birth": "YYYY-MM-DD (required)",
  "time_of_birth": "HH:MM (required)",
  "place_of_birth": "string (required)",
  "current_location": "string (optional)",
  "gender": "male | female | other (optional)",
  "relationship": "string (optional)"
}
```
**Response:** `Profile` · `201`

---

### `PATCH /api/profiles/[id]`
Updates a profile owned by the current user.

**Body:** Same fields as POST, all optional.

**Response:** `Profile`

---

### `DELETE /api/profiles/[id]`
Deletes a profile owned by the current user.

**Response:** `{ success: true }`

---

## Readings (Sidecar Engines)

All reading GET routes accept `?profile_id=<id>` and return cached results when the
birth data has not changed. Admin users may request any profile.

### `GET /api/readings/dashaflow?profile_id=<id>`
Full Vedic chart: planets, houses, dashas, yogas, divisional charts, Ashtakavarga.

**Response:** `{ output: DashaflowOutput, cached: boolean }`

### `POST /api/readings/dashaflow`
Force-refresh the chart cache. Rate-limited to 5 per minute.

**Body:** `{ "profile_id": "string" }`

**Response:** `{ reading: Reading, output: DashaflowOutput, cached: false }`

---

### `GET /api/readings/transit?profile_id=<id>`
Today's planetary transits against the natal chart. Cache key includes today's date
so results auto-invalidate daily.

**Response:** `{ output: TransitOutput, cached: boolean, transit_date: "YYYY-MM-DD" }`

### `POST /api/readings/transit`
Force-refresh transits for a specific date. Rate-limited to 5 per minute.

**Body:** `{ "profile_id": "string", "transit_date": "YYYY-MM-DD (optional, defaults to today)" }`

**Response:** `{ reading: Reading, output: TransitOutput, cached: false, transit_date: "YYYY-MM-DD" }`

---

### `GET /api/readings/career?profile_id=<id>`
Career analysis: 10th house, D10 indicators, career themes.

**Response:** `{ output: CareerOutput, cached: boolean }`

### `POST /api/readings/career`
Force-refresh career cache. Rate-limited to 5 per minute.

**Body:** `{ "profile_id": "string" }`

**Response:** `{ reading: Reading, output: CareerOutput, cached: false }`

---

### `POST /api/readings/muhurtha`
Admin only. Finds auspicious timings for an event. Requires the profile to have a
`current_location` set.

**Body:**
```json
{
  "profile_id": "string",
  "event_type": "marriage | travel | business | ... (default: marriage)",
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD"
}
```
**Response:** Array of muhurtha windows with quality scores.

---

### `POST /api/readings/tarabalam`
Admin only. Computes Tara and Tithi for each day in a date range across multiple profiles.

**Body:**
```json
{
  "profile_ids": ["string", "string"],
  "start_date": "YYYY-MM-DD",
  "end_date": "YYYY-MM-DD"
}
```
Max range: 90 days. Rate-limited to 20 per minute.

**Response:** `{ profiles: ProfileSummary[], taras: TaraRow[] }`

---

## AI Readings

### `POST /api/readings/ai-insight`
Generates or retrieves a cached AI insight for a chart tab.

**Body:** `{ "profile_id": "string", "tab": "string", "regenerate": boolean }`

**Response:** `{ insight: AIInsight, cached: boolean }`

---

### `POST /api/readings/ai-insight/compatibility`
AI insight for a compatibility check result.

**Body:** `{ "check_id": "string", "regenerate": boolean }`

**Response:** `{ insight: AIInsight, cached: boolean }`

---

### `POST /api/readings/chat`
Conversational AI for a specific chart tab. Returns a streamed or full text response.

**Body:** `{ "profile_id": "string", "tab": "string", "messages": Message[], "model": "string" }`

**Response:** `{ reply: string }`

---

### `POST /api/readings/chat/compatibility`
Conversational AI for a compatibility check.

**Body:** `{ "check_id": "string", "messages": Message[], "model": "string" }`

**Response:** `{ reply: string }`

---

## Compatibility

### `GET /api/compatibility`
Returns all compatibility checks run by the current user.

**Response:** `CompatibilityCheck[]`

---

### `POST /api/compatibility`
Runs a new compatibility check between two profiles. Returns the existing result if
the same pair has been checked before. Rate-limited to 10 per minute.

**Body:** `{ "profile_id_1": "string", "profile_id_2": "string" }`

**Response:** `CompatibilityCheck` · `200` (cached) or `201` (new)

---

## Consultation Requests

### `GET /api/consultation-requests`
Returns all consultation requests submitted by the current user.

**Response:** `ConsultationRequest[]`

---

### `POST /api/consultation-requests`
Submits a consultation request. Rate-limited to 5 per minute. Max 10 profile IDs.

**Body (simplified mode):**
```json
{
  "question": "string (30–2000 chars)",
  "profile_ids": ["string"],
  "delivery_mode": "written | appointment",
  "slot_id": "string (required if delivery_mode is appointment)"
}
```

**Body (structured mode):**
```json
{
  "life_area": "string",
  "observation": "string (30–2000 chars)",
  "constraint_text": "string (30–2000 chars)",
  "objective": "string (30–2000 chars)",
  "options": "string (30–2000 chars)",
  "profile_ids": ["string"],
  "delivery_mode": "written | appointment",
  "slot_id": "string (required if appointment)"
}
```
**Response:** `ConsultationRequest` · `201`

---

### `POST /api/consultation-requests/[id]`
Submits user feedback (rating) on a consultation response. User must own the request.

**Body:** `{ "rating": "helpful | not_helpful", "note": "string (optional)" }`

**Response:** `{ success: true }`

---

## Admin Routes

All admin routes check `isAdmin(session)` server-side and return `401` otherwise.

### `GET /api/admin/users` — list all users
### `GET /api/admin/profiles` — list all profiles (any user)
### `GET /api/admin/compatibility` — list all compatibility checks
### `POST /api/admin/compatibility/clear` — delete all compatibility checks
### `GET /api/admin/consultation-requests` — list all consultation requests
### `POST /api/admin/consultation-requests/[id]/mark-answered` — mark a request answered
### `POST /api/admin/consultation-requests/[id]/mark-paid` — mark a request paid
### `GET /api/admin/settings` — get app settings
### `POST /api/admin/settings` — update app settings (written/live enabled, fees)
### `GET /api/admin/slots` — list consultation slots
### `POST /api/admin/slots` — create a new slot
### `DELETE /api/admin/slots/[id]` — delete a slot

---

## Settings

### `GET /api/settings`
Returns public app settings (fee amounts, enabled flags).

**Response:** `AppSettings`

---

*Last updated: 2026-05-19*
