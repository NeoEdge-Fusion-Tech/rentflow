import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Package,
  ScanLine,
  Search,
  X,
} from "lucide-react";
import { ValidationService } from "../../api";
import { cn } from "@/src/utils";

const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

const todayISO = () => toISODate(new Date());

const shiftDay = (iso: string, days: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  return toISODate(new Date(y, m - 1, d + days));
};

const fmtTime = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

const fmtDayTime = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString(undefined, {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

/** Where a booking is in its check out → check in journey. */
export function bookingPhase(b: {
  status: string;
  counts: { booked: number; checked_out: number; checked_in: number };
}) {
  const { booked, checked_out, checked_in } = b.counts;
  if (b.status === "returned_incomplete")
    return { label: "Return incomplete", tone: "rose" };
  if (b.status === "returned") return { label: "Checked in", tone: "emerald" };
  if (checked_out === 0) return { label: "To check out", tone: "amber" };
  if (checked_out < booked) return { label: "Partly out", tone: "amber" };
  if (checked_in > 0) return { label: "Partly in", tone: "indigo" };
  return { label: "Out · to check in", tone: "indigo" };
}

/** Filter chips; values match the API's `phase` param. */
const PHASE_FILTERS = [
  { value: null, label: "All" },
  { value: "to_check_out", label: "To check out" },
  { value: "out", label: "Out · not back" },
  { value: "checked_in", label: "Checked in" },
] as const;

const fmtShortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });

