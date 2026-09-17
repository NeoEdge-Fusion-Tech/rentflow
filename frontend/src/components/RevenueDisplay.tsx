import React from "react";
import { Eye, EyeOff } from "lucide-react";
import { useVisibility } from "../context/VisibilityContext";

interface RevenueDisplayProps {
  amount: string | number;
  className?: string;
  iconClassName?: string;
}

// Currency symbols like the Naira sign (₦) are drawn full-width in most fonts,
// so at bold/tight tracking they visually collide with the digit right after
// them (worst with "0", since its round shape sits closest to the symbol's
// strokes). Split off a leading symbol and give it a little breathing room.
function formatAmount(amount: string | number) {
  if (typeof amount !== "string") return amount;
  const match = amount.match(/^([^\d\s]+)(\s*)(.*)$/);
  if (!match) return amount;
  const [, symbol, , rest] = match;
  return (
    <>
      <span style={{ marginRight: "0.15em" }}>{symbol}</span>
      {rest}
    </>
  );
}

export function RevenueDisplay({
  amount,
  className = "",
  iconClassName = "w-4 h-4",
}: RevenueDisplayProps) {
  const { isRevenueHidden, toggleRevenueVisibility } = useVisibility();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Most fonts (including this app's default) render a mismatched glyph for
          the Naira sign (₦) that visually collides with the digits after it.
          Noto Sans has correct, well-spaced coverage for it. */}
      <span style={{ fontFamily: "'Noto Sans', sans-serif" }}>
        {isRevenueHidden ? "****" : formatAmount(amount)}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleRevenueVisibility();
        }}
        className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors focus:outline-none"
        title={isRevenueHidden ? "Show Revenue" : "Hide Revenue"}
      >
        {isRevenueHidden ? (
          <EyeOff className={iconClassName} />
        ) : (
          <Eye className={iconClassName} />
        )}
      </button>
    </div>
  );
}
