// Higher-level lookup helpers — call these from server contexts (page
// server components or API routes) to fetch typed entries by their
// natural factors rather than raw file keys.

import "server-only";
import { loadByTypeAndKey } from "./loader";
import type {
  AscendantEntry,
  DashaPairEntry,
  HouseLordshipEntry,
  NakshatraEntry,
  PlanetInHouseEntry,
} from "./types";

const slug = (s: string) => s.toLowerCase().trim().replace(/\s+/g, "-");

export function lookupPlanetInHouse(planet: string, house: number): PlanetInHouseEntry | null {
  if (!planet || !house) return null;
  const fileKey = `${slug(planet)}-${house}`;
  const entry = loadByTypeAndKey("planet-in-house", fileKey);
  return entry && entry.type === "planet-in-house" ? entry : null;
}

export function lookupDashaPair(mahadasha: string, antardasha: string): DashaPairEntry | null {
  if (!mahadasha || !antardasha) return null;
  const fileKey = `${slug(mahadasha)}-${slug(antardasha)}`;
  const entry = loadByTypeAndKey("dasha-pair", fileKey);
  return entry && entry.type === "dasha-pair" ? entry : null;
}

export function lookupNakshatra(nakshatra: string): NakshatraEntry | null {
  if (!nakshatra) return null;
  const fileKey = slug(nakshatra);
  const entry = loadByTypeAndKey("nakshatra", fileKey);
  return entry && entry.type === "nakshatra" ? entry : null;
}

export function lookupAscendant(sign: string): AscendantEntry | null {
  if (!sign) return null;
  const fileKey = slug(sign);
  const entry = loadByTypeAndKey("ascendant", fileKey);
  return entry && entry.type === "ascendant" ? entry : null;
}

export function lookupHouseLordship(lordOfHouse: number, placedInHouse: number): HouseLordshipEntry | null {
  if (!lordOfHouse || !placedInHouse) return null;
  const fileKey = `${lordOfHouse}-in-${placedInHouse}`;
  const entry = loadByTypeAndKey("house-lordship", fileKey);
  return entry && entry.type === "house-lordship" ? entry : null;
}
