# Multi-Engine Astrology Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three new astrology engines — Western/Tropical (Kerykeion), Hellenistic/Traditional (flatlib), and Chinese Ba Zi (bazi-calculator-by-alvamind) — each with full backend calculation, API route, frontend view, and profile page tab.

**Architecture:** Python sidecar at `localhost:8001` gains two new endpoints (`/calculate/western`, `/calculate/hellenistic`); Ba Zi runs server-side in Next.js using the pre-built npm package. Each engine follows the existing pattern: `lib/engines/X.ts` fetcher → `app/api/readings/X/route.ts` → `components/engines/XView.tsx` → wired into the profile page `Tabs`.

**Tech Stack:** Python 3 + FastAPI + kerykeion 5.12.8 + flatlib 0.2.3 + pyswisseph (already installed in venv); Next.js 16 App Router + TypeScript; bazi-calculator-by-alvamind (compiled dist already in node_modules); shadcn/ui + Tailwind CSS dark mode.

---

## Context for subagent workers

### Existing pattern (replicate for each new engine)

Every engine follows this exact 4-file chain:

1. **`python/main.py`** — FastAPI sidecar (for Python engines only). Add `@app.post("/calculate/X")` endpoint.
2. **`lib/engines/X.ts`** — Server-side TypeScript fetcher. Calls Python sidecar or npm package. Returns typed output.
3. **`app/api/readings/X/route.ts`** — Next.js App Router POST handler. Loads profile from DB, calls fetcher, saves reading, returns JSON.
4. **`components/engines/XView.tsx`** — React client component. Takes `output: Record<string, unknown>` prop, renders all data with `<Section>` collapsibles.

### Key existing files to understand before touching anything

- `python/main.py` — current sidecar with one endpoint; extend it, don't replace
- `lib/engines/jyotishganit.ts` — template for a Python sidecar fetcher
- `app/api/readings/jyotishganit/route.ts` — template for an API route
- `components/engines/JyotishganitView.tsx` — template for a view component using `<Section>`
- `components/Section.tsx` — collapsible section, props: `title`, `defaultOpen?`, `accent?` (Tailwind text color class)
- `app/profiles/[id]/page.tsx` — profile page; add new engine states, tabs, and EngineTab renders here
- `lib/db.ts` — `db.readings.save({ profile_id, engine, input_snapshot, output_data })` persists readings

### Pre-built Ba Zi npm package

The `bazi-calculator-by-alvamind` package has already been compiled. It lives at:
- `node_modules/bazi-calculator-by-alvamind/dist/bazi-calculator.js` — main class
- `node_modules/bazi-calculator-by-alvamind/dist/index.js` — re-export (already created)
- `node_modules/bazi-calculator-by-alvamind/dist/dates_mapping.json` — required data file (already copied)

Import in TypeScript: `import { BaziCalculator } from "bazi-calculator-by-alvamind"`

API: `new BaziCalculator(year, month, day, hour, gender)` then `.getCompleteAnalysis()` returns `{ mainPillars, basicAnalysis }`.

The package must be added to `serverExternalPackages` in `next.config.ts` to prevent bundling issues.

### Python venv

Located at `python/venv/`. All packages pre-installed:
- `kerykeion==5.12.8`
- `flatlib==0.2.3`
- `pyswisseph==2.10.3.2` (compiled with SDKROOT workaround — already done)
- `jyotishganit`, `fastapi`, `uvicorn` (existing)

The sidecar runs with: `cd python && source venv/bin/activate && uvicorn main:app --port 8001`

### Dark mode color conventions

The app is forced dark (`<html class="dark">`). Use these patterns:
- Western (indigo theme): `text-indigo-400` headers, `bg-indigo-950/30 border-indigo-800/40` cards, `border-white/10` table borders
- Hellenistic (purple theme): `text-purple-400` headers, `bg-purple-950/30 border-purple-800/40` cards
- Ba Zi (red theme): `text-red-400` headers, `bg-red-950/30 border-red-800/40` cards
- Table rows: `border-b border-white/10 hover:bg-white/5`
- `<th>` cells: `text-left py-1.5 pr-3 font-medium text-xs text-muted-foreground`

---

## File Structure

### New files to create:
- `python/main.py` — **MODIFY**: add `/calculate/western` and `/calculate/hellenistic` endpoints
- `python/requirements.txt` — **MODIFY**: add kerykeion, flatlib, pyswisseph entries
- `lib/engines/western.ts` — **CREATE**: Kerykeion fetcher (calls sidecar `/calculate/western`)
- `lib/engines/hellenistic.ts` — **CREATE**: flatlib fetcher (calls sidecar `/calculate/hellenistic`)
- `lib/engines/bazi.ts` — **CREATE**: Ba Zi fetcher (runs BaziCalculator server-side in Next.js)
- `app/api/readings/western/route.ts` — **CREATE**: API route for Western engine
- `app/api/readings/hellenistic/route.ts` — **CREATE**: API route for Hellenistic engine
- `app/api/readings/bazi/route.ts` — **CREATE**: API route for Ba Zi engine
- `components/engines/WesternView.tsx` — **CREATE**: Western chart view
- `components/engines/HellenisticView.tsx` — **CREATE**: Hellenistic chart view
- `components/engines/BaziView.tsx` — **CREATE**: Chinese Ba Zi view
- `app/profiles/[id]/page.tsx` — **MODIFY**: add 3 new tabs and engine states
- `next.config.ts` — **MODIFY**: add `bazi-calculator-by-alvamind` to serverExternalPackages

---

## Task 1: Python sidecar — Western endpoint (Kerykeion)

**Files:**
- Modify: `python/main.py`
- Modify: `python/requirements.txt`

### What Kerykeion returns (tested against 1984-10-08 14:50 IST, Vijayawada):

```python
from kerykeion import AstrologicalSubject, NatalAspects
import json

s = AstrologicalSubject(name, year, month, day, hour, minute,
                        lat=latitude, lng=longitude, tz_str=timezone)
# s.json() returns JSON with all planets + houses + metadata
# NatalAspects(s).all_aspects → list of aspect objects
```

Planet objects include: `sign`, `sign_num`, `position` (degrees in sign), `abs_pos`, `house`, `retrograde`, `speed`, `declination`, `quality`, `element`, `emoji`.
House objects: `sign`, `position`, `abs_pos`.
Aspect objects (pydantic model): `p1_name`, `p2_name`, `aspect`, `orbit`, `aspect_degrees`, `aspect_movement` (Applying/Separating).

- [ ] **Step 1: Add kerykeion and flatlib to requirements.txt**

