import React, { useState, useEffect } from "react";
import { PricingCards } from "../components/PricingCards";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PaymentService, AuthService, UserService } from "../api";
import { useNotification } from "../context/NotificationContext";

export function Pricing() {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const token =
    localStorage.getItem("token") || sessionStorage.getItem("token");

  useEffect(() => {
    // Fetch plans for display
    UserService.getSubscriptionPlans()
      .then((res) => {
        setSubscriptionPlans(
          (res.data.results || res.data).filter((p: any) => p.is_active),
        );
      })
      .catch(console.error);

    if (token) {
      AuthService.getMe()
        .then((res) => setCurrentUser(res.data))
        .catch(console.error);
    }
  }, [token]);

  const handleUpgrade = async (planName: string) => {
    if (!token) {
      navigate("/register");
      return;
    }

    const plan = subscriptionPlans.find(
      (p) => p.name.toLowerCase() === planName.toLowerCase(),
    );
    if (!plan) return;

    try {
      setIsUpgrading(true);
      const res = await PaymentService.initializeSubscription({
        plan_id: plan.id,
      });

      if (res.data.payment_link) {
        window.location.href = res.data.payment_link;
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
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-main)] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-12">
        <div className="mb-12">
          <Link
            to="/"
            className="inline-flex items-center text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
          </Link>
        </div>

        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-serif tracking-tight mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-[var(--text-muted)] max-w-2xl mx-auto">
            Choose the perfect plan for your business. Upgrade or downgrade at
            any time.
          </p>
        </div>

        <PricingCards
          onUpgrade={handleUpgrade}
          onSwitchToFree={handleDowngrade}
          isUpgrading={isUpgrading}
          currentPlanName={currentUser?.subscription_plan}
          subscriptionPlans={subscriptionPlans}
        />
      </div>
    </div>
  );
}