export const TONE: Record<string, string> = {
  amber: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

/**
 * Validator: today's pickups and returns (or any day), searchable.
 * Filters live in the URL so "back" from a booking keeps them.
 */
export function Validation() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const date = params.get("date") || todayISO();
  const rangeFrom = params.get("from") || "";
  const rangeTo = params.get("to") || "";
  const isRange = Boolean(rangeFrom || rangeTo);
  const allDates = !isRange && date === "all";
  const search = params.get("q") || "";
  const phase = params.get("phase");

  const [query, setQuery] = useState(search);
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setParamsMany = (updates: Record<string, string | null>) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(updates)) {
          if (value) next.set(key, value);
          else next.delete(key);
        }
        return next;
      },
      { replace: true },
    );
  const setParam = (key: string, value: string | null) =>
    setParamsMany({ [key]: value });

  // Picking a single day (or "all") leaves custom-range mode, and vice versa.
  const setDay = (value: string | null) =>
    setParamsMany({ date: value, from: null, to: null });
  const openRange = () => {
    const start = allDates ? todayISO() : date;
    setParamsMany({ date: null, from: start, to: start });
  };

  // Debounce typing into the URL.
  useEffect(() => {
    const t = setTimeout(() => {
      if (query.trim() !== search) setParam("q", query.trim() || null);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    ValidationService.getBookings({
      ...(isRange
        ? { from: rangeFrom || undefined, to: rangeTo || undefined }
        : { date }),
      search: search || undefined,
      phase: phase || undefined,
    })
      .then((res) => !cancelled && setBookings(res.data))
      .catch(
        (err) =>
          !cancelled &&
          setError(err.response?.data?.detail || "Could not load bookings."),
      )
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [date, rangeFrom, rangeTo, isRange, search, phase]);

  const isToday = !isRange && date === todayISO();
  const rangeLabel =
    rangeFrom && rangeTo && rangeFrom !== rangeTo
      ? `${fmtShortDate(rangeFrom)} – ${fmtShortDate(rangeTo)}`
      : fmtShortDate(rangeFrom || rangeTo || todayISO());
  const dayLabel = isRange
    ? rangeLabel
    : allDates
      ? "All dates"
      : isToday
        ? "Today"
        : new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
            weekday: "short",
            day: "numeric",
            month: "short",
          });

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-10">
      <div className="flex items-center gap-3 px-4 sm:px-0">
        <div className="w-11 h-11 bg-brand-primary/10 rounded-2xl flex items-center justify-center shrink-0">
          <ScanLine className="w-6 h-6 text-brand-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)]">
            Validator
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Check equipment out at pickup and back in on return.
          </p>
        </div>
      </div>

      <div className="px-4 sm:px-0 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search client, booking, item or #number"
            className="w-full h-12 pl-10 pr-4 bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary"
          />
        </div>

        {isRange ? (
          <div className="flex items-center gap-2">
            <div className="flex flex-1 min-w-0 items-center gap-2 p-1.5 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-2xl">
              <Calendar className="w-4 h-4 ml-2 shrink-0 text-[var(--text-muted)]" />
              <label className="flex-1 min-w-0">
                <span className="sr-only">From</span>
                <input
                  type="date"
                  value={rangeFrom}
                  max={rangeTo || undefined}
                  onChange={(e) => setParam("from", e.target.value || null)}
                  className="w-full h-9 px-2 bg-transparent text-sm font-bold text-[var(--text-main)] outline-none"
                  aria-label="From date"
                />
              </label>
              <span className="text-sm text-[var(--text-muted)]">to</span>
              <label className="flex-1 min-w-0">
                <span className="sr-only">To</span>
                <input
                  type="date"
                  value={rangeTo}
                  min={rangeFrom || undefined}
                  onChange={(e) => setParam("to", e.target.value || null)}
                  className="w-full h-9 px-2 bg-transparent text-sm font-bold text-[var(--text-main)] outline-none"
                  aria-label="To date"
                />
              </label>
              <button
                type="button"
                onClick={() => setDay(null)}
                className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)]"
                aria-label="Clear custom range"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setDay(null)}
              className="h-12 px-4 shrink-0 text-sm font-bold rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-surface)] text-[var(--text-main)] hover:border-brand-primary/40"
            >
              Today
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center flex-1 min-w-0 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-2xl">
              <button
                type="button"
                disabled={allDates}
                onClick={() => setDay(shiftDay(date, -1))}
                className="p-3 text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-30"
                aria-label="Previous day"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <label className="relative flex-1 min-w-0 flex items-center justify-center gap-2 text-sm font-bold text-[var(--text-main)] cursor-pointer">
                <Calendar className="w-4 h-4 text-[var(--text-muted)]" />
                {dayLabel}
                <input
                  type="date"
                  value={allDates ? "" : date}
                  onChange={(e) => setDay(e.target.value || null)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  aria-label="Pick a date"
                />
              </label>
              <button
                type="button"
                disabled={allDates}
                onClick={() => setDay(shiftDay(date, 1))}
                className="p-3 text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-30"
                aria-label="Next day"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <button
              type="button"
              onClick={openRange}
              className="h-12 px-4 shrink-0 text-sm font-bold rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-surface)] text-[var(--text-main)] hover:border-brand-primary/40"
            >
              Custom
            </button>
            <button
              type="button"
              onClick={() => setDay(allDates || !isToday ? null : "all")}
              className="h-12 px-4 shrink-0 text-sm font-bold rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-surface)] text-[var(--text-main)] hover:border-brand-primary/40"
            >
              {allDates || !isToday ? "Today" : "All dates"}
            </button>
          </div>
        )}

        <div
          role="radiogroup"
          aria-label="Filter by check out / check in status"
          className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0"
        >
          {PHASE_FILTERS.map((f) => {
            const active = (phase || null) === f.value;
            return (
              <button
                key={f.label}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setParam("phase", f.value)}
                className={cn(
                  "h-9 px-3.5 shrink-0 rounded-full text-xs font-bold border transition-colors",
                  active
                    ? "bg-brand-primary text-white border-brand-primary"
                    : "bg-[var(--bg-surface)] text-[var(--text-main)] border-[var(--border-soft)] hover:border-brand-primary/40",
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 sm:px-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-10 h-10 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin mb-4" />
            <p className="text-sm font-bold text-[var(--text-muted)]">
              Loading bookings…
            </p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-2xl bg-rose-500/10 text-rose-600 text-sm font-bold text-center">
            {error}
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-16 bg-[var(--bg-surface)] rounded-3xl border border-dashed border-[var(--border-soft)]">
            <Package className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
            <p className="text-[var(--text-main)] font-medium">
              No{" "}
              {phase
                ? `"${PHASE_FILTERS.find((f) => f.value === phase)?.label}" `
                : ""}
              bookings{" "}
              {allDates
                ? "found"
                : isRange && rangeFrom && rangeTo && rangeFrom !== rangeTo
                  ? `between ${dayLabel}`
                  : `for ${isToday ? "today" : dayLabel}`}
              .
            </p>
            <p className="text-[var(--text-muted)] text-sm mt-1">
              Only confirmed bookings show here.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {bookings.map((b) => {
              const phase = bookingPhase(b);
              const day = isToday ? fmtTime : fmtDayTime;
              return (
                <li key={b.booking_id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/validation/${b.booking_id}`)}
                    className="w-full text-left p-4 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-soft)] hover:border-brand-primary/40 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                              TONE[phase.tone],
                            )}
                          >
                            {phase.label}
                          </span>
                          {b.has_open_issues &&
                            b.status !== "returned_incomplete" && (
                              <AlertTriangle className="w-4 h-4 text-rose-500" />
                            )}
                          <span className="text-xs font-bold text-[var(--text-muted)]">
                            #{b.booking_id}
                          </span>
                        </div>
                        <h3 className="mt-1 font-bold text-[var(--text-main)] truncate">
                          {b.client_name}
                        </h3>
                        {b.booking_title && (
                          <p className="text-sm text-[var(--text-muted)] truncate">
                            {b.booking_title}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="w-5 h-5 shrink-0 text-[var(--text-muted)] group-hover:text-brand-primary group-hover:translate-x-0.5 transition-all mt-1" />
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="font-bold uppercase tracking-wider text-[10px] text-[var(--text-muted)]">
                          Out
                        </p>
                        <p className="font-bold text-[var(--text-main)]">
                          {day(b.pickup_date)}
                        </p>
                      </div>
                      <div>
                        <p className="font-bold uppercase tracking-wider text-[10px] text-[var(--text-muted)]">
                          Back
                        </p>
                        <p className="font-bold text-[var(--text-main)]">
                          {day(b.return_date)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {b.items.map((i: any, idx: number) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-[var(--bg-app)] rounded-md text-[11px] font-medium text-[var(--text-main)]"
                        >
                          {i.product_name}{" "}
                          <span className="font-bold text-[var(--text-muted)]">
                            ×{i.quantity}
                          </span>
                        </span>
                      ))}
                    </div>

                    <p className="mt-3 text-xs text-[var(--text-muted)] tabular-nums">
                      {b.counts.checked_out}/{b.counts.booked} checked out ·{" "}
                      {b.counts.checked_in}/{b.counts.booked} checked in
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
