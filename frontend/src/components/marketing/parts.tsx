import React from "react";
import { Link } from "react-router-dom";

const Soon = () => <span className="ne-soon">Soon</span>;

const ROWS: [string, string, React.ReactNode, boolean?][] = [
  [
    "Booking requests",
    "Lost between calls, answered late",
    "Storefront takes bookings and deposits 24/7",
  ],
  [
    "Double bookings",
    "Two clients, one LED wall",
    "Availability checked by date before you confirm",
  ],
  [
    "Who still owes you",
    "Dig through sheets, guess, chase",
    "Balance due on every booking and invoice",
  ],
  [
    "Kit going out",
    "Memory and a notebook",
    "Scanned out, scanned back, waybill printed",
  ],
  [
    "Faulty kit",
    "Found on site, in front of the client",
    "Checked before it leaves, flagged when it returns",
  ],
  [
    "Quotes and invoices",
    "Retyped in Word every time",
    "Branded, duplicated in seconds, PDF ready",
  ],
  [
    "Client trust",
    "“How do I know this isn’t a scam?”",
    "Branded quotes, invoices and receipts, plus a client portal",
  ],
  [
    "Your crew",
    "Voice notes and phone calls",
    "Checklists on their own phones",
  ],
  ["Event profit", "Maybe, at month end", "Live on every event", true],
  [
    "Client disputes",
    "Your word against theirs",
    <>
      A signed contract on every booking <Soon />
    </>,
    true,
  ],
  [
    "Past clients",
    "Forgotten until they book someone else",
    <>
      Tagged hot, warm or dormant, so you follow up <Soon />
    </>,
    true,
  ],
];

/** Excel vs NeoOps table; rows stack into cards on phones (see .ne-cmp). */
export function Comparison() {
  return (
    <section className="ne-sec" style={{ padding: "110px 0 0" }}>
      <div className="ne-wrap">
        <div
          className="ne-reveal"
          style={{ textAlign: "center", maxWidth: "820px", margin: "0 auto" }}
        >
          <span className="ne-pill">Before and after</span>
          <h2 className="ne-h2" style={{ marginTop: "23px", color: "#07294C" }}>
            Your business on Excel.{" "}
            <span
              className="ne-serif"
              style={{ boxShadow: "inset 0 -0.26em 0 #FFC17D" }}
            >
              Your business on NeoOps.
            </span>
          </h2>
        </div>
        <div className="ne-reveal ne-cmp" style={{ marginTop: "48px" }}>
          <div className="ne-cmp-row ne-cmp-head">
            <div>The job</div>
            <div className="ne-cmp-old">Excel + notebook</div>
            <div className="ne-cmp-new">With NeoOps</div>
          </div>
          {ROWS.map(([job, before, after, strong]) => (
            <div className="ne-cmp-row" key={job}>
              <div className="ne-cmp-job">{job}</div>
              <div className="ne-cmp-old">
                <span className="ne-cmp-label">Excel + notebook</span>
                {before}
              </div>
              <div
                className="ne-cmp-new"
                style={{ fontWeight: strong ? 800 : 600 }}
              >
                <span className="ne-cmp-label">With NeoOps</span>✓ {after}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const icon = (d: React.ReactNode) => (
  <span className="ne-badge" style={{ width: "40px", height: "40px" }}>
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#FFC17D"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {d}
    </svg>
  </span>
);

const MODULES = [
  {
    n: "01 · Rent",
    t: "Bookings & storefront",
    d: "Take bookings and deposits 24/7, with availability checked by date.",
    i: (
      <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
    ),
  },
  {
    n: "02 · Track",
    t: "Inventory & scanner",
    d: "Scan every item out and back, and catch faulty kit before it leaves.",
    i: <path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8" />,
  },
  {
    n: "03 · Run",
    t: "Event checklists",
    d: "Pre-event, on the day and after. Your crew works from one list.",
    i: (
      <path d="M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h9" />
    ),
  },
  {
    n: "04 · Bill",
    t: "Quotes, invoices & receipts",
    d: "Branded quotes that become invoices, with part payments and receipts.",
    i: (
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M8 13h8M8 17h5" />
    ),
  },
  {
    n: "05 · Profit",
    t: "Projects & P&L",
    d: "See what every event and event type really made.",
    i: <path d="M3 13h8V3H3zm10 8h8V11h-8zM3 21h8v-6H3zm10-18v6h8V3z" />,
  },
  {
    n: "06 · Keep",
    t: "Clients that come back",
    d: "Every job and payment per client, plus a portal and feedback forms.",
    i: (
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" />
    ),
  },
];

/** Compact module overview for the homepage; the full tour is on /features. */
export function FeatureGrid() {
  return (
    <>
      <div className="ne-modules">
        {MODULES.map((m) => (
          <Link key={m.t} to="/features" className="ne-module ne-reveal">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
              }}
            >
              {icon(m.i)}
              <span
                className="ne-eyebrow"
                style={{ fontSize: "11px", color: "rgba(7,41,76,.55)" }}
              >
                {m.n}
              </span>
            </div>
            <h3>{m.t}</h3>
            <p>{m.d}</p>
          </Link>
        ))}
      </div>
      <div style={{ textAlign: "center", marginTop: "28px" }}>
        <Link
          className="ne-btn ne-btn-paper"
          to="/features"
          style={{ background: "#FFFFFF" }}
        >
          See every feature
        </Link>
      </div>
    </>
  );
}
