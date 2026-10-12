import React, { useState } from "react";
import { ChevronDown, Clock } from "lucide-react";
import { shortDays } from "./StoreFilters";

/*
 * Vendors set opening hours in their own time zone. Customers see those
 * hours converted to *their* time zone, and booking times they pick are
 * checked against the vendor's schedule. Everything here works on real
 * instants, so days that shift across midnight are handled.
 */

const WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const WEEK_FROM_MONDAY = [...WEEK.slice(1), WEEK[0]];
const DAY_MS = 24 * 60 * 60 * 1000;

export interface Availability {
  available_days?: string[] | null;
  open_time?: string | null; // "HH:MM" or "HH:MM:SS"
  close_time?: string | null;
  accepting_requests?: boolean;
  timezone?: string | null; // vendor's IANA time zone
}

const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : "");

interface WallParts {
  year: number;
  month: number; // 1-12
  day: number;
  weekday: number; // 0 = Sunday
  hour: number;
  minute: number;
}

/** Wall-clock parts of `instant` in `timeZone` (viewer's zone if omitted). */
function wallParts(instant: number, timeZone?: string | null): WallParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timeZone || undefined,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = fmt.formatToParts(new Date(instant));
  } catch {
    parts = new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(instant));
  }
  const get = (t: string) => parts.find((p) => p.type === t)?.value || "0";
  return {
    year: +get("year"),
    month: +get("month"),
    day: +get("day"),
    weekday: WEEK.indexOf(get("weekday")),
    hour: +get("hour") % 24,
    minute: +get("minute"),
  };
}

/** The instant when it is `y-m-d hh:mm` on the wall clock in `timeZone`. */
function instantOf(
  y: number,
  m: number,
  d: number,
  hour: number,
  minute: number,
  timeZone?: string | null,
) {
  const target = Date.UTC(y, m - 1, d, hour, minute);
  let guess = target;
  // Two passes settle DST edges.
  for (let i = 0; i < 2; i++) {
    const p = wallParts(guess, timeZone);
    const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    guess += target - asUTC;
  }
  return guess;
}

const pad = (n: number) => String(n).padStart(2, "0");
const timeOf = (p: WallParts) => `${pad(p.hour)}:${pad(p.minute)}`;

/** Short zone label, e.g. "WAT" or "GMT+1". */
function zoneLabel(timeZone?: string | null) {
  try {
    return (
      new Intl.DateTimeFormat("en-US", {
        timeZone: timeZone || undefined,
        timeZoneName: "short",
      })
        .formatToParts(new Date())
        .find((p) => p.type === "timeZoneName")?.value || ""
    );
  } catch {
    return "";
  }
}

interface Interval {
  start: number;
  end: number;
}

/** Vendor opening intervals overlapping [from, to]. */
function openIntervals(a: Availability, from: number, to: number): Interval[] {
  const days = a.available_days?.length ? a.available_days : WEEK;
  const [oh, om] = (hhmm(a.open_time) || "00:00").split(":").map(Number);
  const close = hhmm(a.close_time);
  const [ch, cm] = (close || "00:00").split(":").map(Number);
  const out: Interval[] = [];
  // Walk vendor-local calendar days from a day before `from`.
  for (let t = from - DAY_MS; t <= to + DAY_MS; t += DAY_MS) {
    const p = wallParts(t, a.timezone);
    if (!days.includes(WEEK[p.weekday])) continue;
    const start = instantOf(p.year, p.month, p.day, oh, om, a.timezone);
    const end = close
      ? instantOf(p.year, p.month, p.day, ch, cm, a.timezone)
      : start + DAY_MS; // no hours = all day
    if (end > from && start < to && !out.some((i) => i.start === start)) {
      out.push({ start, end });
    }
  }
  return out.sort((x, y) => x.start - y.start);
}

