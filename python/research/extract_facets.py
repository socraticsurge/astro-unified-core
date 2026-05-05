"""
Extract structured "facets" from research_readings.output_data into research_chart_facets
for fast filterable querying. One row per (subject, engine, facet_key, facet_value);
multiple rows per (subject, engine) are expected (yogas, conjunctions, lots, etc.).

Usage:
    python research/extract_facets.py                       # all engines
    python research/extract_facets.py jyotishganit western  # specific engines

Re-running is idempotent: facets for an engine are deleted before re-extracting.
"""

import sqlite3
import json
import sys
import datetime as _dt
from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[2] / "astrounified.db"

SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
]

# Kerykeion uses 3-letter sign abbreviations
WESTERN_SIGN_FULL = {
    "Ari": "Aries", "Tau": "Taurus", "Gem": "Gemini", "Can": "Cancer",
    "Leo": "Leo", "Vir": "Virgo", "Lib": "Libra", "Sco": "Scorpio",
    "Sag": "Sagittarius", "Cap": "Capricorn", "Aqu": "Aquarius", "Pis": "Pisces",
}

# Kerykeion house names → number
WESTERN_HOUSE_NUM = {
    "First_House": "1", "Second_House": "2", "Third_House": "3",
    "Fourth_House": "4", "Fifth_House": "5", "Sixth_House": "6",
    "Seventh_House": "7", "Eighth_House": "8", "Ninth_House": "9",
    "Tenth_House": "10", "Eleventh_House": "11", "Twelfth_House": "12",
    # also lowercase variants seen in some keys
    "first_house": "1", "second_house": "2", "third_house": "3",
    "fourth_house": "4", "fifth_house": "5", "sixth_house": "6",
    "seventh_house": "7", "eighth_house": "8", "ninth_house": "9",
    "tenth_house": "10", "eleventh_house": "11", "twelfth_house": "12",
}

# Hellenistic aspect: type field is an int (degrees)
HELLENISTIC_ASPECT_NAME = {
    0: "conjunction", 60: "sextile", 90: "square", 120: "trine", 180: "opposition",
    30: "semi-sextile", 45: "semi-square", 135: "sesquiquadrate", 150: "quincunx",
}

# Essential dignities (traditional 7 planets)
DOMICILE = {
    "Sun": ["Leo"],
    "Moon": ["Cancer"],
    "Mercury": ["Gemini", "Virgo"],
    "Venus": ["Taurus", "Libra"],
    "Mars": ["Aries", "Scorpio"],
    "Jupiter": ["Sagittarius", "Pisces"],
    "Saturn": ["Capricorn", "Aquarius"],
}
EXALTATION = {
    "Sun": "Aries", "Moon": "Taurus", "Mercury": "Virgo", "Venus": "Pisces",
    "Mars": "Capricorn", "Jupiter": "Cancer", "Saturn": "Libra",
}
OPPOSITE_SIGN = {
    "Aries": "Libra", "Libra": "Aries",
    "Taurus": "Scorpio", "Scorpio": "Taurus",
    "Gemini": "Sagittarius", "Sagittarius": "Gemini",
    "Cancer": "Capricorn", "Capricorn": "Cancer",
    "Leo": "Aquarius", "Aquarius": "Leo",
    "Virgo": "Pisces", "Pisces": "Virgo",
}


# ---------- helpers ----------

def lon_to_sign(lon):
    """Convert longitude (degrees) to sign name."""
    try:
        return SIGNS[int(float(lon) / 30.0) % 12]
    except Exception:
        return None


def expand_western_sign(s):
    if not s:
        return None
    return WESTERN_SIGN_FULL.get(s, s)


def essential_dignity(planet, sign):
    """Return one of: domicile / exaltation / detriment / fall / peregrine."""
    if not sign or planet not in DOMICILE:
        return None
    if sign in DOMICILE[planet]:
        return "domicile"
    if EXALTATION.get(planet) == sign:
        return "exaltation"
    # detriment = opposite of domicile
    detriments = [OPPOSITE_SIGN.get(s) for s in DOMICILE[planet]]
    if sign in detriments:
        return "detriment"
    if OPPOSITE_SIGN.get(EXALTATION.get(planet)) == sign:
        return "fall"
    return "peregrine"


def sorted_pair(a, b):
    """Return tuple of (lower-a, lower-b) with alphabetic ordering."""
    la, lb = a.lower(), b.lower()
    return (la, lb) if la <= lb else (lb, la)


