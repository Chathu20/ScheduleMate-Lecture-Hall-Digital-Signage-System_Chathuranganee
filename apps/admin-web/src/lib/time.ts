/**
 * Session start/end times (and session_date) are stored as "floating"
 * wall-clock values: when an admin types 09:00, it's saved as
 * `...T09:00:00.000Z` — the literal digits typed, labeled UTC, with no real
 * timezone conversion (see fmtTime/fmtDate below, which always render with
 * timeZone: 'UTC' so the digits round-trip unchanged).
 *
 * The browser's `new Date()` is the real current instant, which is NOT in
 * that same floating frame. Comparing a stored floating time directly
 * against `new Date()` is off by the viewer's real UTC offset — e.g. for a
 * viewer in Sri Lanka (UTC+5:30), a 9am session wouldn't read as "Ongoing"
 * until the real UTC clock reached 09:00, i.e. 2:30pm local time.
 *
 * getFloatingNow() re-labels the browser's current LOCAL wall-clock
 * components as UTC, producing a "now" in the same floating frame as the
 * stored session times — mirroring the backend's lib/time.ts — so
 * ongoing/upcoming classification lines up with the actual wall clock.
 */
export function getFloatingNow(): Date {
  const real = new Date();
  return new Date(Date.UTC(
    real.getFullYear(),
    real.getMonth(),
    real.getDate(),
    real.getHours(),
    real.getMinutes(),
    real.getSeconds(),
    real.getMilliseconds()
  ));
}
