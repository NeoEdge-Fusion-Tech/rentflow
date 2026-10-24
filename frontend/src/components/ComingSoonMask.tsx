import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ShoppingBag, Store, ArrowLeft, Lock } from "lucide-react";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { useTheme } from "../context/ThemeContext";
import { AuthService } from "../api";
import {
  MARKETPLACE_ACCESS_CONFIG,
  isProfileAllowed,
} from "../config/marketplaceAccess";

interface ComingSoonMaskProps {
  children: React.ReactNode;
  type?: "marketplace" | "storefront";
  title?: string;
  description?: string;
}

export function ComingSoonMask({
  children,
  type = "marketplace",
  title,
  description,
}: ComingSoonMaskProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();

  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    // If the mask is turned off completely in config, allow access
    if (!MARKETPLACE_ACCESS_CONFIG.enabled) {
      setIsAuthorized(true);
      setIsLoading(false);
      return;
    }

    // Check if user is logged in
    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    if (!token) {
      setIsAuthorized(false);
      setIsLoading(false);
      return;
    }

    // Validate logged in user against allowlist
    AuthService.getMe()
      .then((res) => {
        const user = res.data;
        setCurrentUser(user);
        if (isProfileAllowed(user)) {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
        }
      })
      .catch((e) => {
        console.warn("Could not verify user profile for store mask", e);
        setIsAuthorized(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [location.pathname]);

  // If loading user profile
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-app)] text-[var(--text-main)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
          <p className="text-sm text-[var(--text-muted)] animate-pulse">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // If authorized, render original implementation with zero changes
  if (isAuthorized) {
    return <>{children}</>;
  }

  // Content for unauthorized users
  const isMarketplace = type === "marketplace";
  const heading =
    title ||
    (isMarketplace
      ? "Event Marketplace is Coming Soon"
      : "Storefront is Coming Soon");
  const subtext =
    description ||
    (isMarketplace
      ? "We're building an all-in-one event rental marketplace. Browse equipment, compare top vendors, and book rentals seamlessly. Stay tuned for our official launch!"
      : "This rental storefront is currently being prepared for online bookings. Please check back soon or get in touch with the rental team directly.");

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-app)] text-[var(--text-main)] transition-colors duration-300 relative overflow-hidden select-none">
      {/* Background ambient decorative glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-primary/10 rounded-full blur-3xl pointer-events-none -z-0" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-brand-accent/10 rounded-full blur-3xl pointer-events-none -z-0" />

      {/* Navigation Bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 max-w-7xl w-full mx-auto">
        <Logo className="h-8 cursor-pointer" dark={theme === "dark"} />
        <div className="flex items-center gap-3">
          <ThemeToggle className="bg-transparent border-0 shadow-none p-2 rounded-full hover:bg-[var(--border-subtle)]" />
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] hover:border-brand-primary/50 rounded-xl transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Home
          </button>
          {currentUser ? (
            <button
              onClick={() => navigate("/dashboard")}
              className="px-4 py-2 text-sm font-bold bg-brand-primary text-white rounded-xl hover:opacity-90 transition-opacity shadow-sm shadow-brand-primary/20"
            >
              Dashboard
            </button>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="px-4 py-2 text-sm font-bold bg-brand-primary text-white rounded-xl hover:opacity-90 transition-opacity shadow-sm shadow-brand-primary/20"
            >
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main Hero Mask */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-16 text-center max-w-3xl mx-auto w-full">
        <div className="space-y-6">
          {/* Pill Badge */}
          <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-bold uppercase tracking-widest shadow-sm">
            Coming Soon
          </div>

          {/* Central Visual Icon */}
          <div className="mx-auto w-24 h-24 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-soft)] shadow-xl flex items-center justify-center relative group">
            <div className="absolute inset-0 bg-brand-primary/5 rounded-3xl transition-transform group-hover:scale-105 duration-300" />
            {isMarketplace ? (
              <ShoppingBag className="w-12 h-12 text-brand-primary drop-shadow-sm" />
            ) : (
              <Store className="w-12 h-12 text-brand-primary drop-shadow-sm" />
            )}
            <div className="absolute -bottom-2 -right-2 p-1.5 rounded-xl bg-amber-500 text-white shadow-md">
              <Lock className="w-4 h-4" />
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-[var(--text-main)] leading-tight">
            {heading}
          </h1>

          {/* Subtext description */}
          <p className="text-base sm:text-lg text-[var(--text-muted)] max-w-xl mx-auto leading-relaxed">
            {subtext}
          </p>

          {/* Feature Highlights */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            <span className="px-3.5 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-soft)] text-xs font-medium text-[var(--text-muted)] shadow-sm">
              Curated Catalog
            </span>
            <span className="px-3.5 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-soft)] text-xs font-medium text-[var(--text-muted)] shadow-sm">
              Instant Availability
            </span>
            <span className="px-3.5 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-soft)] text-xs font-medium text-[var(--text-muted)] shadow-sm">
              Seamless Bookings
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-3 pt-4">
            {currentUser ? (
              <button
                onClick={() => navigate("/dashboard")}
                className="px-6 py-3 bg-brand-primary text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-md shadow-brand-primary/20 flex items-center justify-center gap-2"
              >
                Go to Dashboard
              </button>
            ) : (
              <button
                onClick={() => navigate("/")}
                className="px-6 py-3 bg-brand-primary text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-md shadow-brand-primary/20 flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Return to Home
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-xs text-[var(--text-muted)] border-t border-[var(--border-subtle)]">
        &copy; {new Date().getFullYear()} NeoOps RentFlow. All rights reserved.
      </footer>
    </div>
  );
}