def slug_arabic_part(name):
    """'Part of Fortune' → 'part_fortune'; 'Part of Eros (Love)' → 'part_eros_love'"""
    s = name.lower()
    s = s.replace(" of ", "_")
    # remove punctuation, keep alnum and underscore
    out = []
    for ch in s:
        if ch.isalnum():
            out.append(ch)
        elif ch in (" ", "/", "-", "(", ")", "."):
            out.append("_")
    slug = "".join(out)
    while "__" in slug:
        slug = slug.replace("__", "_")
    return slug.strip("_")


def add(facets, key, value):
    """Append (key, str(value).strip()) if value is non-empty."""
    if value is None:
        return
    s = str(value).strip()
    if not s:
        return
    facets.append((key, s))


# ---------- panchangam ----------

def extract_panchangam(out):
    facets = []
    p = (out.get("raw") or {}).get("panchang") or {}
    add(facets, "tithi", p.get("tithi_name"))
    add(facets, "paksha", p.get("paksha"))
    add(facets, "nakshatra", p.get("nakshatra_name"))
    if p.get("nakshatra_pada") is not None:
        add(facets, "nakshatra_pada", p.get("nakshatra_pada"))
    add(facets, "yoga", p.get("yoga_name"))
    add(facets, "karana", p.get("karana_name"))
    add(facets, "vara", p.get("vara_name"))
    asc = p.get("ascendant")
    if isinstance(asc, (int, float)):
        sign = lon_to_sign(asc)
        if sign:
            add(facets, "ascendant_sign", sign)
    return facets


# ---------- jyotishganit ----------

def extract_jyotishganit(out):
    facets = []
    data = out.get("data") or {}

    # Lagna (house 0)
    houses = (data.get("d1Chart") or {}).get("houses") or []
    if houses:
        h0 = houses[0]
        add(facets, "lagna_sign", h0.get("sign"))
        add(facets, "lagna_lord", h0.get("lord"))
        nak = h0.get("nakshatra")
        if not nak:
            for occ in h0.get("occupants") or []:
                if occ.get("nakshatra"):
                    nak = occ.get("nakshatra")
                    break
        add(facets, "lagna_nakshatra", nak)

    # Panchanga
    pan = data.get("panchanga") or {}
    add(facets, "panchanga_tithi", pan.get("tithi"))
    add(facets, "panchanga_nakshatra", pan.get("nakshatra"))
    add(facets, "panchanga_yoga", pan.get("yoga"))
    add(facets, "panchanga_karana", pan.get("karana"))
    add(facets, "panchanga_vaara", pan.get("vaara"))

    # Planets across houses
    # houses[i].occupants is a list of PlanetPosition
    for h in houses:
        try:
            num = h.get("number")
            sign = h.get("sign")
            occs = h.get("occupants") or []
            planet_names_in_house = []
            for occ in occs:
                if occ.get("@type") not in ("PlanetPosition", "Planet"):
                    continue
                name = occ.get("celestialBody") or occ.get("name")
                if not name:
                    continue
                key_lower = name.lower()
                planet_names_in_house.append(name)
                if num is not None:
                    add(facets, f"{key_lower}_house", num)
                if sign:
                    add(facets, f"{key_lower}_sign", sign)
                if occ.get("nakshatra"):
                    add(facets, f"{key_lower}_nakshatra", occ.get("nakshatra"))
                if occ.get("pada") is not None:
                    add(facets, f"{key_lower}_pada", occ.get("pada"))
                # retrograde flag
                is_retro = occ.get("isRetrograde")
                if is_retro is None:
                    is_retro = (occ.get("motion_type") == "retrograde")
                if is_retro:
                    add(facets, f"{key_lower}_retrograde", "yes")
            # Conjunctions: pairs of planets in the same house
            if len(planet_names_in_house) >= 2 and sign:
                pn = sorted(planet_names_in_house, key=lambda x: x.lower())
                for i in range(len(pn)):
                    for j in range(i + 1, len(pn)):
                        a, b = sorted_pair(pn[i], pn[j])
                        add(facets, f"conj_{a}_{b}", sign)
        except Exception:
            continue

    # Mahadasha lord = the one whose [start, end] covers today
    try:
        mahas = ((data.get("dashas") or {}).get("all") or {}).get("mahadashas") or {}
        if isinstance(mahas, dict):
            today = _dt.date.today()
            for planet, info in mahas.items():
                if not isinstance(info, dict):
                    continue
                start = info.get("start")
                end = info.get("end")
                try:
                    sd = _dt.date.fromisoformat(start)
                    ed = _dt.date.fromisoformat(end)
                except Exception:
                    continue
                if sd <= today <= ed:
                    add(facets, "mahadasha_lord", planet)
                    break
    except Exception:
        pass

    return facets


