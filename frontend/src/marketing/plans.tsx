import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthService, PaymentService, UserService } from "../api";
import { useNotification } from "../context/NotificationContext";

/*
 * Live subscription plans for the website. Every price and free-plan limit
 * on the marketing pages comes from here, never from the copy.
 */

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

interface Plans {
  free?: Plan;
  monthly?: Plan;
  yearly?: Plan;
  loading: boolean;
}

export const formatNaira = (v: string | number) =>
  "₦" + Number(v || 0).toLocaleString("en-NG", { maximumFractionDigits: 0 });

const limit = (n?: number) =>
  n == null ? "…" : n === -1 ? "Unlimited" : String(n);

// One request per visit, shared by every page and component.
let cache: Promise<Plan[]> | null = null;
const fetchPlans = () =>
  (cache ??= UserService.getSubscriptionPlans()
    .then((res) =>
      ((res.data.results || res.data) as Plan[]).filter((p) => p.is_active),
    )
    .catch((e) => {
      console.error("Failed to load plans", e);
      cache = null;
      return [];
    }));

export function usePlans(): Plans {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  useEffect(() => {
    let live = true;
    fetchPlans().then((p) => live && setPlans(p));
    return () => {
      live = false;
    };
  }, []);
  const list = plans || [];
  const isFree = (p: Plan) =>
    p.is_free || p.name.toLowerCase() === "free" || Number(p.price) === 0;
  return {
    free: list.find(isFree),
    monthly: list.find((p) => !isFree(p) && p.billing_cycle === "monthly"),
    yearly: list.find((p) => !isFree(p) && p.billing_cycle === "yearly"),
    loading: plans === null,
  };
}

/** A plan price inside running copy, e.g. "Premium is ₦5,000 a month". */
export function PlanPrice({ cycle }: { cycle: "free" | "monthly" | "yearly" }) {
  const plans = usePlans();
  const p = plans[cycle];
  return <>{p ? formatNaira(p.price) : plans.loading ? "₦…" : "—"}</>;
}

/** What a year of Premium saves over twelve monthly payments. */
export function PlanSaving() {
  const { monthly, yearly, loading } = usePlans();
  if (!monthly || !yearly) return <>{loading ? "₦…" : "—"}</>;
  return (
    <>
      {formatNaira(
        Math.max(Number(monthly.price) * 12 - Number(yearly.price), 0),
      )}
    </>
  );
}

/** The free plan's monthly allowance of invoices or bookings. */
export function FreeLimit({ kind }: { kind: "invoices" | "bookings" }) {
  const { free } = usePlans();
  return (
    <>
      {limit(
        kind === "invoices"
          ? free?.max_invoices_per_month
          : free?.max_inventory_booking_per_month,
      )}
    </>
  );
}

function planFeatures(p: Plan, premium: boolean): string[] {
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
  return premium
    ? [
        ...out,
        "Client and vendor management",
        "Projects and task checklists",
        "Expense and payment tracking",
        "Multi-currency support",
      ]
    : [...out, "Basic client management", "Standard support"];
}

const Arrow = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#FFC17D"
    strokeWidth="2.4"
    aria-hidden="true"
  >
    <path d="M7 17L17 7M9 7h8v8"></path>
  </svg>
);

/**
 * Free and Premium cards from the live plans, keeping the old /pricing
 * flow: signed out goes to sign-up, signed in starts the Paystack upgrade.
 */
export function PricingCards() {
  const { free, monthly, yearly, loading } = usePlans();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [annual, setAnnual] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string>("");
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");

  useEffect(() => {
    if (!token) return;
    AuthService.getMe()
      .then((res) => setCurrentPlan(res.data?.subscription_plan || ""))
      .catch(console.error);
  }, [token]);

  const premium = (annual ? yearly : monthly) || monthly || yearly;
  const saving =
    monthly && yearly ? Number(monthly.price) * 12 - Number(yearly.price) : 0;
  const isCurrent = (p?: Plan) =>
    !!p && !!currentPlan && p.name.toLowerCase() === currentPlan.toLowerCase();

  const upgrade = async (plan: Plan) => {
    if (!token) {
      navigate("/register");
      return;
    }
    try {
      setIsUpgrading(true);
      // Same endpoint the Settings billing tab uses.
      const res = await PaymentService.createSubscriptionLink(plan.name);
      if (res.data.payment_url) {
        window.location.href = res.data.payment_url;
      } else {
        showNotification("Plan updated successfully", "success");
        navigate("/settings?tab=billing");
      }
    } catch (e: any) {
      console.error(e);
      showNotification(
        e.response?.data?.error || "Failed to initialize subscription.",
        "error",
      );
    } finally {
      setIsUpgrading(false);
    }
  };

  const chooseFree = () => {
    if (!token) {
      navigate("/register");
      return;
    }
    showNotification(
      "To cancel your plan, please contact support at support@neoedge.com or downgrade from your workspace settings.",
      "info",
    );
  };

  if (loading) return <p className="mk-plans-note">Loading plans…</p>;
  if (!free && !premium)
    return (
      <p className="mk-plans-note">
        Plans are unavailable right now. Email{" "}
        <a href="mailto:info@neoedgefusion.com" style={{ fontWeight: 800 }}>
          info@neoedgefusion.com
        </a>
        .
      </p>
    );

  return (
    <div>
      {monthly && yearly && (
        <div style={{ textAlign: "center", marginTop: "36px" }}>
          <div className="mk-seg" role="group" aria-label="Billing period">
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
                <span className="mk-seg-save">Save {formatNaira(saving)}</span>
              )}
            </button>
          </div>
        </div>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "16px",
          marginTop: "28px",
          maxWidth: "860px",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        {free && (
          <div
            className="ne-card ne-reveal"
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
              style={{ fontSize: "15px", color: "#66717C", margin: "14px 0 0" }}
            >
              {free.description ||
                "For getting started and running your first jobs"}
            </p>
            <div style={{ marginTop: "20px" }}>
              <span
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
              className="ne-btn ne-btn-paper mk-btn"
              onClick={chooseFree}
              disabled={isCurrent(free)}
              style={{ marginTop: "28px", justifyContent: "center" }}
            >
              {isCurrent(free) ? "Current plan" : "Start for free"}
            </button>
          </div>
        )}
        {premium && (
          <div
            className="ne-card ne-reveal"
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
                {formatNaira(Number(yearly.price) / 12)} a month, billed yearly
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
              className="ne-btn ne-btn-peach mk-btn"
              onClick={() => upgrade(premium)}
              disabled={isUpgrading || isCurrent(premium)}
              style={{ marginTop: "28px", justifyContent: "space-between" }}
            >
              {isCurrent(premium)
                ? "Current plan"
                : isUpgrading
                  ? "Redirecting…"
                  : token
                    ? `Upgrade to ${premium.name}`
                    : "Start free, upgrade anytime"}
              <span className="ne-arrow" style={{ background: "#07294C" }}>
                <Arrow />
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