Open `python/requirements.txt` and add:
```
fastapi==0.115.0
uvicorn[standard]==0.30.0
jyotishganit
kerykeion==5.12.8
flatlib==0.2.3
```
(pyswisseph is installed as a compiled wheel in the venv and doesn't need to be in requirements.txt — it requires a special build flag on macOS)

- [ ] **Step 2: Verify kerykeion import works in the venv**

```bash
cd python && source venv/bin/activate
python3 -c "from kerykeion import AstrologicalSubject, NatalAspects; print('OK')"
```
Expected: `OK`

- [ ] **Step 3: Add the Western endpoint to python/main.py**

Replace the entire `python/main.py` with:

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import datetime
import json
import jyotishganit

app = FastAPI(title="Astrology Sidecar")


class BirthData(BaseModel):
    date_of_birth: str   # YYYY-MM-DD
    time_of_birth: str   # HH:MM
    latitude: float
    longitude: float
    timezone_offset: float
    timezone: str = "UTC"
    name: str = "Native"


@app.post("/calculate")
def calculate_jyotishganit(data: BirthData):
    try:
        birth_datetime = datetime.strptime(
            f"{data.date_of_birth} {data.time_of_birth}", "%Y-%m-%d %H:%M"
        )
        chart = jyotishganit.calculate_birth_chart(
            birth_date=birth_datetime,
            latitude=data.latitude,
            longitude=data.longitude,
            timezone_offset=data.timezone_offset,
        )
        output = jyotishganit.get_birth_chart_json(chart)
        return {"status": "ok", "data": output}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/calculate/western")
def calculate_western(data: BirthData):
    try:
        from kerykeion import AstrologicalSubject, NatalAspects

        year, month, day = [int(x) for x in data.date_of_birth.split("-")]
        hour, minute = [int(x) for x in data.time_of_birth.split(":")]

        s = AstrologicalSubject(
            data.name, year, month, day, hour, minute,
            lat=data.latitude,
            lng=data.longitude,
            tz_str=data.timezone,
        )
        subject_data = json.loads(s.json())

        aspects = NatalAspects(s)
        aspects_list = [
            {
                "p1": a.p1_name,
                "p2": a.p2_name,
                "aspect": a.aspect,
                "orbit": round(a.orbit, 4),
                "movement": a.aspect_movement,
                "aspect_degrees": a.aspect_degrees,
            }
            for a in aspects.all_aspects
        ]

        PLANET_KEYS = [
            "sun", "moon", "mercury", "venus", "mars",
            "jupiter", "saturn", "uranus", "neptune", "pluto",
            "mean_node", "true_node", "chiron",
        ]
        HOUSE_KEYS = [
            "first_house", "second_house", "third_house", "fourth_house",
            "fifth_house", "sixth_house", "seventh_house", "eighth_house",
            "ninth_house", "tenth_house", "eleventh_house", "twelfth_house",
        ]

        planets = {k: subject_data[k] for k in PLANET_KEYS if k in subject_data}
        houses = {k: subject_data[k] for k in HOUSE_KEYS if k in subject_data}

        return {
            "status": "ok",
            "data": {
                "meta": {
                    "zodiac_type": subject_data.get("zodiac_type"),
                    "houses_system": subject_data.get("houses_system_name"),
                    "julian_day": subject_data.get("julian_day"),
                    "is_diurnal": subject_data.get("is_diurnal"),
                    "day_of_week": subject_data.get("day_of_week"),
                    "utc_datetime": subject_data.get("iso_formatted_utc_datetime"),
                    "local_datetime": subject_data.get("iso_formatted_local_datetime"),
                },
                "planets": planets,
                "houses": houses,
                "aspects": aspects_list,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"status": "ok"}
```

- [ ] **Step 4: Restart the sidecar and test the endpoint**

```bash
# Kill any running sidecar
pkill -f "uvicorn main:app" 2>/dev/null || true
cd python && source venv/bin/activate
uvicorn main:app --port 8001 &
sleep 2

# Test the Western endpoint
curl -s -X POST http://localhost:8001/calculate/western \
  -H "Content-Type: application/json" \
  -d '{"date_of_birth":"1984-10-08","time_of_birth":"14:50","latitude":16.5115,"longitude":80.616,"timezone_offset":5.5,"timezone":"Asia/Kolkata","name":"Test"}' \
  | python3 -m json.tool | head -60
```

Expected: JSON with `data.planets`, `data.houses`, `data.aspects`, `data.meta` keys. `data.planets.sun.sign` should be `"Lib"`.

- [ ] **Step 5: Commit**

```bash
git add python/main.py python/requirements.txt
git commit -m "feat: add Western (Kerykeion) endpoint to Python sidecar"
```

---

## Task 2: Python sidecar — Hellenistic endpoint (flatlib)

**Files:**
- Modify: `python/main.py`

### What flatlib returns (tested):
```python
from flatlib import const, chart
from flatlib.datetime import Datetime
from flatlib.geopos import GeoPos
from flatlib.chart import Chart

# Datetime takes 'YYYY/MM/DD', 'HH:MM', UTC offset '+HH:MM'
date = Datetime('1984/10/08', '09:20', '+00:00')
pos = GeoPos(16.5115, 80.616)
c = Chart(date, pos)

# Planets: c.get(const.SUN) → obj with .id, .sign, .lon, .signlon, .lat, .lonspeed
#          .isRetrograde(), .isDirect(), .movement(), .element(), .gender(), .faction()
# Houses:  c.get(const.HOUSE1) through HOUSE12
# Aspects: from flatlib import aspects
#          aspects.getAspect(obj1, obj2, const.MAJOR_ASPECTS) → Aspect with .type, .orb
# c.isDiurnal() → bool (day chart)
```

Flatlib planets: SUN, MOON, MERCURY, VENUS, MARS, JUPITER, SATURN, CHIRON, URANUS, NEPTUNE, PLUTO
Traditional 7: SUN, MOON, MERCURY, VENUS, MARS, JUPITER, SATURN

The key Hellenistic features flatlib offers:
- Essential dignities (via planet position in sign, exaltation/fall/rulership)
- Sect (day/night chart, planet sect membership)
- Lots: Part of Fortune = ASC + Moon - Sun (day chart), ASC + Sun - Moon (night chart)
- Aspects with orbs using traditional orb table

- [ ] **Step 1: Add Hellenistic endpoint to python/main.py**

Add this function **before** the `@app.get("/health")` line in `python/main.py`:

```python
@app.post("/calculate/hellenistic")
def calculate_hellenistic(data: BirthData):
    try:
        from flatlib import const, chart as flat_chart, aspects as flat_aspects
        from flatlib.datetime import Datetime
        from flatlib.geopos import GeoPos

        year, month, day = data.date_of_birth.split("-")
        hour, minute = data.time_of_birth.split(":")

        # Convert local time to UTC for flatlib
        local_decimal = int(hour) + int(minute) / 60.0
        utc_decimal = local_decimal - data.timezone_offset
        # Handle day rollover
        utc_date = datetime.strptime(data.date_of_birth, "%Y-%m-%d")
        if utc_decimal < 0:
            from datetime import timedelta
            utc_date = utc_date - timedelta(days=1)
            utc_decimal += 24
        elif utc_decimal >= 24:
            from datetime import timedelta
            utc_date = utc_date + timedelta(days=1)
            utc_decimal -= 24
        utc_h = int(utc_decimal)
        utc_m = int((utc_decimal - utc_h) * 60)
        utc_date_str = utc_date.strftime("%Y/%m/%d")
        utc_time_str = f"{utc_h:02d}:{utc_m:02d}"

        date = Datetime(utc_date_str, utc_time_str, "+00:00")
        pos = GeoPos(data.latitude, data.longitude)
        c = flat_chart.Chart(date, pos)

        PLANETS = [
            const.SUN, const.MOON, const.MERCURY, const.VENUS, const.MARS,
            const.JUPITER, const.SATURN, const.URANUS, const.NEPTUNE, const.PLUTO,
        ]
        HOUSES = [
            const.HOUSE1, const.HOUSE2, const.HOUSE3, const.HOUSE4,
            const.HOUSE5, const.HOUSE6, const.HOUSE7, const.HOUSE8,
            const.HOUSE9, const.HOUSE10, const.HOUSE11, const.HOUSE12,
        ]
        TRADITIONAL = [const.SUN, const.MOON, const.MERCURY, const.VENUS,
                       const.MARS, const.JUPITER, const.SATURN]

        def serialize_obj(obj):
            return {
                "id": obj.id,
                "sign": obj.sign,
                "lon": round(obj.lon, 4),
                "signlon": round(obj.signlon, 4),
                "lat": round(obj.lat, 4) if hasattr(obj, "lat") else None,
                "speed": round(obj.lonspeed, 4) if hasattr(obj, "lonspeed") else None,
                "retrograde": obj.isRetrograde() if hasattr(obj, "isRetrograde") else False,
                "element": obj.element() if hasattr(obj, "element") else None,
                "gender": obj.gender() if hasattr(obj, "gender") else None,
            }

        planets = {}
        for pid in PLANETS:
            try:
                planets[pid] = serialize_obj(c.get(pid))
            except Exception:
                pass

        houses = {}
        for hid in HOUSES:
            try:
                h = c.get(hid)
                houses[hid] = {"id": hid, "sign": h.sign, "lon": round(h.lon, 4), "signlon": round(h.signlon, 4)}
            except Exception:
                pass

        asc = c.get(const.ASC)
        asc_lon = asc.lon if asc else 0.0

        # Aspects between traditional planets
        aspect_list = []
        for i, p1id in enumerate(TRADITIONAL):
            for p2id in TRADITIONAL[i + 1:]:
                try:
                    p1 = c.get(p1id)
                    p2 = c.get(p2id)
                    asp = flat_aspects.getAspect(p1, p2, const.MAJOR_ASPECTS)
                    if asp and asp.type != const.NO_ASPECT:
                        aspect_list.append({
                            "p1": p1id,
                            "p2": p2id,
                            "type": asp.type,
                            "orb": round(asp.orb, 4) if hasattr(asp, "orb") else None,
                            "movement": asp.movement if hasattr(asp, "movement") else None,
                        })
                except Exception:
                    pass

        # Part of Fortune
        sun = c.get(const.SUN)
        moon = c.get(const.MOON)
        is_diurnal = c.isDiurnal()
        if sun and moon:
            if is_diurnal:
                pof_lon = (asc_lon + moon.lon - sun.lon) % 360
            else:
                pof_lon = (asc_lon + sun.lon - moon.lon) % 360
        else:
            pof_lon = None

        SIGN_NAMES = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo",
                      "Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"]
        pof_sign = SIGN_NAMES[int(pof_lon // 30)] if pof_lon is not None else None

        return {
            "status": "ok",
            "data": {
                "meta": {
                    "is_diurnal": is_diurnal,
                    "utc_datetime": f"{utc_date_str} {utc_time_str}",
                    "house_system": "Placidus",
                },
                "planets": planets,
                "houses": houses,
                "aspects": aspect_list,
                "lots": {
                    "pars_fortuna": {
                        "lon": round(pof_lon, 4) if pof_lon is not None else None,
                        "sign": pof_sign,
                        "formula": "ASC + Moon - Sun" if is_diurnal else "ASC + Sun - Moon",
                    }
                },
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

- [ ] **Step 2: Restart sidecar and test Hellenistic endpoint**

```bash
pkill -f "uvicorn main:app" 2>/dev/null || true
cd python && source venv/bin/activate
uvicorn main:app --port 8001 &
sleep 2

curl -s -X POST http://localhost:8001/calculate/hellenistic \
  -H "Content-Type: application/json" \
  -d '{"date_of_birth":"1984-10-08","time_of_birth":"14:50","latitude":16.5115,"longitude":80.616,"timezone_offset":5.5,"timezone":"Asia/Kolkata","name":"Test"}' \
  | python3 -m json.tool | head -50
```

Expected: JSON with `data.planets`, `data.houses`, `data.aspects`, `data.lots.pars_fortuna`. `data.planets.Sun.sign` should be `"Libra"`.

- [ ] **Step 3: Commit**

```bash
git add python/main.py
git commit -m "feat: add Hellenistic (flatlib) endpoint to Python sidecar"
```

---

## Task 3: Ba Zi engine — next.config.ts + TypeScript fetcher

**Files:**
- Modify: `next.config.ts`
- Create: `lib/engines/bazi.ts`

### Ba Zi API (confirmed working):
```typescript
import { BaziCalculator } from "bazi-calculator-by-alvamind";
const calc = new BaziCalculator(year, month, day, hour, "male" | "female");
const result = calc.getCompleteAnalysis();
// result.mainPillars.year = { chinese: "甲子", element: "WOOD", animal: "Rat", branch: { element: "WATER" } }
// result.mainPillars.month/day/time (same shape)
// result.basicAnalysis.dayMaster = { stem: "乙", nature: "Yin", element: "WOOD" }
// result.basicAnalysis.lifeGua = 7
// result.basicAnalysis.fiveFactors = { WOOD: 43, FIRE: 14, EARTH: 8, METAL: 4, WATER: 31 }
// result.basicAnalysis.eightMansions = { group: "West", lucky: {...}, unlucky: {...} }
// result.basicAnalysis.nobleman, intelligence, skyHorse, peachBlossom (all Chinese branch strings)
```

The package's `dist/` folder was compiled from TypeScript source and needs `dates_mapping.json` in the same dist directory (already done). It must be treated as an external package to avoid Turbopack bundling it.

- [ ] **Step 1: Add bazi-calculator-by-alvamind to serverExternalPackages in next.config.ts**

Read `next.config.ts` first, then replace its content with:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "better-sqlite3",
    "@fusionstrings/panchangam",
    "bazi-calculator-by-alvamind",
  ],
  turbopack: {},
  webpack: (config) => {
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    return config;
  },
};

export default nextConfig;
```

- [ ] **Step 2: Create lib/engines/bazi.ts**

```typescript
export type BaziInput = {
  date_of_birth: string;  // YYYY-MM-DD
  time_of_birth: string;  // HH:MM
  gender?: "male" | "female";
};

export type BaziOutput = {
  data: unknown;
  error?: string;
};

export async function fetchBazi(input: BaziInput): Promise<BaziOutput> {
  try {
    const { BaziCalculator } = await import("bazi-calculator-by-alvamind");
    const [year, month, day] = input.date_of_birth.split("-").map(Number);
    const [hour] = input.time_of_birth.split(":").map(Number);
    const gender = input.gender ?? "male";

    const calc = new BaziCalculator(year, month, day, hour, gender);
    const result = calc.getCompleteAnalysis();
    return { data: result };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /path/to/astrounified  # run from project root
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add next.config.ts lib/engines/bazi.ts
git commit -m "feat: add Ba Zi (bazi-calculator-by-alvamind) TypeScript fetcher"
```

---

## Task 4: Western engine — TypeScript fetcher + API route

**Files:**
- Create: `lib/engines/western.ts`
- Create: `app/api/readings/western/route.ts`

### Input to sidecar `/calculate/western`:
```json
{
  "date_of_birth": "YYYY-MM-DD",
  "time_of_birth": "HH:MM",
  "latitude": 16.5115,
  "longitude": 80.616,
  "timezone_offset": 5.5,
  "timezone": "Asia/Kolkata",
  "name": "Native"
}
```

- [ ] **Step 1: Create lib/engines/western.ts**

```typescript
const SIDECAR = process.env.PYTHON_SIDECAR_URL ?? "http://localhost:8001";

export type WesternInput = {
  date_of_birth: string;
  time_of_birth: string;
  latitude: number;
  longitude: number;
  timezone_offset: number;
  timezone: string;
  name?: string;
};

export type WesternOutput = {
  data: unknown;
  error?: string;
};

export async function fetchWestern(input: WesternInput): Promise<WesternOutput> {
  try {
    const res = await fetch(`${SIDECAR}/calculate/western`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, name: input.name ?? "Native" }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      return { data: null, error: (err as { detail?: string }).detail ?? res.statusText };
    }
    const json = await res.json();
    return { data: json.data };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
```

- [ ] **Step 2: Create app/api/readings/western/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchWestern } from "@/lib/engines/western";

export async function POST(req: NextRequest) {
  const { profile_id } = await req.json();
  const profile = db.profiles.get(profile_id);
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const input = {
    date_of_birth: profile.date_of_birth,
    time_of_birth: profile.time_of_birth,
    latitude: profile.latitude,
    longitude: profile.longitude,
    timezone_offset: profile.timezone_offset,
    timezone: profile.timezone,
    name: profile.name,
  };

  const output = await fetchWestern(input);
  const reading = db.readings.save({
    profile_id,
    engine: "western",
    input_snapshot: input,
    output_data: output,
  });

  return NextResponse.json({ reading, output });
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Test the API route end-to-end**

With Next.js dev server running on port 3000:
```bash
# First get a valid profile_id from the database
node -e "
const Database = require('better-sqlite3');
const db = new Database('astrounified.db');
const p = db.prepare('SELECT id FROM profiles LIMIT 1').get();
console.log('Profile ID:', p.id);
"

# Replace PROFILE_ID with the value above
curl -s -X POST http://localhost:3000/api/readings/western \
  -H "Content-Type: application/json" \
  -d '{"profile_id":"PROFILE_ID"}' \
  | python3 -m json.tool | head -30
```

Expected: JSON with `output.data.planets`, `output.data.houses`, `output.data.aspects`.

- [ ] **Step 5: Commit**

```bash
git add lib/engines/western.ts app/api/readings/western/route.ts
git commit -m "feat: add Western engine fetcher and API route"
```

---

## Task 5: Hellenistic engine — TypeScript fetcher + API route

**Files:**
- Create: `lib/engines/hellenistic.ts`
- Create: `app/api/readings/hellenistic/route.ts`

- [ ] **Step 1: Create lib/engines/hellenistic.ts**

```typescript
const SIDECAR = process.env.PYTHON_SIDECAR_URL ?? "http://localhost:8001";

export type HellenisticInput = {
  date_of_birth: string;
  time_of_birth: string;
  latitude: number;
  longitude: number;
  timezone_offset: number;
  timezone: string;
};

export type HellenisticOutput = {
  data: unknown;
  error?: string;
};

export async function fetchHellenistic(input: HellenisticInput): Promise<HellenisticOutput> {
  try {
    const res = await fetch(`${SIDECAR}/calculate/hellenistic`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      return { data: null, error: (err as { detail?: string }).detail ?? res.statusText };
    }
    const json = await res.json();
    return { data: json.data };
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
```

- [ ] **Step 2: Create app/api/readings/hellenistic/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchHellenistic } from "@/lib/engines/hellenistic";

export async function POST(req: NextRequest) {
  const { profile_id } = await req.json();
  const profile = db.profiles.get(profile_id);
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const input = {
    date_of_birth: profile.date_of_birth,
    time_of_birth: profile.time_of_birth,
    latitude: profile.latitude,
    longitude: profile.longitude,
    timezone_offset: profile.timezone_offset,
    timezone: profile.timezone,
  };

  const output = await fetchHellenistic(input);
  const reading = db.readings.save({
    profile_id,
    engine: "hellenistic",
    input_snapshot: input,
    output_data: output,
  });

  return NextResponse.json({ reading, output });
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Test end-to-end**

```bash
curl -s -X POST http://localhost:3000/api/readings/hellenistic \
  -H "Content-Type: application/json" \
  -d '{"profile_id":"PROFILE_ID"}' \
  | python3 -m json.tool | head -30
```

Expected: JSON with `output.data.planets`, `output.data.aspects`, `output.data.lots.pars_fortuna`.

- [ ] **Step 5: Commit**

```bash
git add lib/engines/hellenistic.ts app/api/readings/hellenistic/route.ts
git commit -m "feat: add Hellenistic (flatlib) engine fetcher and API route"
```

---

## Task 6: Ba Zi API route

**Files:**
- Create: `app/api/readings/bazi/route.ts`

- [ ] **Step 1: Create app/api/readings/bazi/route.ts**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchBazi } from "@/lib/engines/bazi";

export async function POST(req: NextRequest) {
  const { profile_id } = await req.json();
  const profile = db.profiles.get(profile_id);
  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const input = {
    date_of_birth: profile.date_of_birth,
    time_of_birth: profile.time_of_birth,
  };

  const output = await fetchBazi(input);
  const reading = db.readings.save({
    profile_id,
    engine: "bazi",
    input_snapshot: input,
    output_data: output,
  });

  return NextResponse.json({ reading, output });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Test Ba Zi API route end-to-end**

```bash
curl -s -X POST http://localhost:3000/api/readings/bazi \
  -H "Content-Type: application/json" \
  -d '{"profile_id":"PROFILE_ID"}' \
  | python3 -m json.tool
```

Expected: JSON where `output.data.mainPillars.year.animal` is `"Rat"` (for 1984), and `output.data.basicAnalysis.dayMaster.element` is `"WOOD"`.

- [ ] **Step 4: Commit**

```bash
git add app/api/readings/bazi/route.ts
git commit -m "feat: add Ba Zi API route"
```

---

## Task 7: WesternView component

**Files:**
- Create: `components/engines/WesternView.tsx`

### Data shape from Kerykeion Western endpoint:
```
data.meta: { zodiac_type, houses_system, julian_day, is_diurnal, day_of_week, utc_datetime, local_datetime }
data.planets: {
  sun: { sign, position (in sign), abs_pos, house, retrograde, speed, declination, quality, element, emoji },
  moon/mercury/venus/mars/jupiter/saturn/uranus/neptune/pluto/mean_node/true_node/chiron: (same shape)
}
data.houses: {
  first_house: { sign, position (in sign), abs_pos },
  second_house ... twelfth_house: (same shape)
}
data.aspects: [{ p1, p2, aspect, orbit, movement, aspect_degrees }]
```

Sign abbreviations from kerykeion: "Ari","Tau","Gem","Can","Leo","Vir","Lib","Sco","Sag","Cap","Aqu","Pis"

### Sections to render:
1. **Chart Overview** (open): is_diurnal (Day/Night), zodiac_type, houses_system, day_of_week, julian_day
2. **Planetary Positions** (open): table with Planet | Sign (full name) | Deg in Sign | House | Element | Quality | Speed | ℞ | Declination
3. **House Cusps** (open): table H1–H12 with Sign (full name) and degrees
4. **Aspects** (open): table with P1 | P2 | Aspect | Orb | Movement (Applying/Separating) — color code: conjunction=yellow, trine=green, sextile=teal, square=red, opposition=orange, quincunx=gray
5. **Outer Planets & Points** (collapsed): uranus, neptune, pluto, chiron, nodes

- [ ] **Step 1: Create components/engines/WesternView.tsx**

```tsx
"use client";
import { Section } from "@/components/Section";

type PlanetData = {
  sign?: string; position?: number; abs_pos?: number; house?: string;
  retrograde?: boolean; speed?: number; declination?: number;
  quality?: string; element?: string; emoji?: string;
};
type HouseData = { sign?: string; position?: number; abs_pos?: number };
type AspectData = {
  p1: string; p2: string; aspect: string;
  orbit?: number; movement?: string; aspect_degrees?: number;
};
type MetaData = {
  zodiac_type?: string; houses_system?: string; julian_day?: number;
  is_diurnal?: boolean; day_of_week?: string;
  utc_datetime?: string; local_datetime?: string;
};

type Props = { output: Record<string, unknown> };

const SIGN_MAP: Record<string, string> = {
  Ari:"Aries",Tau:"Taurus",Gem:"Gemini",Can:"Cancer",Leo:"Leo",Vir:"Virgo",
  Lib:"Libra",Sco:"Scorpio",Sag:"Sagittarius",Cap:"Capricorn",Aqu:"Aquarius",Pis:"Pisces",
};
const HOUSE_ORDER = [
  "first_house","second_house","third_house","fourth_house","fifth_house","sixth_house",
  "seventh_house","eighth_house","ninth_house","tenth_house","eleventh_house","twelfth_house",
];
const INNER_PLANETS = ["sun","moon","mercury","venus","mars","jupiter","saturn"];
const OUTER_PLANETS = ["uranus","neptune","pluto","chiron","mean_node","true_node"];

function aspectColor(asp: string): string {
  switch (asp) {
    case "conjunction": return "text-yellow-400";
    case "trine": return "text-emerald-400";
    case "sextile": return "text-teal-400";
    case "square": return "text-red-400";
    case "opposition": return "text-orange-400";
    default: return "text-muted-foreground";
  }
}

function fullSign(abbr: string): string {
  return SIGN_MAP[abbr] ?? abbr;
}

function fmtDeg(deg?: number): string {
  if (deg === undefined || deg === null) return "—";
  const d = Math.floor(deg);
  const m = Math.floor((deg - d) * 60);
  return `${d}°${String(m).padStart(2,"0")}′`;
}

export function WesternView({ output }: Props) {
  const data = output.data as Record<string, unknown> | undefined;
  if (!data) return <p className="text-muted-foreground text-sm p-4">{output.error ? String(output.error) : "No data"}</p>;

  const meta = data.meta as MetaData | undefined;
  const planets = data.planets as Record<string, PlanetData> | undefined;
  const houses = data.houses as Record<string, HouseData> | undefined;
  const aspects = data.aspects as AspectData[] | undefined;

  const accent = "text-indigo-400";
  const row = "border-b border-white/10 hover:bg-white/5";
  const th = "text-left py-1.5 pr-3 font-medium text-xs text-muted-foreground";
  const card = "bg-indigo-950/20 border border-indigo-800/30 rounded-lg p-3";

  return (
    <div>
      {meta && (
        <Section title="Chart Overview" accent={accent}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
            {[
              { label: "Chart Type", value: meta.is_diurnal !== undefined ? (meta.is_diurnal ? "Day Chart ☀️" : "Night Chart 🌙") : undefined },
              { label: "Zodiac", value: meta.zodiac_type },
              { label: "House System", value: meta.houses_system },
              { label: "Day of Week", value: meta.day_of_week },
              { label: "Local Time", value: meta.local_datetime },
              { label: "UTC Time", value: meta.utc_datetime },
              { label: "Julian Day", value: meta.julian_day?.toFixed(6) },
            ].filter(x => x.value !== undefined).map(({ label, value }) => (
              <div key={label} className={card}>
                <p className="text-xs text-indigo-400/70 uppercase tracking-wide">{label}</p>
                <p className="text-sm font-medium text-indigo-200 mt-0.5 break-all">{String(value)}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {planets && (
        <Section title="Planetary Positions (Inner Planets + Luminaries)" accent={accent}>
          <table className="w-full text-sm border-collapse mt-1">
            <thead>
              <tr className="border-b border-white/10">
                <th className={th}>Planet</th>
                <th className={th}>Sign</th>
                <th className={th}>Deg in Sign</th>
                <th className={th}>House</th>
                <th className={th}>Element</th>
                <th className={th}>Quality</th>
                <th className={th}>Speed°/d</th>
                <th className={th}>Decl.</th>
                <th className={th}>℞</th>
              </tr>
            </thead>
            <tbody>
              {INNER_PLANETS.filter(p => planets[p]).map(pKey => {
                const p = planets[pKey];
                return (
                  <tr key={pKey} className={row}>
                    <td className="py-2 pr-3 font-medium capitalize">{pKey} {p.emoji ?? ""}</td>
                    <td className="py-2 pr-3">{fullSign(p.sign ?? "")}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{fmtDeg(p.position)}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">
                      {p.house?.replace("_House","").replace("_house","") ?? "—"}
                    </td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{p.element ?? "—"}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{p.quality ?? "—"}</td>
                    <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{p.speed?.toFixed(3) ?? "—"}</td>
                    <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{p.declination?.toFixed(2) ?? "—"}°</td>
                    <td className="py-2 font-bold text-orange-400">{p.retrograde ? "℞" : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Section>
      )}

      {houses && (
        <Section title="House Cusps" accent={accent}>
          <table className="w-full text-sm border-collapse mt-1">
            <thead>
              <tr className="border-b border-white/10">
                <th className={th}>House</th>
                <th className={th}>Sign</th>
                <th className={`${th} font-mono`}>Cusp°</th>
              </tr>
            </thead>
            <tbody>
              {HOUSE_ORDER.filter(hk => houses[hk]).map((hk, i) => {
                const h = houses[hk];
                return (
                  <tr key={hk} className={row}>
                    <td className="py-2 pr-3 font-bold text-indigo-400">{i + 1}</td>
                    <td className="py-2 pr-3">{fullSign(h.sign ?? "")}</td>
                    <td className="py-2 font-mono text-xs text-muted-foreground">{fmtDeg(h.position)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Section>
      )}

      {aspects && aspects.length > 0 && (
        <Section title="Aspects" accent={accent}>
          <table className="w-full text-sm border-collapse mt-1">
            <thead>
              <tr className="border-b border-white/10">
                <th className={th}>Planet 1</th>
                <th className={th}>Aspect</th>
                <th className={th}>Planet 2</th>
                <th className={th}>Orb</th>
                <th className={th}>Movement</th>
              </tr>
            </thead>
            <tbody>
              {aspects.map((a, i) => (
                <tr key={i} className={row}>
                  <td className="py-2 pr-3 font-medium capitalize">{a.p1}</td>
                  <td className={`py-2 pr-3 font-medium capitalize ${aspectColor(a.aspect)}`}>{a.aspect}</td>
                  <td className="py-2 pr-3 font-medium capitalize">{a.p2}</td>
                  <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{a.orbit?.toFixed(2)}°</td>
                  <td className="py-2 text-xs text-muted-foreground">{a.movement ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {planets && OUTER_PLANETS.some(p => planets[p]) && (
        <Section title="Outer Planets & Nodes" accent={accent} defaultOpen={false}>
          <table className="w-full text-sm border-collapse mt-1">
            <thead>
              <tr className="border-b border-white/10">
                <th className={th}>Point</th>
                <th className={th}>Sign</th>
                <th className={th}>Deg in Sign</th>
                <th className={th}>House</th>
                <th className={th}>℞</th>
              </tr>
            </thead>
            <tbody>
              {OUTER_PLANETS.filter(p => planets[p]).map(pKey => {
                const p = planets[pKey];
                return (
                  <tr key={pKey} className={row}>
                    <td className="py-2 pr-3 font-medium capitalize">{pKey.replace("_", " ")} {p.emoji ?? ""}</td>
                    <td className="py-2 pr-3">{fullSign(p.sign ?? "")}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{fmtDeg(p.position)}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{p.house?.replace("_House","").replace("_house","") ?? "—"}</td>
                    <td className="py-2 font-bold text-orange-400">{p.retrograde ? "℞" : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Section>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/engines/WesternView.tsx
git commit -m "feat: add WesternView component for Kerykeion data"
```

---

## Task 8: HellenisticView component

**Files:**
- Create: `components/engines/HellenisticView.tsx`

### Data shape from flatlib Hellenistic endpoint:
```
data.meta: { is_diurnal, utc_datetime, house_system }
data.planets: {
  Sun: { id, sign, lon, signlon, lat, speed, retrograde, element, gender },
  Moon/Mercury/Venus/Mars/Jupiter/Saturn/Uranus/Neptune/Pluto: (same)
}
data.houses: {
  House1: { id, sign, lon, signlon },
  House2 … House12: (same)
}
data.aspects: [{ p1, p2, type, orb, movement }]
data.lots.pars_fortuna: { lon, sign, formula }
```

Aspect types from flatlib const: "conjunction", "sextile", "square", "trine", "opposition"

Traditional planets for dignities: Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn

Essential dignity rules:
- Domicile (Rulership): Aries/Scorpio→Mars, Taurus/Libra→Venus, Gemini/Virgo→Mercury, Cancer→Moon, Leo→Sun, Sagittarius/Pisces→Jupiter, Capricorn/Aquarius→Saturn
- Exaltation: Sun→Aries, Moon→Taurus, Mercury→Virgo, Venus→Pisces, Mars→Capricorn, Jupiter→Cancer, Saturn→Libra
- Fall (opposite exaltation): Sun→Libra, Moon→Scorpio, Mercury→Pisces, Venus→Virgo, Mars→Cancer, Jupiter→Capricorn, Saturn→Aries
- Detriment (opposite domicile)

Compute dignity in the view component from planet sign.

### Sections:
1. **Chart Overview** (open): day/night chart, house system
2. **Planetary Positions with Dignities** (open): table with Planet | Sign | Deg | Dignity | Retrograde | Speed | Element | Gender
3. **House Cusps** (open): House 1-12 with sign and cusp degree
4. **Aspects** (open): table with aspects between traditional planets
5. **Hermetic Lots** (open): Pars Fortuna with lon, sign, formula

- [ ] **Step 1: Create components/engines/HellenisticView.tsx**

```tsx
"use client";
import { Section } from "@/components/Section";

type PlanetObj = {
  id?: string; sign?: string; lon?: number; signlon?: number;
  lat?: number; speed?: number; retrograde?: boolean;
  element?: string; gender?: string;
};
type HouseObj = { id?: string; sign?: string; lon?: number; signlon?: number };
type AspectObj = { p1?: string; p2?: string; type?: string; orb?: number; movement?: string };
type Lots = { pars_fortuna?: { lon?: number; sign?: string; formula?: string } };

type Props = { output: Record<string, unknown> };

// Essential dignity lookup
const DOMICILE: Record<string, string[]> = {
  Sun: ["Leo"], Moon: ["Cancer"], Mercury: ["Gemini","Virgo"],
  Venus: ["Taurus","Libra"], Mars: ["Aries","Scorpio"],
  Jupiter: ["Sagittarius","Pisces"], Saturn: ["Capricorn","Aquarius"],
};
const EXALTATION: Record<string, string> = {
  Sun: "Aries", Moon: "Taurus", Mercury: "Virgo", Venus: "Pisces",
  Mars: "Capricorn", Jupiter: "Cancer", Saturn: "Libra",
};
const FALL: Record<string, string> = {
  Sun: "Libra", Moon: "Scorpio", Mercury: "Pisces", Venus: "Virgo",
  Mars: "Cancer", Jupiter: "Capricorn", Saturn: "Aries",
};
const DETRIMENT: Record<string, string[]> = {
  Sun: ["Aquarius"], Moon: ["Capricorn"], Mercury: ["Sagittarius","Pisces"],
  Venus: ["Aries","Scorpio"], Mars: ["Taurus","Libra"],
  Jupiter: ["Gemini","Virgo"], Saturn: ["Cancer","Leo"],
};

function essentialDignity(planet: string, sign: string): { label: string; color: string } {
  if (DOMICILE[planet]?.includes(sign)) return { label: "Domicile", color: "text-emerald-400 bg-emerald-950/40 border-emerald-700/50" };
  if (EXALTATION[planet] === sign) return { label: "Exaltation", color: "text-blue-400 bg-blue-950/40 border-blue-700/50" };
  if (FALL[planet] === sign) return { label: "Fall", color: "text-orange-400 bg-orange-950/40 border-orange-700/50" };
  if (DETRIMENT[planet]?.includes(sign)) return { label: "Detriment", color: "text-red-400 bg-red-950/40 border-red-700/50" };
  return { label: "Peregrine", color: "text-gray-400 bg-gray-800/40 border-gray-600/50" };
}

function aspectColor(type?: string): string {
  switch (type) {
    case "conjunction": return "text-yellow-400";
    case "trine": return "text-emerald-400";
    case "sextile": return "text-teal-400";
    case "square": return "text-red-400";
    case "opposition": return "text-orange-400";
    default: return "text-muted-foreground";
  }
}

function fmtDeg(deg?: number): string {
  if (deg === undefined || deg === null) return "—";
  const d = Math.floor(deg);
  const m = Math.floor((deg - d) * 60);
  return `${d}°${String(m).padStart(2,"0")}′`;
}

const TRADITIONAL = ["Sun","Moon","Mercury","Venus","Mars","Jupiter","Saturn"];
const HOUSE_IDS = ["House1","House2","House3","House4","House5","House6",
                   "House7","House8","House9","House10","House11","House12"];

export function HellenisticView({ output }: Props) {
  const data = output.data as Record<string, unknown> | undefined;
  if (!data) return <p className="text-muted-foreground text-sm p-4">{output.error ? String(output.error) : "No data"}</p>;

  const meta = data.meta as { is_diurnal?: boolean; utc_datetime?: string; house_system?: string } | undefined;
  const planets = data.planets as Record<string, PlanetObj> | undefined;
  const houses = data.houses as Record<string, HouseObj> | undefined;
  const aspects = data.aspects as AspectObj[] | undefined;
  const lots = data.lots as Lots | undefined;

  const accent = "text-purple-400";
  const row = "border-b border-white/10 hover:bg-white/5";
  const th = "text-left py-1.5 pr-3 font-medium text-xs text-muted-foreground";
  const card = "bg-purple-950/20 border border-purple-800/30 rounded-lg p-3";

  return (
    <div>
      {meta && (
        <Section title="Chart Overview" accent={accent}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
            {[
              { label: "Chart Sect", value: meta.is_diurnal !== undefined ? (meta.is_diurnal ? "Day Chart (Solar)" : "Night Chart (Lunar)") : undefined },
              { label: "House System", value: meta.house_system },
              { label: "UTC Moment", value: meta.utc_datetime },
            ].filter(x => x.value !== undefined).map(({ label, value }) => (
              <div key={label} className={card}>
                <p className="text-xs text-purple-400/70 uppercase tracking-wide">{label}</p>
                <p className="text-sm font-medium text-purple-200 mt-0.5">{String(value)}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
            Hellenistic astrology uses Whole Sign or Placidus houses, emphasizes sect (day/night), essential dignities (Domicile, Exaltation, Fall, Detriment), and the Hermetic Lots.
          </p>
        </Section>
      )}

      {planets && (
        <Section title="Planetary Positions — Essential Dignities" accent={accent}>
          <table className="w-full text-sm border-collapse mt-1">
            <thead>
              <tr className="border-b border-white/10">
                <th className={th}>Planet</th>
                <th className={th}>Sign</th>
                <th className={th}>Deg</th>
                <th className={th}>Dignity</th>
                <th className={th}>Speed</th>
                <th className={th}>Lat</th>
                <th className={th}>Element</th>
                <th className={th}>Gender</th>
                <th className={th}>℞</th>
              </tr>
            </thead>
            <tbody>
              {TRADITIONAL.filter(p => planets[p]).map(pKey => {
                const p = planets[pKey];
                const dig = essentialDignity(pKey, p.sign ?? "");
                return (
                  <tr key={pKey} className={row}>
                    <td className="py-2 pr-3 font-medium">{pKey}</td>
                    <td className="py-2 pr-3">{p.sign}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{fmtDeg(p.signlon)}</td>
                    <td className="py-2 pr-3">
                      <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${dig.color}`}>{dig.label}</span>
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{p.speed?.toFixed(3) ?? "—"}</td>
                    <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">{p.lat?.toFixed(3) ?? "—"}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground capitalize">{p.element ?? "—"}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground capitalize">{p.gender ?? "—"}</td>
                    <td className="py-2 font-bold text-orange-400">{p.retrograde ? "℞" : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Section>
      )}

      {houses && (
        <Section title="House Cusps" accent={accent}>
          <table className="w-full text-sm border-collapse mt-1">
            <thead>
              <tr className="border-b border-white/10">
                <th className={th}>House</th>
                <th className={th}>Sign</th>
                <th className={`${th} font-mono`}>Cusp°</th>
              </tr>
            </thead>
            <tbody>
              {HOUSE_IDS.filter(hk => houses[hk]).map((hk, i) => {
                const h = houses[hk];
                return (
                  <tr key={hk} className={row}>
                    <td className="py-2 pr-3 font-bold text-purple-400">{i + 1}</td>
                    <td className="py-2 pr-3">{h.sign}</td>
                    <td className="py-2 font-mono text-xs text-muted-foreground">{fmtDeg(h.signlon)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Section>
      )}

      {aspects && aspects.length > 0 && (
        <Section title="Aspects (Traditional Planets)" accent={accent}>
          <table className="w-full text-sm border-collapse mt-1">
            <thead>
              <tr className="border-b border-white/10">
                <th className={th}>Planet 1</th>
                <th className={th}>Aspect</th>
                <th className={th}>Planet 2</th>
                <th className={th}>Orb</th>
              </tr>
            </thead>
            <tbody>
              {aspects.map((a, i) => (
                <tr key={i} className={row}>
                  <td className="py-2 pr-3 font-medium">{a.p1}</td>
                  <td className={`py-2 pr-3 font-medium capitalize ${aspectColor(a.type)}`}>{a.type}</td>
                  <td className="py-2 pr-3 font-medium">{a.p2}</td>
                  <td className="py-2 font-mono text-xs text-muted-foreground">{a.orb?.toFixed(2)}°</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {lots?.pars_fortuna && (
        <Section title="Hermetic Lots" accent={accent}>
          <div className={`${card} mt-2 space-y-2`}>
            <div>
              <p className="text-xs text-purple-400/70 uppercase tracking-wide">Pars Fortuna (Lot of Fortune)</p>
              <p className="text-xl font-bold text-purple-200 mt-1">{lots.pars_fortuna.sign}</p>
              <p className="text-sm font-mono text-muted-foreground">{lots.pars_fortuna.lon?.toFixed(4)}°</p>
              <p className="text-xs text-muted-foreground mt-1">Formula: {lots.pars_fortuna.formula}</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The Lot of Fortune indicates areas of material prosperity and body vitality. Computed from ASC, Sun, Moon positions — formula inverts for night charts.
            </p>
          </div>
        </Section>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/engines/HellenisticView.tsx
git commit -m "feat: add HellenisticView component with essential dignities"
```

---

## Task 9: BaziView component

**Files:**
- Create: `components/engines/BaziView.tsx`

### Data shape from Ba Zi engine:
```
data.mainPillars: {
  year:  { chinese: "甲子", element: "WOOD", animal: "Rat",  branch: { element: "WATER" } }
  month: { chinese: "甲戌", element: "WOOD", animal: "Dog",  branch: { element: "EARTH" } }
  day:   { chinese: "乙亥", element: "WOOD", animal: "Pig",  branch: { element: "WATER" } }
  time:  { chinese: "癸未", element: "WATER", animal: "Goat", branch: { element: "EARTH" } }
}
data.basicAnalysis: {
  lifeGua: 7,
  dayMaster: { stem: "乙", nature: "Yin", element: "WOOD" },
  nobleman: ["未","丑"],
  intelligence: "巳",
  skyHorse: "巳",
  peachBlossom: "酉",
  fiveFactors: { WOOD: 43, FIRE: 14, EARTH: 8, METAL: 4, WATER: 31 },
  eightMansions: {
    group: "West",
    lucky: { wealth: "NW", health: "W", romance: "NE", career: "SW" },
    unlucky: { obstacles: "SE", quarrels: "E", setbacks: "S", totalLoss: "N" }
  }
}
```

### Element color mapping (use throughout):
- WOOD: `text-green-400 bg-green-950/30`
- FIRE: `text-red-400 bg-red-950/30`
- EARTH: `text-yellow-400 bg-yellow-950/30`
- METAL: `text-gray-300 bg-gray-800/30`
- WATER: `text-blue-400 bg-blue-950/30`

### Sections:
1. **Four Pillars** (open): 4-column grid showing Year/Month/Day/Time pillars with Chinese characters large, element color, animal name, stem element, branch element
2. **Day Master** (open): Large display of the Day Master stem with Yin/Yang nature and element
3. **Five Elements Balance** (open): bar chart (use div widths as percentages) for WOOD/FIRE/EARTH/METAL/WATER
4. **Life Gua & Special Stars** (open): lifeGua number, nobleman branches, intelligence/skyHorse/peachBlossom stars
5. **Eight Mansions** (open): lucky and unlucky directions with color coding

- [ ] **Step 1: Create components/engines/BaziView.tsx**

```tsx
"use client";
import { Section } from "@/components/Section";

type Pillar = { chinese?: string; element?: string; animal?: string; branch?: { element?: string } };
type Pillars = { year?: Pillar; month?: Pillar; day?: Pillar; time?: Pillar };
type DayMaster = { stem?: string; nature?: string; element?: string };
type FiveFactors = { WOOD?: number; FIRE?: number; EARTH?: number; METAL?: number; WATER?: number };
type EightMansions = {
  group?: string;
  lucky?: { wealth?: string; health?: string; romance?: string; career?: string };
  unlucky?: { obstacles?: string; quarrels?: string; setbacks?: string; totalLoss?: string };
};
type BasicAnalysis = {
  lifeGua?: number; dayMaster?: DayMaster; nobleman?: string[];
  intelligence?: string; skyHorse?: string; peachBlossom?: string;
  fiveFactors?: FiveFactors; eightMansions?: EightMansions;
};

type Props = { output: Record<string, unknown> };

const ELEMENT_COLORS: Record<string, string> = {
  WOOD: "text-green-300 bg-green-950/30 border-green-700/40",
  FIRE: "text-red-300 bg-red-950/30 border-red-700/40",
  EARTH: "text-yellow-300 bg-yellow-950/30 border-yellow-700/40",
  METAL: "text-slate-300 bg-slate-800/30 border-slate-600/40",
  WATER: "text-blue-300 bg-blue-950/30 border-blue-700/40",
};
const ELEMENT_BAR: Record<string, string> = {
  WOOD: "bg-green-500",
  FIRE: "bg-red-500",
  EARTH: "bg-yellow-500",
  METAL: "bg-slate-400",
  WATER: "bg-blue-500",
};

export function BaziView({ output }: Props) {
  const data = output.data as Record<string, unknown> | undefined;
  if (!data) return <p className="text-muted-foreground text-sm p-4">{output.error ? String(output.error) : "No data"}</p>;

  const pillars = data.mainPillars as Pillars | undefined;
  const analysis = data.basicAnalysis as BasicAnalysis | undefined;

  const accent = "text-red-400";

  const fiveFactors = analysis?.fiveFactors;
  const totalFactors = fiveFactors
    ? Object.values(fiveFactors).reduce((s, v) => s + (v ?? 0), 0)
    : 0;

  return (
    <div>
      {pillars && (
        <Section title="Four Pillars (八字 Bā Zì)" accent={accent}>
          <div className="grid grid-cols-4 gap-3 mt-3">
            {(["year","month","day","time"] as const).map(key => {
              const p = pillars[key];
              if (!p) return null;
              const elColors = ELEMENT_COLORS[p.element ?? ""] ?? "text-muted-foreground bg-white/5 border-white/10";
              return (
                <div key={key} className={`border rounded-lg p-3 text-center ${elColors}`}>
                  <p className="text-xs uppercase tracking-widest opacity-70 mb-2">{key}</p>
                  <p className="text-4xl font-bold leading-none mb-2">{p.chinese}</p>
                  <p className="text-base font-semibold">{p.animal}</p>
                  <div className="mt-2 space-y-1 text-xs opacity-70">
                    <p>Stem: {p.element}</p>
                    <p>Branch: {p.branch?.element}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {analysis?.dayMaster && (
        <Section title="Day Master (日主)" accent={accent}>
          <div className={`mt-2 inline-block border rounded-lg p-5 text-center ${ELEMENT_COLORS[analysis.dayMaster.element ?? ""] ?? "border-white/10"}`}>
            <p className="text-xs uppercase tracking-widest opacity-70 mb-1">Day Stem</p>
            <p className="text-5xl font-bold">{analysis.dayMaster.stem}</p>
            <p className="text-lg font-semibold mt-2">{analysis.dayMaster.nature} {analysis.dayMaster.element}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed max-w-lg">
            The Day Master is the most important pillar — it represents the self. Its element and polarity (Yin/Yang) shape personality, relationships, and destiny analysis.
          </p>
        </Section>
      )}

      {fiveFactors && totalFactors > 0 && (
        <Section title="Five Elements Balance (五行 Wǔ Xíng)" accent={accent}>
          <div className="space-y-2 mt-3">
            {(["WOOD","FIRE","EARTH","METAL","WATER"] as const).map(el => {
              const val = fiveFactors[el] ?? 0;
              const pct = totalFactors > 0 ? (val / totalFactors) * 100 : 0;
              return (
                <div key={el} className="flex items-center gap-3">
                  <span className={`text-xs font-bold w-14 ${ELEMENT_COLORS[el].split(" ")[0]}`}>{el}</span>
                  <div className="flex-1 bg-white/10 rounded-full h-4 overflow-hidden">
                    <div className={`h-4 rounded-full ${ELEMENT_BAR[el]}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground w-12 text-right">{val} ({pct.toFixed(0)}%)</span>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {analysis && (
        <Section title="Life Gua & Special Stars" accent={accent}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
            {analysis.lifeGua !== undefined && (
              <div className="bg-red-950/20 border border-red-800/30 rounded-lg p-3 text-center">
                <p className="text-xs text-red-400/70 uppercase tracking-wide">Life Gua (卦)</p>
                <p className="text-4xl font-bold text-red-200 mt-1">{analysis.lifeGua}</p>
              </div>
            )}
            {[
              { label: "Nobleman Stars (贵人)", value: analysis.nobleman?.join(", ") },
              { label: "Intelligence Star (文昌)", value: analysis.intelligence },
              { label: "Sky Horse (驿马)", value: analysis.skyHorse },
              { label: "Peach Blossom (桃花)", value: analysis.peachBlossom },
            ].filter(x => x.value).map(({ label, value }) => (
              <div key={label} className="bg-white/5 border border-white/10 rounded-lg p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
                <p className="text-base font-semibold text-red-200 mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {analysis?.eightMansions && (
        <Section title="Eight Mansions Feng Shui (八宅)" accent={accent}>
          <div className="mt-2 space-y-3">
            <p className="text-xs text-muted-foreground">
              Life Group: <span className="font-semibold text-red-300">{analysis.eightMansions.group}</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-950/20 border border-emerald-800/30 rounded-lg p-3">
                <p className="text-xs text-emerald-400 uppercase tracking-wide mb-2">Lucky Directions</p>
                {[
                  { label: "Wealth (生气)", dir: analysis.eightMansions.lucky?.wealth },
                  { label: "Health (天医)", dir: analysis.eightMansions.lucky?.health },
                  { label: "Romance (延年)", dir: analysis.eightMansions.lucky?.romance },
                  { label: "Career (伏位)", dir: analysis.eightMansions.lucky?.career },
                ].filter(x => x.dir).map(({ label, dir }) => (
                  <div key={label} className="flex justify-between text-sm py-0.5">
                    <span className="text-muted-foreground text-xs">{label}</span>
                    <span className="font-bold text-emerald-300">{dir}</span>
                  </div>
                ))}
              </div>
              <div className="bg-red-950/20 border border-red-800/30 rounded-lg p-3">
                <p className="text-xs text-red-400 uppercase tracking-wide mb-2">Unlucky Directions</p>
                {[
                  { label: "Obstacles (六煞)", dir: analysis.eightMansions.unlucky?.obstacles },
                  { label: "Quarrels (五鬼)", dir: analysis.eightMansions.unlucky?.quarrels },
                  { label: "Setbacks (祸害)", dir: analysis.eightMansions.unlucky?.setbacks },
                  { label: "Total Loss (绝命)", dir: analysis.eightMansions.unlucky?.totalLoss },
                ].filter(x => x.dir).map(({ label, dir }) => (
                  <div key={label} className="flex justify-between text-sm py-0.5">
                    <span className="text-muted-foreground text-xs">{label}</span>
                    <span className="font-bold text-red-300">{dir}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/engines/BaziView.tsx
git commit -m "feat: add BaziView component for Chinese Four Pillars"
```

---

## Task 10: Wire everything into the profile page

**Files:**
- Modify: `app/profiles/[id]/page.tsx`

The profile page currently has tabs: VedAstro | Panchangam | Jyotishganit | Consolidated | Chat.
Add: Western | Hellenistic | Ba Zi (three new tabs after Jyotishganit, before Consolidated).

The existing `EngineTab` component handles rendering: it takes `engine`, `label`, `state`, `onRefresh`. Pass new engine names and labels.

Auto-fetch all 6 engines on profile load (extend the `useEffect` that currently fetches 3).

- [ ] **Step 1: Read app/profiles/[id]/page.tsx**

Read the full file before editing: `app/profiles/[id]/page.tsx`

- [ ] **Step 2: Add imports for new view components**

After line `import { JyotishganitView } from "@/components/engines/JyotishganitView";`, add:
```typescript
import { WesternView } from "@/components/engines/WesternView";
import { HellenisticView } from "@/components/engines/HellenisticView";
import { BaziView } from "@/components/engines/BaziView";
```

- [ ] **Step 3: Extend ENGINE_ACCENTS**

Replace:
```typescript
const ENGINE_ACCENTS: Record<string, string> = {
  vedastro: "text-blue-700",
  panchangam: "text-amber-700",
  jyotishganit: "text-green-700",
};
```
With:
```typescript
const ENGINE_ACCENTS: Record<string, string> = {
  vedastro: "text-blue-400",
  panchangam: "text-amber-400",
  jyotishganit: "text-green-400",
  western: "text-indigo-400",
  hellenistic: "text-purple-400",
  bazi: "text-red-400",
};
```

- [ ] **Step 4: Extend the EngineTab render logic**

The `EngineTab` component has this block inside its render:
```typescript
      engine === "vedastro" ? <VedAstroView output={state.output as Record<string, unknown>} /> :
      engine === "panchangam" ? <PanchangamView output={state.output as Record<string, unknown>} /> :
      engine === "jyotishganit" ? <JyotishganitView output={state.output as Record<string, unknown>} /> :
      null
```

Replace with:
```typescript
      engine === "vedastro" ? <VedAstroView output={state.output as Record<string, unknown>} /> :
      engine === "panchangam" ? <PanchangamView output={state.output as Record<string, unknown>} /> :
      engine === "jyotishganit" ? <JyotishganitView output={state.output as Record<string, unknown>} /> :
      engine === "western" ? <WesternView output={state.output as Record<string, unknown>} /> :
      engine === "hellenistic" ? <HellenisticView output={state.output as Record<string, unknown>} /> :
      engine === "bazi" ? <BaziView output={state.output as Record<string, unknown>} /> :
      null
```

- [ ] **Step 5: Add new engine states to useState**

Replace:
```typescript
  const [engines, setEngines] = useState<Record<string, EngineState>>({
    vedastro: DEFAULT_ENGINE,
    panchangam: DEFAULT_ENGINE,
    jyotishganit: DEFAULT_ENGINE,
  });
```
With:
```typescript
  const [engines, setEngines] = useState<Record<string, EngineState>>({
    vedastro: DEFAULT_ENGINE,
    panchangam: DEFAULT_ENGINE,
    jyotishganit: DEFAULT_ENGINE,
    western: DEFAULT_ENGINE,
    hellenistic: DEFAULT_ENGINE,
    bazi: DEFAULT_ENGINE,
  });
```

- [ ] **Step 6: Extend fetchEngine type signature and auto-fetch**

Replace:
```typescript
  const fetchEngine = useCallback(
    async (engine: "vedastro" | "panchangam" | "jyotishganit") => {
```
With:
```typescript
  const fetchEngine = useCallback(
    async (engine: "vedastro" | "panchangam" | "jyotishganit" | "western" | "hellenistic" | "bazi") => {
```

Replace the auto-fetch block:
```typescript
        fetchEngine("vedastro");
        fetchEngine("panchangam");
        fetchEngine("jyotishganit");
```
With:
```typescript
        fetchEngine("vedastro");
        fetchEngine("panchangam");
        fetchEngine("jyotishganit");
        fetchEngine("western");
        fetchEngine("hellenistic");
        fetchEngine("bazi");
```

- [ ] **Step 7: Add new TabsTrigger and TabsContent elements**

After `<TabsTrigger value="jyotishganit" ...>Jyotishganit</TabsTrigger>`, add:
```tsx
          <TabsTrigger value="western" className="text-indigo-400">Western</TabsTrigger>
          <TabsTrigger value="hellenistic" className="text-purple-400">Hellenistic</TabsTrigger>
          <TabsTrigger value="bazi" className="text-red-400">Ba Zi</TabsTrigger>
```

After the `<TabsContent value="jyotishganit">` block, add:
```tsx
        <TabsContent value="western">
          <EngineTab engine="western" label="Western (Kerykeion)" state={engines.western} onRefresh={() => fetchEngine("western")} />
        </TabsContent>
        <TabsContent value="hellenistic">
          <EngineTab engine="hellenistic" label="Hellenistic (flatlib)" state={engines.hellenistic} onRefresh={() => fetchEngine("hellenistic")} />
        </TabsContent>
        <TabsContent value="bazi">
          <EngineTab engine="bazi" label="Chinese Ba Zi" state={engines.bazi} onRefresh={() => fetchEngine("bazi")} />
        </TabsContent>
```

- [ ] **Step 8: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9: Smoke test in browser**

Open http://localhost:3000, navigate to an existing profile. You should see 8 tabs:
- VedAstro, Panchangam, Jyotishganit (existing)
- Western, Hellenistic, Ba Zi (new)
- Consolidated, Chat

Each new tab should either show data or a loading spinner. Verify:
- Western tab: shows planets in Tropical zodiac (Sun in Libra for Oct 8 1984)
- Hellenistic tab: shows "Day Chart (Solar)" for a daytime birth, Pars Fortuna sign
- Ba Zi tab: shows Four Pillars with Chinese characters, Day Master, Five Elements bar chart

- [ ] **Step 10: Commit**

```bash
git add app/profiles/[id]/page.tsx
git commit -m "feat: add Western, Hellenistic, Ba Zi tabs to profile page"
```

---

## Self-Review

### Spec coverage check:
1. ✅ Western/Kerykeion: Tasks 1, 4, 7, 10
2. ✅ Hellenistic/flatlib: Tasks 2, 5, 8, 10
3. ✅ Chinese Ba Zi: Tasks 3, 6, 9, 10
4. ✅ Dark mode colors: all views use dark-mode-first classes

### Placeholder scan:
- No "TBD" or "TODO" patterns
- All code blocks complete
- All type signatures defined before use
- All constants (ELEMENT_COLORS, HOUSE_ORDER, etc.) defined in the file that uses them

### Type consistency:
- `WesternInput` in `western.ts` matches field names passed in `app/api/readings/western/route.ts`
- `HellenisticInput` in `hellenistic.ts` matches fields in its route
- `BaziInput` in `bazi.ts` uses same field names as other engines
- `BaziView` uses `output.data` (not `output.raw`) matching `fetchBazi` return shape `{ data: result }`
- `WesternView` uses `output.data.planets`, `output.data.houses`, `output.data.aspects`, `output.data.meta` matching sidecar response
- `HellenisticView` uses `output.data.planets`, `output.data.houses`, `output.data.aspects`, `output.data.lots` matching sidecar response
