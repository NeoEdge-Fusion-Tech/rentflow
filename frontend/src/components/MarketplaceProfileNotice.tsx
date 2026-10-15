import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";

/** Explains which company-profile fields block marketplace listing. */
export function MarketplaceProfileNotice({ missing }: { missing: string[] }) {
  if (missing.length === 0) return null;
  return (
    <div className="mt-2 flex items-start gap-2.5 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400">
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
      <p className="text-xs leading-relaxed">
        To list on the event marketplace, complete your company profile:{" "}
        <strong>{missing.join(", ")}</strong>.{" "}
        <Link
          to="/settings"
          className="font-bold underline underline-offset-2 hover:opacity-80"
        >
          Complete profile
        </Link>
      </p>
    </div>
  );
}
