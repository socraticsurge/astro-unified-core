from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import datetime
import json
import jyotishganit

app = FastAPI(title="Astrology Sidecar")

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
                "movement": getattr(a, "aspect_movement", None),
                "aspect_degrees": getattr(a, "aspect_degrees", None),
            }
            for a in aspects.all_aspects
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
                            "movement": getattr(asp, "movement", None),
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


def _chaldean_calculate(full_name: str, birthdate: str) -> dict:
    """Compute Chaldean key figures.

    Chaldean alphabet mapping (1-8 only; 9 is considered sacred):
      1: A I J Q Y
      2: B K R
      3: C G L S
      4: D M T
      5: E H N X
      6: U V W
      7: O Z
      8: F P
    """
    CHALDEAN = {
        "a": 1, "i": 1, "j": 1, "q": 1, "y": 1,
        "b": 2, "k": 2, "r": 2,
        "c": 3, "g": 3, "l": 3, "s": 3,
        "d": 4, "m": 4, "t": 4,
        "e": 5, "h": 5, "n": 5, "x": 5,
        "u": 6, "v": 6, "w": 6,
        "o": 7, "z": 7,
        "f": 8, "p": 8,
    }
    VOWELS = set("aeiou")

    def reduce(n: int) -> int:
        """Reduce to single digit (keep master numbers 11, 22, 33)."""
        while n > 9 and n not in (11, 22, 33):
            n = sum(int(d) for d in str(n))
        return n

    letters = [c.lower() for c in full_name if c.isalpha()]
    values = [CHALDEAN.get(c, 0) for c in letters]

    vowel_sum = sum(CHALDEAN.get(c, 0) for c in letters if c in VOWELS)
    consonant_sum = sum(CHALDEAN.get(c, 0) for c in letters if c not in VOWELS)
    total_sum = sum(values)

    # Birthdate numbers
    year, month, day = [int(x) for x in birthdate.split("-")]
    day_num = reduce(day)
    month_num = reduce(month)
    year_num = reduce(sum(int(d) for d in str(year)))

    # Life path = reduce(day + month + year)
    life_path = reduce(day_num + month_num + year_num)

    hearth_desire = reduce(vowel_sum)
    personality = reduce(consonant_sum)
    destiny = reduce(total_sum)
    expression = destiny  # same as destiny in Chaldean
    power = reduce(life_path + destiny)

    # Name number frequencies (digits 1-8 in Chaldean)
    from collections import Counter
    freq: dict[str, int] = {}
    for d in range(1, 9):
        freq[str(d)] = 0
    for v in values:
        if v > 0:
            freq[str(v)] = freq.get(str(v), 0) + 1
    missing = [d for d in range(1, 9) if freq[str(d)] == 0]

    return {
        "key_figures": {
            "hearth_desire_number": hearth_desire,
            "personality_number": personality,
            "destiny_number": destiny,
            "expression_number": expression,
            "full_name_numbers": freq,
            "full_name_missing_numbers": missing,
            "birthdate": birthdate,
            "life_path_number": life_path,
            "birthdate_day_num": day_num,
            "birthdate_month_num": month_num,
            "birthdate_year_num": year_num,
            "power_number": power,
        },
        "interpretations": {
            "life_path_number": None,
        },
    }


