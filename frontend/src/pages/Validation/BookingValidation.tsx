import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownToLine,
  ArrowLeft,
  ArrowUpFromLine,
  CheckCircle2,
  ChevronDown,
  Clock,
  MapPin,
  Phone,
  X,
} from "lucide-react";
import { ProductService, ValidationService } from "../../api";
import { cn } from "@/src/utils";
import { useNotification } from "../../context/NotificationContext";
import {
  HandoverChecklist,
  type ChecklistAnswer,
  type ChecklistPrompt,
} from "../../components/HandoverChecklist";
import type { HandoverCheck } from "../../types";
import { bookingPhase, TONE } from "./index";

const fmt = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const ISSUE_LABEL: Record<string, string> = {
  missing: "missing",
  damaged: "damaged",
  consumed: "used up",
  not_sent: "not sent",
};

type Mode = "check_out" | "check_in";

/** One booking: what was booked, unit by unit, with check out / check in. */
export function BookingValidation() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const [booking, setBooking] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [action, setAction] = useState<{
    unit: any;
    item: any;
    mode: Mode;
  } | null>(null);

  const load = async () => {
    try {
      const res = await ValidationService.getBooking(id as string);
      setBooking(res.data);
    } catch (err: any) {
      if (err.response?.status !== 404)
        showNotification("Failed to load booking.", "error");
      setBooking(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    load();
  }, [id]);

  const back = () =>
    window.history.length > 1 ? navigate(-1) : navigate("/validation");

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-10 h-10 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold text-[var(--text-muted)]">
          Loading booking…
        </p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-16">
        <p className="text-[var(--text-main)] font-medium">
          Booking not found.
        </p>
        <button
          onClick={() => navigate("/validation")}
          className="mt-4 text-brand-primary font-bold"
        >
          Back to list
        </button>
      </div>
    );
  }

  const phase = bookingPhase(booking);
  const place = [booking.event_location, booking.address, booking.city]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-start gap-3 px-4 sm:px-0">
        <button
          onClick={back}
          className="p-2 -ml-2 mt-0.5 text-[var(--text-muted)] hover:bg-[var(--bg-surface)] rounded-xl"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                TONE[phase.tone],
              )}
            >
              {phase.label}
            </span>
            <span className="text-xs font-bold text-[var(--text-muted)]">
              #{booking.booking_id}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-main)] leading-tight mt-1">
            {booking.client_name}
          </h1>
          {booking.booking_title && (
            <p className="text-sm text-[var(--text-muted)]">
              {booking.booking_title}
            </p>
          )}
        </div>
      </div>

      {/* Booking details */}
      <section className="mx-4 sm:mx-0 p-5 bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-soft)] grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
            Check out
          </p>
          <p className="font-bold text-[var(--text-main)]">
            {fmt(booking.pickup_date)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
            Check in
          </p>
          <p className="font-bold text-[var(--text-main)]">
            {fmt(booking.return_date)}
          </p>
        </div>
        {(booking.contact_name || booking.contact_phone) && (
          <div className="col-span-2 sm:col-span-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
              Contact
            </p>
            <p className="font-bold text-[var(--text-main)]">
              {booking.contact_name}
            </p>
            {booking.contact_phone && (
              <a
                href={`tel:${booking.contact_phone}`}
                className="inline-flex items-center gap-1 text-brand-primary font-bold"
              >
                <Phone className="w-3.5 h-3.5" /> {booking.contact_phone}
              </a>
            )}
          </div>
        )}
        <div className="col-span-2 sm:col-span-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
            {booking.delivery_mode === "delivery" ? "Delivery" : "Self pickup"}
          </p>
          {place ? (
            <p className="flex gap-1 text-[var(--text-main)]">
              <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-[var(--text-muted)]" />
              {place}
            </p>
          ) : (
            <p className="text-[var(--text-muted)]">No address</p>
          )}
        </div>
        {booking.note_for_org && (
          <p className="col-span-2 p-3 rounded-xl bg-[var(--bg-app)] text-[var(--text-main)]">
            {booking.note_for_org}
          </p>
        )}
        <p className="col-span-2 text-xs text-[var(--text-muted)] tabular-nums">
          {booking.counts.checked_out}/{booking.counts.booked} checked out ·{" "}
          {booking.counts.checked_in}/{booking.counts.booked} checked in
        </p>
      </section>

      {/* Items */}
      <section className="mx-4 sm:mx-0 space-y-4">
        {booking.items.map((item: any) => (
          <div key={item.booking_item_id} className="space-y-2">
            <h2 className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider">
              {item.product_name}{" "}
              <span className="text-[var(--text-muted)]">×{item.quantity}</span>
            </h2>
            {item.units.length === 0 && (
              <p className="text-sm text-[var(--text-muted)] p-4 bg-[var(--bg-surface)] rounded-2xl border border-dashed border-[var(--border-soft)]">
                No unit assigned yet. Assign one from Bookings before checking
                out.
              </p>
            )}
            {item.units.map((unit: any) => (
              <UnitCard
                key={unit.booking_item_unit_id}
                unit={unit}
                onAction={(mode) => setAction({ unit, item, mode })}
              />
            ))}
          </div>
        ))}
      </section>

      {action && (
        <HandoverSheet
          booking={booking}
          item={action.item}
          unit={action.unit}
          mode={action.mode}
          onClose={() => setAction(null)}
          onDone={(message, warn) => {
            setAction(null);
            showNotification(message, warn ? "warning" : "success");
            load();
          }}
        />
      )}
    </div>
  );
}

