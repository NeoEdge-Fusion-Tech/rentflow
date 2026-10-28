import React, { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import "../../pages/landing.css";

const NAV = [
  { to: "/#cost", label: "What it saves" },
  { to: "/features", label: "Features" },
  { to: "/about#for-who", label: "For Who" },
  { to: "/pricing", label: "Pricing" },
  { to: "/about", label: "About" },
];

import { Logo } from "../Logo";

function Header() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  useEffect(() => setOpen(false), [location.pathname, location.hash]);
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    "ne-link" + (isActive ? " on" : "");
  return (
    <header className="ne-header">
      <nav className="ne-nav ne-wrap" aria-label="Main">
        <Logo to="/" showSubtitle={true} className="h-10" />
        <div
          className="ne-hide-sm"
          style={{ display: "flex", alignItems: "center", gap: "26px" }}
        >
          {NAV.map((n) =>
            n.to.includes("#") ? (
              <Link key={n.to} className="ne-link" to={n.to}>
                {n.label}
              </Link>
            ) : (
              <NavLink key={n.to} className={linkClass} to={n.to}>
                {n.label}
              </NavLink>
            ),
          )}
          <Link className="ne-link" to="/login">
            Log in
          </Link>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Link to="/register" className="ne-cta-sm">
            Start for free{" "}
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: "#FFC17D",
              }}
            ></span>
          </Link>
          <button
            type="button"
            className="ne-burger"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#07294C"
              strokeWidth="2.4"
              strokeLinecap="round"
              aria-hidden="true"
            >
              {open ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </nav>
      {open && (
        <div className="ne-menu">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to}>
              {n.label}
            </Link>
          ))}
          <Link to="/login">Log in</Link>
        </div>
      )}
    </header>
  );
}

/**
 * Shell for the public marketing pages: header, footer and the phone
 * sticky bar. Scrolls to the hash target (e.g. /#cost) or the top on
 * navigation.
 */
export function MarketingLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    const prev = document.title;
    document.title = title;
    return () => {
      document.title = prev;
    };
  }, [title]);

  useEffect(() => {
    if (hash) {
      const t = setTimeout(
        () =>
          document
            .getElementById(hash.slice(1))
            ?.scrollIntoView({ behavior: "smooth" }),
        60,
      );
      return () => clearTimeout(t);
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return (
    <div
      className="ne"
      style={{ width: "100%", background: "#FFFFFF", minHeight: "100vh" }}
    >
      <Header />
      <main id="top">{children}</main>
      <footer
        style={{
          background: "#061F38",
          color: "#FFFFFF",
          padding: "72px 0 28px",
        }}
      >
        <div className="ne-wrap">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "36px",
            }}
          >
            <div style={{ gridColumn: "span 1" }}>
              <img
                src="/landing/neoedge-logo.png"
                alt="NeoEdge Fusion"
                style={{
                  width: "96px",
                  height: "96px",
                  filter: "brightness(0) invert(1)",
                }}
              />
              <p
                style={{
                  fontSize: "14px",
                  color: "rgba(255,255,255,.62)",
                  margin: "16px 0 0",
                  maxWidth: "280px",
                }}
              >
                NeoOps is a NeoEdge Fusion product. From moments to memories.
                From ideas to systems.
              </p>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                fontSize: "14px",
              }}
            >
              <strong
                style={{
                  fontSize: "11px",
                  letterSpacing: ".15em",
                  textTransform: "uppercase",
                  color: "#FFC17D",
                }}
              >
                Product
              </strong>
              <Link
                to="/features"
                style={{
                  color: "rgba(255,255,255,.72)",
                  textDecoration: "none",
                }}
              >
                Features
              </Link>
              <Link
                to="/pricing"
                style={{
                  color: "rgba(255,255,255,.72)",
                  textDecoration: "none",
                }}
              >
                Pricing
              </Link>
              <Link
                to="/about"
                style={{
                  color: "rgba(255,255,255,.72)",
                  textDecoration: "none",
                }}
              >
                About
              </Link>
              <Link
                to="/login"
                style={{
                  color: "rgba(255,255,255,.72)",
                  textDecoration: "none",
                }}
              >
                Log in
              </Link>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                fontSize: "14px",
              }}
            >
              <strong
                style={{
                  fontSize: "11px",
                  letterSpacing: ".15em",
                  textTransform: "uppercase",
                  color: "#FFC17D",
                }}
              >
                For who
              </strong>
              <Link
                to="/about#for-who"
                style={{
                  color: "rgba(255,255,255,.72)",
                  textDecoration: "none",
                }}
              >
                Event operators
              </Link>
              <Link
                to="/about#for-who"
                style={{
                  color: "rgba(255,255,255,.72)",
                  textDecoration: "none",
                }}
              >
                Event planners
              </Link>
              <Link
                to="/about#for-who"
                style={{
                  color: "rgba(255,255,255,.72)",
                  textDecoration: "none",
                }}
              >
                Rentals &amp; decor
              </Link>
              <Link
                to="/about#for-who"
                style={{
                  color: "rgba(255,255,255,.72)",
                  textDecoration: "none",
                }}
              >
                Sound, light &amp; AV
              </Link>
              <Link
                to="/about#for-who"
                style={{
                  color: "rgba(255,255,255,.72)",
                  textDecoration: "none",
                }}
              >
                Photo &amp; video
              </Link>
              <Link
                to="/about#for-who"
                style={{
                  color: "rgba(255,255,255,.72)",
                  textDecoration: "none",
                }}
              >
                Brand activations
              </Link>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                fontSize: "14px",
              }}
            >
              <strong
                style={{
                  fontSize: "11px",
                  letterSpacing: ".15em",
                  textTransform: "uppercase",
                  color: "#FFC17D",
                }}
              >
                NeoEdge
              </strong>
              <a
                href="https://neoedgefusion.com/"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "rgba(255,255,255,.72)",
                  textDecoration: "none",
                }}
              >
                neoedgefusion.com
              </a>
              <a
                href="https://neoedgefusion.com/tech.html"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "rgba(255,255,255,.72)",
                  textDecoration: "none",
                }}
              >
                NeoTech
              </a>
              <a
                href="mailto:info@neoedgefusion.com"
                style={{
                  color: "rgba(255,255,255,.72)",
                  textDecoration: "none",
                }}
              >
                info@neoedgefusion.com
              </a>
            </div>
          </div>
          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,.13)",
              marginTop: "48px",
              paddingTop: "18px",
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
              fontSize: "12px",
              color: "rgba(255,255,255,.48)",
            }}
          >
            <span>© 2026 NeoEdge Fusion</span>
            <span>Experience · Media · Events · Technology</span>
          </div>
        </div>
      </footer>
      <div className="ne-sticky" role="region" aria-label="Quick actions">
        <Link
          to="/register"
          style={{
            flex: "1",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "46px",
            borderRadius: "999px",
            background: "#07294C",
            color: "#FFFFFF",
            fontWeight: 800,
            fontSize: "15px",
            textDecoration: "none",
          }}
        >
          Start for free
        </Link>
        <Link
          to="/login"
          style={{
            flex: "1",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "46px",
            borderRadius: "999px",
            background: "#FFF4E6",
            color: "#07294C",
            fontWeight: 800,
            fontSize: "15px",
            textDecoration: "none",
          }}
        >
          Log in
        </Link>
      </div>
    </div>
  );
}
