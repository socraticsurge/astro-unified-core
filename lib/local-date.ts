/**
 * Formats a Date using its local calendar fields. Do not replace this with
 * `toISOString().slice(0, 10)`: that converts to UTC first and can produce the
 * previous day for users east of Greenwich during their morning.
 */
export function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addLocalDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Returns the calendar date in an explicit IANA timezone. Serverless runtimes
 * normally run in UTC, so their local fields cannot be used for a profile in
 * Asia/Kolkata or another timezone.
 */
export function toTimeZoneIsoDate(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter(part => part.type === "year" || part.type === "month" || part.type === "day")
      .map(part => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}