# ---------- western ----------

def extract_western(out):
    facets = []
    data = out.get("data") or {}
    meta = data.get("meta") or {}
    add(facets, "chart_type", "day" if meta.get("is_diurnal") else "night")

    planets = data.get("planets") or {}
    for pname, pdata in planets.items():
        if not isinstance(pdata, dict):
            continue
        key = pname.lower()
        sign = expand_western_sign(pdata.get("sign"))
        if sign:
            add(facets, f"{key}_sign", sign)
        h = pdata.get("house")
        if h:
            hnum = WESTERN_HOUSE_NUM.get(h)
            if hnum:
                add(facets, f"{key}_house", hnum)
        if pdata.get("retrograde"):
            add(facets, f"{key}_retrograde", "yes")

    houses = data.get("houses") or {}
    fh = houses.get("first_house") or houses.get("First_House") or {}
    th = houses.get("tenth_house") or houses.get("Tenth_House") or {}
    if fh.get("sign"):
        add(facets, "asc_sign", expand_western_sign(fh.get("sign")))
    if th.get("sign"):
        add(facets, "mc_sign", expand_western_sign(th.get("sign")))

    aspects = data.get("aspects") or []
    seen_pairs = set()
    for a in aspects:
        try:
            p1 = a.get("p1") or a.get("object1")
            p2 = a.get("p2") or a.get("object2")
            atype = a.get("aspect")
            if not (p1 and p2 and atype):
                continue
            a_, b_ = sorted_pair(p1, p2)
            key = f"aspect_{a_}_{b_}"
            if (key, str(atype)) in seen_pairs:
                continue
            seen_pairs.add((key, str(atype)))
            add(facets, key, str(atype).lower())
        except Exception:
            continue

    return facets


# ---------- hellenistic ----------

def extract_hellenistic(out):
    facets = []
    data = out.get("data") or {}
    meta = data.get("meta") or {}
    add(facets, "sect", "day" if meta.get("is_diurnal") else "night")

    traditional = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"]
    planets = data.get("planets") or {}
    for pname in traditional:
        pdata = planets.get(pname)
        if not isinstance(pdata, dict):
            continue
        key = pname.lower()
        sign = pdata.get("sign")
        if sign:
            add(facets, f"{key}_sign", sign)
            dig = essential_dignity(pname, sign)
            if dig:
                add(facets, f"{key}_dignity", dig)
        if pdata.get("retrograde"):
            add(facets, f"{key}_retrograde", "yes")

    lots = data.get("lots") or {}
    pf = lots.get("pars_fortuna") or {}
    if pf.get("sign"):
        add(facets, "pars_fortuna_sign", pf.get("sign"))

    aspects = data.get("aspects") or []
    seen = set()
    for a in aspects:
        try:
            p1 = a.get("p1")
            p2 = a.get("p2")
            atype = a.get("type")
            if p1 is None or p2 is None or atype is None:
                continue
            # Only include traditional aspects between traditional bodies
            if isinstance(atype, (int, float)):
                aname = HELLENISTIC_ASPECT_NAME.get(int(atype))
            else:
                aname = str(atype).lower()
            if not aname:
                continue
            a_, b_ = sorted_pair(p1, p2)
            key = f"aspect_{a_}_{b_}"
            sig = (key, aname)
            if sig in seen:
                continue
            seen.add(sig)
            add(facets, key, aname)
        except Exception:
            continue

    return facets


# ---------- bazi ----------

def extract_bazi(out):
    facets = []
    data = out.get("data") or {}
    pillars = data.get("mainPillars") or {}
    for pillar in ("year", "month", "day", "time"):
        p = pillars.get(pillar) or {}
        add(facets, f"{pillar}_animal", p.get("animal"))
        add(facets, f"{pillar}_element", p.get("element"))

    ba = data.get("basicAnalysis") or {}
    dm = ba.get("dayMaster") or {}
    add(facets, "day_master_stem", dm.get("stem"))
    add(facets, "day_master_element", dm.get("element"))
    add(facets, "day_master_nature", dm.get("nature"))

    em = ba.get("eightMansions") or {}
    add(facets, "eight_mansions_group", em.get("group"))

    if ba.get("lifeGua") is not None:
        add(facets, "life_gua", ba.get("lifeGua"))

    ff = ba.get("fiveFactors") or {}
    if ff:
        try:
            # Tie-break: alphabetical
            items = [(k, v) for k, v in ff.items() if isinstance(v, (int, float))]
            if items:
                max_v = max(v for _, v in items)
                min_v = min(v for _, v in items)
                dom = sorted([k for k, v in items if v == max_v])[0]
                weak = sorted([k for k, v in items if v == min_v])[0]
                add(facets, "dominant_element", dom)
                add(facets, "weakest_element", weak)
        except Exception:
            pass

    return facets


