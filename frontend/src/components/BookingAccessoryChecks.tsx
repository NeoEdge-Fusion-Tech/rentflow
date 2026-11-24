import { useState } from "react";
import { AlertTriangle, CheckCircle2, ListChecks } from "lucide-react";
import { cn } from "@/src/utils";
import { HandoverCheckService } from "../api";
import type { HandoverCheck, HandoverIssue } from "../types";

const ISSUE_LABEL: Record<Exclude<HandoverIssue, "">, string> = {
  missing: "missing",
  damaged: "damaged",
  consumed: "used up",
  not_sent: "not sent",
};

interface Props {
  booking: any;
  /** Called after a flag is resolved so the booking can be reloaded. */
  onResolved: () => void;
}

/**
 * The accessory checklists recorded for a booking, per unit, with any
 * shortfalls and a way to resolve an incomplete return.
 */
export function BookingAccessoryChecks({ booking, onResolved }: Props) {
  const units: { label: string; checks: HandoverCheck[] }[] = [];
  for (const item of booking.items || []) {
    for (const unit of item.units || []) {
      if (unit.handover_checks?.length) {
        units.push({
          label: `${item.product_name}${
            unit.serial_number ? ` · ${unit.serial_number}` : ""
          }`,
          // Oldest first: check out, then check in.
          checks: [...unit.handover_checks].reverse(),
        });
      }
    }
  }
  if (units.length === 0) return null;

  return (
    <section className="space-y-3">
      <h4 className="flex items-center gap-2 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
        <ListChecks className="w-4 h-4" /> Accessory checks
      </h4>
      {units.map((u) => (
        <div
          key={u.label}
          className="p-4 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-soft)] space-y-3"
        >
          <p className="text-sm font-bold text-[var(--text-main)]">{u.label}</p>
          {u.checks.map((check) => (
            <CheckRow
              key={check.check_id}
              check={check}
              onResolved={onResolved}
            />
          ))}
        </div>
      ))}
    </section>
  );
}

function CheckRow({
  check,
  onResolved,
}: {
  check: HandoverCheck;
  onResolved: () => void;
  key?: number;
}) {
  const [resolving, setResolving] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = check.is_incomplete && !check.resolved_at;
  const shortLines = check.lines.filter((l) => l.issue);
  const when = new Date(check.performed_at).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const resolve = async () => {
    setSaving(true);
    setError(null);
    try {
      await HandoverCheckService.resolve(check.check_id, note.trim());
      setResolving(false);
      onResolved();
    } catch (err: any) {
      setError(err.response?.data?.error || "Could not resolve");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl border p-3 text-sm",
        open
          ? "border-rose-500/30 bg-rose-500/5"
          : check.has_issues
            ? "border-amber-500/30 bg-amber-500/5"
            : "border-[var(--border-soft)] bg-[var(--bg-app)]",
      )}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="font-bold text-[var(--text-main)]">
            {check.stage === "check_out" ? "Checked out" : "Checked in"}
            {check.quantity > 1 && ` × ${check.quantity}`}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {when}
            {check.performed_by_name && ` · ${check.performed_by_name}`}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
            open
              ? "bg-rose-500/10 text-rose-600"
              : check.has_issues
                ? check.resolved_at
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                : "bg-emerald-500/10 text-emerald-600",
          )}
        >
          {open ? (
            <>
              <AlertTriangle className="w-3 h-3" /> Incomplete
            </>
          ) : check.resolved_at ? (
            <>
              <CheckCircle2 className="w-3 h-3" /> Resolved
            </>
          ) : check.has_issues ? (
            "Flagged"
          ) : (
            <>
              <CheckCircle2 className="w-3 h-3" /> All present
            </>
          )}
        </span>
      </div>

      {shortLines.length > 0 && (
        <ul className="mt-2 space-y-1">
          {shortLines.map((l) => (
            <li key={l.line_id} className="text-xs text-[var(--text-main)]">
              <span className="font-bold">
                {l.confirmed_quantity} of {l.expected_quantity} × {l.name}
              </span>
              {l.is_critical && (
                <span className="ml-1 text-[9px] font-black uppercase text-rose-600">
                  critical
                </span>
              )}
              <span className="text-[var(--text-muted)]">
                {" "}
                — {l.shortfall}{" "}
                {ISSUE_LABEL[l.issue as Exclude<HandoverIssue, "">]}
                {l.note && `: ${l.note}`}
              </span>
            </li>
          ))}
        </ul>
      )}

      {check.note && (
        <p className="mt-2 text-xs text-[var(--text-muted)] italic">
          “{check.note}”
        </p>
      )}

      {check.resolved_at && (
        <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
          Resolved {new Date(check.resolved_at).toLocaleDateString()}
          {check.resolved_by_name && ` by ${check.resolved_by_name}`}:{" "}
          {check.resolution_note}
        </p>
      )}

      {open && !resolving && (
        <button
          type="button"
          onClick={() => setResolving(true)}
          className="mt-3 text-xs font-bold text-brand-primary hover:bg-brand-primary/5 px-2.5 py-1.5 rounded-lg"
        >
          Resolve…
        </button>
      )}
      {open && resolving && (
        <div className="mt-3 space-y-2">
          <input
            type="text"
            value={note}
            autoFocus
            onChange={(e) => setNote(e.target.value)}
            placeholder="How was it resolved? e.g. Bolt found, replaced, charged to client"
            className="w-full text-sm bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-lg px-3 py-2 outline-none focus:border-brand-primary"
          />
          {error && <p className="text-xs text-rose-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!note.trim() || saving}
              onClick={resolve}
              className="text-xs font-bold bg-brand-primary text-brand-accent px-3 py-2 rounded-lg disabled:opacity-50"
            >
              {saving ? "Saving…" : "Mark resolved"}
            </button>
            <button
              type="button"
              onClick={() => setResolving(false)}
              className="text-xs font-bold text-[var(--text-muted)] px-3 py-2 rounded-lg hover:bg-[var(--bg-app)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
