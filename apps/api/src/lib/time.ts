/**
 * Session start/end times (and session_date) are stored as "floating"
 * wall-clock values: when an admin types 09:00, the client saves it as
 * `...T09:00:00.000Z` — the literal digits the admin typed, labeled UTC,
 * with no real timezone conversion. That keeps entry and display simple
 * (see admin-web's fmtTime/fmtDate, which always render with timeZone:
 * 'UTC' so the digits round-trip unchanged).
 *
 * `new Date()` returns the real current instant, which is NOT in that same
 * floating frame — on a server whose system clock is set to the
 * institution's local timezone (e.g. Asia/Colombo, UTC+5:30), comparing a
 * stored floating time directly against `new Date()` is off by the
 * server's UTC offset. A 9am session would only flip from "Upcoming" to
 * "Ongoing" once the real UTC clock reaches 09:00 — i.e. 2:30pm local time.
 *
 * getFloatingNow() re-labels the server's current LOCAL wall-clock
 * components as UTC, producing a "now" in the same floating frame as the
 * stored session times, so ongoing/upcoming comparisons line up with the
 * institution's actual wall clock.
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
