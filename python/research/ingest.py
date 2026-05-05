"""One-time ingest of the VedAstro 15K HuggingFace datasets into SQLite.

Pulls:
  * vedastro-org/15000-Famous-People-Birth-Date-Location  (PersonList-15k.csv)
  * vedastro-org/15000-Famous-People-Marriage-Divorce-Info (MarriageInfoDataset.csv)

Populates research_subjects, research_marriages, research_readings (queue),
and records a research_jobs row.

Run from the project's python venv:

    cd /Users/vinaychaganti/Documents/AstroRepos/astrounified/python
    source venv/bin/activate
    python research/ingest.py

Idempotent: safe to re-run.
"""

from __future__ import annotations

import ast
import json
import math
import os
import re
import sqlite3
import sys
import uuid
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd
from huggingface_hub import hf_hub_download

# Optional: IANA timezone name from lat/lng. Skipped if not installed.
try:
    from timezonefinder import TimezoneFinder  # type: ignore

    _TZF = TimezoneFinder()
except Exception:  # pragma: no cover - optional dep
    _TZF = None


# ---------------------------------------------------------------------------
# Paths / constants
# ---------------------------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DB_PATH = PROJECT_ROOT / "astrounified.db"

BIRTH_REPO = "vedastro-org/15000-Famous-People-Birth-Date-Location"
BIRTH_FILE = "PersonList-15k.csv"
MARRIAGE_REPO = "vedastro-org/15000-Famous-People-Marriage-Divorce-Info"
MARRIAGE_FILE = "MarriageInfoDataset.csv"

SOURCE_DATASET = "vedastro-15k"

ENGINES = [
    "panchangam",
    "jyotishganit",
    "western",
    "hellenistic",
    "bazi",
    "numerology",
    "dashaflow",
    "stellium",
]

COUNTRY_NORMALIZE = {
    "italia": "Italy",
    "italy": "Italy",
    "deutschland": "Germany",
    "germany": "Germany",
    "españa": "Spain",
    "espana": "Spain",
    "spain": "Spain",
    "france": "France",
    "uk": "United Kingdom",
    "u.k.": "United Kingdom",
    "u.k": "United Kingdom",
    "great britain": "United Kingdom",
    "united kingdom": "United Kingdom",
    "england": "United Kingdom",
    "scotland": "United Kingdom",
    "wales": "United Kingdom",
    "northern ireland": "United Kingdom",
    "usa": "United States",
    "u.s.a.": "United States",
    "u.s.": "United States",
    "us": "United States",
    "united states": "United States",
    "united states of america": "United States",
    "russia": "Russia",
    "russian federation": "Russia",
    "rossiya": "Russia",
    "japan": "Japan",
    "nippon": "Japan",
    "china": "China",
    "people's republic of china": "China",
    "empty": None,
    "": None,
}

TYPE_NORMALIZE = {
    "love": "love",
    "arranged": "arranged",
    "pragmatic": "pragmatic",
    "unknown": "unknown",
    "none": "none",
    "n/a": "n/a",
    "not applicable": "n/a",
    "not married": "none",
    "romantic": "love",
    "open": "open",
    "secret": "secret",
    "common-law": "common-law",
    "common law": "common-law",
    "morganatic": "morganatic",
}

