import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Clock, X } from "lucide-react";

interface SubscriptionState {
  plan_name: string;
  status: string;
  current_period_end: string | null;
  days_left: number | null;
  expired: boolean;
}

const WARN_DAYS = 3;
const DISMISS_KEY = "subscriptionBannerDismissed";

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Shown across the app when the organization's paid plan has expired, or is
 * about to. Dismissible for the current browser session only.
 */
export function SubscriptionBanner({
  state,
  canManage,
}: {
  state: SubscriptionState | null | undefined;
  canManage: boolean;
}) {
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === state?.current_period_end;
    } catch {
      return false;
    }
  });

  if (!state || dismissed || !state.current_period_end) return null;
  const expiringSoon =
    !state.expired && state.days_left !== null && state.days_left <= WARN_DAYS;
  if (!state.expired && !expiringSoon) return null;

  const plan = titleCase(state.plan_name || "paid");
  const date = new Date(state.current_period_end).toLocaleDateString(
    undefined,
    { day: "numeric", month: "short", year: "numeric" },
  );
  const message = state.expired
    ? `Your ${plan} plan expired on ${date}. You're now on the Free plan's limits.`
    : `Your ${plan} plan ends on ${date} (${
        state.days_left === 0
          ? "today"
          : `in ${state.days_left} day${state.days_left === 1 ? "" : "s"}`
      }).`;

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, state.current_period_end || "");
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      role="alert"
      className={`mb-6 flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl border ${
        state.expired
          ? "bg-rose-500/10 border-rose-500/30 text-rose-600"
          : "bg-amber-500/10 border-amber-500/30 text-amber-600"
      }`}
    >
      <div className="flex items-start gap-3 flex-1">
        {state.expired ? (
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
        ) : (
          <Clock className="w-5 h-5 shrink-0 mt-0.5" />
        )}
        <p className="text-sm font-medium">
          {message}
          {!canManage && " Ask your organization admin to renew."}
        </p>
      </div>
      <div className="flex items-center gap-2 self-end sm:self-auto">
        {canManage && (
          <button
            onClick={() => navigate("/settings?tab=billing")}
            className="px-4 py-2 rounded-xl bg-brand-primary text-white text-sm font-bold hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            {state.expired ? "Renew plan" : "Renew now"}
          </button>
        )}
        <button
          onClick={dismiss}
          title="Dismiss"
          className="p-2 rounded-lg hover:bg-black/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