export interface OpeningStatus {
  isOpen: boolean;
  detail: string; // viewer's time, e.g. "Closes 16:00"
  schedule: string; // viewer's time, e.g. "Mon – Fri · 08:00 – 16:00"
  vendorSchedule: string; // vendor's time, e.g. "Mon – Fri · 09:00 – 17:00 (WAT)"
  sameZone: boolean;
  week: { day: string; hours: string | null; isToday: boolean }[];
}

/**
 * Open/closed at `now`, with the vendor's schedule expressed in the viewer's
 * time zone. Returns null when the vendor hasn't set days or hours.
 */
export function openingStatus(
  a: Availability | null | undefined,
  now: number = Date.now(),
): OpeningStatus | null {
  if (!a) return null;
  const open = hhmm(a.open_time);
  const close = hhmm(a.close_time);
  if (!a.available_days?.length && !(open && close)) return null;

  const vendorDays = a.available_days?.length ? a.available_days : WEEK;
  const vendorHours = open && close ? `${open} – ${close}` : "Open all day";
  const vendorZone = zoneLabel(a.timezone);
  const viewerZone = zoneLabel(undefined);
  const viewerOffsetNow =
    timeOf(wallParts(now, undefined)) === timeOf(wallParts(now, a.timezone));
  const sameZone = !a.timezone || viewerOffsetNow;

  const intervals = openIntervals(a, now - DAY_MS, now + 8 * DAY_MS);
  const today = wallParts(now, undefined);
  const dayKey = (p: WallParts) => `${p.year}-${p.month}-${p.day}`;
  const tomorrow = wallParts(now + DAY_MS, undefined);

  // Describe an instant relative to the viewer's today.
  const describe = (instant: number) => {
    const p = wallParts(instant, undefined);
    if (dayKey(p) === dayKey(today)) return `today at ${timeOf(p)}`;
    if (dayKey(p) === dayKey(tomorrow)) return `tomorrow at ${timeOf(p)}`;
    return `${WEEK[p.weekday].slice(0, 3)} at ${timeOf(p)}`;
  };

  const current = intervals.find((i) => i.start <= now && now < i.end);
  let detail = "";
  if (current) {
    if (!close) detail = "Open all day";
    else {
      const endP = wallParts(current.end, undefined);
      detail =
        dayKey(endP) === dayKey(today)
          ? `Closes ${timeOf(endP)}`
          : `Closes ${describe(current.end)}`;
    }
  } else {
    const next = intervals.find((i) => i.start > now);
    if (next) detail = `Opens ${describe(next.start)}`;
  }

  // One week of openings in the viewer's time, keyed by local weekday.
  const weekIntervals = openIntervals(a, now, now + 7 * DAY_MS);
  const byDay: Record<number, string> = {};
  weekIntervals.forEach((i) => {
    const s = wallParts(i.start, undefined);
    const e = wallParts(i.end, undefined);
    const crosses = dayKey(s) !== dayKey(e);
    byDay[s.weekday] = close
      ? `${timeOf(s)} – ${timeOf(e)}${crosses ? " (next day)" : ""}`
      : "Open all day";
  });
  // Include an opening that started yesterday and is still running.
  if (
    current &&
    byDay[wallParts(current.start, undefined).weekday] === undefined
  ) {
    const s = wallParts(current.start, undefined);
    const e = wallParts(current.end, undefined);
    byDay[s.weekday] = `${timeOf(s)} – ${timeOf(e)}`;
  }
  const week = WEEK_FROM_MONDAY.map((day) => {
    const idx = WEEK.indexOf(day);
    return {
      day,
      hours: byDay[idx] ?? null,
      isToday: idx === today.weekday,
    };
  });

  // Compact local schedule when every open day has the same local hours.
  const localDays = week.filter((d) => d.hours).map((d) => d.day);
  const uniqueHours = Array.from(
    new Set(week.filter((d) => d.hours).map((d) => d.hours)),
  );
  const schedule =
    uniqueHours.length === 1
      ? `${shortDays(localDays)} · ${uniqueHours[0]}`
      : `${shortDays(localDays)} · hours vary`;

  return {
    isOpen: Boolean(current),
    detail,
    schedule: sameZone
      ? schedule
      : `${schedule}${viewerZone ? ` (${viewerZone})` : ""}`,
    vendorSchedule: `${shortDays(vendorDays)} · ${vendorHours}${
      vendorZone ? ` (${vendorZone})` : ""
    }`,
    sameZone,
    week,
  };
}

