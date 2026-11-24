import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCheck,
  Minus,
  Plus,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/src/utils";
import type {
  ChecklistPromptLine,
  HandoverIssue,
  HandoverStage,
} from "../types";

export interface ChecklistPrompt {
  stage: HandoverStage;
  checklist: ChecklistPromptLine[];
  quantity: number;
  product_name: string;
  unit_name?: string | null;
  serial_number?: string | null;
  stock_location?: string | null;
  booking_id?: string;
  client_name?: string;
  message?: string;
}

export interface ChecklistAnswer {
  accessory_id: number;
  confirmed_quantity: number;
  issue: HandoverIssue;
  note: string;
}

type LineState =
  | { kind: "unset" }
  | { kind: "ok" }
  | { kind: "short"; confirmed: number; issue: HandoverIssue; note: string };

const CONSUMABLE_REASONS = ["Exhausted", "Used at the event"];

const ISSUES: Record<HandoverStage, { value: HandoverIssue; label: string }[]> =
  {
    check_out: [
      { value: "missing", label: "Missing" },
      { value: "damaged", label: "Damaged" },
      { value: "not_sent", label: "Not sending" },
    ],
    check_in: [
      { value: "missing", label: "Missing" },
      { value: "damaged", label: "Damaged" },
      { value: "consumed", label: "Used up" },
    ],
  };

interface Props {
  /** Declared because this project's JSX typings reject `key` otherwise. */
  key?: string;
  prompt: ChecklistPrompt;
  onConfirm: (answers: ChecklistAnswer[], note: string) => void;
  onBack: () => void;
}

/**
 * Accessory checklist shown when a unit with a kit is checked out or in.
 * Every line must be ticked, or have a problem reported, before confirming.
 */
