import React, { useEffect, useState } from "react";
import { UserService } from "../../api";

export interface Plan {
  id: number;
  name: string;
  description?: string | null;
  price: string | number;
  billing_cycle: "monthly" | "yearly";
  max_invoices_per_month: number;
  max_inventory_booking_per_month: number;
  has_booking: boolean;
  has_invoice: boolean;
  is_free?: boolean;
  is_active: boolean;
}

export const formatNaira = (v: string | number) =>
  "₦" + Number(v || 0).toLocaleString("en-NG", { maximumFractionDigits: 0 });

const limit = (n: number) => (n === -1 ? "Unlimited" : String(n));

/** Active subscription plans from the API, split into free/monthly/yearly. */
export function usePlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    UserService.getSubscriptionPlans()
      .then((res) =>
        setPlans(
          ((res.data.results || res.data) as Plan[]).filter((p) => p.is_active),
        ),
      )
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const isFree = (p: Plan) =>
    p.is_free || p.name.toLowerCase() === "free" || Number(p.price) === 0;
  const free = plans.find(isFree);
  const monthly = plans.find(
    (p) => !isFree(p) && p.billing_cycle === "monthly",
  );
  const yearly = plans.find((p) => !isFree(p) && p.billing_cycle === "yearly");
  return { plans, free, monthly, yearly, loading };
}

/** Feature list for a plan, from its limits plus what every tier includes. */
export function planFeatures(p: Plan, premium: boolean): string[] {
  const out: string[] = [];
  if (p.has_invoice)
    out.push(
      p.max_invoices_per_month === -1
        ? "Unlimited invoicing"
        : `${p.max_invoices_per_month} invoices a month`,
    );
  if (p.has_booking)
    out.push(
      p.max_inventory_booking_per_month === -1
        ? "Unlimited inventory bookings"
        : `${p.max_inventory_booking_per_month} inventory bookings a month`,
    );
  if (premium) {
    out.push(
      "Client and vendor management",
      "Projects and task checklists",
      "Expense and payment tracking",
      "Multi-currency support",
    );
  } else {
    out.push("Basic client management", "Standard support");
  }
  return out;
}

/** "Free stays free…" FAQ answer, built from the live plans. */
export function premiumAnswer({
  free,
  monthly,
  yearly,
}: ReturnType<typeof usePlans>): React.ReactNode {
  const freeLimits = free
    ? `${limit(free.max_invoices_per_month)} invoices and ${limit(
        free.max_inventory_booking_per_month,
      )} bookings a month`
    : "a monthly allowance of invoices and bookings";
  const prices = [
    monthly && `${formatNaira(monthly.price)} a month`,
    yearly && `${formatNaira(yearly.price)} a year`,
  ]
    .filter(Boolean)
    .join(" or ");
  return `Free stays free, with ${freeLimits}. When you need more, Premium is ${
    prices || "available"
  }, with unlimited invoices and bookings, plus projects, checklists, expense tracking and multi-currency.`;
}

const Arrow = ({ stroke }: { stroke: string }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke={stroke}
    strokeWidth="2.4"
    aria-hidden="true"
  >
    <path d="M7 17L17 7M9 7h8v8"></path>
  </svg>
);

/**
 * Free and Premium cards driven by the subscription plans. The caller owns
 * what the buttons do (sign up when signed out, upgrade when signed in).
 */
