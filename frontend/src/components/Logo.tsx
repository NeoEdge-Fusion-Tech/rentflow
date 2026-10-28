import React from "react";
import { Link } from "react-router-dom";

export interface LogoProps {
  className?: string;
  showText?: boolean;
  showSubtitle?: boolean;
  dark?: boolean;
  shade?: "orange" | "dark" | "white";
  to?: string;
  href?: string;
  onClick?: () => void;
  alt?: string;
}

/**
 * The official NeoOps Icon Mark:
 * Characteristic head (circle) and body (semicircle bowl) in signature orange (#FFA652) or dark shade (#07294C).
 */
export function NeoOpsIcon({
  className = "w-full h-full",
  color = "#FFA652",
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Head - Circle */}
      <circle cx="50" cy="28" r="14" fill={color} />
      {/* Body - Semicircle Bowl */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M50 88C72.0914 88 90 70.0914 90 48H10C10 70.0914 27.9086 88 50 88Z"
        fill={color}
      />
    </svg>
  );
}

/**
 * NeoOps Brand Logo:
 * - Icon: Signature circle & bowl mark (in signature orange #FFA652 or dark shade #07294C).
 * - Typography: "Neo" (Dark navy on light bg, pure white on dark bg) + "Ops" (Signature Orange #FFA652).
 * - Subtitle: "BY NEOEDGE FUSION" (optional).
 */
export function Logo({
  className = "h-8",
  showText = true,
  showSubtitle = false,
  dark = false,
  shade = "orange",
  to,
  href,
  onClick,
}: LogoProps) {
  // Resolve icon color based on shade & theme
  let iconColor = "#FFA652";
  if (shade === "dark") {
    iconColor = "#07294C";
  } else if (shade === "white") {
    iconColor = "#FFFFFF";
  }

  // On dark background: "Neo" is white (#FFFFFF)
  // On white / light background: "Neo" is dark navy (#07294C)
  const neoTextColor = dark ? "text-white" : "text-[#07294C]";
  const opsTextColor = shade === "dark" ? "text-[#07294C]" : "text-[#FFA652]";
  const subtitleColor = dark ? "text-white/70" : "text-[#64748B]";

  const content = (
    <div
      className={`inline-flex items-center gap-2.5 select-none ${className}`}
    >
      {/* NeoOps icon mark */}
      <div className="h-full aspect-square flex-shrink-0 flex items-center justify-center">
        <NeoOpsIcon
          className="w-full h-full drop-shadow-sm"
          color={iconColor}
        />
      </div>

      {showText && (
        <div className="flex flex-col justify-center leading-none">
          <div className="flex items-center text-xl sm:text-2xl font-black tracking-tight">
            <span className={neoTextColor}>Neo</span>
            <span className={opsTextColor}>Ops</span>
          </div>
          {showSubtitle && (
            <span
              className={`text-[9px] sm:text-[10px] font-bold tracking-[0.14em] uppercase ${subtitleColor} mt-1`}
            >
              by NeoEdge Fusion
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (to) {
    return (
      <Link
        to={to}
        onClick={onClick}
        className="inline-flex items-center text-decoration-none transition-opacity hover:opacity-90 shrink-0"
      >
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a
        href={href}
        onClick={onClick}
        className="inline-flex items-center text-decoration-none transition-opacity hover:opacity-90 shrink-0"
      >
        {content}
      </a>
    );
  }

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center border-0 bg-transparent p-0 cursor-pointer transition-opacity hover:opacity-90 text-left shrink-0"
      >
        {content}
      </button>
    );
  }

  return <div className="inline-flex items-center shrink-0">{content}</div>;
}

export const NeoOpsLogo = Logo;
export default Logo;