# ---------- numerology ----------

def extract_numerology(out):
    facets = []
    data = out.get("data") or {}
    for school in ("pythagorean", "chaldean"):
        kf = (data.get(school) or {}).get("key_figures") or {}
        m = {
            "life_path": kf.get("life_path_number"),
            "destiny": kf.get("destiny_number"),
            "expression": kf.get("expression_number"),
            "soul_urge": kf.get("hearth_desire_number"),
            "personality": kf.get("personality_number"),
            "power": kf.get("power_number"),
        }
        for label, val in m.items():
            if val is not None:
                add(facets, f"{school}_{label}", val)
    return facets


# ---------- dashaflow ----------

def extract_dashaflow(out):
    facets = []
    data = out.get("data") or {}

    lagna = data.get("lagna") or {}
    add(facets, "lagna_sign", lagna.get("sign"))
    add(facets, "lagna_nakshatra", lagna.get("nakshatra"))
    if lagna.get("pada") is not None:
        add(facets, "lagna_pada", lagna.get("pada"))

    panchang = data.get("panchang") or {}
    tithi = panchang.get("tithi")
    if isinstance(tithi, dict):
        add(facets, "panchang_tithi", tithi.get("name"))
        add(facets, "panchang_paksha", tithi.get("paksha"))
    elif isinstance(tithi, str):
        add(facets, "panchang_tithi", tithi)
    nak = panchang.get("nakshatra")
    if isinstance(nak, dict):
        add(facets, "panchang_nakshatra", nak.get("name"))
    elif isinstance(nak, str):
        add(facets, "panchang_nakshatra", nak)
    yoga = panchang.get("yoga")
    if isinstance(yoga, dict):
        add(facets, "panchang_yoga", yoga.get("name"))
    elif isinstance(yoga, str):
        add(facets, "panchang_yoga", yoga)
    vara = panchang.get("vara")
    if isinstance(vara, dict):
        add(facets, "panchang_vara", vara.get("name"))
    elif isinstance(vara, str):
        add(facets, "panchang_vara", vara)

    planets = data.get("planets") or {}
    for pname, pdata in planets.items():
        if not isinstance(pdata, dict):
            continue
        key = pname.lower()
        if pdata.get("house") is not None:
            add(facets, f"{key}_house", pdata.get("house"))
        if pdata.get("sign"):
            add(facets, f"{key}_sign", pdata.get("sign"))
        if pdata.get("nakshatra"):
            add(facets, f"{key}_nakshatra", pdata.get("nakshatra"))
        if pdata.get("pada") is not None:
            add(facets, f"{key}_pada", pdata.get("pada"))
        if pdata.get("dignity"):
            add(facets, f"{key}_dignity", pdata.get("dignity"))
        if pdata.get("is_retrograde"):
            add(facets, f"{key}_retrograde", "yes")
        if pdata.get("is_combust"):
            add(facets, f"{key}_combust", "yes")

    for y in data.get("yogas") or []:
        if isinstance(y, dict) and y.get("name"):
            add(facets, "yoga", y.get("name"))

    dashas = data.get("dashas") or {}
    maha = dashas.get("maha") or {}
    if maha.get("planet"):
        add(facets, "mahadasha_lord", maha.get("planet"))
    antar = dashas.get("antar") or {}
    if antar.get("planet"):
        add(facets, "antardasha_lord", antar.get("planet"))

    karakas = data.get("jaimini_karakas") or {}
    atma = karakas.get("Atmakaraka") or {}
    if atma.get("planet"):
        add(facets, "atmakaraka", atma.get("planet"))
    amat = karakas.get("Amatyakaraka") or {}
    if amat.get("planet"):
        add(facets, "amatyakaraka", amat.get("planet"))

    karakamsha = data.get("karakamsha") or {}
    if karakamsha.get("karakamsha_sign"):
        add(facets, "karakamsha_sign", karakamsha.get("karakamsha_sign"))

    return facets