export function HandoverChecklist({ prompt, onConfirm, onBack }: Props) {
  const lines = prompt.checklist;
  // At check in, consumables start as "not returned" (used up): tick the
  // ones that came back. Everything else starts unchecked.
  const notReturned: LineState = {
    kind: "short",
    confirmed: 0,
    issue: "consumed",
    note: "",
  };
  const [states, setStates] = useState<Record<number, LineState>>(() =>
    Object.fromEntries(
      lines.map((l) => [
        l.accessory_id,
        prompt.stage === "check_in" && l.kind === "consumable"
          ? notReturned
          : { kind: "unset" },
      ]),
    ),
  );
  const [note, setNote] = useState("");

  const isCheckIn = prompt.stage === "check_in";
  const set = (id: number, s: LineState) =>
    setStates((prev) => ({ ...prev, [id]: s }));

  // Consumables are compulsory at check out, optional at check in.
  const isOptional = (l: ChecklistPromptLine) =>
    isCheckIn && l.kind === "consumable";
  const required = lines.filter((l) => !isOptional(l));
  const accessoryLines = lines.filter((l) => l.kind !== "consumable");
  const consumableLines = lines.filter((l) => l.kind === "consumable");

  const unset = required.filter((l) => states[l.accessory_id].kind === "unset");
  const done = required.length - unset.length;

  // What the result will be, so nobody is surprised after confirming.
  const criticalLosses = useMemo(
    () =>
      lines.filter((l) => {
        const s = states[l.accessory_id];
        return (
          l.is_critical &&
          s.kind === "short" &&
          (s.issue === "missing" || s.issue === "damaged")
        );
      }),
    [lines, states],
  );

  const confirm = () =>
    onConfirm(
      lines
        // Skipped optional consumables are simply not sent.
        .filter(
          (l) => !(isOptional(l) && states[l.accessory_id].kind === "unset"),
        )
        .map((l) => {
          const s = states[l.accessory_id];
          return s.kind === "short"
            ? {
                accessory_id: l.accessory_id,
                confirmed_quantity: s.confirmed,
                issue: s.issue,
                note: s.note,
              }
            : {
                accessory_id: l.accessory_id,
                confirmed_quantity: l.expected_quantity,
                issue: "",
                note: "",
              };
        }),
      note,
    );

  const renderLine = (line: ChecklistPromptLine) => {
    const s = states[line.accessory_id];
    return (
      <li
        key={line.accessory_id}
        className={cn(
          "rounded-xl border-2 transition-colors",
          s.kind === "ok" && "border-emerald-500/60 bg-emerald-500/5",
          s.kind === "short" && "border-amber-500/60 bg-amber-500/5",
          s.kind === "unset" &&
            "border-[var(--border-soft)] bg-[var(--bg-app)]",
        )}
      >
        <div className="flex items-center gap-3 p-3">
          <button
            type="button"
            role="checkbox"
            aria-checked={s.kind === "ok"}
            onClick={() =>
              set(
                line.accessory_id,
                s.kind !== "ok"
                  ? { kind: "ok" }
                  : isOptional(line)
                    ? notReturned
                    : { kind: "unset" },
              )
            }
            className="flex items-center gap-3 flex-1 min-w-0 text-left"
          >
            <span
              className={cn(
                "w-7 h-7 shrink-0 rounded-lg border-2 flex items-center justify-center transition-colors",
                s.kind === "ok"
                  ? "bg-emerald-500 border-emerald-500 text-white"
                  : "border-[var(--border-soft)] bg-[var(--bg-surface)]",
              )}
            >
              {s.kind === "ok" && <Check className="w-4 h-4" />}
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-[var(--text-main)]">
                  {line.expected_quantity} × {line.name}
                </span>
                {line.is_critical && (
                  <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600">
                    Critical
                  </span>
                )}
              </span>
              {line.description && (
                <span className="block text-xs text-[var(--text-muted)] truncate">
                  {line.description}
                </span>
              )}
            </span>
          </button>
          {s.kind !== "short" && (
            <button
              type="button"
              onClick={() =>
                set(line.accessory_id, {
                  kind: "short",
                  confirmed: Math.max(0, line.expected_quantity - 1),
                  issue: isOptional(line) ? "consumed" : "missing",
                  note: "",
                })
              }
              className="shrink-0 text-xs font-bold text-amber-600 hover:bg-amber-500/10 px-2.5 py-1.5 rounded-lg"
            >
              {isOptional(line) ? "Some used" : "Problem"}
            </button>
          )}
        </div>

        {s.kind === "short" && (
          <div className="px-3 pb-3 space-y-3 border-t border-amber-500/20 pt-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold text-[var(--text-muted)]">
                {isOptional(line)
                  ? "Came back"
                  : isCheckIn
                    ? "Received"
                    : "Sending"}
              </span>
              <div className="flex items-center rounded-lg border border-[var(--border-soft)] bg-[var(--bg-surface)]">
                <button
                  type="button"
                  onClick={() =>
                    set(line.accessory_id, {
                      ...s,
                      confirmed: Math.max(0, s.confirmed - 1),
                    })
                  }
                  className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)]"
                  aria-label="Fewer"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center text-sm font-black tabular-nums text-[var(--text-main)]">
                  {s.confirmed}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    set(
                      line.accessory_id,
                      s.confirmed + 1 >= line.expected_quantity
                        ? { kind: "ok" }
                        : { ...s, confirmed: s.confirmed + 1 },
                    )
                  }
                  className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)]"
                  aria-label="More"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <span className="text-xs text-[var(--text-muted)]">
                of {line.expected_quantity}
              </span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {isOptional(line) &&
                CONSUMABLE_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() =>
                      set(line.accessory_id, {
                        ...s,
                        note: s.note === reason ? "" : reason,
                      })
                    }
                    className={cn(
                      "text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors",
                      s.note === reason
                        ? "bg-amber-500 border-amber-500 text-white"
                        : "border-[var(--border-soft)] text-[var(--text-muted)] hover:text-[var(--text-main)]",
                    )}
                  >
                    {reason}
                  </button>
                ))}
              {!isOptional(line) &&
                ISSUES[prompt.stage].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      set(line.accessory_id, { ...s, issue: opt.value })
                    }
                    className={cn(
                      "text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors",
                      s.issue === opt.value
                        ? "bg-amber-500 border-amber-500 text-white"
                        : "border-[var(--border-soft)] text-[var(--text-muted)] hover:text-[var(--text-main)]",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
            </div>
            <input
              type="text"
              value={s.note}
              onChange={(e) =>
                set(line.accessory_id, { ...s, note: e.target.value })
              }
              placeholder={
                isOptional(line)
                  ? "Reason (optional), e.g. exhausted"
                  : "What happened? (optional)"
              }
              className="w-full text-sm bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-lg px-3 py-2 outline-none focus:border-brand-primary"
            />
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onBack}
          className="p-2 -ml-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-app)] hover:text-[var(--text-main)]"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-brand-primary">
            {isCheckIn ? "Check in" : "Check out"} · Kit
          </p>
          <h3 className="text-lg font-bold text-[var(--text-main)] leading-tight">
            {prompt.product_name}
            {prompt.quantity > 1 && (
              <span className="text-[var(--text-muted)]">
                {" "}
                × {prompt.quantity}
              </span>
            )}
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {[
              prompt.serial_number && `SN ${prompt.serial_number}`,
              // Where to collect it from (check out) or put it back (check in).
              prompt.stock_location && `Location: ${prompt.stock_location}`,
              prompt.booking_id && `Booking ${prompt.booking_id}`,
              prompt.client_name,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>

      {prompt.message && (
        <p className="text-sm text-[var(--text-muted)]">{prompt.message}</p>
      )}

      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold text-[var(--text-muted)] tabular-nums">
          {done} of {required.length} checked
        </span>
        {unset.length > 0 && (
          <button
            type="button"
            onClick={() =>
              setStates((prev) => {
                const next = { ...prev };
                unset.forEach((l) => (next[l.accessory_id] = { kind: "ok" }));
                return next;
              })
            }
            className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-2 rounded-lg transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            {done === 0 ? "All present" : "Rest present"}
          </button>
        )}
      </div>

      {accessoryLines.length > 0 && (
        <section className="space-y-2">
          {consumableLines.length > 0 && (
            <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
              Accessories
            </h4>
          )}
          <ul className="space-y-2">{accessoryLines.map(renderLine)}</ul>
        </section>
      )}

      {consumableLines.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
            {isCheckIn ? "Consumables · optional" : "Consumables"}
          </h4>
          <p className="text-xs text-[var(--text-muted)]">
            {isCheckIn
              ? "Tick what came back. Anything not returned is recorded as used, never as lost; add a reason if you like."
              : "Did you pack all the consumables? Tick each one, or report what's short."}
          </p>
          <ul className="space-y-2">{consumableLines.map(renderLine)}</ul>
        </section>
      )}

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Note for this handover (optional)"
        className="w-full text-sm bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl px-3 py-2 outline-none focus:border-brand-primary resize-none"
      />

      {isCheckIn && criticalLosses.length > 0 && (
        <div className="flex gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            <span className="font-bold">
              This return will be marked incomplete
            </span>{" "}
            because a critical part is missing or damaged (
            {criticalLosses.map((l) => l.name).join(", ")}). The item still goes
            back into stock.
          </p>
        </div>
      )}

      <button
        type="button"
        disabled={unset.length > 0}
        onClick={confirm}
        className="w-full h-14 bg-brand-primary text-brand-accent rounded-xl font-black text-sm uppercase tracking-widest hover:opacity-90 disabled:opacity-50 transition-opacity shadow-xl shadow-brand-primary/20"
      >
        {unset.length > 0
          ? `${unset.length} item${unset.length === 1 ? "" : "s"} left to check`
          : `Confirm ${isCheckIn ? "check in" : "check out"}`}
      </button>
    </div>
  );
}
