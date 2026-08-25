import React, { useState } from "react";
import { Check, Heart } from "lucide-react";

export function PricingCards({
  onUpgrade,
  onSwitchToFree,
  isUpgrading,
  currentPlanName,
  subscriptionPlans,
}: {
  onUpgrade?: (planName: string) => void;
  onSwitchToFree?: () => void;
  isUpgrading?: boolean;
  currentPlanName?: string;
  subscriptionPlans?: any[];
}) {
  const [isAnnual, setIsAnnual] = useState(true);

  // Fallback to static dummy plans if subscriptionPlans not provided
  const dummyFreePlan = {
    name: "Free",
    price: 0,
    features: [
      "Invoicing (10/month)",
      "Inventory bookings (10/month)",
      "Basic Client Management",
      "Standard Support",
    ],
  };

  const dummyMonthlyPlan = {
    name: "Monthly Premium",
    price: 5000,
    features: [
      "Unlimited Invoicing",
      "Unlimited Inventory Bookings",
      "Client & Vendor Management",
      "Projects & Task Checklists",
      "Expense & Payment Tracking",
      "Dedicated Validation App",
      "Multi-Currency Support",
    ],
  };

  const dummyYearlyPlan = {
    name: "Yearly Premium",
    price: 50000,
    features: [
      "Unlimited Invoicing",
      "Unlimited Inventory Bookings",
      "Client & Vendor Management",
      "Projects & Task Checklists",
      "Expense & Payment Tracking",
      "Dedicated Validation App",
      "Multi-Currency Support",
    ],
  };

  let freePlan = dummyFreePlan;
  let premiumMonthly = dummyMonthlyPlan;
  let premiumYearly = dummyYearlyPlan;

  if (subscriptionPlans && subscriptionPlans.length > 0) {
    const f = subscriptionPlans.find((p) => p.name.toLowerCase() === "free");
    if (f) {
      freePlan = {
        name: f.name,
        price: f.price,
        features: [
          ...(f.has_invoice
            ? [
                `Invoicing (${
                  f.max_invoices_per_month === -1
                    ? "Unlimited"
                    : f.max_invoices_per_month
                }/month)`,
              ]
            : []),
          ...(f.has_booking
            ? [
                `Inventory bookings (${
                  f.max_inventory_booking_per_month === -1
                    ? "Unlimited"
                    : f.max_inventory_booking_per_month
                }/month)`,
              ]
            : []),
          "Basic Client Management",
          "Standard Support",
        ],
      };
    }

    const m = subscriptionPlans.find(
      (p) =>
        p.name.toLowerCase() !== "free" &&
        p.billing_cycle.toLowerCase() === "monthly",
    );
    if (m) {
      premiumMonthly = {
        name: m.name,
        price: m.price,
        features: [
          ...(m.has_invoice ? ["Unlimited Invoicing"] : []),
          ...(m.has_booking ? ["Unlimited Inventory Bookings"] : []),
          "Client & Vendor Management",
          "Projects & Task Checklists",
          "Expense & Payment Tracking",
          "Dedicated Validation App",
          "Multi-Currency Support",
        ],
      };
    }

    const y = subscriptionPlans.find(
      (p) =>
        p.name.toLowerCase() !== "free" &&
        p.billing_cycle.toLowerCase() === "yearly",
    );
    if (y) {
      premiumYearly = {
        name: y.name,
        price: y.price,
        features: [
          ...(y.has_invoice ? ["Unlimited Invoicing"] : []),
          ...(y.has_booking ? ["Unlimited Inventory Bookings"] : []),
          "Client & Vendor Management",
          "Projects & Task Checklists",
          "Expense & Payment Tracking",
          "Dedicated Validation App",
          "Multi-Currency Support",
        ],
      };
    }
  }

  const activePremium = isAnnual ? premiumYearly : premiumMonthly;

  const currentPlan = currentPlanName?.toLowerCase() || "free";
  const isFreeCurrent = currentPlan === "free";
  const isPremiumCurrent = currentPlan !== "free";

  return (
    <div className="w-full max-w-5xl mx-auto py-8 text-[var(--text-main)] transition-colors duration-300">
      {/* Toggle */}
      <div className="flex justify-center items-center mb-12">
        <div className="flex items-center gap-4">
          <span
            className={`text-sm font-medium transition-colors ${
              !isAnnual
                ? "text-[var(--text-main)] font-bold"
                : "text-[var(--text-muted)]"
            }`}
          >
            Monthly
          </span>
          <button
            onClick={() => setIsAnnual(!isAnnual)}
            className="w-14 h-8 bg-[var(--border-strong)] rounded-full relative flex items-center transition-colors shadow-inner"
          >
            <div
              className={`w-6 h-6 bg-brand-primary rounded-full absolute transition-transform duration-300 ${
                isAnnual ? "translate-x-7" : "translate-x-1"
              }`}
            ></div>
          </button>
          <span
            className={`text-sm font-medium flex items-center gap-2 transition-colors ${
              isAnnual
                ? "text-[var(--text-main)] font-bold"
                : "text-[var(--text-muted)]"
            }`}
          >
            Annual
            <span className="bg-brand-primary/20 text-brand-primary text-[10px] uppercase font-bold px-2 py-0.5 rounded-full">
              Save 20%
            </span>
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Free Plan */}
        <div
          className={`relative bg-[var(--bg-surface)] rounded-[2rem] p-8 lg:p-10 border transition-all duration-300 shadow-xl overflow-hidden ${
            isFreeCurrent
              ? "border-[var(--border-strong)]"
              : "border-[var(--border-soft)] hover:border-[var(--border-strong)]"
          }`}
        >
          <div className="mb-6">
            <h3 className="text-3xl font-serif tracking-tight mb-2">
              Free Plan
            </h3>
            <p className="text-[var(--text-muted)] text-sm">
              Perfect for getting started and exploring the platform.
            </p>
          </div>

          <div className="mb-8">
            <span className="text-4xl font-bold">₦{freePlan.price}</span>
            <span className="text-[var(--text-muted)] ml-1">/month</span>
          </div>

          <button
            onClick={onSwitchToFree}
            disabled={isUpgrading || isFreeCurrent}
            className={`w-full py-4 rounded-full font-bold text-lg transition-all ${
              isFreeCurrent
                ? "bg-[var(--bg-app)] text-[var(--text-muted)] border border-[var(--border-soft)] cursor-not-allowed"
                : "bg-white text-black hover:bg-gray-100 dark:bg-[var(--bg-app)] dark:text-white dark:hover:bg-[var(--border-subtle)] dark:border dark:border-[var(--border-soft)]"
            }`}
          >
            {isFreeCurrent ? "Current Plan" : "Downgrade to Free"}
          </button>

          <ul className="mt-10 space-y-4">
            {freePlan.features.map((feature, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-[var(--text-muted)] text-sm font-medium"
              >
                <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Premium Plan */}
        <div className="relative bg-[var(--bg-surface)] rounded-[2rem] p-[2px] transition-all duration-300 shadow-2xl group">
          {/* Animated Gradient Border */}
          <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-b from-brand-primary via-brand-primary/50 to-transparent opacity-80 group-hover:opacity-100 transition-opacity"></div>

          <div className="relative bg-[var(--bg-surface)] rounded-[2rem] p-8 lg:p-10 h-full w-full">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-3xl font-serif tracking-tight mb-2">
                  Premium Plan
                </h3>
                <p className="text-[var(--text-muted)] text-sm">
                  Maximum limits and every feature unlocked.
                </p>
              </div>
              <div className="flex items-center gap-1 bg-brand-primary text-brand-accent text-xs font-bold px-3 py-1.5 rounded-full shadow-lg shadow-brand-primary/30">
                <Heart className="w-3 h-3 fill-current" /> MOST POPULAR
              </div>
            </div>

            <div className="mb-8 flex flex-col">
              <div className="flex items-baseline">
                <span className="text-4xl font-bold text-brand-primary">
                  ₦{activePremium.price.toLocaleString()}
                </span>
                <span className="text-[var(--text-muted)] ml-1">
                  /{isAnnual ? "year" : "month"}
                </span>
              </div>
              {isAnnual && (
                <span className="text-sm font-medium text-[var(--text-muted)] mt-1">
                  Saves ₦
                  {(
                    premiumMonthly.price * 12 -
                    premiumYearly.price
                  ).toLocaleString()}{" "}
                  by billing yearly!
                </span>
              )}
            </div>

            <button
              onClick={() => onUpgrade?.(activePremium.name.toLowerCase())}
              disabled={
                isUpgrading ||
                (isPremiumCurrent &&
                  currentPlan === activePremium.name.toLowerCase())
              }
              className={`w-full py-4 rounded-full font-bold text-lg transition-all shadow-xl shadow-brand-primary/20 ${
                isPremiumCurrent &&
                currentPlan === activePremium.name.toLowerCase()
                  ? "bg-brand-primary/10 text-brand-primary cursor-not-allowed"
                  : "bg-brand-primary text-brand-accent hover:opacity-90 active:scale-[0.98]"
              }`}
            >
              {isUpgrading
                ? "Redirecting..."
                : isPremiumCurrent &&
                    currentPlan === activePremium.name.toLowerCase()
                  ? "Current Plan"
                  : "Upgrade"}
            </button>

            <ul className="mt-10 space-y-4">
              {activePremium.features.map((feature, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-sm font-medium"
                >
                  <Check className="w-5 h-5 text-brand-primary shrink-0 drop-shadow-sm" />
                  <span className="text-[var(--text-main)]">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