function UnitCard({
  unit,
  onAction,
}: {
  unit: any;
  onAction: (mode: Mode) => void;
  key?: number;
}) {
  const isBulk = unit.unit_type === "bulk";
  const checksIn = unit.checks.filter(
    (c: HandoverCheck) => c.stage === "check_in",
  );
  const fullyIn =
    unit.quantity_checked_out > 0 &&
    unit.quantity_checked_in >= unit.quantity_checked_out &&
    !unit.can_check_out;
  const lastIn = checksIn[checksIn.length - 1] as HandoverCheck | undefined;
  const openFlag = unit.checks.some(
    (c: HandoverCheck) => c.is_incomplete && !c.resolved_at,
  );

  return (
    <div className="p-4 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-soft)] space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-[var(--text-main)]">
            {unit.unit_name || unit.serial_number || "Unit"}
            {isBulk && (
              <span className="text-[var(--text-muted)]">
                {" "}
                ×{unit.quantity}
              </span>
            )}
          </p>
          {unit.serial_number && (
            <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
              {isBulk ? "Code" : "SN"} {unit.serial_number}
            </p>
          )}
          {unit.stock_location && (
            <p className="flex items-center gap-1 text-xs text-[var(--text-muted)] mt-0.5">
              <MapPin className="w-3.5 h-3.5 shrink-0" /> {unit.stock_location}
            </p>
          )}
        </div>
        <p className="text-xs text-[var(--text-muted)] text-right tabular-nums shrink-0">
          Out {unit.quantity_checked_out}/{unit.quantity}
          <br />
          In {unit.quantity_checked_in}/
          {unit.quantity_checked_out || unit.quantity}
        </p>
      </div>

      {(["consumable", "accessory"] as const).map((kind) => {
        const kit = unit.accessories.filter((a: any) => a.kind === kind);
        if (kit.length === 0) return null;
        return (
          <div key={kind}>
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">
              {kind === "consumable" ? "Consumables" : "Accessories"}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {kit.map((a: any, idx: number) => (
                <span
                  key={idx}
                  title={a.description || undefined}
                  className={cn(
                    "px-2 py-1 rounded-md text-[11px] font-medium",
                    a.is_critical && kind === "accessory"
                      ? "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                      : kind === "consumable"
                        ? "bg-amber-500/10 text-amber-800 dark:text-amber-300"
                        : "bg-[var(--bg-app)] text-[var(--text-main)]",
                  )}
                >
                  {a.quantity}× {a.name}
                  {isBulk && " each"}
                </span>
              ))}
            </div>
          </div>
        );
      })}

      {openFlag && (
        <p className="flex gap-1.5 text-xs font-bold text-rose-600">
          <AlertTriangle className="w-4 h-4 shrink-0" /> Return incomplete:
          resolve from Bookings once the part is found or replaced.
        </p>
      )}

      {fullyIn ? (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>
            <span className="font-bold">Checked in</span>
            {lastIn &&
              ` ${fmt(lastIn.performed_at)}${
                lastIn.performed_by_name
                  ? ` by ${lastIn.performed_by_name}`
                  : ""
              }`}
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={!unit.can_check_out}
            onClick={() => onAction("check_out")}
            className="h-12 flex items-center justify-center gap-2 rounded-xl font-bold text-sm bg-brand-primary text-brand-accent disabled:bg-[var(--bg-app)] disabled:text-[var(--text-muted)] disabled:cursor-not-allowed"
          >
            <ArrowUpFromLine className="w-4 h-4" /> Check out
          </button>
          <button
            type="button"
            disabled={!unit.can_check_in}
            onClick={() => onAction("check_in")}
            className="h-12 flex items-center justify-center gap-2 rounded-xl font-bold text-sm bg-indigo-600 text-white disabled:bg-[var(--bg-app)] disabled:text-[var(--text-muted)] disabled:cursor-not-allowed"
          >
            <ArrowDownToLine className="w-4 h-4" /> Check in
          </button>
        </div>
      )}

      {unit.checks.length > 0 && (
        <ul className="space-y-1.5 pt-1 border-t border-[var(--border-subtle)]">
          {unit.checks.map((c: HandoverCheck) => (
            <HistoryRow key={c.check_id} check={c} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** One check out / check in. Tap to see what was confirmed. */
function HistoryRow({ check }: { check: HandoverCheck; key?: number }) {
  const [open, setOpen] = useState(false);
  const isOut = check.stage === "check_out";
  const flagged = check.has_issues;

  return (
    <li className="rounded-xl bg-[var(--bg-app)]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 p-2.5 text-left text-xs"
      >
        {isOut ? (
          <ArrowUpFromLine className="w-4 h-4 shrink-0 text-brand-primary" />
        ) : (
          <ArrowDownToLine className="w-4 h-4 shrink-0 text-indigo-500" />
        )}
        <span className="flex-1 min-w-0">
          <span className="font-bold text-[var(--text-main)]">
            {isOut ? "Checked out" : "Checked in"}
            {check.quantity > 1 && ` ×${check.quantity}`}
          </span>
          <span className="text-[var(--text-muted)]">
            {" "}
            · {fmt(check.performed_at)}
            {check.performed_by_name && ` · ${check.performed_by_name}`}
          </span>
        </span>
        {flagged && (
          <AlertCircle
            className={cn(
              "w-4 h-4 shrink-0",
              check.is_incomplete && !check.resolved_at
                ? "text-rose-500"
                : "text-amber-500",
            )}
          />
        )}
        <ChevronDown
          className={cn(
            "w-4 h-4 shrink-0 text-[var(--text-muted)] transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-1.5 text-xs">
          {check.lines.length === 0 ? (
            <p className="text-[var(--text-muted)]">
              No accessories on this unit.
            </p>
          ) : (
            check.lines.map((l) => (
              <p key={l.line_id} className="flex items-start gap-2">
                {l.issue ? (
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px text-amber-500" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-px text-emerald-500" />
                )}
                <span className="text-[var(--text-main)]">
                  {l.confirmed_quantity}/{l.expected_quantity} × {l.name}
                  {l.is_critical && (
                    <span className="ml-1 text-[9px] font-black uppercase text-rose-600">
                      critical
                    </span>
                  )}
                  {l.issue && (
                    <span className="text-[var(--text-muted)]">
                      {" "}
                      — {l.shortfall} {ISSUE_LABEL[l.issue]}
                      {l.note && `: ${l.note}`}
                    </span>
                  )}
                </span>
              </p>
            ))
          )}
          {check.note && (
            <p className="italic text-[var(--text-muted)]">“{check.note}”</p>
          )}
          {check.resolved_at && (
            <p className="text-emerald-700 dark:text-emerald-400">
              Resolved {fmt(check.resolved_at)}
              {check.resolved_by_name && ` by ${check.resolved_by_name}`}:{" "}
              {check.resolution_note}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * Check out / check in one unit: quantity (bulk) or condition (check in),
 * then the accessory checklist when the unit has a kit.
 */
function HandoverSheet({
  booking,
  item,
  unit,
  mode,
  onClose,
  onDone,
}: {
  booking: any;
  item: any;
  unit: any;
  mode: Mode;
  onClose: () => void;
  onDone: (message: string, warn: boolean) => void;
}) {
  const isBulk = unit.unit_type === "bulk";
  const isIn = mode === "check_in";
  const remaining = isIn
    ? unit.quantity_checked_out - unit.quantity_checked_in
    : unit.quantity - unit.quantity_checked_out;

  const [qty, setQty] = useState(remaining);
  const [damaged, setDamaged] = useState(0);
  const [condition, setCondition] = useState<"good" | "damaged">("good");
  const [prompt, setPrompt] = useState<ChecklistPrompt | null>(null);
  const [payload, setPayload] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (body: any) => {
    setBusy(true);
    setError(null);
    try {
      const res = await ProductService.scan(body);
      if (res.data.requires_checklist) {
        setPayload(body);
        setPrompt(res.data);
        return;
      }
      if (res.data.requires_quantity || res.data.requires_condition) {
        throw new Error(res.data.message || "More details needed.");
      }
      const c = res.data.checklist;
      onDone(
        c?.has_issues
          ? `${c.is_incomplete ? "Return incomplete" : "Flagged"}: ${
              c.flag_reason
            }`
          : `${item.product_name} ${isIn ? "checked in" : "checked out"}`,
        !!c?.has_issues,
      );
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const start = () => {
    if (!unit.serial_number) {
      setError("This unit has no serial or code, so it can't be checked.");
      return;
    }
    const body: any = {
      serial_number: unit.serial_number,
      action: isIn ? "return" : "pickup",
      booking_item_unit_id: unit.booking_item_unit_id,
    };
    if (isBulk) {
      if (isIn) {
        body.qty_good = qty - damaged;
        body.qty_damaged = damaged;
      } else {
        body.quantity = qty;
      }
    } else if (isIn) {
      body.condition = condition;
      body.condition_submitted = true;
    }
    send(body);
  };

  const confirmChecklist = (answers: ChecklistAnswer[], note: string) =>
    send({ ...payload, checklist: answers, checklist_note: note });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-[var(--bg-surface)] rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 border border-[var(--border-soft)] shadow-2xl">
        {prompt ? (
          <HandoverChecklist
            key={prompt.checklist
              .map((l) => `${l.accessory_id}:${l.expected_quantity}`)
              .join(",")}
            prompt={prompt}
            onConfirm={confirmChecklist}
            onBack={() => setPrompt(null)}
          />
        ) : (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-primary">
                  {isIn ? "Check in" : "Check out"} · #{booking.booking_id}
                </p>
                <h3 className="text-lg font-bold text-[var(--text-main)]">
                  {item.product_name}
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  {[
                    unit.unit_name,
                    unit.serial_number && `SN ${unit.serial_number}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 -mr-2 text-[var(--text-muted)] hover:text-[var(--text-main)]"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isBulk && (
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1.5">
                  <span className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">
                    {isIn ? "Returning" : "Going out"}
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={remaining}
                    value={qty}
                    onChange={(e) =>
                      setQty(
                        Math.min(
                          remaining,
                          Math.max(1, parseInt(e.target.value) || 1),
                        ),
                      )
                    }
                    className="w-full h-12 px-3 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl text-sm font-bold text-[var(--text-main)] outline-none focus:border-brand-primary"
                  />
                  <span className="block text-[11px] text-[var(--text-muted)]">
                    of {remaining} {isIn ? "out" : "left"}
                  </span>
                </label>
                {isIn && (
                  <label className="space-y-1.5">
                    <span className="block text-xs font-bold text-rose-500 uppercase tracking-widest">
                      Damaged
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={qty}
                      value={damaged}
                      onChange={(e) =>
                        setDamaged(
                          Math.min(
                            qty,
                            Math.max(0, parseInt(e.target.value) || 0),
                          ),
                        )
                      }
                      className="w-full h-12 px-3 bg-rose-500/5 border border-rose-500/20 rounded-xl text-sm font-bold text-rose-600 outline-none focus:border-rose-500"
                    />
                  </label>
                )}
              </div>
            )}

            {!isBulk && isIn && (
              <div className="grid grid-cols-2 gap-2">
                {(["good", "damaged"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCondition(c)}
                    className={cn(
                      "h-12 rounded-xl border-2 text-sm font-bold capitalize transition-colors",
                      condition === c
                        ? c === "good"
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-600"
                          : "border-rose-500 bg-rose-500/10 text-rose-600"
                        : "border-[var(--border-soft)] text-[var(--text-muted)]",
                    )}
                  >
                    {c === "good" ? "Good condition" : "Damaged"}
                  </button>
                ))}
              </div>
            )}

            {unit.accessories.length > 0 && (
              <p className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                <Clock className="w-3.5 h-3.5" /> Next: tick off the kit (
                {unit.accessories.length} item
                {unit.accessories.length === 1 ? "" : "s"}).
              </p>
            )}

            {error && (
              <p className="p-3 rounded-xl bg-rose-500/10 text-rose-600 text-sm font-bold">
                {error}
              </p>
            )}

            <button
              type="button"
              disabled={busy || remaining < 1}
              onClick={start}
              className="w-full h-14 bg-brand-primary text-brand-accent rounded-xl font-black text-sm uppercase tracking-widest hover:opacity-90 disabled:opacity-50"
            >
              {busy
                ? "Working…"
                : unit.accessories.length > 0
                  ? "Continue"
                  : `Confirm ${isIn ? "check in" : "check out"}`}
            </button>
          </div>
        )}
        {prompt && error && (
          <p className="mt-3 p-3 rounded-xl bg-rose-500/10 text-rose-600 text-sm font-bold">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
