// One source of truth for both the process queue and the shared Turso lease.
// The 1.1-second spacing is deliberately conservative under LocationIQ Free's
// two-request/second and 60-request/minute ceilings.
export const MANAGED_PROVIDER_MIN_INTERVAL_MS = 1_100;
