import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  dark?: boolean;
}

export function Logo({ className = "h-8", showText = true, dark = false }: LogoProps) {
  const textColor = "text-[var(--text-main)]";
  const subTextColor = "text-brand-accent";

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="relative w-8 h-8 flex-shrink-0">
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm">
          {/* Head - Circle */}
          <circle cx="50" cy="28" r="14" fill="#FFA652" />
          {/* Body - Semi-circle / Bowl shape with top cutout */}
          <path 
            fillRule="evenodd" 
            clipRule="evenodd" 
            d="M50 88C72.0914 88 90 70.0914 90 48H10C10 70.0914 27.9086 88 50 88Z" 
            fill="#FFA652" 
          />
        </svg>
      </div>
      {showText && (
        <div className="flex flex-col leading-[0.95] mt-1">
          <span className={`text-xl font-bold tracking-tight ${textColor}`}>Neo</span>
          <span className={`text-xl font-bold tracking-tight ${subTextColor}`}>Inventory</span>
        </div>
      )}
    </div>
  );
}
