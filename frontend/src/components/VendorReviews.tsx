import React, { useEffect, useState } from "react";
import { Star, X, Clock, Loader2 } from "lucide-react";
import { VendorReviewService } from "../api";
import {
  DateFilterBar,
  DEFAULT_DATE_FILTER,
  DateFilterValue,
  dateFilterParams,
} from "./DateFilterBar";
import { useNotification } from "../context/NotificationContext";
import { cn } from "../utils";

export const PUNCTUALITY = [
  {
    value: "early",
    label: "Early",
    cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  },
  {
    value: "on_time",
    label: "On time",
    cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  },
  {
    value: "late",
    label: "Late",
    cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
  {
    value: "no_show",
    label: "No-show",
    cls: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
  },
];

const RATING_LABELS = ["", "Poor", "Fair", "Good", "Very good", "Excellent"];

export const punctualityOf = (v: string) =>
  PUNCTUALITY.find((p) => p.value === v) || PUNCTUALITY[1];

export function PunctualityBadge({ value }: { value: string }) {
  const p = punctualityOf(value);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider",
        p.cls,
      )}
    >
      <Clock className="w-3 h-3" />
      {p.label}
    </span>
  );
}

export function Stars({
  value,
  size = "w-4 h-4",
  className = "",
}: {
  value: number;
  size?: string;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      aria-label={`${value} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            size,
            n <= Math.round(value)
              ? "fill-amber-400 text-amber-400"
              : "text-[var(--border-soft)]",
          )}
        />
      ))}
    </span>
  );
}

export interface ReviewTarget {
  event: number;
  event_name: string;
  vendor: number;
  vendor_name: string;
  vendor_service?: string;
  review?: any; // existing review when editing
}

/** Create or edit a vendor's review for a project. */
export function VendorReviewModal({
  target,
  onClose,
  onSaved,
}: {
  target: ReviewTarget;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showNotification } = useNotification();
  const existing = target.review;
  const [punctuality, setPunctuality] = useState<string>(
    existing?.punctuality || "",
  );
  const [rating, setRating] = useState<number>(existing?.rating || 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState<string>(existing?.comment || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = async () => {
    if (!punctuality || !rating) return;
    try {
      setSaving(true);
      const data = { punctuality, rating, comment: comment.trim() };
      if (existing) {
        await VendorReviewService.update(existing.review_id, data);
      } else {
        await VendorReviewService.create({
          ...data,
          event: target.event,
          vendor: target.vendor,
        });
      }
      showNotification("Vendor review saved", "success");
      onSaved();
      onClose();
    } catch (e: any) {
      console.error(e);
      showNotification(
        e.response?.data?.error || "Couldn't save the review.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const shown = hover || rating;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4 bg-[var(--bg-app)]/80 backdrop-blur-sm">
      <div className="bg-[var(--bg-surface)] rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden border border-[var(--border-soft)] shadow-2xl">
        <div className="flex items-start justify-between gap-3 p-6 border-b border-[var(--border-soft)] bg-[var(--bg-app)]/50 shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-[var(--text-main)] truncate">
              {existing ? "Edit review" : "Review vendor"}: {target.vendor_name}
            </h2>
            <p className="text-xs text-[var(--text-muted)] truncate">
              {target.vendor_service ? `${target.vendor_service} · ` : ""}
              {target.event_name}
            </p>
          </div>
          <button
            onClick={onClose}
            title="Close"
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-app)] rounded-full shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1 min-h-0">
          <div>
            <p className="text-sm font-bold text-[var(--text-main)] mb-2">
              Punctuality <span className="text-rose-500">*</span>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PUNCTUALITY.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPunctuality(p.value)}
                  aria-pressed={punctuality === p.value}
                  className={cn(
                    "py-2.5 rounded-xl border text-sm font-bold transition-colors",
                    punctuality === p.value
                      ? p.cls +
                          " ring-2 ring-offset-1 ring-offset-[var(--bg-surface)] ring-current"
                      : "border-[var(--border-soft)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-app)]",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-bold text-[var(--text-main)] mb-2">
              Performance <span className="text-rose-500">*</span>
            </p>
            <div className="flex items-center gap-3">
              <div
                className="flex items-center gap-1"
                onMouseLeave={() => setHover(0)}
                role="radiogroup"
                aria-label="Rating"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={rating === n}
                    aria-label={`${n} star${n === 1 ? "" : "s"}`}
                    onMouseEnter={() => setHover(n)}
                    onClick={() => setRating(n)}
                    className="p-0.5"
                  >
                    <Star
                      className={cn(
                        "w-8 h-8 transition-colors",
                        n <= shown
                          ? "fill-amber-400 text-amber-400"
                          : "text-[var(--border-soft)]",
                      )}
                    />
                  </button>
                ))}
              </div>
              <span className="text-sm font-semibold text-[var(--text-muted)]">
                {shown ? `${shown}/5 · ${RATING_LABELS[shown]}` : "Tap to rate"}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-[var(--text-main)] mb-2">
              Comment{" "}
              <span className="font-normal text-[var(--text-muted)]">
                (optional)
              </span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder="How did they do? Quality of work, communication, would you hire them again…"
              className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:border-brand-primary resize-none text-sm"
            />
          </div>
        </div>

        <div className="p-6 border-t border-[var(--border-soft)] flex gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-[var(--border-soft)] font-bold text-[var(--text-muted)] hover:bg-[var(--bg-app)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || !punctuality || !rating}
            className="flex-1 py-3 rounded-xl bg-brand-primary text-[var(--text-on-brand)] font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {existing ? "Save changes" : "Submit review"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * App-wide nudge when finished projects have vendors waiting for a review.
 * Opens a list of the pending reviews; each opens the review modal.
 */
export function PendingVendorReviewsBanner() {
  const [pending, setPending] = useState<ReviewTarget[]>([]);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<ReviewTarget | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem("vendorReviewsDismissed") === "1";
    } catch {
      return false;
    }
  });

  const load = () =>
    VendorReviewService.pending()
      .then((res) => setPending(res.data || []))
      .catch(() => {});

  useEffect(() => {
    load();
  }, []);

  if (pending.length === 0 || (dismissed && !open)) return null;

  const projects = new Set(pending.map((p) => p.event)).size;

  return (
    <>
      {!dismissed && (
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10">
          <div className="flex items-start gap-3 flex-1">
            <Star className="w-5 h-5 text-amber-500 fill-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm text-[var(--text-main)]">
              <strong>
                {pending.length} vendor review{pending.length === 1 ? "" : "s"}{" "}
                pending
              </strong>{" "}
              across {projects} finished project{projects === 1 ? "" : "s"}.
              Rate their punctuality and performance while it's fresh.
            </p>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => setOpen(true)}
              className="px-4 py-2 rounded-xl bg-brand-primary text-[var(--text-on-brand)] text-sm font-bold hover:opacity-90 whitespace-nowrap"
            >
              Review now
            </button>
            <button
              onClick={() => {
                setDismissed(true);
                try {
                  sessionStorage.setItem("vendorReviewsDismissed", "1");
                } catch {
                  /* ignore */
                }
              }}
              title="Remind me later"
              className="p-2 rounded-lg text-[var(--text-muted)] hover:bg-black/5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-[var(--bg-app)]/80 backdrop-blur-sm">
          <div className="bg-[var(--bg-surface)] rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-[var(--border-soft)] shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-soft)] bg-[var(--bg-app)]/50 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-main)]">
                  Pending vendor reviews
                </h2>
                <p className="text-xs text-[var(--text-muted)]">
                  {pending.length} to do
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                title="Close"
                className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-app)] rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <ul className="flex-1 min-h-0 overflow-y-auto divide-y divide-[var(--border-soft)]">
              {pending.map((p) => (
                <li
                  key={`${p.event}-${p.vendor}`}
                  className="flex items-center justify-between gap-3 px-6 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-[var(--text-main)] truncate">
                      {p.vendor_name}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] truncate">
                      {p.vendor_service ? `${p.vendor_service} · ` : ""}
                      {p.event_name}
                    </p>
                  </div>
                  <button
                    onClick={() => setTarget(p)}
                    className="shrink-0 px-3.5 py-2 rounded-xl border border-[var(--border-soft)] text-sm font-bold text-[var(--text-main)] hover:bg-[var(--bg-app)]"
                  >
                    Review
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {target && (
        <VendorReviewModal
          target={target}
          onClose={() => setTarget(null)}
          onSaved={() => {
            load().then(() => {
              /* close the list when nothing is left */
            });
            setPending((prev) =>
              prev.filter(
                (x) =>
                  !(x.event === target.event && x.vendor === target.vendor),
              ),
            );
          }}
        />
      )}
    </>
  );
}

/** Vendor reviews for one project, listed under its expenses. */
export function ProjectVendorReviews({
  event,
  expenses,
}: {
  event: any;
  expenses: any[];
}) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [target, setTarget] = useState<ReviewTarget | null>(null);

  const load = () =>
    VendorReviewService.getAll({ event: event.event_id, page_size: 200 })
      .then((res) => setReviews(res.data.results || res.data))
      .catch(() => {});

  useEffect(() => {
    if (event?.event_id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.event_id]);

  // Distinct vendors that appear on this project's expenses.
  const vendors: { id: number; name: string; service?: string }[] = [];
  expenses.forEach((e) => {
    if (e.vendor && !vendors.some((v) => v.id === e.vendor)) {
      vendors.push({
        id: e.vendor,
        name: e.vendor_details?.business_name || e.name || "Vendor",
        service: e.vendor_details?.service,
      });
    }
  });
  if (vendors.length === 0) return null;

  const today = new Date().toISOString().slice(0, 10);
  const finished =
    event.status !== "cancelled" &&
    (event.status === "completed" ||
      (event.end_date && event.end_date < today));
  const reviewFor = (vendorId: number) =>
    reviews.find((r) => r.vendor === vendorId);
  const pendingCount = finished
    ? vendors.filter((v) => !reviewFor(v.id)).length
    : 0;

  return (
    <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-soft)] p-6 mt-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h3 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
          Vendor reviews
        </h3>
        {pendingCount > 0 && (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
            {pendingCount} pending
          </span>
        )}
      </div>
      <ul className="space-y-3">
        {vendors.map((v) => {
          const r = reviewFor(v.id);
          return (
            <li
              key={v.id}
              className="flex flex-col sm:flex-row sm:items-start gap-3 p-4 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-app)]"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-[var(--text-main)]">{v.name}</p>
                  {v.service && (
                    <span className="text-xs text-[var(--text-muted)]">
                      {v.service}
                    </span>
                  )}
                </div>
                {r ? (
                  <div className="mt-2 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Stars value={r.rating} />
                      <PunctualityBadge value={r.punctuality} />
                    </div>
                    {r.comment && (
                      <p className="text-sm text-[var(--text-muted)] whitespace-pre-wrap break-words">
                        “{r.comment}”
                      </p>
                    )}
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {r.created_by_name ? `${r.created_by_name} · ` : ""}
                      {new Date(r.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                ) : (
                  <p
                    className={cn(
                      "mt-1 text-xs",
                      finished
                        ? "text-amber-600 dark:text-amber-400 font-semibold"
                        : "text-[var(--text-muted)]",
                    )}
                  >
                    {finished
                      ? "Pending review"
                      : "Not reviewed yet — you'll be reminded when the project ends."}
                  </p>
                )}
              </div>
              <button
                onClick={() =>
                  setTarget({
                    event: event.event_id,
                    event_name: event.name,
                    vendor: v.id,
                    vendor_name: v.name,
                    vendor_service: v.service,
                    review: r,
                  })
                }
                className={cn(
                  "self-start shrink-0 px-3.5 py-2 rounded-xl text-sm font-bold transition-colors",
                  r
                    ? "border border-[var(--border-soft)] text-[var(--text-main)] hover:bg-[var(--bg-surface)]"
                    : "bg-brand-primary text-[var(--text-on-brand)] hover:opacity-90",
                )}
              >
                {r ? "Edit" : "Review"}
              </button>
            </li>
          );
        })}
      </ul>
      {target && (
        <VendorReviewModal
          target={target}
          onClose={() => setTarget(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}

/**
 * All vendor reviews with search, date range + sort, punctuality and rating
 * filters (Vendors → Reviews tab).
 */
export function VendorReviewsList() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [punctuality, setPunctuality] = useState("");
  const [rating, setRating] = useState("");
  const [dateFilter, setDateFilter] =
    useState<DateFilterValue>(DEFAULT_DATE_FILTER);
  const [target, setTarget] = useState<ReviewTarget | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = () => {
    setLoading(true);
    const params: any = { page_size: 100, ...dateFilterParams(dateFilter) };
    if (debounced) params.search = debounced;
    if (punctuality) params.punctuality = punctuality;
    if (rating) params.rating = rating;
    return VendorReviewService.getAll(params)
      .then((res) => {
        setReviews(res.data.results || res.data);
        setCount(res.data.count ?? (res.data.results || res.data).length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, punctuality, rating, dateFilter]);

  const selectCls =
    "h-10 pl-3 pr-8 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-xl text-sm font-medium text-[var(--text-main)] outline-none focus:border-brand-primary cursor-pointer";

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by vendor, service, project or comment…"
        className="w-full px-4 py-3 bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-2xl outline-none focus:border-brand-primary shadow-sm"
      />
      <div className="flex flex-wrap items-center gap-2">
        <DateFilterBar
          value={dateFilter}
          onChange={setDateFilter}
          allowPaid={false}
        />
        <select
          aria-label="Punctuality"
          value={punctuality}
          onChange={(e) => setPunctuality(e.target.value)}
          className={selectCls}
        >
          <option value="">Any punctuality</option>
          {PUNCTUALITY.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Rating"
          value={rating}
          onChange={(e) => setRating(e.target.value)}
          className={selectCls}
        >
          <option value="">Any rating</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} star{n === 1 ? "" : "s"}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-muted)] bg-[var(--bg-app)] rounded-2xl border border-dashed border-[var(--border-soft)]">
          No reviews match. Reviews are added from each project's “Vendor
          reviews” section.
        </div>
      ) : (
        <>
          <p className="text-xs text-[var(--text-muted)]">
            {count} review{count === 1 ? "" : "s"}
          </p>
          <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {reviews.map((r) => (
              <li
                key={r.review_id}
                className="p-5 rounded-2xl border border-[var(--border-soft)] bg-[var(--bg-surface)] shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-[var(--text-main)] truncate">
                      {r.vendor_name}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] truncate">
                      {r.vendor_service ? `${r.vendor_service} · ` : ""}
                      {r.event_name}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setTarget({
                        event: r.event,
                        event_name: r.event_name,
                        vendor: r.vendor,
                        vendor_name: r.vendor_name,
                        vendor_service: r.vendor_service,
                        review: r,
                      })
                    }
                    className="shrink-0 px-3 py-1.5 rounded-lg border border-[var(--border-soft)] text-xs font-bold text-[var(--text-main)] hover:bg-[var(--bg-app)]"
                  >
                    Edit
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <Stars value={r.rating} />
                  <PunctualityBadge value={r.punctuality} />
                </div>
                {r.comment && (
                  <p className="mt-3 text-sm text-[var(--text-muted)] whitespace-pre-wrap break-words line-clamp-4">
                    “{r.comment}”
                  </p>
                )}
                <p className="mt-3 text-[11px] text-[var(--text-muted)]">
                  {r.created_by_name ? `${r.created_by_name} · ` : ""}
                  {new Date(r.created_at).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}

      {target && (
        <VendorReviewModal
          target={target}
          onClose={() => setTarget(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
