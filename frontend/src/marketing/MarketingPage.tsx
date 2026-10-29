import React, { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { analyticsEnabled, loadConsent } from "./config";
import { initSite } from "./scripts";
import "./site.css";
import "./base.css";

/**
 * Wrapper for every page of the public website: sets the title and
 * description, scrolls to the hash target, and runs the page's behaviour
 * once the static markup is in the DOM.
 */
export function MarketingPage({
  slug,
  title,
  description,
  site,
  script,
  children,
}: {
  slug: string;
  title: string;
  description?: string;
  /** Page uses the shared site stylesheet (.mk-site). */
  site?: boolean;
  script?: (root: HTMLElement) => void | (() => void);
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { pathname, hash } = useLocation();

  useEffect(() => {
    const prev = document.title;
    document.title = title;
    const meta = document.querySelector('meta[name="description"]');
    const prevDesc = meta?.getAttribute("content");
    if (meta && description) meta.setAttribute("content", description);
    return () => {
      document.title = prev;
      if (meta && prevDesc != null) meta.setAttribute("content", prevDesc);
    };
  }, [title, description]);

  useEffect(() => {
    const root = ref.current;
    // StrictMode runs effects twice on the same DOM; wire it up once.
    if (!root || root.dataset.ready) return;
    root.dataset.ready = "1";
    initSite(root);
    script?.(root);
    loadConsent();
    // Listeners live on nodes that unmount with the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (hash) {
      const t = setTimeout(
        () =>
          document
            .getElementById(decodeURIComponent(hash.slice(1)))
            ?.scrollIntoView({ behavior: "smooth" }),
        60,
      );
      return () => clearTimeout(t);
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return (
    <div
      ref={ref}
      className={`mk pg-${slug}${site ? " mk-site" : ""}${
        analyticsEnabled ? "" : " mk-no-consent"
      }`}
    >
      {children}
    </div>
  );
}
