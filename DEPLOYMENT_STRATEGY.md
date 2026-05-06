# AstroRepos Vercel Launch Strategy (Core Features Only - Zero Cost)

This revised strategy focuses exclusively on the core application: profile management and multi-engine astrological calculations. 

## 1. Scope Reductions
- **EXCLUDE:** Research tab and its associated routes (/research).
- **EXCLUDE:** 2.9GB Research Corpus database.
- **RETAIN:** Profile creation/management.
- **RETAIN:** Calculations for all systems (Jyotish, Western, Hellenistic, Bazi, Numerology, etc.).

## 2. Updated Architectural Plan

### Phase 1: Vercel Native Storage ($0)
- **Database:** Since we only need to store profiles and reading history, we will use **Vercel Postgres (Free Tier)**. This is a hosted PostgreSQL database that integrates natively with Vercel.
- **Files (Star Catalog/Ephemeris):** 
    - The ephemeris files and `hip_main.dat` (51MB) **will be bundled directly into the Vercel deployment**. 
    - Total deployment limit is 250MB (Pro) or 100MB+ (Hobby). At ~60MB total for data, it fits comfortably. This ensures the data is always available locally to the functions with zero latency.

### Phase 2: Atlas & Geocoding ($0)
- **Atlas:** We are using **OpenStreetMap (Nominatim)** for geocoding and the `geo-tz` library for timezone lookups.
- **Implementation:** These are already integrated into `lib/geocode.ts`. They require no local database and cost $0 as they use public APIs and local computation.

### Phase 3: Unified Serverless Compute ($0)
- **Next.js API:** Handles profile CRUD and UI logic.
- **Python Functions:** Calculation engines (Kerykeion, Flatlib, Jyotishganit) will be ported to `api/python/index.py`. 
- **Integration:** The frontend calls the Python functions via relative API paths, keeping everything in one project.

## 3. Implementation Steps

1.  **Strip Research Logic:** Disable Research UI and exclude the large .db from git history.
2.  **Database Migration:** Initialize Vercel Postgres and update `lib/db.ts` to use it for profiles/readings.
3.  **Data Bundling:** Move `hip_main.dat` and ephemeris into the project folder so they are uploaded during `git push`.
4.  **Python Refactor:** Port sidecar logic to Vercel Serverless Python functions.

## 4. Expected Costs: $0.00
- **Frontend/API:** Vercel (Hobby) - $0
- **Database:** Vercel Postgres (Free) - $0
- **Compute:** Vercel Serverless Functions - $0
- **Geocoding:** OpenStreetMap - $0

---
*Created by Gemini CLI Agent*

## 7. Deployment Execution (The Move to Live)

Once the code is refactored locally, the move to Vercel will follow these steps:

1.  **GitHub Repository Creation:** I will use the `gh` (GitHub CLI) to create a new, private repository (e.g., `astro-unified-core`) on your account.
2.  **Initial Push:** I will push the cleaned experimental code (Next.js + Vercel Python Functions + Static Data) to this new repo.
3.  **Vercel Connection:** 
    - You will log into your Vercel dashboard.
    - Click "Add New" -> "Project".
    - Select the new GitHub repository.
4.  **Configuration:** 
    - I will provide you with the necessary Environment Variables (e.g., `POSTGRES_URL` for Vercel Postgres).
    - Vercel will automatically detect the Next.js and Python functions and deploy them.

*Note: I can handle the GitHub creation and code pushing autonomously. You will only need to click "Deploy" on Vercel and provide the DB credentials.*