# ---------- stellium ----------

def extract_stellium(out):
    facets = []
    data = out.get("data") or {}

    sect = data.get("sect")
    if sect:
        add(facets, "sect", str(sect).lower())

    voc = data.get("voc_moon")
    if isinstance(voc, dict):
        if "is_void" in voc:
            add(facets, "voc_moon", "yes" if voc.get("is_void") else "no")

    angles_keep = {"ASC", "MC", "DSC", "IC"}
    for pos in data.get("positions") or []:
        try:
            t = pos.get("type")
            name = pos.get("name") or ""
            sign = pos.get("sign")
            if t == "planet" and name and sign:
                key = name.lower().replace(" ", "_")
                add(facets, f"{key}_sign", sign)
                if pos.get("is_retrograde"):
                    add(facets, f"{key}_retrograde", "yes")
            elif t == "angle" and name in angles_keep and sign:
                add(facets, f"{name.lower()}_sign", sign)
        except Exception:
            continue

    profections = data.get("profections_now") or []
    if profections:
        pf = profections[0] or {}
        add(facets, "profection_year_sign", pf.get("profected_sign"))
        if pf.get("profected_house") is not None:
            add(facets, "profection_year_house", pf.get("profected_house"))
        add(facets, "profection_year_ruler", pf.get("ruler"))

    for ap in data.get("arabic_parts") or []:
        try:
            name = ap.get("name")
            sign = ap.get("sign")
            if name and sign:
                slug = slug_arabic_part(name)
                if slug:
                    add(facets, f"lot_{slug}_sign", sign)
        except Exception:
            continue

    return facets


# ---------- driver ----------

EXTRACTORS = {
    "panchangam": extract_panchangam,
    "jyotishganit": extract_jyotishganit,
    "western": extract_western,
    "hellenistic": extract_hellenistic,
    "bazi": extract_bazi,
    "numerology": extract_numerology,
    "dashaflow": extract_dashaflow,
    "stellium": extract_stellium,
}


def main():
    if not DB_PATH.exists():
        print(f"DB not found at {DB_PATH}", file=sys.stderr)
        sys.exit(1)

    engines = sys.argv[1:] if len(sys.argv) > 1 else list(EXTRACTORS.keys())

    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    cur = conn.cursor()

    total_facet_rows = 0
    total_errors = 0

    for engine in engines:
        if engine not in EXTRACTORS:
            print(f"unknown engine: {engine}", file=sys.stderr)
            continue
        extractor = EXTRACTORS[engine]

        # Idempotent: clear old facets for this engine
        cur.execute("DELETE FROM research_chart_facets WHERE engine = ?", (engine,))
        conn.commit()

        cur2 = conn.cursor()
        cur2.execute(
            "SELECT subject_row_key, output_data FROM research_readings "
            "WHERE engine = ? AND status = 'done'",
            (engine,),
        )

        n_subjects = 0
        n_facets = 0
        n_errors = 0

        for row_key, output_str in cur2:
            n_subjects += 1
            try:
                if not output_str:
                    continue
                output = json.loads(output_str)
                facets = extractor(output) or []
                # Filter empty/None and strip whitespace (already done in add())
                rows = [
                    (row_key, engine, k, v)
                    for k, v in facets
                    if v is not None and str(v).strip() != ""
                ]
                if rows:
                    cur.executemany(
                        "INSERT INTO research_chart_facets "
                        "(subject_row_key, engine, facet_key, facet_value) "
                        "VALUES (?, ?, ?, ?)",
                        rows,
                    )
                    n_facets += len(rows)
            except Exception as e:
                n_errors += 1
                print(
                    f"  error in {engine}/{row_key}: {type(e).__name__}: {e}",
                    file=sys.stderr,
                    flush=True,
                )
            if n_subjects % 1000 == 0:
                conn.commit()
                print(
                    f"  {engine}: {n_subjects} subjects processed, {n_facets} facets, {n_errors} errors",
                    flush=True,
                )

        conn.commit()
        print(
            f"{engine}: {n_subjects} subjects -> {n_facets} facets ({n_errors} errors)",
            flush=True,
        )
        total_facet_rows += n_facets
        total_errors += n_errors

    conn.commit()
    conn.close()
    print(f"DONE: {total_facet_rows} facet rows total, {total_errors} extraction errors")


if __name__ == "__main__":
    main()
