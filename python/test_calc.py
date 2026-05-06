import sys
from pydantic import BaseModel
class BirthData(BaseModel):
    date_of_birth: str = "1990-01-01"
    time_of_birth: str = "12:00"
    latitude: float = 34.05
    longitude: float = -118.24
    timezone_offset: float = -8.0
    timezone: str = "America/Los_Angeles"
    name: str = "Native"

import main
data = BirthData()
for endpoint in ["calculate_jyotishganit", "calculate_western", "calculate_hellenistic", "calculate_numerology", "calculate_dashaflow_endpoint", "calculate_stellium_endpoint"]:
    try:
        func = getattr(main, endpoint)
        print(f"Testing {endpoint}...")
        func(data)
        print(f"{endpoint} OK")
    except Exception as e:
        print(f"{endpoint} FAILED: {repr(e)}")