@app.post("/calculate/numerology")
def calculate_numerology(data: BirthData):
    try:
        from numerology import Pythagorean

        # Split name into first_name, last_name
        name = (data.name or "Native").strip()
        parts = name.split(None, 1)
        first_name = parts[0]
        last_name = parts[1] if len(parts) > 1 else ""

        py = Pythagorean(first_name=first_name, last_name=last_name, birthdate=data.date_of_birth)

        def serialize_pythagorean(p):
            kf = dict(p.key_figures)
            # full_name_missing_numbers is a tuple — convert to list for JSON
            if "full_name_missing_numbers" in kf and isinstance(kf["full_name_missing_numbers"], tuple):
                kf["full_name_missing_numbers"] = list(kf["full_name_missing_numbers"])
            # full_name_numbers has int keys — convert to string keys for clean JSON
            if "full_name_numbers" in kf and isinstance(kf["full_name_numbers"], dict):
                kf["full_name_numbers"] = {str(k): v for k, v in kf["full_name_numbers"].items()}
            return {
                "key_figures": kf,
                "interpretations": p.interpretations,
            }

        full_name = f"{first_name} {last_name}".strip()
        ch_result = _chaldean_calculate(full_name, data.date_of_birth)

        return {
            "status": "ok",
            "data": {
                "name": {"first_name": first_name, "last_name": last_name, "full_name": name},
                "birthdate": data.date_of_birth,
                "pythagorean": serialize_pythagorean(py),
                "chaldean": ch_result,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/calculate/dashaflow")
def calculate_dashaflow_endpoint(data: BirthData):
    try:
        import dashaflow

        chart = dashaflow.calculate_vedic_chart(
            data.date_of_birth,
            data.time_of_birth,
            data.latitude,
            data.longitude,
            data.timezone,
        )
        return {"status": "ok", "data": chart}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/calculate/stellium")
def calculate_stellium_endpoint(data: BirthData):
    try:
        import stellium
        from stellium.components import ArabicPartsCalculator
        from dataclasses import asdict, is_dataclass
        from datetime import datetime, timezone, timedelta

        # Build datetime string for stellium
        dt_str = f"{data.date_of_birth} {data.time_of_birth}"

        chart = (stellium.ChartBuilder.from_details(
            dt_str,
            (data.latitude, data.longitude),
            name=data.name,
        )
        .with_aspects()
        .add_component(ArabicPartsCalculator())
        .calculate())

        full = chart.to_dict()  # base dict (positions, aspects, houses, etc.)

        # Sect
        sect = chart.sect()

        # Voc moon
        try:
            voc = chart.voc_moon()
            if hasattr(voc, "__dict__"):
                voc = vars(voc)
        except Exception:
            voc = None

        # Profections at "now" (UTC)
        try:
            now = datetime.now(timezone.utc)
            profs = chart.profection(date=now)
            # profs is a tuple of ProfectionResult dataclass instances
            def serialize_prof(p):
                if not p:
                    return None
                d = {}
                for fld in ['source_point', 'source_sign', 'source_house', 'units', 'unit_type',
                            'profected_house', 'profected_sign', 'ruler', 'ruler_house', 'ruler_modern']:
                    if hasattr(p, fld):
                        d[fld] = getattr(p, fld)
                # ruler_position is a CelestialPosition — extract the essentials
                rp = getattr(p, 'ruler_position', None)
                if rp:
                    d['ruler_position'] = {
                        'name': rp.name,
                        'sign': rp.sign,
                        'sign_degree': round(rp.sign_degree, 4) if rp.sign_degree is not None else None,
                        'longitude': round(rp.longitude, 4) if rp.longitude is not None else None,
                        'is_retrograde': rp.is_retrograde,
                    }
                # planets_in_house may be a tuple of CelestialPositions or strings
                pih = getattr(p, 'planets_in_house', ())
                d['planets_in_house'] = [
                    (x.name if hasattr(x, 'name') else str(x)) for x in (pih or ())
                ]
                return d
            profections = [serialize_prof(p) for p in (profs or ())]
        except Exception as e:
            profections = {"error": str(e)}

        # Arabic Parts
        try:
            parts = chart.get_component_result("Arabic Parts") or []
            arabic_parts = [
                {
                    "name": p.name,
                    "sign": p.sign,
                    "sign_degree": round(p.sign_degree, 4) if p.sign_degree is not None else None,
                    "longitude": round(p.longitude, 4) if p.longitude is not None else None,
                }
                for p in parts
            ]
        except Exception as e:
            arabic_parts = {"error": str(e)}

        # Get current date for context
        full["sect"] = sect
        full["voc_moon"] = voc
        full["profections_now"] = profections
        full["arabic_parts"] = arabic_parts
        full["query_date"] = datetime.now(timezone.utc).isoformat()

        return {"status": "ok", "data": full}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"status": "ok"}
