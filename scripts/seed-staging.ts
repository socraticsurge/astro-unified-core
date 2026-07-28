import { ensureSchema, getClient } from "../lib/db/client";
import { assertStagingDatabase } from "./staging-database-guard";

const CREATED_AT = "2026-07-22T00:00:00.000Z";

const users = [
  [
    "gate7-owner",
    "Gate 7 Owner",
    "owner@staging.astrochaganti.test",
  ],
  [
    "gate7-admin",
    "Gate 7 Admin",
    "admin@staging.astrochaganti.test",
  ],
  [
    "gate7-other",
    "Gate 7 Other User",
    "other@staging.astrochaganti.test",
  ],
] as const;

const profiles = [
  {
    id: "gate7-owner-self",
    userId: "gate7-owner",
    name: "Aruna",
    date: "1990-04-12",
    time: "08:15",
    place: "Hyderabad, India",
    latitude: 17.385,
    longitude: 78.4867,
    relationship: "Self",
    gender: "female",
  },
  {
    id: "gate7-owner-family",
    userId: "gate7-owner",
    name: "Mitra",
    date: "1994-09-03",
    time: "14:40",
    place: "Vijayawada, India",
    latitude: 16.5062,
    longitude: 80.648,
    relationship: "Family",
    gender: "male",
  },
  {
    id: "gate7-admin-self",
    userId: "gate7-admin",
    name: "Tara",
    date: "1985-11-18",
    time: "06:35",
    place: "Warangal, India",
    latitude: 17.9689,
    longitude: 79.5941,
    relationship: "Self",
    gender: "female",
  },
  {
    id: "gate7-other-profile",
    userId: "gate7-other",
    name: "Nila",
    date: "1988-01-21",
    time: "21:10",
    place: "Visakhapatnam, India",
    latitude: 17.6868,
    longitude: 83.2185,
    relationship: "Self",
    gender: "female",
  },
] as const;

async function main() {
  assertStagingDatabase();
  await ensureSchema();
  const client = getClient();

  await client.batch(
    users.map(([id, name, email]) => ({
      sql: `INSERT OR IGNORE INTO users
            (id, name, email, image, last_login, created_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, name, email, "", null, CREATED_AT],
    })),
    "write",
  );

  await client.batch(
    profiles.map((profile) => ({
      sql: `INSERT OR IGNORE INTO profiles
            (id, user_id, name, date_of_birth, time_of_birth, place_of_birth,
             latitude, longitude, timezone, timezone_offset, relationship,
             gender, created_at, current_location, current_latitude,
             current_longitude, current_timezone, current_timezone_offset)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        profile.id,
        profile.userId,
        profile.name,
        profile.date,
        profile.time,
        profile.place,
        profile.latitude,
        profile.longitude,
        "Asia/Kolkata",
        5.5,
        profile.relationship,
        profile.gender,
        CREATED_AT,
        "Hyderabad, India",
        17.385,
        78.4867,
        "Asia/Kolkata",
        5.5,
      ],
    })),
    "write",
  );

  const userCount = await client.execute("SELECT COUNT(*) FROM users");
  const profileCount = await client.execute("SELECT COUNT(*) FROM profiles");
  console.log(
    `Synthetic Gate 7 data ready (${Number(userCount.rows[0]?.[0] ?? 0)} users, ${Number(profileCount.rows[0]?.[0] ?? 0)} profiles).`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Staging seed failed.");
  process.exitCode = 1;
});
