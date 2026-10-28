import React from "react";
import { Link } from "react-router-dom";

export interface LogoProps {
  className?: string;
  showText?: boolean;
  showSubtitle?: boolean;
  dark?: boolean;
  variant?: "neoops" | "neoedge";
  subtitle?: string;
  to?: string;
  href?: string;
  onClick?: () => void;
}

/**
 * NeoOps Icon Mark:
 * Rounded squircle in deep navy (#072B4F) featuring the iconic stylized 'N'
 * and signature amber notification/operational node (#FFAB57).
 */
export function NeoOpsIcon({
  className = "w-full h-full",
  alt = "NeoOps Icon",
}: {
  className?: string;
  alt?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label={alt}
      role="img"
    >
      {/* Brand navy squircle background */}
      <rect width="100" height="100" rx="26" fill="#072B4F" />

      {/* Stylized 'N' stroke with rounded terminals */}
      <path
        d="M28 68V34L72 68V46"
        stroke="#FFFFFF"
        strokeWidth="9.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Signature operational node / light */}
      <circle cx="72" cy="33" r="6.5" fill="#FFAB57" />
    </svg>
  );
}

/**
 * NeoEdge Fusion Icon Mark:
 * Precision vector reproduction of the geometric 'NE' modular ligature.
 */
export function NeoEdgeIcon({
  className = "w-full h-full",
  fill = "currentColor",
  alt = "NeoEdge Fusion Icon",
}: {
  className?: string;
  fill?: string;
  alt?: string;
}) {
  return (
    <svg
      viewBox="0 0 1492 968"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label={alt}
      role="img"
    >
      {/* Fused N & E outer ligature */}
      <path
        d="M0 0H351L724 427V0H1340V274H1076V694H1336V968H724L351 541V968H0V0Z"
        fill={fill}
      />
      {/* Floating middle E modular block */}
      <rect x="1150" y="347" width="342" height="274" fill={fill} />
    </svg>
  );
}

/**
 * NeoOps Logo Component
 */
export function NeoOpsLogo({
  className = "h-9",
  showText = true,
  showSubtitle = false,
  dark = false,
  subtitle = "BY NEOEDGE FUSION",
}: Omit<LogoProps, "variant">) {
  const textColor = dark ? "text-white" : "text-[#07294C]";
  const subTextColor = dark ? "text-slate-400" : "text-[#64748B]";

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* NeoOps squircle icon badge */}
      <div className="h-full aspect-square flex-shrink-0 flex items-center justify-center">
        <NeoOpsIcon className="w-full h-full drop-shadow-sm" />
      </div>

      {showText && (
        <div className="flex flex-col justify-center leading-none">
          <span
            className={`font-black tracking-tight text-xl sm:text-2xl ${textColor}`}
            style={{ letterSpacing: "-0.03em" }}
          >
            NeoOps
          </span>
          {showSubtitle && (
            <span
              className={`text-[9px] sm:text-[10px] font-bold tracking-[0.14em] uppercase ${subTextColor} mt-1`}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * NeoEdge Fusion Logo Component
 */
export function NeoEdgeLogo({
  className = "h-9",
  showText = true,
  dark = false,
}: Omit<LogoProps, "variant" | "showSubtitle" | "subtitle">) {
  const fillColor = dark ? "#FFFFFF" : "#07294C";
  const textColor = dark ? "text-white" : "text-[#07294C]";

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <div className="h-full aspect-[1.54/1] flex-shrink-0 flex items-center justify-center">
        <NeoEdgeIcon className="w-full h-full" fill={fillColor} />
      </div>

      {showText && (
        <div className="flex flex-col justify-center leading-none">
          <span
            className={`font-black tracking-tight text-lg sm:text-xl ${textColor}`}
            style={{ letterSpacing: "-0.02em" }}
          >
            NeoEdge
          </span>
          <span
            className={`font-bold tracking-tight text-base sm:text-lg ${textColor} opacity-90 mt-0.5`}
          >
            Fusion
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Unified Logo Component
 * Default component used across navigation, headers, login, and branding.
 */
export function Logo({
  className = "h-8",
  showText = true,
  showSubtitle = false,
  dark = false,
  variant = "neoops",
  subtitle,
  to,
  href,
  onClick,
}: LogoProps) {
  const content =
    variant === "neoedge" ? (
      <NeoEdgeLogo className={className} showText={showText} dark={dark} />
    ) : (
      <NeoOpsLogo
        className={className}
        showText={showText}
        showSubtitle={showSubtitle}
        dark={dark}
        subtitle={subtitle}
      />
    );

  if (to) {
    return (
      <Link
        to={to}
        onClick={onClick}
        className="inline-flex items-center text-decoration-none transition-opacity hover:opacity-95"
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
        className="inline-flex items-center text-decoration-none transition-opacity hover:opacity-95"
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
        className="inline-flex items-center border-0 bg-transparent p-0 cursor-pointer transition-opacity hover:opacity-95 text-left"
      >
        {content}
      </button>
    );
  }

  return content;
}

export default Logo;
