import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthService, PaymentService } from "../api";
import { useNotification } from "../context/NotificationContext";
import { MarketingLayout } from "../components/marketing/MarketingLayout";
import { Faq, FinalCta } from "../components/marketing/sections";
import {
  Plan,
  PricingPlans,
  premiumAnswer,
  usePlans,
} from "../components/marketing/plans";

/**
 * Public pricing page. Plans come from the API; signed-out visitors are
 * sent to sign up, signed-in users go through the Paystack upgrade.
 */
export function Pricing() {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const plans = usePlans();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");

  useEffect(() => {
    if (token) {
      AuthService.getMe()
        .then((res) => setCurrentUser(res.data))
        .catch(console.error);
    }
  }, [token]);

  const handleUpgrade = async (plan: Plan) => {
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

  const handleDowngrade = () => {
    if (!token) {
      navigate("/register");
      return;
    }
    showNotification(
      "To cancel your plan, please contact support at support@neoedge.com or downgrade from your workspace settings.",
      "info",
    );
  };

  return (
    <MarketingLayout title="Pricing | NeoOps">
      <div className="ne-page-top">
        <PricingPlans
          data={plans}
          onChooseFree={handleDowngrade}
          onChoosePremium={handleUpgrade}
          isUpgrading={isUpgrading}
          currentPlanName={currentUser?.subscription_plan}
        />
      </div>
      <Faq premiumAnswer={premiumAnswer(plans)} />
      <FinalCta />
    </MarketingLayout>
  );
}
