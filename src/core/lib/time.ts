/**
 * The demo universe has a fixed "now" so every render, test and benchmark replays identically.
 * Real deployments would inject a wall clock; the engine never reads Date.now() itself.
 */
export const DEMO_NOW = Date.parse("2026-10-01T15:00:00.000Z");
export const DAY_MS = 86_400_000;

export const daysAgo = (days: number, hour = 15, minute = 0) =>
  new Date(DEMO_NOW - days * DAY_MS + (hour - 15) * 3_600_000 + minute * 60_000).toISOString();

export const ageInDays = (iso: string, now = DEMO_NOW) => (now - Date.parse(iso)) / DAY_MS;

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function formatRelative(iso: string, now = DEMO_NOW) {
  const d = Math.round(ageInDays(iso, now));
  if (d <= 0) return "today";
  if (d === 1) return "1 day ago";
  if (d < 0) return `in ${-d} days`;
  return `${d} days ago`;
}
