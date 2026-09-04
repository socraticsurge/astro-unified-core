// A warm process starts provider work no faster than once every 1.1 seconds,
// preserving the existing bounded eight-second request contract while staying
// below public Nominatim's absolute one-request/second application ceiling.
export const MANAGED_PROVIDER_MIN_INTERVAL_MS = 1_100;

// Commercial fallbacks keep the existing conservative cross-instance
// admission spacing. Public Nominatim uses the exclusive lease below instead.
export const MANAGED_PROVIDER_DISTRIBUTED_INTERVAL_MS = 2_000;

export const MANAGED_PROVIDER_REQUEST_DEADLINE_MS = 8_000;
export const MANAGED_PROVIDER_STORAGE_AMBIGUITY_MS = 2_500;

// A provider-requested pause is shared through the same fenced Turso row as
// the public-Nominatim send lease. Bound it so malformed or hostile upstream
// metadata cannot pin the application indefinitely.
export const MANAGED_PROVIDER_MAX_RETRY_AFTER_MS = 24 * 60 * 60 * 1_000;

// Public Nominatim is protected by one exclusive distributed send lease. The
// lease outlives the whole request deadline, normal cooldown, and the storage
// ambiguity window, so a crashed or late invocation cannot overlap the next
// admitted network send.
export const PUBLIC_NOMINATIM_LEASE_MS = 12_500;

// Deliberately far below what the one-request/second ceiling could permit in a
// day. This keeps a bounded donated-service budget even under distributed or
// abusive user traffic.
export const PUBLIC_NOMINATIM_DAILY_REQUEST_LIMIT_MAX = 1_000;