/**
 * Checks a booking time (an instant, e.g. from a datetime-local input in the
 * customer's zone) against the vendor's schedule. Returns "" when it fits.
 */
export function checkBookingTime(
  a: Availability | null | undefined,
  label: string,
  instant: number,
): string {
  if (!a || isNaN(instant)) return "";
  const open = hhmm(a.open_time);
  const close = hhmm(a.close_time);
  if (!a.available_days?.length && !(open && close)) return "";
  const fits = openIntervals(a, instant, instant + 1).some(
    // Closing time itself is allowed, matching the server.
    (i) => i.start <= instant && instant <= i.end,
  );
  if (fits) return "";
  const status = openingStatus(a, instant);
  return `${label} is outside the vendor's opening hours${
    status ? ` (${status.schedule})` : ""
  }.`;
}

/** Small "Open now" / "Closed" pill. */
export function OpenStatusBadge({
  availability,
  className = "",
}: {
  availability: Availability | null | undefined;
  className?: string;
}) {
  const status = openingStatus(availability);
  if (!status) return null;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
        status.isOpen
          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          : "bg-[var(--bg-app)] text-[var(--text-muted)] border border-[var(--border-soft)]"
      } ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          status.isOpen ? "bg-emerald-500" : "bg-[var(--text-muted)]"
        }`}
      />
      {status.isOpen ? "Open now" : "Closed"}
    </span>
  );
}

/** "Opening hours" panel in the viewer's time, with each day listed. */
export function OpeningHours({
  availability,
  className = "",
}: {
  availability: Availability | null | undefined;
  className?: string;
}) {
  const [showWeek, setShowWeek] = useState(false);
  const status = openingStatus(availability);
  if (!status) return null;

  return (
    <div
      className={`p-4 rounded-2xl border bg-[var(--bg-surface)] border-[var(--border-soft)] text-sm ${className}`}
    >
      <div className="flex items-start gap-3">
        <Clock className="w-4 h-4 mt-0.5 shrink-0 text-[var(--text-link)]" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-bold text-[var(--text-main)]">
              Opening hours
            </span>
            <span
              className={`font-semibold ${
                status.isOpen
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-500"
              }`}
            >
              {status.isOpen ? "Open now" : "Closed"}
            </span>
            {status.detail && (
              <span className="text-[var(--text-muted)]">
                · {status.detail}
              </span>
            )}
          </div>
          <p className="text-[var(--text-muted)] mt-0.5">
            {status.schedule}
            {!status.sameZone && " · your time"}
          </p>
          {!status.sameZone && (
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Vendor's local time: {status.vendorSchedule}
            </p>
          )}
          <button
            type="button"
            onClick={() => setShowWeek((v) => !v)}
            aria-expanded={showWeek}
            className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[var(--text-link)] hover:underline"
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${
                showWeek ? "rotate-180" : ""
              }`}
            />
            {showWeek ? "Hide days" : "See all days"}
          </button>
          {showWeek && (
            <ul className="mt-3 divide-y divide-[var(--border-soft)] rounded-xl border border-[var(--border-soft)] overflow-hidden">
              {status.week.map(({ day, hours, isToday }) => (
                <li
                  key={day}
                  className={`flex items-center justify-between gap-3 px-3 py-2 ${
                    isToday ? "bg-[var(--bg-app)] font-semibold" : ""
                  }`}
                >
                  <span className="text-[var(--text-main)]">
                    {day}
                    {isToday && (
                      <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-[var(--text-link)]">
                        Today
                      </span>
                    )}
                  </span>
                  <span
                    className={
                      hours
                        ? "text-[var(--text-main)] tabular-nums text-right"
                        : "text-[var(--text-muted)]"
                    }
                  >
                    {hours || "Closed"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
