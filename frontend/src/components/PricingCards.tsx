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

  const monthlyCostForYear = premiumMonthly.price * 12;
  const yearlyCost = premiumYearly.price;
  const savePercent =
    monthlyCostForYear > 0
      ? Math.round(
          ((monthlyCostForYear - yearlyCost) / monthlyCostForYear) * 100,
        )
      : 0;

  return (
    <div className="w-full max-w-5xl mx-auto py-8 text-[var(--text-main)] transition-colors duration-300">
      {/* Toggle */}
      <div className="flex justify-center items-center mb-16">
        <div className="flex items-center gap-4 bg-[var(--bg-surface)] p-2 rounded-full border border-[var(--border-soft)] shadow-sm">
          <button
            onClick={() => setIsAnnual(false)}
            className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
              !isAnnual
                ? "bg-[var(--bg-app)] text-[var(--text-main)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setIsAnnual(true)}
            className={`px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${
              isAnnual
                ? "bg-[var(--bg-app)] text-[var(--text-main)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
            }`}
          >
            Annual
            <span
              className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                isAnnual
                  ? "bg-brand-primary text-brand-accent"
                  : "bg-brand-primary/20 text-brand-primary"
              }`}
            >
              Save {savePercent}%
            </span>
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        {/* Free Plan */}
        <div
          className={`relative bg-[var(--bg-surface)] rounded-[2rem] p-8 lg:p-10 border transition-all duration-300 shadow-lg flex flex-col ${
            isFreeCurrent
              ? "border-[var(--border-strong)] ring-2 ring-[var(--border-strong)]"
              : "border-[var(--border-soft)] hover:border-[var(--border-strong)]"
          }`}
        >
          <div className="mb-6">
            <h3 className="text-2xl font-semibold mb-2">Free Plan</h3>
            <p className="text-[var(--text-muted)] text-sm leading-relaxed">
              Perfect for getting started and exploring the platform.
            </p>
          </div>

          <div className="mb-8">
            <span className="text-5xl font-bold tracking-tight">₦0</span>
            <span className="text-[var(--text-muted)] ml-2 font-medium">
              /month
            </span>
          </div>

          <button
            onClick={onSwitchToFree}
            disabled={isUpgrading || isFreeCurrent}
            className={`w-full py-3.5 rounded-xl font-bold text-[15px] transition-all mb-8 ${
              isFreeCurrent
                ? "bg-[var(--bg-app)] text-[var(--text-muted)] border border-[var(--border-soft)] cursor-not-allowed"
                : "bg-[var(--text-main)] text-[var(--bg-app)] hover:opacity-90"
            }`}
          >
            {isFreeCurrent ? "Current Plan" : "Downgrade to Free"}
          </button>

          <ul className="space-y-4 mt-auto">
            {freePlan.features.map((feature, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-[var(--text-muted)] text-[15px]"
              >
                <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Premium Plan */}
        <div className="relative rounded-[2rem] p-[2px] transition-all duration-300 shadow-2xl group flex flex-col bg-gradient-to-b from-brand-primary via-brand-primary/20 to-transparent">
          <div className="absolute -top-4 right-8 bg-gradient-to-r from-pink-500 to-brand-primary text-white text-[11px] font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 uppercase tracking-wider">
            <Heart className="w-3 h-3 fill-current" /> Most Popular
          </div>

          <div className="relative bg-[var(--bg-surface)] rounded-[2rem] p-8 lg:p-10 h-full w-full flex flex-col">
            <div className="mb-6 mt-2">
              <h3 className="text-2xl font-semibold mb-2">Premium Plan</h3>
              <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                Maximum limits and every feature unlocked.
              </p>
            </div>

            <div className="mb-8 flex flex-col">
              <div className="flex items-baseline">
                <span className="text-5xl font-bold tracking-tight text-[var(--text-main)]">
                  ₦{activePremium.price.toLocaleString()}
                </span>
                <span className="text-[var(--text-muted)] ml-2 font-medium">
                  /{isAnnual ? "year" : "month"}
                </span>
              </div>
              {isAnnual && (
                <span className="text-sm font-medium text-emerald-500 mt-2 bg-emerald-500/10 w-fit px-3 py-1 rounded-full">
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
              className={`w-full py-3.5 rounded-xl font-bold text-[15px] transition-all mb-8 ${
                isPremiumCurrent &&
                currentPlan === activePremium.name.toLowerCase()
                  ? "bg-brand-primary/10 text-brand-primary cursor-not-allowed border border-brand-primary/20"
                  : "bg-gradient-to-r from-pink-500 to-brand-primary text-white hover:opacity-90 shadow-lg shadow-brand-primary/30"
              }`}
            >
              {isUpgrading
                ? "Redirecting..."
                : isPremiumCurrent &&
                    currentPlan === activePremium.name.toLowerCase()
                  ? "Current Plan"
                  : "Upgrade Now"}
            </button>

            <ul className="space-y-4 mt-auto">
              {activePremium.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-[15px]">
                  <Check className="w-5 h-5 text-brand-primary shrink-0" />
                  <span className="text-[var(--text-main)] font-medium">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
