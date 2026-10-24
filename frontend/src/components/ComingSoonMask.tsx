import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ShoppingBag,
  Store,
  Sparkles,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  Lock,
  User,
  ShieldAlert,
  X,
} from "lucide-react";
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
  const [showPassModal, setShowPassModal] = useState(false);
  const [passphraseInput, setPassphraseInput] = useState("");
  const [passphraseError, setPassphraseError] = useState("");

  useEffect(() => {
    // If the mask is turned off completely in config, allow access
    if (!MARKETPLACE_ACCESS_CONFIG.enabled) {
      setIsAuthorized(true);
      setIsLoading(false);
      return;
    }

    // Check query params and stored passphrase
    if (isProfileAllowed(null)) {
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
        console.warn("Could not verify user profile for preview mask", e);
        setIsAuthorized(false);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [location.pathname, location.search]);

  // When user enters preview passphrase manually
  const handlePassphraseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passphraseInput.trim()) return;

    if (
      MARKETPLACE_ACCESS_CONFIG.previewPassphrase &&
      passphraseInput.trim() === MARKETPLACE_ACCESS_CONFIG.previewPassphrase
    ) {
      localStorage.setItem(
        "marketplace_preview_access",
        passphraseInput.trim(),
      );
      setIsAuthorized(true);
      setShowPassModal(false);
      setPassphraseError("");
    } else {
      setPassphraseError("Invalid preview code. Please try again.");
    }
  };

  const handleClearPreviewAccess = () => {
    localStorage.removeItem("marketplace_preview_access");
    window.location.reload();
  };

  // If loading user profile
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-app)] text-[var(--text-main)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
          <p className="text-sm text-[var(--text-muted)] animate-pulse">
            Checking access permissions...
          </p>
        </div>
      </div>
    );
  }

  // If authorized, render children (implementation completely untouched)
  if (isAuthorized) {
    return (
      <>
        {/* Subtle banner indicating preview mode for authorized viewers */}
        <div className="bg-brand-primary text-white text-xs px-4 py-1.5 flex items-center justify-between shadow-sm sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-brand-accent shrink-0" />
            <span className="font-medium">
              Authorized Preview Mode —{" "}
              {currentUser?.email
                ? `Logged in as ${currentUser.email}`
                : "Unlocked via preview key"}
            </span>
          </div>
          <button
            onClick={handleClearPreviewAccess}
            className="text-[11px] underline opacity-80 hover:opacity-100 transition-opacity"
            title="Lock marketplace again"
          >
            Lock preview
          </button>
        </div>
        {children}
      </>
    );
  }

  // Default content based on type
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
          {!currentUser ? (
            <button
              onClick={() =>
                navigate(
                  `/login?redirect=${encodeURIComponent(location.pathname)}`,
                )
              }
              className="px-4 py-2 text-sm font-bold bg-brand-primary text-white rounded-xl hover:opacity-90 transition-opacity shadow-sm shadow-brand-primary/20"
            >
              Sign In
            </button>
          ) : (
            <button
              onClick={() => navigate("/dashboard")}
              className="px-4 py-2 text-sm font-bold bg-brand-primary text-white rounded-xl hover:opacity-90 transition-opacity shadow-sm shadow-brand-primary/20"
            >
              Dashboard
            </button>
          )}
        </div>
      </header>

      {/* Main Hero Mask */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-16 text-center max-w-3xl mx-auto w-full">
        <div className="space-y-6">
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-bold uppercase tracking-widest shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-brand-accent" />
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
              ✨ Curated Catalog
            </span>
            <span className="px-3.5 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-soft)] text-xs font-medium text-[var(--text-muted)] shadow-sm">
              ⚡ Instant Availability
            </span>
            <span className="px-3.5 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-soft)] text-xs font-medium text-[var(--text-muted)] shadow-sm">
              🔒 Seamless Bookings
            </span>
          </div>

          {/* User Status / Early Access Notice */}
          {currentUser ? (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 max-w-md mx-auto text-left flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-700 dark:text-amber-400 space-y-1">
                <p className="font-semibold">
                  Signed in as:{" "}
                  <span className="underline">{currentUser.email}</span>
                </p>
                <p>
                  This feature is currently in private preview and restricted to
                  authorized tester profiles.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[var(--text-muted)]">
              Authorized team member or tester?{" "}
              <button
                onClick={() =>
                  navigate(
                    `/login?redirect=${encodeURIComponent(location.pathname)}`,
                  )
                }
                className="text-brand-primary font-bold underline hover:opacity-80 transition-opacity"
              >
                Sign in with an authorized profile
              </button>
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <button
              onClick={() => navigate("/")}
              className="w-full sm:w-auto px-6 py-3 bg-brand-primary text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-md shadow-brand-primary/20 flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Home
            </button>
            <button
              onClick={() => setShowPassModal(true)}
              className="w-full sm:w-auto px-5 py-3 bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] font-semibold rounded-xl hover:border-brand-primary/50 transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4 text-brand-primary" />
              Enter Preview Code
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-xs text-[var(--text-muted)] border-t border-[var(--border-subtle)]">
        &copy; {new Date().getFullYear()} NeoOps RentFlow. All rights reserved.
      </footer>

      {/* Preview Code Modal */}
      {showPassModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm text-[var(--text-main)]">
                <KeyRound className="w-4 h-4 text-brand-primary" />
                Unlock Preview
              </div>
              <button
                onClick={() => {
                  setShowPassModal(false);
                  setPassphraseError("");
                }}
                className="p-1 rounded-lg hover:bg-[var(--bg-app)] text-[var(--text-muted)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              If you have an early access preview passphrase, enter it below to
              view the live {isMarketplace ? "marketplace" : "storefront"}.
            </p>

            <form onSubmit={handlePassphraseSubmit} className="space-y-3">
              <input
                type="text"
                placeholder="Enter preview code..."
                value={passphraseInput}
                onChange={(e) => {
                  setPassphraseInput(e.target.value);
                  setPassphraseError("");
                }}
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-app)] text-[var(--text-main)] text-sm outline-none focus:border-brand-primary transition-colors"
              />

              {passphraseError && (
                <p className="text-xs text-rose-500 font-medium">
                  {passphraseError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPassModal(false);
                    setPassphraseError("");
                  }}
                  className="px-4 py-2 text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--bg-app)] rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-primary text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity shadow-sm"
                >
                  Unlock Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