OUTCOME_NORMALIZE = {
    "happiness": "happiness",
    "dissolution": "dissolution",
    "unknown": "unknown",
    "none": "none",
    "struggle": "struggle",
    "tragedy": "tragedy",
    "tragic death": "tragedy",
    "tragic": "tragedy",
    "tragic end": "tragedy",
    "long-term partnership": "long-term partnership",
    "long-term relationship": "long-term partnership",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# `HH:MM dd/mm/yyyy +HH:MM` — capture the offset sign separately so we can
# handle both `+05:30` and `-08:00`.
_STDTIME_RE = re.compile(
    r"^\s*(?P<h>\d{1,2}):(?P<m>\d{2})\s+"
    r"(?P<d>\d{1,2})/(?P<mo>\d{1,2})/(?P<y>\d{2,4})\s+"
    r"(?P<sign>[+-])(?P<oh>\d{1,2}):(?P<om>\d{2})\s*$"
)


def parse_stdtime(stdtime: str) -> tuple[str, str, float]:
    """Returns (date_of_birth YYYY-MM-DD, time_of_birth HH:MM, tz_offset_hours).

    Raises ValueError on malformed input.
    """
    m = _STDTIME_RE.match(stdtime or "")
    if not m:
        raise ValueError(f"unparseable StdTime: {stdtime!r}")
    h = int(m.group("h"))
    minute = int(m.group("m"))
    d = int(m.group("d"))
    mo = int(m.group("mo"))
    y = int(m.group("y"))
    if y < 100:  # safety: 2-digit years
        y += 1900
    sign = 1 if m.group("sign") == "+" else -1
    oh = int(m.group("oh"))
    om = int(m.group("om"))
    offset = sign * (oh + om / 60.0)
    date_of_birth = f"{y:04d}-{mo:02d}-{d:02d}"
    time_of_birth = f"{h:02d}:{minute:02d}"
    return date_of_birth, time_of_birth, offset


def normalize_country(raw: Any) -> str | None:
    if raw is None:
        return None
    s = str(raw).strip()
    if not s:
        return None
    key = s.lower()
    if key in COUNTRY_NORMALIZE:
        return COUNTRY_NORMALIZE[key]
    return s  # preserve original casing for everything else


def extract_country(location_name: str | None) -> str | None:
    if not location_name:
        return None
    parts = [p.strip() for p in location_name.split(",") if p.strip()]
    if not parts:
        return None
    return normalize_country(parts[-1])


def lookup_iana_tz(lat: float, lng: float) -> str | None:
    if _TZF is None:
        return None
    try:
        return _TZF.timezone_at(lat=lat, lng=lng)
    except Exception:
        return None


def norm_lookup(value: Any, mapping: dict[str, str]) -> tuple[str | None, str | None]:
    """(raw, normalized) — preserves None/empty as (None, None)."""
    if value is None:
        return None, None
    if isinstance(value, float) and math.isnan(value):
        return None, None
    raw = str(value).strip()
    if not raw:
        return None, None
    key = raw.lower()
    return raw, mapping.get(key, "other")


def parse_notes(raw: Any) -> dict[str, Any]:
    if raw is None:
        return {}
    if isinstance(raw, float) and math.isnan(raw):
        return {}
    s = str(raw).strip()
    if not s:
        return {}
    try:
        val = ast.literal_eval(s)
        return val if isinstance(val, dict) else {}
    except Exception:
        # Fallback: try JSON
        try:
            val = json.loads(s)
            return val if isinstance(val, dict) else {}
        except Exception:
            return {}


def iso_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


# ---------------------------------------------------------------------------
# Schema (mirrors lib/db.ts so the script can run before the Next.js app does)
# ---------------------------------------------------------------------------

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS research_subjects (
  row_key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  gender TEXT,
  date_of_birth TEXT NOT NULL,
  time_of_birth TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  timezone_name TEXT,
  timezone_offset REAL NOT NULL,
  location_name TEXT,
  country TEXT,
  rodden TEXT,
  birth_year INTEGER,
  raw_birthtime TEXT,
  source_dataset TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS research_marriages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_row_key TEXT NOT NULL REFERENCES research_subjects(row_key) ON DELETE CASCADE,
  seq_index INTEGER NOT NULL,
  type_raw TEXT,
  type_normalized TEXT,
  outcome_raw TEXT,
  outcome_normalized TEXT,
  marriage_date TEXT,
  divorce_date TEXT,
  spouse TEXT,
  person_id TEXT,
  credibility TEXT,
  raw_json TEXT
);

CREATE TABLE IF NOT EXISTS research_readings (
  subject_row_key TEXT NOT NULL REFERENCES research_subjects(row_key) ON DELETE CASCADE,
  engine TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  output_data TEXT,
  error_msg TEXT,
  duration_ms INTEGER,
  computed_at TEXT,
  PRIMARY KEY (subject_row_key, engine)
);

CREATE TABLE IF NOT EXISTS research_jobs (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  status TEXT NOT NULL,
  total INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  started_at TEXT,
  finished_at TEXT,
  last_progress_at TEXT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_research_marriages_subject ON research_marriages(subject_row_key);
CREATE INDEX IF NOT EXISTS idx_research_readings_status ON research_readings(status);
CREATE INDEX IF NOT EXISTS idx_research_readings_engine_status ON research_readings(engine, status);
CREATE INDEX IF NOT EXISTS idx_research_subjects_birth_year ON research_subjects(birth_year);
CREATE INDEX IF NOT EXISTS idx_research_subjects_country ON research_subjects(country);
CREATE INDEX IF NOT EXISTS idx_research_subjects_gender ON research_subjects(gender);
"""


# ---------------------------------------------------------------------------
# Main flow
# ---------------------------------------------------------------------------


def warn(msg: str) -> None:
    print(f"[ingest] {msg}", file=sys.stderr)


def info(msg: str) -> None:
    print(f"[ingest] {msg}")


def download_csvs() -> tuple[Path, Path]:
    info(f"downloading {BIRTH_FILE} from {BIRTH_REPO}...")
    birth_path = Path(
        hf_hub_download(repo_id=BIRTH_REPO, filename=BIRTH_FILE, repo_type="dataset")
    )
    info(f"  -> {birth_path}")
    info(f"downloading {MARRIAGE_FILE} from {MARRIAGE_REPO}...")
    marriage_path = Path(
        hf_hub_download(
            repo_id=MARRIAGE_REPO, filename=MARRIAGE_FILE, repo_type="dataset"
        )
    )
    info(f"  -> {marriage_path}")
    return birth_path, marriage_path


def open_db() -> sqlite3.Connection:
    if not DB_PATH.exists():
        warn(f"DB not found at {DB_PATH}; creating new file")
    conn = sqlite3.connect(str(DB_PATH))
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript(SCHEMA_SQL)
    conn.commit()
    return conn


def ingest_subjects(
    conn: sqlite3.Connection, df: pd.DataFrame
) -> tuple[int, int, Counter, list[int]]:
    """Insert/replace subjects. Returns (ingested, filtered, country_counter, years)."""
    ingested = 0
    filtered = 0
    parse_errors = 0
    country_counter: Counter = Counter()
    years: list[int] = []

    cur = conn.cursor()
    cur.execute("BEGIN")

    insert_sql = """
        INSERT OR REPLACE INTO research_subjects (
          row_key, name, gender, date_of_birth, time_of_birth,
          latitude, longitude, timezone_name, timezone_offset,
          location_name, country, rodden, birth_year, raw_birthtime,
          source_dataset, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """

    now_iso = iso_now()

    for idx, row in enumerate(df.itertuples(index=False), start=1):
        row_key = getattr(row, "RowKey", None)
        try:
            if not row_key or (isinstance(row_key, float) and math.isnan(row_key)):
                filtered += 1
                continue
            row_key = str(row_key).strip()

            notes = parse_notes(getattr(row, "Notes", None))
            rodden = notes.get("rodden")
            rodden_str = str(rodden).strip() if rodden is not None else None

            # Filter placeholder rows.
            if rodden_str == "FF" and row_key.startswith("Empty"):
                filtered += 1
                continue

            raw_bt = getattr(row, "BirthTime", None)
            if not raw_bt or (isinstance(raw_bt, float) and math.isnan(raw_bt)):
                raise ValueError("missing BirthTime")
            raw_bt_str = str(raw_bt)
            bt = json.loads(raw_bt_str)
            std_time = bt.get("StdTime")
            location = bt.get("Location") or {}
            location_name = location.get("Name")
            try:
                lat = float(location.get("Latitude"))
                lng = float(location.get("Longitude"))
            except (TypeError, ValueError) as e:
                raise ValueError(f"bad lat/lng: {e}") from e

            date_of_birth, time_of_birth, tz_offset = parse_stdtime(std_time)
            birth_year = int(date_of_birth[:4])
            years.append(birth_year)

            country = extract_country(location_name)
            country_counter[country or "(unknown)"] += 1

            iana = lookup_iana_tz(lat, lng)

            name = getattr(row, "Name", None)
            if name is None or (isinstance(name, float) and math.isnan(name)):
                name = row_key
            name = str(name).strip() or row_key

            gender = getattr(row, "Gender", None)
            if isinstance(gender, float) and math.isnan(gender):
                gender = None
            elif gender is not None:
                gender = str(gender).strip() or None

            cur.execute(
                insert_sql,
                (
                    row_key,
                    name,
                    gender,
                    date_of_birth,
                    time_of_birth,
                    lat,
                    lng,
                    iana,
                    tz_offset,
                    location_name,
                    country,
                    rodden_str,
                    birth_year,
                    raw_bt_str,
                    SOURCE_DATASET,
                    now_iso,
                ),
            )
            ingested += 1
        except Exception as e:
            parse_errors += 1
            warn(f"subject parse error row_key={row_key!r}: {e}")
            continue

        if idx % 1000 == 0:
            info(f"  subjects processed: {idx} (ingested={ingested}, filtered={filtered}, errors={parse_errors})")

    conn.commit()
    if parse_errors:
        warn(f"subject parse errors: {parse_errors}")
    return ingested, filtered, country_counter, years


def ingest_marriages(
    conn: sqlite3.Connection, df: pd.DataFrame, valid_keys: set[str]
) -> tuple[int, int, int]:
    """Insert marriages for known subjects. Returns (subjects_with_marriages, total_marriage_rows, both_dates_count)."""
    cur = conn.cursor()
    cur.execute("BEGIN")

    delete_sql = "DELETE FROM research_marriages WHERE subject_row_key = ?"
    insert_sql = """
        INSERT INTO research_marriages (
          subject_row_key, seq_index, type_raw, type_normalized,
          outcome_raw, outcome_normalized, marriage_date, divorce_date,
          spouse, person_id, credibility, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """

    subjects_with = 0
    total_rows = 0
    both_dates = 0
    parse_errors = 0
    skipped_orphans = 0

    for idx, row in enumerate(df.itertuples(index=False), start=1):
        subject_key = getattr(row, "PartitionKey", None)
        try:
            if not subject_key or (isinstance(subject_key, float) and math.isnan(subject_key)):
                continue
            subject_key = str(subject_key).strip()
            if subject_key not in valid_keys:
                skipped_orphans += 1
                continue

            info_raw = getattr(row, "Info", None)
            if not info_raw or (isinstance(info_raw, float) and math.isnan(info_raw)):
                continue
            payload = json.loads(str(info_raw))
            marriages = payload.get("marriages") or []
            if not isinstance(marriages, list) or not marriages:
                continue

            cur.execute(delete_sql, (subject_key,))

            inserted_for_subject = 0
            for seq_index, m in enumerate(marriages):
                if not isinstance(m, dict):
                    continue
                type_raw, type_norm = norm_lookup(m.get("type"), TYPE_NORMALIZE)
                outcome_raw, outcome_norm = norm_lookup(m.get("outcome"), OUTCOME_NORMALIZE)
                marriage_date = m.get("marriageDate")
                divorce_date = m.get("divorceDate")
                spouse = m.get("spouse")
                person_id = m.get("PersonId") or m.get("personId")
                credibility = m.get("dataCredibility")

                # Normalize blank strings to None.
                def _clean(v: Any) -> str | None:
                    if v is None:
                        return None
                    if isinstance(v, float) and math.isnan(v):
                        return None
                    s = str(v).strip()
                    return s or None

                marriage_date = _clean(marriage_date)
                divorce_date = _clean(divorce_date)
                spouse = _clean(spouse)
                person_id = _clean(person_id)
                credibility = _clean(credibility)

                if marriage_date and divorce_date:
                    both_dates += 1

                cur.execute(
                    insert_sql,
                    (
                        subject_key,
                        seq_index,
                        type_raw,
                        type_norm,
                        outcome_raw,
                        outcome_norm,
                        marriage_date,
                        divorce_date,
                        spouse,
                        person_id,
                        credibility,
                        json.dumps(m, ensure_ascii=False),
                    ),
                )
                inserted_for_subject += 1
                total_rows += 1

            if inserted_for_subject > 0:
                subjects_with += 1
        except Exception as e:
            parse_errors += 1
            warn(f"marriage parse error subject={subject_key!r}: {e}")
            continue

        if idx % 1000 == 0:
            info(f"  marriages processed: {idx} (subjects_with={subjects_with}, rows={total_rows})")

    conn.commit()
    if parse_errors:
        warn(f"marriage parse errors: {parse_errors}")
    if skipped_orphans:
        warn(f"marriage rows skipped (no matching subject): {skipped_orphans}")
    return subjects_with, total_rows, both_dates


def seed_readings(conn: sqlite3.Connection) -> int:
    cur = conn.cursor()
    cur.execute("BEGIN")
    cur.execute("SELECT row_key FROM research_subjects")
    rows = [r[0] for r in cur.fetchall()]
    insert_sql = (
        "INSERT OR IGNORE INTO research_readings "
        "(subject_row_key, engine, status) VALUES (?, ?, 'pending')"
    )
    inserted = 0
    for key in rows:
        for engine in ENGINES:
            cur.execute(insert_sql, (key, engine))
            inserted += cur.rowcount if cur.rowcount > 0 else 0
    conn.commit()
    return inserted


def record_job(conn: sqlite3.Connection, total: int) -> str:
    job_id = str(uuid.uuid4())
    now = iso_now()
    conn.execute(
        """
        INSERT INTO research_jobs (
          id, kind, status, total, completed, failed,
          started_at, finished_at, last_progress_at, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            job_id,
            "ingest",
            "done",
            total,
            total,
            0,
            now,
            now,
            now,
            f"VedAstro 15K ingest from {BIRTH_REPO} + {MARRIAGE_REPO}",
        ),
    )
    conn.commit()
    return job_id


def main() -> int:
    info(f"DB: {DB_PATH}")
    info(f"timezonefinder: {'enabled' if _TZF is not None else 'disabled (not installed)'}")

    birth_csv, marriage_csv = download_csvs()

    info("loading CSVs into pandas...")
    birth_df = pd.read_csv(birth_csv, dtype=str, keep_default_na=False, na_values=[""])
    marriage_df = pd.read_csv(
        marriage_csv, dtype=str, keep_default_na=False, na_values=[""]
    )
    info(f"  birth rows: {len(birth_df)}  marriage rows: {len(marriage_df)}")

    conn = open_db()
    try:
        info("ingesting subjects...")
        ingested, filtered, country_counter, years = ingest_subjects(conn, birth_df)

        # Build set of valid keys for FK-safe marriage insert.
        valid_keys = {
            r[0] for r in conn.execute("SELECT row_key FROM research_subjects").fetchall()
        }

        info("ingesting marriages...")
        subjects_with_marr, marriage_rows, both_dates = ingest_marriages(
            conn, marriage_df, valid_keys
        )

        info("seeding research_readings queue...")
        readings_inserted = seed_readings(conn)

        info("recording research_jobs row...")
        job_id = record_job(conn, ingested)
    finally:
        conn.close()

    # Summary
    top_countries = [
        f"{name} ({n})"
        for name, n in country_counter.most_common(5)
        if name != "(unknown)"
    ][:5]
    year_min = min(years) if years else None
    year_max = max(years) if years else None

    print()
    print(f"Ingested {ingested} subjects (filtered {filtered} placeholders)")
    print(
        f"  {subjects_with_marr} of those have {marriage_rows} marriage entries "
        f"({both_dates} with both marriage+divorce dates)"
    )
    print(f"  Top 5 countries: {', '.join(top_countries) if top_countries else '(none)'}")
    print(f"  Birth-year range: {year_min} — {year_max}")
    print(
        f"Seeded research_readings queue: {len(ENGINES)} engines x {ingested} subjects "
        f"= {len(ENGINES) * ingested} rows pending "
        f"(this run inserted {readings_inserted} new rows)"
    )
    print(f"Job id: {job_id}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
