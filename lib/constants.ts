// Application-wide constants. Import from here instead of inlining magic numbers.

/** Maximum number of profiles a single user may create. */
export const MAX_PROFILES = 10;

/** Maximum character length for long-form consultation fields. */
export const MAX_FIELD_LENGTH = 2000;

/** Maximum number of profile IDs accepted in a single consultation request. */
export const MAX_CONSULTATION_PROFILES = 10;

/** Default per-user rate-limit: requests allowed per window. */
export const RATE_LIMIT_DEFAULT_COUNT = 5;

/** Rate-limit sliding window in milliseconds (1 minute). */
export const RATE_LIMIT_WINDOW_MS = 60_000;
