// Returns true when a cached Reading's input_snapshot no longer matches the
// current profile birth data — meaning the cached result is stale and should
// be recomputed.
export function birthDataChanged(
  cachedSnapshotJson: string,
  current: {
    date_of_birth: string | null;
    time_of_birth: string | null;
    latitude: number | null;
    longitude: number | null;
    timezone: string | null;
  }
): boolean {
  try {
    const snap = JSON.parse(cachedSnapshotJson) as Record<string, unknown>;
    return (
      snap.date_of_birth !== current.date_of_birth ||
      snap.time_of_birth !== current.time_of_birth ||
      snap.latitude      !== current.latitude      ||
      snap.longitude     !== current.longitude     ||
      snap.timezone      !== current.timezone
    );
  } catch {
    return true; // unparseable snapshot — treat as stale
  }
}
