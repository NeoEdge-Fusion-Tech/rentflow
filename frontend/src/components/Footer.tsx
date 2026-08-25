import React from "react";
import { Link } from "react-router-dom";

interface FooterProps {
  className?: string;
}

export function Footer({ className = "" }: FooterProps) {
  return (
    <div
      className={`py-6 mt-12 text-center w-full flex justify-center ${className}`}
    >
      <div className="flex flex-row items-center gap-3">
        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-1">
          A product of
        </span>
        <a
          href="https://neoedgefusion.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block transition-transform hover:scale-105"
        >
          <img
            src="/logo_light.png"
            alt="NeoEdge Fusion"
            className="h-7 logo-light-mode"
          />
          <img
            src="/logo_dark.png"
            alt="NeoEdge Fusion"
            className="h-7 logo-dark-mode"
          />
        </a>
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
      </div>
    </div>
  );
}
