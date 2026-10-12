import React from "react";
import { Check } from "lucide-react";

// Shared by the event marketplace and each organization's storefront.

export const priceOf = (p: any): number | null =>
  p.min_rental_price != null ? Number(p.min_rental_price) : null;

export const formatPrice = (
  p: any,
  amount: number | string | null | undefined,
) => {
  if (amount == null || Number(amount) === 0) return "Price on request";
  const symbol = p.currency_symbol || "";
  return `${symbol}${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

export function FilterCheckbox({
  checked,
  disabled,
  onChange,
  label,
  count,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  count?: number;
}) {
  return (
    <label
      className={`flex items-center gap-3 group ${
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span
        className={`w-5 h-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-colors ${
          checked
            ? "bg-brand-primary border-brand-primary"
            : "border-[var(--border-soft)] group-hover:border-brand-primary/60"
        }`}
      >
        {checked && <Check className="w-3 h-3 text-white" />}
      </span>
      <span
        className={`flex-1 text-sm font-medium transition-colors ${
          checked
            ? "text-[var(--text-main)]"
            : "text-[var(--text-muted)] group-hover:text-[var(--text-main)]"
        }`}
      >
        {label}
      </span>
      {count !== undefined && (
        <span className="text-xs text-[var(--text-muted)] tabular-nums">
          {count}
        </span>
      )}
    </label>
  );
}

export const toggleIn = (list: string[], value: string, on: boolean) =>
  on ? [...list, value] : list.filter((v) => v !== value);
