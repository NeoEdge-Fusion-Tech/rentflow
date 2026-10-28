import React from "react";
import { Link } from "react-router-dom";

import { useTheme } from "../context/ThemeContext";
import { Logo } from "./Logo";

interface FooterProps {
  className?: string;
}

export function Footer({ className = "" }: FooterProps) {
  const { theme } = useTheme();

  return (
    <div
      className={`py-6 mt-12 text-center w-full flex justify-center ${className}`}
    >
      <div className="flex flex-row items-center gap-3">
        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">
          A product of
        </span>
        <Logo className="h-6" dark={theme === "dark"} to="/" />
        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">
          &copy; {new Date().getFullYear()}
        </span>
        <span className="text-[var(--border-strong)] hidden sm:inline px-2">
          |
        </span>
        <Link
          to="/pricing"
          className="text-[10px] font-bold text-[var(--text-muted)] hover:text-brand-primary uppercase tracking-widest mt-1 transition-colors"
        >
          Pricing
        </Link>
        <span className="text-[var(--border-strong)] hidden sm:inline px-2">
          |
        </span>
        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">
          v1.1
        </span>
      </div>
    </div>
  );
}
