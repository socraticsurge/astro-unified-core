import os
import shutil
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import datetime
import json
import jyotishganit

app = FastAPI(title="Astrology Sidecar")

# Reconstruct the star catalog if chunks exist
DATA_DIR = "/tmp/data"
CATALOG_PATH = os.path.join(DATA_DIR, "hip_main.dat")

def init_catalog():
    if not os.path.exists(CATALOG_PATH):
        os.makedirs(DATA_DIR, exist_ok=True)
        # Bundled chunks path in Vercel is relative to the function
        # Typically in /var/task/public/data/ on Vercel
        base_path = os.path.join(os.getcwd(), "public", "data")
        if not os.path.exists(base_path):
            base_path = os.path.join("/var/task", "public", "data")
            
        if os.path.exists(base_path):
            parts = sorted([f for f in os.listdir(base_path) if "hip_main.dat.part_" in f])
            if parts:
                with open(CATALOG_PATH, "wb") as outfile:
                    for part in parts:
                        with open(os.path.join(base_path, part), "rb") as infile:
                            shutil.copyfileobj(infile, outfile)

# Run initialization
try:
    init_catalog()
except Exception as e:
    print(f"Catalog init failed: {e}")

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
    raise HTTPException(
        status_code=501, 
        detail="Hellenistic calculator (flatlib) is temporarily disabled due to dependency conflicts."
    )

@app.get("/health")
def health():
    return {"status": "ok", "catalog_ready": os.path.exists(CATALOG_PATH)}
