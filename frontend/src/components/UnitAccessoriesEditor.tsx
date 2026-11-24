import { ListChecks, Plus, Trash2 } from "lucide-react";
import { cn } from "@/src/utils";
import type { UnitAccessory } from "../types";

interface Props {
  accessories: UnitAccessory[];
  onChange: (next: UnitAccessory[]) => void;
  unitType: "single" | "bulk" | string;
  /** Other units in the same form, offered as kits to copy from. */
  copySources?: { label: string; accessories: UnitAccessory[] }[];
}

const blank = (): UnitAccessory => ({
  kind: "accessory",
  name: "",
  quantity: 1,
  description: "",
  is_critical: false,
});

/** Small toggle chip used for the Consumable / Critical flags. */
function Flag({
  checked,
  onChange,
  label,
  title,
  tone,
  className,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  title: string;
  tone: "amber" | "rose";
  className?: string;
}) {
  const on =
    tone === "amber"
      ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
      : "bg-rose-500/10 text-rose-600 border-rose-500/20";
  return (
    <label
      title={title}
      className={cn(
        "flex items-center gap-1.5 text-[11px] font-bold rounded-lg px-2 py-2 cursor-pointer select-none border transition-colors",
        checked
          ? on
          : "text-[var(--text-muted)] border-[var(--border-soft)] hover:bg-[var(--bg-surface)]",
        className,
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={tone === "amber" ? "accent-amber-600" : "accent-rose-600"}
      />
      {label}
    </label>
  );
}

/**
 * Parts that travel with a unit (bolts, batteries, cables...). They are
 * ticked off when the unit is checked out and checked in. Tick
 * "Consumable" for things that get used up (batteries, tape): they must be
 * packed at check out, but needn't come back.
 */
export function UnitAccessoriesEditor({
  accessories,
  onChange,
  unitType,
  copySources = [],
}: Props) {
  const update = (i: number, patch: Partial<UnitAccessory>) =>
    onChange(accessories.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));

  const sources = copySources.filter((s) => s.accessories.length > 0);

  const flags = (acc: UnitAccessory, i: number, className?: string) => (
    <>
      <Flag
        checked={acc.kind === "consumable"}
        onChange={(v) =>
          update(i, {
            kind: v ? "consumable" : "accessory",
            // A used-up item can't make a return incomplete.
            ...(v ? { is_critical: false } : {}),
          })
        }
        label="Consumable"
        title="Gets used up (batteries, tape, cable ties). Must be packed at check out; optional at check in."
        tone="amber"
        className={className}
      />
      {acc.kind !== "consumable" && (
        <Flag
          checked={acc.is_critical}
          onChange={(v) => update(i, { is_critical: v })}
          label="Critical"
          title="The unit can't work without it. Missing at check in marks the return incomplete."
          tone="rose"
          className={className}
        />
      )}
    </>
  );

  return (
    <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--bg-app)]/50 p-3 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
            <ListChecks className="w-3.5 h-3.5" /> Accessories / kit
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Parts that go out with this {unitType === "bulk" ? "batch" : "unit"}
            , ticked off at check out and check in. Tick{" "}
            <span className="font-bold">Consumable</span> for things that get
            used up, e.g. batteries, gaffer tape, cable ties.
            {unitType === "bulk" && " Quantities are per item."}
          </p>
        </div>
        {accessories.length === 0 && sources.length > 0 && (
          <select
            value=""
            onChange={(e) => {
              const src = sources[Number(e.target.value)];
              if (src)
                // Copies are new rows: drop ids from the other unit.
                onChange(
                  src.accessories.map(({ accessory_id, ...rest }) => ({
                    ...rest,
                  })),
                );
            }}
            className="text-xs font-bold bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-lg px-2 py-1.5 outline-none focus:border-brand-primary"
            aria-label="Copy accessories from another unit"
          >
            <option value="">Copy from…</option>
            {sources.map((s, idx) => (
              <option key={idx} value={idx}>
                {s.label} ({s.accessories.length})
              </option>
            ))}
          </select>
        )}
      </div>

      {accessories.length > 0 && (
        <ul className="space-y-2">
          {accessories.map((acc, i) => (
            <li
              key={acc.accessory_id ?? `new-${i}`}
              className="grid grid-cols-[1fr_4.5rem_auto] sm:grid-cols-[1fr_4.5rem_1.2fr_auto_auto] gap-2 items-center"
            >
              <input
                type="text"
                value={acc.name}
                onChange={(e) => update(i, { name: e.target.value })}
                placeholder="Name, e.g. Bolt or AA battery"
                aria-label="Accessory name"
                className="min-w-0 text-sm bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-lg px-3 py-2 outline-none focus:border-brand-primary"
              />
              <input
                type="number"
                min={1}
                value={acc.quantity}
                onChange={(e) =>
                  update(i, {
                    quantity: Math.max(1, parseInt(e.target.value) || 1),
                  })
                }
                aria-label="Quantity"
                className="text-sm font-bold bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-lg px-2 py-2 outline-none focus:border-brand-primary text-center"
              />
              <input
                type="text"
                value={acc.description || ""}
                onChange={(e) => update(i, { description: e.target.value })}
                placeholder="Description (optional)"
                aria-label="Description"
                className="hidden sm:block min-w-0 text-sm bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-lg px-3 py-2 outline-none focus:border-brand-primary"
              />
              <div className="hidden sm:flex gap-1.5">{flags(acc, i)}</div>
              <button
                type="button"
                onClick={() =>
                  onChange(accessories.filter((_, idx) => idx !== i))
                }
                className="p-2 text-[var(--text-muted)] hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors"
                aria-label={`Remove ${acc.name || "accessory"}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
              {/* Phone layout: description + flags on their own row */}
              <div className="col-span-3 flex gap-2 flex-wrap sm:hidden">
                <input
                  type="text"
                  value={acc.description || ""}
                  onChange={(e) => update(i, { description: e.target.value })}
                  placeholder="Description (optional)"
                  aria-label="Description"
                  className="flex-1 min-w-[10rem] text-sm bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-lg px-3 py-2 outline-none focus:border-brand-primary"
                />
                {flags(acc, i)}
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => onChange([...accessories, blank()])}
        className="flex items-center gap-1.5 text-xs font-bold text-brand-primary hover:bg-brand-primary/5 px-2.5 py-1.5 rounded-lg transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> Add accessory
      </button>
    </div>
  );
}
