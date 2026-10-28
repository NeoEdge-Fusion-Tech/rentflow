import React from "react";
import { Link } from "react-router-dom";

export interface LogoProps {
  className?: string;
  showText?: boolean;
  showSubtitle?: boolean;
  dark?: boolean;
  to?: string;
  href?: string;
  onClick?: () => void;
  alt?: string;
}

/**
 * NeoOps Icon Mark:
 * Rounded squircle in brand navy (#072B50) featuring the stylized 'N'
 * and signature amber operational node (#FFAB57).
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
      <rect width="100" height="100" rx="26" fill="#072B50" />
      <path
        d="M28 68V34L72 68V46"
        stroke="#FFFFFF"
        strokeWidth="9.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="72" cy="33" r="6.5" fill="#FFAB57" />
    </svg>
  );
}

/**
 * Original NeoOps Logo Component:
 * Uses the authentic brand asset directly from the master design file.
 * Automatically selects the white-text version for dark backgrounds
 * and the navy-text version for light backgrounds.
 */
export function Logo({
  className = "h-8",
  showText = true,
  dark = false,
  to,
  href,
  onClick,
  alt = "NeoOps - by NeoEdge Fusion",
}: LogoProps) {
  const imageSrc = !showText
    ? "/neoops-original-badge.png"
    : dark
      ? "/logo_dark.png"
      : "/logo_light.png";

  const content = (
    <img
      src={imageSrc}
      alt={alt}
      className={`select-none object-contain ${className}`}
      draggable={false}
    />
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

export default Logo;