export function PricingPlans({
  data,
  onChooseFree,
  onChoosePremium,
  isUpgrading,
  currentPlanName,
}: {
  data: ReturnType<typeof usePlans>;
  onChooseFree: () => void;
  onChoosePremium: (plan: Plan) => void;
  isUpgrading?: boolean;
  currentPlanName?: string;
}) {
  const { free, monthly, yearly, loading } = data;
  const [annual, setAnnual] = useState(false);
  const premium = (annual ? yearly : monthly) || monthly || yearly;
  const saving =
    monthly && yearly ? Number(monthly.price) * 12 - Number(yearly.price) : 0;
  const isCurrent = (p?: Plan) =>
    !!p &&
    !!currentPlanName &&
    p.name.toLowerCase() === currentPlanName.toLowerCase();

  return (
    <section className="ne-sec" id="pricing" style={{ padding: "110px 0 0" }}>
      <div className="ne-wrap">
        <div
          className="ne-reveal"
          style={{ textAlign: "center", maxWidth: "720px", margin: "0 auto" }}
        >
          <span className="ne-pill">Pricing</span>
          <h1 className="ne-h2" style={{ marginTop: "22px", color: "#07294C" }}>
            Start free.{" "}
            <span
              className="ne-serif"
              style={{ boxShadow: "inset 0 -0.26em 0 #FFC17D" }}
            >
              Upgrade when you're busy.
            </span>
          </h1>
          <p style={{ fontSize: "17px", color: "#66717C", margin: "18px 0 0" }}>
            Run your first jobs on the free plan.
            {free && monthly && (
              <>
                {" "}
                When you outgrow {limit(free.max_invoices_per_month)} invoices
                and {limit(free.max_inventory_booking_per_month)} bookings a
                month, Premium is {formatNaira(monthly.price)} a month.
              </>
            )}
          </p>
          {monthly && yearly && (
            <div className="ne-seg" role="group" aria-label="Billing period">
              <button
                type="button"
                className={annual ? "" : "on"}
                aria-pressed={!annual}
                onClick={() => setAnnual(false)}
              >
                Monthly
              </button>
              <button
                type="button"
                className={annual ? "on" : ""}
                aria-pressed={annual}
                onClick={() => setAnnual(true)}
              >
                Yearly
                {saving > 0 && (
                  <span className="ne-seg-save">
                    Save {formatNaira(saving)}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <p
            style={{ textAlign: "center", color: "#66717C", marginTop: "44px" }}
          >
            Loading plans…
          </p>
        ) : !free && !premium ? (
          <p
            style={{ textAlign: "center", color: "#66717C", marginTop: "44px" }}
          >
            Plans are unavailable right now. Email{" "}
            <a href="mailto:info@neoedgefusion.com" style={{ fontWeight: 800 }}>
              info@neoedgefusion.com
            </a>
            .
          </p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "16px",
              marginTop: "36px",
              maxWidth: "860px",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            {free && (
              <div
                className="ne-card ne-reveal ne-plan"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid rgba(7,41,76,.1)",
                  padding: "34px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <span className="ne-pill" style={{ alignSelf: "flex-start" }}>
                  {free.name}
                </span>
                <p
                  style={{
                    fontSize: "15px",
                    color: "#66717C",
                    margin: "14px 0 0",
                  }}
                >
                  {free.description ||
                    "For getting started and running your first jobs"}
                </p>
                <div style={{ marginTop: "20px" }}>
                  <span
                    className="ne-price"
                    style={{
                      fontSize: "44px",
                      fontWeight: 800,
                      letterSpacing: "-0.05em",
                      color: "#07294C",
                    }}
                  >
                    {formatNaira(free.price)}
                  </span>
                  <span style={{ fontSize: "15px", color: "#66717C" }}>
                    {" "}
                    / month
                  </span>
                </div>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: "24px 0 0",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    fontSize: "15px",
                    flex: 1,
                    color: "#07294C",
                  }}
                >
                  {planFeatures(free, false).map((f) => (
                    <li key={f} style={{ display: "flex", gap: "10px" }}>
                      <span>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="ne-btn ne-btn-paper"
                  onClick={onChooseFree}
                  disabled={isCurrent(free)}
                  style={{
                    marginTop: "28px",
                    justifyContent: "center",
                    cursor: "pointer",
                    font: "inherit",
                    fontWeight: 800,
                  }}
                >
                  {isCurrent(free) ? "Current plan" : "Start for free"}
                </button>
              </div>
            )}
            {premium && (
              <div
                className="ne-card ne-reveal ne-plan"
                style={{
                  background: "#07294C",
                  color: "#FFFFFF",
                  padding: "34px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  <span
                    className="ne-pill"
                    style={{
                      background: "rgba(255,255,255,.1)",
                      color: "#FFFFFF",
                      borderColor: "rgba(255,255,255,.2)",
                    }}
                  >
                    Premium
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 800,
                      background: "#FFC17D",
                      color: "#07294C",
                      padding: "5px 12px",
                      borderRadius: "999px",
                    }}
                  >
                    Most popular
                  </span>
                </div>
                <p
                  style={{
                    fontSize: "15px",
                    color: "rgba(255,255,255,.72)",
                    margin: "14px 0 0",
                  }}
                >
                  {premium.description || "No limits, every feature unlocked"}
                </p>
                <div style={{ marginTop: "20px" }}>
                  <span
                    className="ne-price"
                    style={{
                      fontSize: "44px",
                      fontWeight: 800,
                      letterSpacing: "-0.05em",
                      color: "#FFC17D",
                    }}
                  >
                    {formatNaira(premium.price)}
                  </span>
                  <span
                    style={{ fontSize: "15px", color: "rgba(255,255,255,.72)" }}
                  >
                    {" "}
                    / {premium.billing_cycle === "yearly" ? "year" : "month"}
                  </span>
                </div>
                {premium === monthly && yearly && (
                  <p
                    style={{
                      fontSize: "14px",
                      color: "rgba(255,255,255,.72)",
                      margin: "6px 0 0",
                    }}
                  >
                    or {formatNaira(yearly.price)} a year
                    {saving > 0 && `, and save ${formatNaira(saving)}`}
                  </p>
                )}
                {premium === yearly && monthly && (
                  <p
                    style={{
                      fontSize: "14px",
                      color: "rgba(255,255,255,.72)",
                      margin: "6px 0 0",
                    }}
                  >
                    {formatNaira(Number(yearly.price) / 12)} a month, billed
                    yearly
                  </p>
                )}
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: "22px 0 0",
                    display: "flex",
                    flexDirection: "column",
                    gap: "12px",
                    fontSize: "15px",
                    flex: 1,
                  }}
                >
                  {planFeatures(premium, true).map((f) => (
                    <li key={f} style={{ display: "flex", gap: "10px" }}>
                      <span style={{ color: "#FFC17D" }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  className="ne-btn ne-btn-peach"
                  onClick={() => onChoosePremium(premium)}
                  disabled={isUpgrading || isCurrent(premium)}
                  style={{
                    marginTop: "28px",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    border: 0,
                    font: "inherit",
                    fontWeight: 800,
                  }}
                >
                  {isCurrent(premium)
                    ? "Current plan"
                    : isUpgrading
                      ? "Redirecting…"
                      : currentPlanName
                        ? `Upgrade to ${premium.name}`
                        : "Start free, upgrade anytime"}
                  <span className="ne-arrow" style={{ background: "#07294C" }}>
                    <Arrow stroke="#FFC17D" />
                  </span>
                </button>
              </div>
            )}
          </div>
        )}
        <div
          className="ne-reveal"
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "12px 28px",
            marginTop: "26px",
            fontSize: "14px",
            fontWeight: 600,
            color: "#4A5663",
          }}
        >
          <span>✓ Upgrade or downgrade anytime</span>
          <span>✓ Cancel anytime</span>
          <span>✓ No card needed</span>
          <span>✓ Your data stays yours</span>
        </div>
      </div>
    </section>
  );
}
