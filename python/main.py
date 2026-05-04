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


@app.get("/health")
def health():
    return {"status": "ok"}
