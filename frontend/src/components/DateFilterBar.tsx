import React from "react";
import { CalendarRange, ArrowDownUp, X } from "lucide-react";

// Built-ins; pages can add their own via the `fields` prop (e.g. "event").
export type DateField = "created" | "updated" | "paid" | (string & {});

export interface FilterOption {
  value: string;
  label: string;
}

export interface DateFilterValue {
  field: DateField;
  preset: string; // "any" | "today" | "7d" | "30d" | "month" | "last_month" | "year" | "custom"
  from: string; // YYYY-MM-DD
  to: string;
  ordering: string; // "-created" | "created" | "-updated" | "-paid"
}

export const DEFAULT_DATE_FILTER: DateFilterValue = {
  field: "created",
  preset: "any",
  from: "",
  to: "",
  ordering: "-created",
};

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

const presetRange = (preset: string): { from: string; to: string } => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (preset) {
    case "today":
      return { from: iso(now), to: iso(now) };
    case "7d":
      return { from: iso(new Date(y, m, now.getDate() - 6)), to: iso(now) };
    case "30d":
      return { from: iso(new Date(y, m, now.getDate() - 29)), to: iso(now) };
    case "month":
      return { from: iso(new Date(y, m, 1)), to: iso(now) };
    case "last_month":
      return { from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)) };
    case "year":
      return { from: `${y}-01-01`, to: iso(now) };
    default:
      return { from: "", to: "" };
  }
};

/** Query params for the backend DateRangeOrderingFilter. */
export const dateFilterParams = (v: DateFilterValue) => {
  const params: Record<string, string> = { ordering: v.ordering };
  if (v.from || v.to) {
    params.date_field = v.field;
    if (v.from) params.date_from = v.from;
    if (v.to) params.date_to = v.to;
  }
  return params;
};

export const isDateFilterActive = (v: DateFilterValue) =>
  Boolean(v.from || v.to) || v.ordering !== DEFAULT_DATE_FILTER.ordering;

const PRESETS = [
  ["any", "Any time"],
  ["today", "Today"],
  ["7d", "Last 7 days"],
  ["30d", "Last 30 days"],
  ["month", "This month"],
  ["last_month", "Last month"],
  ["year", "This year"],
  ["custom", "Custom range"],
];

const selectCls =
  "h-10 pl-3 pr-8 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-xl text-sm font-medium text-[var(--text-main)] outline-none focus:border-brand-primary cursor-pointer";

/**
 * Filter a list by date created / last updated / date paid, and sort it.
 * Sorted by date created (newest first) by default.
 */
export function DateFilterBar({
  value,
  onChange,
  allowPaid = true,
  fields: customFields,
  sorts: customSorts,
  className = "",
}: {
  value: DateFilterValue;
  onChange: (v: DateFilterValue) => void;
  allowPaid?: boolean;
  /** Override which dates can be filtered on. */
  fields?: FilterOption[];
  /** Override the sort options. */
  sorts?: FilterOption[];
  className?: string;
}) {
  const fields: FilterOption[] = customFields || [
    { value: "created", label: "Date created" },
    { value: "updated", label: "Last updated" },
    ...(allowPaid ? [{ value: "paid", label: "Date paid" }] : []),
  ];
  const sorts: FilterOption[] = customSorts || [
    { value: "-created", label: "Newest created" },
    { value: "created", label: "Oldest created" },
    { value: "-updated", label: "Recently updated" },
    ...(allowPaid ? [{ value: "-paid", label: "Recently paid" }] : []),
  ];

  const setPreset = (preset: string) => {
    if (preset === "custom") onChange({ ...value, preset });
    else onChange({ ...value, preset, ...presetRange(preset) });
  };

  const rangeInvalid = Boolean(value.from && value.to && value.from > value.to);

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <div className="flex items-center gap-2">
        <CalendarRange className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
        <select
          aria-label="Date to filter by"
          value={value.field}
          onChange={(e) =>
            onChange({ ...value, field: e.target.value as DateField })
          }
          className={selectCls}
        >
          {fields.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Date range"
          value={value.preset}
          onChange={(e) => setPreset(e.target.value)}
          className={`${selectCls} ${
            value.from || value.to ? "border-brand-primary" : ""
          }`}
        >
          {PRESETS.map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {value.preset === "custom" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            aria-label="From"
            value={value.from}
            max={value.to || undefined}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
            className={`${selectCls} pr-3`}
          />
          <span className="text-[var(--text-muted)] text-sm">to</span>
          <input
            type="date"
            aria-label="To"
            value={value.to}
            min={value.from || undefined}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
            className={`${selectCls} pr-3 ${
              rangeInvalid ? "border-rose-500" : ""
            }`}
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <ArrowDownUp className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
        <select
          aria-label="Sort by"
          value={value.ordering}
          onChange={(e) => onChange({ ...value, ordering: e.target.value })}
          className={selectCls}
        >
          {sorts.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {isDateFilterActive(value) && (
        <button
          type="button"
          onClick={() => onChange(DEFAULT_DATE_FILTER)}
          className="h-10 inline-flex items-center gap-1 px-3 rounded-xl text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-app)]"
        >
          <X className="w-4 h-4" /> Reset
        </button>
      )}
    </div>
  );
}
