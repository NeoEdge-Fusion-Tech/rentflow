import React from 'react';

interface FooterProps {
  className?: string;
}

export function Footer({ className = "" }: FooterProps) {
  return (
    <div className={`py-6 text-center w-full ${className}`}>
      <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
        A product of <span className="text-brand-accent">NeoEdge Fusion</span>
      </p>
    </div>
  );
}
