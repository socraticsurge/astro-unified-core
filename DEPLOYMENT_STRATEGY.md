# AstroRepos Vercel Launch Strategy (Core Features + Multi-User Auth)

This strategy delivers a world-ready version of AstroUnified with secure Google Sign-In and private profile isolation.

## 1. Scope & Features
- **Multi-User Security:** Users only see their own profiles.
- **Admin Visibility:** You can see global usage statistics.
- **Calculations:** Full support for Jyotish, Western, Hellenistic, Bazi, etc.
- **Database:** Migrated to **Turso (SQLite for the Edge)** for permanent, zero-cost storage.

## 2. Technical Stack ($0)
- **Frontend:** Next.js + NextAuth.js (Google Provider).
- **Database:** Turso (9GB Free Tier).
- **Compute:** Vercel Serverless (Node.js + Python).
- **Static Data:** Star catalog bundled as chunks and auto-reconstructed in `/tmp`.

## 3. How to Launch (Final Steps)

### Step A: Setup Turso (The Permanent Database)
1.  Go to [Turso.tech](https://turso.tech) and create a free account.
2.  Create a new database (e.g., `astrounified-live`).
3.  Copy the **Database URL** and **Auth Token**.

### Step B: Connect to Vercel
1.  Go to the Vercel Dashboard and import the `astro-unified-core` repo from GitHub.
2.  In the **Environment Variables** section, add these 5 keys:
    - `GOOGLE_CLIENT_ID`: (The one you created)
    - `GOOGLE_CLIENT_SECRET`: (The one you created)
    - `NEXTAUTH_SECRET`: (Any random string of 32 characters)
    - `TURSO_DATABASE_URL`: (From Turso)
    - `TURSO_AUTH_TOKEN`: (From Turso)
3.  Click **Deploy**.

## 4. Expected Costs: $0.00
- Every component used (Vercel, Turso, Google, GitHub) is on a perpetual free tier.

---
*Created by Gemini CLI Agent*
