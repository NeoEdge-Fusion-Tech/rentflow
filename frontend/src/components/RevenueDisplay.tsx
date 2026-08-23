import React from "react";
import { Eye, EyeOff } from "lucide-react";
import { useVisibility } from "../context/VisibilityContext";

interface RevenueDisplayProps {
  amount: string | number;
  className?: string;
  iconClassName?: string;
}

export function RevenueDisplay({
  amount,
  className = "",
  iconClassName = "w-4 h-4",
}: RevenueDisplayProps) {
  const { isRevenueHidden, toggleRevenueVisibility } = useVisibility();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span>{isRevenueHidden ? "****" : amount}</span>
      <button
        onClick={toggleRevenueVisibility}
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
