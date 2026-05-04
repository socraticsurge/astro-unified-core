from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import datetime
import json
import jyotishganit

app = FastAPI(title="Jyotishganit Sidecar")


class BirthData(BaseModel):
    date_of_birth: str   # YYYY-MM-DD
    time_of_birth: str   # HH:MM
    latitude: float
    longitude: float
    timezone_offset: float


@app.post("/calculate")
def calculate(data: BirthData):
    try:
        # Parse date and time into a combined datetime object
        birth_datetime = datetime.strptime(
            f"{data.date_of_birth} {data.time_of_birth}", "%Y-%m-%d %H:%M"
        )

        # Calculate the full Vedic birth chart
        chart = jyotishganit.calculate_birth_chart(
            birth_date=birth_datetime,
            latitude=data.latitude,
            longitude=data.longitude,
            timezone_offset=data.timezone_offset,
        )

        # Convert to JSON-serializable dict using the library's built-in method
        output = jyotishganit.get_birth_chart_json(chart)

        return {"status": "ok", "data": output}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    return {"status": "ok"}
