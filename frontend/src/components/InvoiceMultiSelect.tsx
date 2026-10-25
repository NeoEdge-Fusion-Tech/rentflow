import React, { useState } from "react";
import { Check, Search } from "lucide-react";

interface Props {
  invoices: any[];
  value: string[]; // selected invoice ids, as strings
  onChange: (ids: string[]) => void;
}

const money = (inv: any) =>
  `${inv.currency_symbol || ""}${Number(inv.total_amount || 0).toLocaleString(
    undefined,
    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  )}`;

const date = (d?: string) =>
  d
    ? new Date(d).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

/**
 * Pick invoices to link to a project. Each row shows the number + title on
 * the first line and client · issue date · amount on the second, with a
 * search box for long lists. Selected invoices are listed first.
 */
export function InvoiceMultiSelect({ invoices, value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const clientOf = (inv: any) =>
    inv.client_details?.business_name || inv.client_name || "";

  const rows = invoices
    .filter(
      (inv) =>
        !q ||
        [inv.invoice_number, inv.title, clientOf(inv)]
          .filter(Boolean)
          .some((s: string) => String(s).toLowerCase().includes(q)),
    )
    .sort(
      (a, b) =>
        Number(value.includes(String(b.invoice_id))) -
        Number(value.includes(String(a.invoice_id))),
    );

  const toggle = (id: string) =>
    onChange(
      value.includes(id) ? value.filter((v) => v !== id) : [...value, id],
    );

  return (
    <div className="bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl overflow-hidden">
      {invoices.length > 5 && (
        <div className="relative border-b border-[var(--border-soft)]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by number, title or client…"
            className="w-full pl-9 pr-3 py-2.5 bg-transparent text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] outline-none"
          />
        </div>
      )}
      <div className="max-h-[220px] overflow-y-auto divide-y divide-[var(--border-soft)]">
        {invoices.length === 0 ? (
          <p className="px-4 py-3 text-sm text-[var(--text-muted)] italic">
            No invoices available
          </p>
        ) : rows.length === 0 ? (
          <p className="px-4 py-3 text-sm text-[var(--text-muted)]">
            No invoices match “{query}”.
          </p>
        ) : (
          rows.map((inv) => {
            const id = String(inv.invoice_id);
            const checked = value.includes(id);
            const meta = [clientOf(inv), date(inv.issue_date), money(inv)]
              .filter(Boolean)
              .join(" · ");
            return (
              <label
                key={id}
                className={`flex items-start gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                  checked
                    ? "bg-brand-primary/5"
                    : "hover:bg-[var(--bg-surface)]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(id)}
                  className="sr-only"
                />
                <span
                  className={`w-5 h-5 mt-0.5 shrink-0 rounded-md border-2 flex items-center justify-center transition-colors ${
                    checked
                      ? "bg-brand-primary border-brand-primary"
                      : "border-[var(--border-soft)]"
                  }`}
                >
                  {checked && <Check className="w-3 h-3 text-white" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2 min-w-0">
                    <span className="text-sm font-bold text-[var(--text-main)] shrink-0">
                      {inv.invoice_number}
                    </span>
                    {inv.title && inv.title !== "Invoice" && (
                      <span className="text-sm text-[var(--text-main)] truncate">
                        {inv.title}
                      </span>
                    )}
                    {inv.status && (
                      <span className="ml-auto shrink-0 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                        {String(inv.status).replace("_", " ")}
                      </span>
                    )}
                  </span>
                  <span
                    className="block text-xs text-[var(--text-muted)] truncate"
                    style={{ fontFamily: "'Noto Sans', sans-serif" }}
                  >
                    {meta}
                  </span>
                </span>
              </label>
            );
          })
        )}
      </div>
      {value.length > 0 && (
        <p className="px-4 py-2 border-t border-[var(--border-soft)] text-xs text-[var(--text-muted)]">
          {value.length} invoice{value.length === 1 ? "" : "s"} selected
        </p>
      )}
    </div>
  );
}
