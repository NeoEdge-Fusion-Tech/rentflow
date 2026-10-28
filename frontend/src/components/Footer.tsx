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
          className="inline-flex items-center transition-transform hover:scale-105"
          title="NeoEdge Fusion"
        >
          <img
            src="/neoedge-fusion-light.png"
            alt="NeoEdge Fusion"
            className="h-7 logo-light-mode object-contain"
          />
          <img
            src="/neoedge-fusion-dark.png"
            alt="NeoEdge Fusion"
            className="h-7 logo-dark-mode object-contain"
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
