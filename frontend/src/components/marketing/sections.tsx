import React, { useState } from "react";
import { Link } from "react-router-dom";

/*
 * Sections of the NeoOps marketing site, converted from the design file.
 * Pages compose them inside <MarketingLayout>; styles are in landing.css.
 */

const naira = (n: number) => "\u20A6" + Math.round(n).toLocaleString("en-NG");

export function Hero() {
  return (
    <section
      style={{
        background: "linear-gradient(180deg, #FFF8EF 0%, #FFFFFF 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: "620px",
          height: "620px",
          right: "-160px",
          top: "-200px",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,193,125,.35), transparent 65%)",
        }}
      ></div>
      <div
        className="ne-wrap"
        style={{
          position: "relative",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "56px",
          paddingTop: "72px",
          paddingBottom: "96px",
        }}
      >
        <div style={{ flex: "1 1 500px", minWidth: "0" }}>
          <span
            className="ne-pill ne-in"
            style={{
              textTransform: "none",
              letterSpacing: "0",
              fontSize: "13px",
              fontWeight: "700",
            }}
          >
            <span
              className="ne-live"
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#FFC17D",
              }}
            ></span>
            For event operators, planners, rental and production businesses
          </span>
          <h1
            className="ne-h1 ne-in ne-d1"
            style={{
              fontSize: "76px",
              lineHeight: ".96",
              letterSpacing: "-0.06em",
              fontWeight: "700",
              color: "#07294C",
              margin: "24px 0 0",
            }}
          >
            The OS for event ops.{" "}
            <span
              className="ne-serif"
              style={{ boxShadow: "inset 0 -0.26em 0 #FFC17D" }}
            >
              Built by Operators.
            </span>
          </h1>
          <p
            className="ne-in ne-d2"
            style={{
              fontSize: "20px",
              lineHeight: "1.6",
              color: "#3E4A56",
              margin: "26px 0 0",
              maxWidth: "580px",
            }}
          >
            Stop losing money between booking and balance. Book it, track it,
            bill it, and see what every event{" "}
            <strong style={{ color: "#07294C" }}>really made</strong>.
          </p>
          <div
            className="ne-in ne-d3"
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              marginTop: "34px",
            }}
          >
            <Link className="ne-btn ne-btn-navy" to="/register">
              Start for free{" "}
              <span className="ne-arrow" style={{ background: "#FFC17D" }}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#07294C"
                  strokeWidth="2.4"
                  aria-hidden="true"
                >
                  <path d="M7 17L17 7M9 7h8v8"></path>
                </svg>
              </span>
            </Link>
            <a
              className="ne-btn ne-btn-paper"
              href="#cost"
              style={{ background: "#FFFFFF" }}
            >
              See what you're losing
            </a>
          </div>
          <div
            className="ne-in ne-d4"
            style={{
              display: "flex",
              gap: "18px",
              flexWrap: "wrap",
              marginTop: "26px",
              fontSize: "14px",
              fontWeight: "600",
              color: "#4A5663",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#07294C"
                strokeWidth="2.6"
                aria-hidden="true"
              >
                <path d="M5 12l5 5L20 7"></path>
              </svg>
              Free to start
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#07294C"
                strokeWidth="2.6"
                aria-hidden="true"
              >
                <path d="M5 12l5 5L20 7"></path>
              </svg>
              No card needed
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#07294C"
                strokeWidth="2.6"
                aria-hidden="true"
              >
                <path d="M5 12l5 5L20 7"></path>
              </svg>
              Works offline, syncs later
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#07294C"
                strokeWidth="2.6"
                aria-hidden="true"
              >
                <path d="M5 12l5 5L20 7"></path>
              </svg>
              Built by event operators
            </span>
          </div>
        </div>

        {/* hero visual */}
        <div
          className="ne-in ne-d2"
          style={{
            flex: "1 1 520px",
            minWidth: "0",
            position: "relative",
            padding: "8px 0 40px",
          }}
        >
          <div style={{ position: "relative", zIndex: "2" }}>
            <div className="ap-frame hero-app">
              <div className="ap-chrome">
                <span></span>
                <span></span>
                <span></span>
                <div className="ap-url">
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 11h14v10H5zM8 11V7a4 4 0 018 0v4"></path>
                  </svg>
                  getneoops.com/app/bookings
                </div>
              </div>
              <div className="ap-body">
                <aside className="ap-side">
                  <div className="ap-logo">
                    <span className="ap-mark">N</span>NeoOps
                  </div>
                  <div className="ap-biz">
                    NeoEdge Fusion
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#66717C"
                      strokeWidth="2.4"
                      aria-hidden="true"
                    >
                      <path d="M6 9l6 6 6-6"></path>
                    </svg>
                  </div>
                  <div className="ap-nav">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M3 13h8V3H3zm10 8h8V11h-8zM3 21h8v-6H3zm10-18v6h8V3z"></path>
                    </svg>
                    <span>Dashboard</span>
                  </div>
                  <div className="ap-nav on">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"></path>
                    </svg>
                    <span>Bookings</span>
                  </div>
                  <div className="ap-nav">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8"></path>
                    </svg>
                    <span>Inventory</span>
                  </div>
                  <div className="ap-nav">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M8 13h8M8 17h5"></path>
                    </svg>
                    <span>Invoices</span>
                  </div>
                  <div className="ap-nav">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M3 7h18v13H3zM8 7V4h8v3"></path>
                    </svg>
                    <span>Projects</span>
                  </div>
                  <div className="ap-nav">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h9"></path>
                    </svg>
                    <span>Tasks</span>
                  </div>
                  <div className="ap-nav">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z"></path>
                    </svg>
                    <span>Clients</span>
                  </div>
                  <div className="ap-plan">
                    <b>Premium</b>
                    <span>Unlimited invoices and bookings</span>
                  </div>
                </aside>
                <div className="ap-main">
                  <div className="ap-top">
                    <div>
                      <div className="ap-h">Bookings</div>
                      <div className="ap-sub">November · 16 jobs</div>
                    </div>
                    <div className="ap-btn">+ New booking</div>
                  </div>
                  <div className="ap-fchips">
                    <span className="ap-fchip on">All 16</span>
                    <span className="ap-fchip">Request 3</span>
                    <span className="ap-fchip">Booked 5</span>
                    <span className="ap-fchip">Confirmed 4</span>
                    <span className="ap-fchip">Picked up 2</span>
                    <span className="ap-fchip">Returned 2</span>
                  </div>
                  <div className="ap-table">
                    <div className="ap-th">
                      <span>Client &amp; items</span>
                      <span>Event date</span>
                      <span>Amount</span>
                      <span>Status</span>
                    </div>
                    <div className="ap-tr">
                      <span>
                        <b>Adaeze &amp; Tobi wedding</b>
                        <em>LED wall, 360 booth</em>
                      </span>
                      <span>Sat 14 Nov</span>
                      <span>₦1,450,000</span>
                      <span>
                        <span
                          className="ap-pill"
                          style={{ background: "#E6F4EA", color: "#1E7A3C" }}
                        >
                          Confirmed
                        </span>
                      </span>
                    </div>
                    <div className="ap-tr">
                      <span>
                        <b>Halcyon staff party</b>
                        <em>Sound, lights, stage</em>
                      </span>
                      <span>Fri 20 Nov</span>
                      <span>₦2,100,000</span>
                      <span>
                        <span
                          className="ap-pill"
                          style={{ background: "#E3ECF5", color: "#07294C" }}
                        >
                          Booked
                        </span>
                      </span>
                    </div>
                    <div className="ap-tr hl">
                      <span>
                        <b>Storefront request</b>
                        <em>200 chairs, 20 tables</em>
                      </span>
                      <span>Sat 21 Nov</span>
                      <span>₦185,000</span>
                      <span>
                        <span
                          className="ap-pill"
                          style={{ background: "#FFF4E6", color: "#9A5B12" }}
                        >
                          Request
                        </span>
                      </span>
                    </div>
                    <div className="ap-tr">
                      <span>
                        <b>HR Summit Lagos</b>
                        <em>Teleprompter, mics</em>
                      </span>
                      <span>Thu 5 Nov</span>
                      <span>₦640,000</span>
                      <span>
                        <span
                          className="ap-pill"
                          style={{ background: "#EEE9FB", color: "#5B3FA8" }}
                        >
                          Picked up
                        </span>
                      </span>
                    </div>
                    <div className="ap-tr">
                      <span>
                        <b>Kemi 40th birthday</b>
                        <em>Photo booth</em>
                      </span>
                      <span>Sat 31 Oct</span>
                      <span>₦230,000</span>
                      <span>
                        <span
                          className="ap-pill"
                          style={{ background: "#F1F3F5", color: "#4A5663" }}
                        >
                          Returned
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Outcomes() {
  return (
    <section style={{ padding: "8px 0 0" }}>
      <div className="ne-wrap">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: "14px",
          }}
        >
          <div
            className="ne-reveal"
            style={{
              background: "#F1F5FA",
              borderRadius: "22px",
              padding: "22px",
            }}
          >
            <div
              style={{
                fontSize: "28px",
                fontWeight: "800",
                letterSpacing: "-0.04em",
                color: "#07294C",
              }}
            >
              24/7
            </div>
            <div
              style={{
                fontSize: "15px",
                fontWeight: "700",
                color: "#07294C",
                marginTop: "6px",
              }}
            >
              Get booked while you sleep
            </div>
            <div
              style={{ fontSize: "14px", color: "#66717C", marginTop: "4px" }}
            >
              Your storefront takes requests and deposits.
            </div>
          </div>
          <div
            className="ne-reveal"
            style={{
              background: "#FFF4E6",
              borderRadius: "22px",
              padding: "22px",
            }}
          >
            <div
              style={{
                fontSize: "28px",
                fontWeight: "800",
                letterSpacing: "-0.04em",
                color: "#07294C",
              }}
            >
              Every item
            </div>
            <div
              style={{
                fontSize: "15px",
                fontWeight: "700",
                color: "#07294C",
                marginTop: "6px",
              }}
            >
              Know where every chair is
            </div>
            <div
              style={{ fontSize: "14px", color: "#66717C", marginTop: "4px" }}
            >
              Every item scanned out and back.
            </div>
          </div>
          <div
            className="ne-reveal"
            style={{
              background: "#F1F5FA",
              borderRadius: "22px",
              padding: "22px",
            }}
          >
            <div
              style={{
                fontSize: "28px",
                fontWeight: "800",
                letterSpacing: "-0.04em",
                color: "#07294C",
              }}
            >
              Paid in full
            </div>
            <div
              style={{
                fontSize: "15px",
                fontWeight: "700",
                color: "#07294C",
                marginTop: "6px",
              }}
            >
              Chase every balance
            </div>
            <div
              style={{ fontSize: "14px", color: "#66717C", marginTop: "4px" }}
            >
              See who owes what, on every job.
            </div>
          </div>
          <div
            className="ne-reveal"
            style={{
              background: "#FFF4E6",
              borderRadius: "22px",
              padding: "22px",
            }}
          >
            <div
              style={{
                fontSize: "28px",
                fontWeight: "800",
                letterSpacing: "-0.04em",
                color: "#07294C",
              }}
            >
              Per event
            </div>
            <div
              style={{
                fontSize: "15px",
                fontWeight: "700",
                color: "#07294C",
                marginTop: "6px",
              }}
            >
              Know your real profit
            </div>
            <div
              style={{ fontSize: "14px", color: "#66717C", marginTop: "4px" }}
            >
              Not a guess at month end.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Story() {
  return (
    <section id="about" style={{ padding: "72px 0 0" }}>
      <div style={{ maxWidth: "1440px", margin: "0 auto", padding: "0 20px" }}>
        <div
          className="ne-band"
          style={{
            background: "#FFF4E6",
            borderRadius: "36px",
            padding: "88px 0",
          }}
        >
          <div
            className="ne-wrap"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "48px",
              alignItems: "center",
            }}
          >
            <div
              className="ne-reveal"
              style={{ flex: "1 1 420px", minWidth: "0" }}
            >
              <span className="ne-pill">Built by operators</span>
              <h2
                className="ne-h2"
                style={{ marginTop: "22px", color: "#07294C" }}
              >
                We run events too.{" "}
                <span
                  className="ne-serif"
                  style={{ boxShadow: "inset 0 -0.26em 0 #FFC17D" }}
                >
                  So we built the tool we needed.
                </span>
              </h2>
              <p
                style={{
                  fontSize: "17px",
                  lineHeight: "1.65",
                  color: "#4A5663",
                  margin: "22px 0 0",
                  maxWidth: "520px",
                }}
              >
                NeoOps runs NeoEdge Fusion's own events, from 360 booths to full
                productions. Every feature exists because we needed it on a real
                job first.
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  marginTop: "28px",
                }}
              >
                <div style={{ display: "flex" }}>
                  <img
                    src="/landing/crew-1.jpg"
                    alt="NeoEdge crew member"
                    style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      objectPosition: "top",
                      border: "3px solid #FFF4E6",
                      marginLeft: "0px",
                    }}
                  />
                  <img
                    src="/landing/crew-2.jpg"
                    alt="NeoEdge crew member"
                    style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      objectPosition: "top",
                      border: "3px solid #FFF4E6",
                      marginLeft: "-12px",
                    }}
                  />
                  <img
                    src="/landing/crew-3.jpg"
                    alt="NeoEdge crew member"
                    style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      objectPosition: "top",
                      border: "3px solid #FFF4E6",
                      marginLeft: "-12px",
                    }}
                  />
                  <img
                    src="/landing/crew-4.jpg"
                    alt="NeoEdge crew member"
                    style={{
                      width: "52px",
                      height: "52px",
                      borderRadius: "50%",
                      objectFit: "cover",
                      objectPosition: "top",
                      border: "3px solid #FFF4E6",
                      marginLeft: "-12px",
                    }}
                  />
                </div>
                <div style={{ fontSize: "14px", color: "#4A5663" }}>
                  <strong style={{ color: "#07294C" }}>The NeoEdge crew</strong>
                  <br />
                  Booth operators, producers and planners who run our jobs on
                  NeoOps.
                </div>
              </div>
            </div>
            <figure
              className="ne-reveal"
              style={{
                flex: "1 1 420px",
                minWidth: "0",
                margin: "0",
                position: "relative",
                borderRadius: "28px",
                overflow: "hidden",
                boxShadow: "0 30px 80px rgba(7,41,76,.14)",
                minHeight: "440px",
              }}
            >
              <img
                src="/landing/stage.jpg"
                alt="A NeoEdge conference stage set, run on NeoOps"
                style={{
                  position: "absolute",
                  inset: "0",
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
              <figcaption
                style={{
                  position: "absolute",
                  left: "16px",
                  right: "16px",
                  bottom: "16px",
                  background: "rgba(255,255,255,.95)",
                  borderRadius: "16px",
                  padding: "14px 16px",
                  fontSize: "14px",
                  color: "#4A5663",
                }}
              >
                <strong
                  style={{
                    color: "#07294C",
                    display: "block",
                    fontSize: "15px",
                  }}
                >
                  Run on NeoOps
                </strong>
                A NeoEdge conference production: kit scanned out, crew on one
                checklist, profit known at close.
              </figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section className="ne-sec" id="how" style={{ padding: "110px 0 0" }}>
      <div className="ne-wrap">
        <div
          className="ne-reveal"
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: "32px",
          }}
        >
          <div>
            <span className="ne-pill">Getting started</span>
            <h2
              className="ne-h2"
              style={{ marginTop: "22px", color: "#07294C", maxWidth: "927px" }}
            >
              Up and running{" "}
              <span
                className="ne-serif"
                style={{ boxShadow: "inset 0 -0.26em 0 #FFC17D" }}
              >
                before your next event.
              </span>
            </h2>
          </div>
          <p
            style={{
              maxWidth: "380px",
              color: "#66717C",
              margin: "0",
              fontSize: "16px",
            }}
          >
            No long training. No big switch-over. Start with one event and grow
            from there.
          </p>
        </div>
        <ol
          style={{
            listStyle: "none",
            padding: "0",
            margin: "48px 0 0",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "16px",
          }}
        >
          <li
            className="ne-card ne-reveal"
            style={{ background: "#FFF8EF", padding: "32px" }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "800",
                color: "#07294C",
                boxShadow: "0 6px 16px rgba(7,41,76,.08)",
              }}
            >
              1
            </div>
            <h3
              style={{
                fontSize: "23px",
                letterSpacing: "-0.03em",
                margin: "22px 0 0",
                color: "#07294C",
              }}
            >
              Add your items and clients
            </h3>
            <p
              style={{ fontSize: "15px", color: "#66717C", margin: "8px 0 0" }}
            >
              Add what you rent and the clients you work with. Start with one
              event and add the rest as you go.
            </p>
          </li>
          <li
            className="ne-card ne-reveal"
            style={{ background: "#F1F5FA", padding: "32px" }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "800",
                color: "#07294C",
                boxShadow: "0 6px 16px rgba(7,41,76,.08)",
              }}
            >
              2
            </div>
            <h3
              style={{
                fontSize: "23px",
                letterSpacing: "-0.03em",
                margin: "22px 0 0",
                color: "#07294C",
              }}
            >
              Share your booking link
            </h3>
            <p
              style={{ fontSize: "15px", color: "#66717C", margin: "8px 0 0" }}
            >
              Put it in your Instagram bio, WhatsApp status and ads. Every click
              lands on a page that takes the booking and the deposit.
            </p>
          </li>
          <li
            className="ne-card ne-reveal"
            style={{ background: "#FFF8EF", padding: "32px" }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "#07294C",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "800",
                color: "#FFC17D",
              }}
            >
              3
            </div>
            <h3
              style={{
                fontSize: "23px",
                letterSpacing: "-0.03em",
                margin: "22px 0 0",
                color: "#07294C",
              }}
            >
              Run the event, see the profit
            </h3>
            <p
              style={{ fontSize: "15px", color: "#66717C", margin: "8px 0 0" }}
            >
              Scan kit, tick tasks, collect balances. The moment it wraps, you
              see exactly what you made, so you know which jobs to chase and how
              to price the next one.
            </p>
          </li>
        </ol>
      </div>
    </section>
  );
}

export function ForWho() {
  return (
    <section className="ne-sec" id="for-who" style={{ padding: "110px 0 0" }}>
      <div className="ne-wrap">
        <div
          className="ne-reveal"
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: "32px",
          }}
        >
          <div>
            <span className="ne-pill">For who</span>
            <h2
              className="ne-h2"
              style={{ marginTop: "22px", color: "#07294C" }}
            >
              Made for the businesses that{" "}
              <span
                className="ne-serif"
                style={{ boxShadow: "inset 0 -0.26em 0 #FFC17D" }}
              >
                make events happen.
              </span>
            </h2>
          </div>
          <p
            style={{
              maxWidth: "380px",
              color: "#66717C",
              margin: "0",
              fontSize: "16px",
            }}
          >
            Whatever your part in the event, NeoOps keeps every job, item and
            payment in one place.
          </p>
        </div>
        <div
          className="ne-forwho"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "14px",
            marginTop: "48px",
          }}
        >
          <Link
            className="ne-tile ne-reveal"
            to="/register"
            style={{
              display: "block",
              position: "relative",
              borderRadius: "24px",
              overflow: "hidden",
              height: "340px",
              textDecoration: "none",
              marginTop: "20px",
            }}
          >
            <img
              className="ne-zoom"
              src="/landing/for-operators.jpg"
              alt="Exhibition arena welcome signage at a large event"
              style={{
                position: "absolute",
                inset: "0",
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: "0",
                background:
                  "linear-gradient(180deg, transparent 45%, rgba(7,41,76,.85))",
              }}
            ></div>
            <div
              style={{
                position: "absolute",
                left: "18px",
                right: "18px",
                bottom: "18px",
                color: "#FFFFFF",
              }}
            >
              <div style={{ fontSize: "18px", fontWeight: "800" }}>
                Event operators
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: "rgba(255,255,255,.85)",
                  marginTop: "4px",
                }}
              >
                Run every job from one place
              </div>
            </div>
          </Link>
          <Link
            className="ne-tile ne-reveal"
            to="/register"
            style={{
              display: "block",
              position: "relative",
              borderRadius: "24px",
              overflow: "hidden",
              height: "340px",
              textDecoration: "none",
            }}
          >
            <img
              className="ne-zoom"
              src="/landing/for-planners.jpg"
              alt="Delegates at a conference planned and run on the day"
              style={{
                position: "absolute",
                inset: "0",
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: "0",
                background:
                  "linear-gradient(180deg, transparent 45%, rgba(7,41,76,.85))",
              }}
            ></div>
            <div
              style={{
                position: "absolute",
                left: "18px",
                right: "18px",
                bottom: "18px",
                color: "#FFFFFF",
              }}
            >
              <div style={{ fontSize: "18px", fontWeight: "800" }}>
                Event planners
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: "rgba(255,255,255,.85)",
                  marginTop: "4px",
                }}
              >
                Know what each vendor costs and what you keep
              </div>
            </div>
          </Link>
          <Link
            className="ne-tile ne-reveal"
            to="/register"
            style={{
              display: "block",
              position: "relative",
              borderRadius: "24px",
              overflow: "hidden",
              height: "340px",
              textDecoration: "none",
              marginTop: "28px",
            }}
          >
            <img
              className="ne-zoom"
              src="/landing/for-rentals.jpg"
              alt="Stage decor, seating and plants set up for a conference"
              style={{
                position: "absolute",
                inset: "0",
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: "0",
                background:
                  "linear-gradient(180deg, transparent 45%, rgba(7,41,76,.85))",
              }}
            ></div>
            <div
              style={{
                position: "absolute",
                left: "18px",
                right: "18px",
                bottom: "18px",
                color: "#FFFFFF",
              }}
            >
              <div style={{ fontSize: "18px", fontWeight: "800" }}>
                Rentals &amp; decor
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: "rgba(255,255,255,.85)",
                  marginTop: "4px",
                }}
              >
                Know what's out, what's due back and what's damaged
              </div>
            </div>
          </Link>
          <Link
            className="ne-tile ne-reveal"
            to="/register"
            style={{
              display: "block",
              position: "relative",
              borderRadius: "24px",
              overflow: "hidden",
              height: "340px",
              textDecoration: "none",
              marginTop: "48px",
            }}
          >
            <img
              className="ne-zoom"
              src="/landing/for-av.jpg"
              alt="Auditorium with LED screens and AV production"
              style={{
                position: "absolute",
                inset: "0",
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: "0",
                background:
                  "linear-gradient(180deg, transparent 45%, rgba(7,41,76,.85))",
              }}
            ></div>
            <div
              style={{
                position: "absolute",
                left: "18px",
                right: "18px",
                bottom: "18px",
                color: "#FFFFFF",
              }}
            >
              <div style={{ fontSize: "18px", fontWeight: "800" }}>
                Sound, light &amp; AV
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: "rgba(255,255,255,.85)",
                  marginTop: "4px",
                }}
              >
                Every mic, speaker and screen back and working
              </div>
            </div>
          </Link>
          <Link
            className="ne-tile ne-reveal"
            to="/register"
            style={{
              display: "block",
              position: "relative",
              borderRadius: "24px",
              overflow: "hidden",
              height: "340px",
              textDecoration: "none",
              marginTop: "20px",
            }}
          >
            <img
              className="ne-zoom"
              src="/landing/for-media.jpg"
              alt="Guests creating content at a brand activation"
              style={{
                position: "absolute",
                inset: "0",
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: "0",
                background:
                  "linear-gradient(180deg, transparent 45%, rgba(7,41,76,.85))",
              }}
            ></div>
            <div
              style={{
                position: "absolute",
                left: "18px",
                right: "18px",
                bottom: "18px",
                color: "#FFFFFF",
              }}
            >
              <div style={{ fontSize: "18px", fontWeight: "800" }}>
                Photo &amp; video
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: "rgba(255,255,255,.85)",
                  marginTop: "4px",
                }}
              >
                Paid for every shoot
              </div>
            </div>
          </Link>
          <Link
            className="ne-tile ne-reveal"
            to="/register"
            style={{
              display: "block",
              position: "relative",
              borderRadius: "24px",
              overflow: "hidden",
              height: "340px",
              textDecoration: "none",
            }}
          >
            <img
              className="ne-zoom"
              src="/landing/for-booths.jpg"
              alt="Guest at a brand activation"
              style={{
                position: "absolute",
                inset: "0",
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: "0",
                background:
                  "linear-gradient(180deg, transparent 45%, rgba(7,41,76,.85))",
              }}
            ></div>
            <div
              style={{
                position: "absolute",
                left: "18px",
                right: "18px",
                bottom: "18px",
                color: "#FFFFFF",
              }}
            >
              <div style={{ fontSize: "18px", fontWeight: "800" }}>
                Brand activations
              </div>
              <div
                style={{
                  fontSize: "14px",
                  color: "rgba(255,255,255,.85)",
                  marginTop: "4px",
                }}
              >
                Quote, staff and get paid for every brand event
              </div>
            </div>
          </Link>
        </div>
      </div>
      <div className="ne-wrap">
        <div
          className="ne-reveal"
          style={{
            marginTop: "22px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "18px",
            background: "#FFF4E6",
            borderRadius: "24px",
            padding: "22px 26px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span
              className="ne-badge"
              style={{ width: "46px", height: "46px", flex: "none" }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#FFC17D"
                strokeWidth="2.2"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7"></circle>
                <path d="M20 20l-4-4"></path>
              </svg>
            </span>
            <div>
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: "800",
                  color: "#07294C",
                }}
              >
                Looking to rent gear for your event?{" "}
                <span
                  style={{
                    fontSize: "10px",
                    letterSpacing: ".1em",
                    textTransform: "uppercase",
                    background: "#07294C",
                    color: "#FFC17D",
                    padding: "2px 7px",
                    borderRadius: "999px",
                    verticalAlign: "middle",
                  }}
                >
                  Soon
                </span>
              </div>
              <div style={{ fontSize: "14px", color: "#4A5663" }}>
                The NeoOps event marketplace is coming: chairs, sound, lighting,
                booths, tents and more from event businesses near you.
              </div>
            </div>
          </div>

          <Link
            className="ne-btn ne-btn-navy"
            to="/marketplace"
            style={{ minHeight: "46px" }}
          >
            See what's coming{" "}
            <span
              className="ne-arrow"
              style={{ width: "32px", height: "32px", background: "#FFC17D" }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#07294C"
                strokeWidth="2.4"
                aria-hidden="true"
              >
                <path d="M7 17L17 7M9 7h8v8"></path>
              </svg>
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}

export function Faq({ premiumAnswer }: { premiumAnswer: React.ReactNode }) {
  return (
    <section className="ne-sec" style={{ padding: "110px 0 0" }}>
      <div
        className="ne-wrap"
        style={{ display: "flex", flexWrap: "wrap", gap: "56px" }}
      >
        <div className="ne-reveal" style={{ flex: "1 1 320px", minWidth: "0" }}>
          <span className="ne-pill">Questions</span>
          <h2
            className="ne-h2"
            style={{ marginTop: "22px", fontSize: "54px", color: "#07294C" }}
          >
            Still thinking{" "}
            <span
              className="ne-serif"
              style={{ boxShadow: "inset 0 -0.26em 0 #FFC17D" }}
            >
              about it?
            </span>
          </h2>
          <p style={{ fontSize: "16px", color: "#66717C", margin: "18px 0 0" }}>
            Ask us anything at{" "}
            <a
              href="mailto:info@neoedgefusion.com"
              style={{ fontWeight: "800" }}
            >
              info@neoedgefusion.com
            </a>
            .
          </p>
        </div>
        <div
          style={{
            flex: "2 1 560px",
            minWidth: "0",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <details
            className="ne-faq"
            style={{
              background: "#F1F5FA",
              borderRadius: "20px",
              padding: "22px 24px",
            }}
          >
            <summary
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "16px",
                fontSize: "18px",
                fontWeight: "700",
                color: "#07294C",
              }}
            >
              I run everything on Excel. Is switching hard?
              <span
                className="ne-plus"
                aria-hidden="true"
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  background: "#FFFFFF",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  flex: "none",
                }}
              >
                +
              </span>
            </summary>
            <p
              style={{
                fontSize: "15px",
                lineHeight: "1.65",
                color: "#4A5663",
                margin: "14px 0 0",
              }}
            >
              No. Start with your next event only. Add the client, the items and
              the invoice, and keep everything else as it is until you're ready.
              Your inventory can grow one job at a time.
            </p>
          </details>
          <details
            className="ne-faq"
            style={{
              background: "#F1F5FA",
              borderRadius: "20px",
              padding: "22px 24px",
            }}
          >
            <summary
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "16px",
                fontSize: "18px",
                fontWeight: "700",
                color: "#07294C",
              }}
            >
              Can my crew use it on their phones?
              <span
                className="ne-plus"
                aria-hidden="true"
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  background: "#FFFFFF",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  flex: "none",
                }}
              >
                +
              </span>
            </summary>
            <p
              style={{
                fontSize: "15px",
                lineHeight: "1.65",
                color: "#4A5663",
                margin: "14px 0 0",
              }}
            >
              Yes. The scanner uses the phone camera, checklists work on any
              phone, and roles control who can see money. Install it like an
              app, and it keeps working on site with poor network, then syncs
              when you're back online.
            </p>
          </details>
          <details
            className="ne-faq"
            style={{
              background: "#F1F5FA",
              borderRadius: "20px",
              padding: "22px 24px",
            }}
          >
            <summary
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "16px",
                fontSize: "18px",
                fontWeight: "700",
                color: "#07294C",
              }}
            >
              Can customers really book and pay online?
              <span
                className="ne-plus"
                aria-hidden="true"
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  background: "#FFFFFF",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  flex: "none",
                }}
              >
                +
              </span>
            </summary>
            <p
              style={{
                fontSize: "15px",
                lineHeight: "1.65",
                color: "#4A5663",
                margin: "14px 0 0",
              }}
            >
              Yes. Share your storefront link, choose a deposit (25%, 50% or
              full), and paid bookings are confirmed with an invoice and receipt
              sent to the customer.
            </p>
          </details>
          <details
            className="ne-faq"
            style={{
              background: "#F1F5FA",
              borderRadius: "20px",
              padding: "22px 24px",
            }}
          >
            <summary
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "16px",
                fontSize: "18px",
                fontWeight: "700",
                color: "#07294C",
              }}
            >
              Will my clients trust paying me through NeoOps?
              <span
                className="ne-plus"
                aria-hidden="true"
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  background: "#FFFFFF",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  flex: "none",
                }}
              >
                +
              </span>
            </summary>
            <p
              style={{
                fontSize: "15px",
                lineHeight: "1.65",
                color: "#4A5663",
                margin: "14px 0 0",
              }}
            >
              That's the point. Every quote, invoice and receipt carries your
              business name and bank details, and each payment you record sends
              the client a receipt. Clients can see all their documents in your
              client portal, and storefront payments go through licensed payment
              providers.
            </p>
          </details>
          <details
            className="ne-faq"
            style={{
              background: "#F1F5FA",
              borderRadius: "20px",
              padding: "22px 24px",
            }}
          >
            <summary
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "16px",
                fontSize: "18px",
                fontWeight: "700",
                color: "#07294C",
              }}
            >
              Is my business data safe?
              <span
                className="ne-plus"
                aria-hidden="true"
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  background: "#FFFFFF",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  flex: "none",
                }}
              >
                +
              </span>
            </summary>
            <p
              style={{
                fontSize: "15px",
                lineHeight: "1.65",
                color: "#4A5663",
                margin: "14px 0 0",
              }}
            >
              Only your team sees your workspace, and privacy mode hides amounts
              on screen when someone's looking over your shoulder.
            </p>
          </details>
          <details
            className="ne-faq"
            style={{
              background: "#F1F5FA",
              borderRadius: "20px",
              padding: "22px 24px",
            }}
          >
            <summary
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "16px",
                fontSize: "18px",
                fontWeight: "700",
                color: "#07294C",
              }}
            >
              What does Premium cost?
              <span
                className="ne-plus"
                aria-hidden="true"
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  background: "#FFFFFF",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "20px",
                  flex: "none",
                }}
              >
                +
              </span>
            </summary>
            <p
              style={{
                fontSize: "15px",
                lineHeight: "1.65",
                color: "#4A5663",
                margin: "14px 0 0",
              }}
            >
              {premiumAnswer}
            </p>
          </details>
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section style={{ padding: "110px 0" }}>
      <div className="ne-wrap">
        <div
          className="ne-reveal ne-cta-box"
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: "36px",
            background: "linear-gradient(135deg, #E3ECF5 0%, #FFF4E6 100%)",
            padding: "88px 40px",
            textAlign: "center",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              width: "520px",
              height: "520px",
              left: "50%",
              top: "-300px",
              transform: "translateX(-50%)",
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(255,193,125,.45), transparent 65%)",
            }}
          ></div>
          <div style={{ position: "relative" }}>
            <span className="ne-pill">Your next event</span>
            <h2
              className="ne-h2"
              style={{
                margin: "22px auto 0",
                maxWidth: "880px",
                fontSize: "68px",
                color: "#07294C",
              }}
            >
              Run it on NeoOps.{" "}
              <span
                className="ne-serif"
                style={{ boxShadow: "inset 0 -0.26em 0 #FFC17D" }}
              >
                Keep the profit it makes.
              </span>
            </h2>
            <p
              style={{
                fontSize: "18px",
                color: "#4A5663",
                margin: "22px auto 0",
                maxWidth: "520px",
              }}
            >
              Start with your next event. See the profit when it closes.
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "12px",
                flexWrap: "wrap",
                marginTop: "34px",
              }}
            >
              <Link className="ne-btn ne-btn-navy" to="/register">
                Start for free{" "}
                <span className="ne-arrow" style={{ background: "#FFC17D" }}>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#07294C"
                    strokeWidth="2.4"
                    aria-hidden="true"
                  >
                    <path d="M7 17L17 7M9 7h8v8"></path>
                  </svg>
                </span>
              </Link>
              <a
                className="ne-btn ne-btn-paper"
                href="mailto:info@neoedgefusion.com"
                style={{ background: "#FFFFFF" }}
              >
                Email us
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function CostCalculator() {
  const [events, setEvents] = useState(6);
  const [jobValue, setJobValue] = useState(250000);
  const [kit, setKit] = useState(30000);
  const [hours, setHours] = useState(8);
  // Assumes 5% of invoiced value slips without tracking.
  const slip = events * jobValue * 12 * 0.05;
  const kitYear = kit * 12;
  const days = Math.round((hours * 52) / 8);
  const num =
    (set: (n: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) =>
      set(Number(e.target.value));
  const eventsLabel = `${events} events`;
  const valueLabel = naira(jobValue);
  const kitLabel = naira(kit);
  const hoursLabel = `${hours} hrs`;
  const slipLabel = naira(slip);
  const kitYearLabel = naira(kitYear);
  const daysLabel = `${days} days`;
  const totalLabel = naira(slip + kitYear);
  const onEvents = num(setEvents);
  const onValue = num(setJobValue);
  const onKit = num(setKit);
  const onHours = num(setHours);
  return (
    <section className="ne-sec" id="cost" style={{ padding: "110px 0 0" }}>
      <div style={{ maxWidth: "1440px", margin: "0 auto", padding: "0 20px" }}>
        <div
          className="ne-band"
          style={{
            background: "#F1F5FA",
            borderRadius: "36px",
            padding: "88px 0",
          }}
        >
          <div
            className="ne-wrap"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "48px",
              alignItems: "center",
            }}
          >
            <div
              className="ne-reveal"
              style={{ flex: "1 1 400px", minWidth: "0" }}
            >
              <span className="ne-pill">The real cost of running on Excel</span>
              <h2
                className="ne-h2"
                style={{ marginTop: "22px", color: "#07294C" }}
              >
                How much is your business{" "}
                <span
                  className="ne-serif"
                  style={{ boxShadow: "inset 0 -0.26em 0 #FFC17D" }}
                >
                  quietly losing?
                </span>
              </h2>
              <p
                style={{
                  fontSize: "17px",
                  lineHeight: "1.65",
                  color: "#4A5663",
                  margin: "22px 0 0",
                }}
              >
                A balance nobody chased. Two linens that never came back. A
                weekend request you saw on Monday. None of it feels big on the
                day. Move the sliders and see what it adds up to in a year.
              </p>
              <p
                style={{
                  fontSize: "17px",
                  lineHeight: "1.65",
                  color: "#07294C",
                  fontWeight: "600",
                  margin: "14px 0 0",
                }}
              >
                Then there's the cost you can't put a price on: the client who
                saw a dead speaker on stage, and the argument over who pays for
                the broken screen.
              </p>
              <ul
                style={{
                  listStyle: "none",
                  padding: "0",
                  margin: "26px 0 0",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  fontSize: "15px",
                  color: "#07294C",
                  fontWeight: "600",
                }}
              >
                <li style={{ display: "flex", gap: "10px" }}>
                  <span
                    style={{
                      width: "22px",
                      height: "22px",
                      borderRadius: "50%",
                      background: "#FFEBD2",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flex: "none",
                      fontSize: "12px",
                    }}
                  >
                    1
                  </span>
                  Payments that slip through the cracks
                </li>
                <li style={{ display: "flex", gap: "10px" }}>
                  <span
                    style={{
                      width: "22px",
                      height: "22px",
                      borderRadius: "50%",
                      background: "#FFEBD2",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flex: "none",
                      fontSize: "12px",
                    }}
                  >
                    2
                  </span>
                  Kit that goes missing or comes back broken
                </li>
                <li style={{ display: "flex", gap: "10px" }}>
                  <span
                    style={{
                      width: "22px",
                      height: "22px",
                      borderRadius: "50%",
                      background: "#FFEBD2",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flex: "none",
                      fontSize: "12px",
                    }}
                  >
                    3
                  </span>
                  Hours lost to paperwork and chasing
                </li>
              </ul>
            </div>

            <div
              className="ne-reveal ne-calc"
              style={{
                flex: "1 1 480px",
                minWidth: "0",
                background: "#FFFFFF",
                borderRadius: "28px",
                padding: "32px",
                boxShadow: "0 30px 80px rgba(7,41,76,.1)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "22px",
                }}
              >
                <label style={{ display: "block" }}>
                  <span
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "14px",
                      fontWeight: "700",
                      color: "#07294C",
                    }}
                  >
                    <span>Events you run a month</span>
                    <span style={{ color: "#66717C" }}>{eventsLabel}</span>
                  </span>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="1"
                    value={events}
                    onChange={onEvents}
                    style={{
                      width: "100%",
                      marginTop: "10px",
                      accentColor: "#07294C",
                    }}
                  />
                </label>
                <label style={{ display: "block" }}>
                  <span
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "14px",
                      fontWeight: "700",
                      color: "#07294C",
                    }}
                  >
                    <span>Average value of one job</span>
                    <span style={{ color: "#66717C" }}>{valueLabel}</span>
                  </span>
                  <input
                    type="range"
                    min="50000"
                    max="2000000"
                    step="50000"
                    value={jobValue}
                    onChange={onValue}
                    style={{
                      width: "100%",
                      marginTop: "10px",
                      accentColor: "#07294C",
                    }}
                  />
                </label>
                <label style={{ display: "block" }}>
                  <span
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "14px",
                      fontWeight: "700",
                      color: "#07294C",
                    }}
                  >
                    <span>Kit lost or damaged a month</span>
                    <span style={{ color: "#66717C" }}>{kitLabel}</span>
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="500000"
                    step="10000"
                    value={kit}
                    onChange={onKit}
                    style={{
                      width: "100%",
                      marginTop: "10px",
                      accentColor: "#07294C",
                    }}
                  />
                </label>
                <label style={{ display: "block" }}>
                  <span
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "14px",
                      fontWeight: "700",
                      color: "#07294C",
                    }}
                  >
                    <span>Hours a week on admin and chasing</span>
                    <span style={{ color: "#66717C" }}>{hoursLabel}</span>
                  </span>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="1"
                    value={hours}
                    onChange={onHours}
                    style={{
                      width: "100%",
                      marginTop: "10px",
                      accentColor: "#07294C",
                    }}
                  />
                </label>
              </div>
              <div
                style={{
                  marginTop: "28px",
                  background: "#07294C",
                  borderRadius: "22px",
                  padding: "24px",
                  color: "#FFFFFF",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    width: "260px",
                    height: "260px",
                    right: "-90px",
                    top: "-110px",
                    borderRadius: "50%",
                    background:
                      "radial-gradient(circle, rgba(255,193,125,.35), transparent 65%)",
                  }}
                ></div>
                <div style={{ position: "relative" }}>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: "800",
                      letterSpacing: ".14em",
                      color: "#FFC17D",
                    }}
                  >
                    ESTIMATED LEAK A YEAR
                  </div>
                  <div
                    className="ne-total"
                    style={{
                      fontSize: "52px",
                      fontWeight: "800",
                      letterSpacing: "-0.05em",
                      lineHeight: "1",
                      marginTop: "8px",
                    }}
                  >
                    {totalLabel}
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                      gap: "10px",
                      marginTop: "18px",
                      fontSize: "12px",
                      color: "rgba(255,255,255,.7)",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "15px",
                          fontWeight: "800",
                          color: "#FFFFFF",
                        }}
                      >
                        {slipLabel}
                      </div>
                      uncollected
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "15px",
                          fontWeight: "800",
                          color: "#FFFFFF",
                        }}
                      >
                        {kitYearLabel}
                      </div>
                      in lost kit
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "15px",
                          fontWeight: "800",
                          color: "#FFFFFF",
                        }}
                      >
                        {daysLabel}
                      </div>
                      working days
                    </div>
                  </div>
                </div>
              </div>
              <p
                style={{
                  fontSize: "12px",
                  color: "#66717C",
                  margin: "14px 0 0",
                }}
              >
                Assumes 5% of invoiced value slips without tracking. Your
                numbers will differ. NeoOps is free to start.
              </p>
              <Link
                className="ne-btn ne-btn-navy"
                to="/register"
                style={{
                  marginTop: "18px",
                  width: "100%",
                  justifyContent: "space-between",
                }}
              >
                Stop the leak, start free{" "}
                <span className="ne-arrow" style={{ background: "#FFC17D" }}>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#07294C"
                    strokeWidth="2.4"
                    aria-hidden="true"
                  >
                    <path d="M7 17L17 7M9 7h8v8"></path>
                  </svg>
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Section header for the features area; `action` replaces the default CTA. */
export function FeaturesIntro({ children }: { children?: React.ReactNode }) {
  return (
    <section className="ne-sec" id="modules" style={{ padding: "110px 0 0" }}>
      <div className="ne-wrap">
        {/* Split header */}
        <div
          className="ne-reveal"
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: "32px 56px",
          }}
        >
          <div style={{ flex: "1 1 520px", minWidth: "0" }}>
            <span className="ne-pill">What NeoOps does</span>
            <h2
              className="ne-h2"
              style={{
                marginTop: "22px",
                color: "#07294C",
                fontSize: "64px",
                maxWidth: "543px",
              }}
            >
              Rent it. Run it. Bill it.
              <br />
              <span
                className="ne-serif"
                style={{
                  color: "#07294C",
                  boxShadow: "inset 0 -0.26em 0 #FFC17D",
                }}
              >
                See the profit.
              </span>
            </h2>
          </div>
          <div style={{ flex: "0 1 400px", minWidth: "0" }}>
            <p
              style={{
                fontSize: "17px",
                lineHeight: "1.65",
                color: "#66717C",
                margin: "0",
                maxWidth: "409px",
              }}
            >
              Every booking, item and invoice in one place. Know who owes you,
              what's out on a job, and what each event made.
            </p>
            <Link
              className="ne-btn ne-btn-navy"
              to="/register"
              style={{ marginTop: "24px" }}
            >
              Start for free{" "}
              <span className="ne-arrow" style={{ background: "#FFC17D" }}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#07294C"
                  strokeWidth="2.4"
                  aria-hidden="true"
                >
                  <path d="M7 17L17 7M9 7h8v8"></path>
                </svg>
              </span>
            </Link>
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}

export function ProductTour() {
  const [tab, setTab] = useState(1);
  const t = (n: number) => ({
    on: tab === n,
    cls: tab === n ? "pt-tab on" : "pt-tab",
    pressed: tab === n,
    pick: () => setTab(n),
  });
  const [t1, t2, t3, t4, t5, t6] = [1, 2, 3, 4, 5, 6].map(t);
  return (
    <section className="ne-sec" style={{ padding: "0" }}>
      <div className="ne-wrap">
        <div className="ne-reveal" style={{ marginTop: "56px" }}>
          <div className="pt-tabs" role="group" aria-label="Product tour">
            <button
              type="button"
              className={t1.cls}
              onClick={t1.pick}
              aria-pressed={t1.pressed}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"></path>
              </svg>
              <span>Bookings</span>
            </button>
            <button
              type="button"
              className={t2.cls}
              onClick={t2.pick}
              aria-pressed={t2.pressed}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8"></path>
              </svg>
              <span>Inventory</span>
            </button>
            <button
              type="button"
              className={t5.cls}
              onClick={t5.pick}
              aria-pressed={t5.pressed}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h9"></path>
              </svg>
              <span>Checklists</span>
            </button>
            <button
              type="button"
              className={t3.cls}
              onClick={t3.pick}
              aria-pressed={t3.pressed}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M8 13h8M8 17h5"></path>
              </svg>
              <span>Invoices</span>
            </button>
            <button
              type="button"
              className={t4.cls}
              onClick={t4.pick}
              aria-pressed={t4.pressed}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M3 13h8V3H3zm10 8h8V11h-8zM3 21h8v-6H3zm10-18v6h8V3z"></path>
              </svg>
              <span>Profit &amp; loss</span>
            </button>
            <button
              type="button"
              className={t6.cls}
              onClick={t6.pick}
              aria-pressed={t6.pressed}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z"></path>
              </svg>
              <span>Clients</span>
            </button>
          </div>
          <div className="pt-box">
            {t1.on && (
              <>
                <div className="pt-pane">
                  <div className="pt-copy">
                    <div
                      className="ne-eyebrow"
                      style={{ fontSize: "11px", color: "rgba(7,41,76,.55)" }}
                    >
                      01 · Rent
                    </div>
                    <h3>Bookings &amp; storefront</h3>
                    <p>
                      Your storefront checks availability by date, so two
                      clients never book the same LED wall. Customers pay a
                      deposit to lock the date, or send a request so you can
                      confirm and quote first.
                    </p>
                    <ul>
                      <li>
                        <span className="pt-tick">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#07294C"
                            strokeWidth="3"
                            aria-hidden="true"
                          >
                            <path d="M5 12l5 5 9-10"></path>
                          </svg>
                        </span>
                        Public storefront at your own link
                      </li>
                      <li>
                        <span className="pt-tick">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#07294C"
                            strokeWidth="3"
                            aria-hidden="true"
                          >
                            <path d="M5 12l5 5 9-10"></path>
                          </svg>
                        </span>
                        Deposits of 25%, 50% or full payment upfront
                      </li>
                      <li>
                        <span className="pt-tick">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#07294C"
                            strokeWidth="3"
                            aria-hidden="true"
                          >
                            <path d="M5 12l5 5 9-10"></path>
                          </svg>
                        </span>
                        Client portal for their quotes and invoices
                      </li>
                    </ul>
                    <Link className="pt-link" to="/register">
                      Try it free{" "}
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        aria-hidden="true"
                      >
                        <path d="M5 12h14M13 6l6 6-6 6"></path>
                      </svg>
                    </Link>
                  </div>
                  <div className="pt-stage">
                    <div className="ap-frame">
                      <div className="ap-chrome">
                        <span></span>
                        <span></span>
                        <span></span>
                        <div className="ap-url">
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M5 11h14v10H5zM8 11V7a4 4 0 018 0v4"></path>
                          </svg>
                          getneoops.com/app/bookings
                        </div>
                      </div>
                      <div className="ap-body">
                        <aside className="ap-side">
                          <div className="ap-logo">
                            <span className="ap-mark">N</span>NeoOps
                          </div>
                          <div className="ap-biz">
                            NeoEdge Fusion
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#66717C"
                              strokeWidth="2.4"
                              aria-hidden="true"
                            >
                              <path d="M6 9l6 6 6-6"></path>
                            </svg>
                          </div>
                          <div className="ap-nav">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M3 13h8V3H3zm10 8h8V11h-8zM3 21h8v-6H3zm10-18v6h8V3z"></path>
                            </svg>
                            <span>Dashboard</span>
                          </div>
                          <div className="ap-nav on">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"></path>
                            </svg>
                            <span>Bookings</span>
                          </div>
                          <div className="ap-nav">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8"></path>
                            </svg>
                            <span>Inventory</span>
                          </div>
                          <div className="ap-nav">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M8 13h8M8 17h5"></path>
                            </svg>
                            <span>Invoices</span>
                          </div>
                          <div className="ap-nav">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M3 7h18v13H3zM8 7V4h8v3"></path>
                            </svg>
                            <span>Projects</span>
                          </div>
                          <div className="ap-nav">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h9"></path>
                            </svg>
                            <span>Tasks</span>
                          </div>
                          <div className="ap-nav">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z"></path>
                            </svg>
                            <span>Clients</span>
                          </div>
                          <div className="ap-plan">
                            <b>Premium</b>
                            <span>Unlimited invoices and bookings</span>
                          </div>
                        </aside>
                        <div className="ap-main">
                          <div className="ap-top">
                            <div>
                              <div className="ap-h">Bookings</div>
                              <div className="ap-sub">November · 16 jobs</div>
                            </div>
                            <div className="ap-btn">+ New booking</div>
                          </div>
                          <div className="ap-fchips">
                            <span className="ap-fchip on">All 16</span>
                            <span className="ap-fchip">Request 3</span>
                            <span className="ap-fchip">Booked 5</span>
                            <span className="ap-fchip">Confirmed 4</span>
                            <span className="ap-fchip">Picked up 2</span>
                            <span className="ap-fchip">Returned 2</span>
                          </div>
                          <div className="ap-table">
                            <div className="ap-th">
                              <span>Client &amp; items</span>
                              <span>Event date</span>
                              <span>Amount</span>
                              <span>Status</span>
                            </div>
                            <div className="ap-tr">
                              <span>
                                <b>Adaeze &amp; Tobi wedding</b>
                                <em>LED wall, 360 booth</em>
                              </span>
                              <span>Sat 14 Nov</span>
                              <span>₦1,450,000</span>
                              <span>
                                <span
                                  className="ap-pill"
                                  style={{
                                    background: "#E6F4EA",
                                    color: "#1E7A3C",
                                  }}
                                >
                                  Confirmed
                                </span>
                              </span>
                            </div>
                            <div className="ap-tr">
                              <span>
                                <b>Halcyon staff party</b>
                                <em>Sound, lights, stage</em>
                              </span>
                              <span>Fri 20 Nov</span>
                              <span>₦2,100,000</span>
                              <span>
                                <span
                                  className="ap-pill"
                                  style={{
                                    background: "#E3ECF5",
                                    color: "#07294C",
                                  }}
                                >
                                  Booked
                                </span>
                              </span>
                            </div>
                            <div className="ap-tr hl">
                              <span>
                                <b>Storefront request</b>
                                <em>200 chairs, 20 tables</em>
                              </span>
                              <span>Sat 21 Nov</span>
                              <span>₦185,000</span>
                              <span>
                                <span
                                  className="ap-pill"
                                  style={{
                                    background: "#FFF4E6",
                                    color: "#9A5B12",
                                  }}
                                >
                                  Request
                                </span>
                              </span>
                            </div>
                            <div className="ap-tr">
                              <span>
                                <b>HR Summit Lagos</b>
                                <em>Teleprompter, mics</em>
                              </span>
                              <span>Thu 5 Nov</span>
                              <span>₦640,000</span>
                              <span>
                                <span
                                  className="ap-pill"
                                  style={{
                                    background: "#EEE9FB",
                                    color: "#5B3FA8",
                                  }}
                                >
                                  Picked up
                                </span>
                              </span>
                            </div>
                            <div className="ap-tr">
                              <span>
                                <b>Kemi 40th birthday</b>
                                <em>Photo booth</em>
                              </span>
                              <span>Sat 31 Oct</span>
                              <span>₦230,000</span>
                              <span>
                                <span
                                  className="ap-pill"
                                  style={{
                                    background: "#F1F3F5",
                                    color: "#4A5663",
                                  }}
                                >
                                  Returned
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      className="ap-float ne-float"
                      style={{ right: "-36px", bottom: "46px", width: "250px" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span className="ap-dot"></span>
                        <b style={{ fontSize: "12px" }}>
                          New storefront request
                        </b>
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#66717C",
                          marginTop: "4px",
                        }}
                      >
                        getneoops.com/public/store/neoedge
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginTop: "10px",
                        }}
                      >
                        <span style={{ fontSize: "15px", fontWeight: "800" }}>
                          ₦185,000
                        </span>
                        <span
                          className="ap-pill"
                          style={{ background: "#FFF4E6", color: "#9A5B12" }}
                        >
                          50% paid upfront
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
            {t2.on && (
              <>
                <div className="pt-pane">
                  <div className="pt-copy">
                    <div
                      className="ne-eyebrow"
                      style={{ fontSize: "11px", color: "rgba(7,41,76,.55)" }}
                    >
                      02 · Track
                    </div>
                    <h3>Inventory &amp; scanner</h3>
                    <p>
                      Check every item's condition before it leaves, so faulty
                      kit never reaches a client's event. Bulk-export QR labels
                      for a whole product line on day one.
                    </p>
                    <ul>
                      <li>
                        <span className="pt-tick">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#07294C"
                            strokeWidth="3"
                            aria-hidden="true"
                          >
                            <path d="M5 12l5 5 9-10"></path>
                          </svg>
                        </span>
                        Condition checked at pickup and return
                      </li>
                      <li>
                        <span className="pt-tick">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#07294C"
                            strokeWidth="3"
                            aria-hidden="true"
                          >
                            <path d="M5 12l5 5 9-10"></path>
                          </svg>
                        </span>
                        Good, available, rented and damaged counts
                      </li>
                      <li>
                        <span className="pt-tick">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#07294C"
                            strokeWidth="3"
                            aria-hidden="true"
                          >
                            <path d="M5 12l5 5 9-10"></path>
                          </svg>
                        </span>
                        QR labels, serials or bulk stock
                      </li>
                    </ul>
                    <Link className="pt-link" to="/register">
                      Try it free{" "}
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        aria-hidden="true"
                      >
                        <path d="M5 12h14M13 6l6 6-6 6"></path>
                      </svg>
                    </Link>
                  </div>
                  <div className="pt-stage">
                    <div className="ap-frame">
                      <div className="ap-chrome">
                        <span></span>
                        <span></span>
                        <span></span>
                        <div className="ap-url">
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M5 11h14v10H5zM8 11V7a4 4 0 018 0v4"></path>
                          </svg>
                          getneoops.com/app/inventory
                        </div>
                      </div>
                      <div className="ap-body">
                        <aside className="ap-side">
                          <div className="ap-logo">
                            <span className="ap-mark">N</span>NeoOps
                          </div>
                          <div className="ap-biz">
                            NeoEdge Fusion
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#66717C"
                              strokeWidth="2.4"
                              aria-hidden="true"
                            >
                              <path d="M6 9l6 6 6-6"></path>
                            </svg>
                          </div>
                          <div className="ap-nav">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M3 13h8V3H3zm10 8h8V11h-8zM3 21h8v-6H3zm10-18v6h8V3z"></path>
                            </svg>
                            <span>Dashboard</span>
                          </div>
                          <div className="ap-nav">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"></path>
                            </svg>
                            <span>Bookings</span>
                          </div>
                          <div className="ap-nav on">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8"></path>
                            </svg>
                            <span>Inventory</span>
                          </div>
                          <div className="ap-nav">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M8 13h8M8 17h5"></path>
                            </svg>
                            <span>Invoices</span>
                          </div>
                          <div className="ap-nav">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M3 7h18v13H3zM8 7V4h8v3"></path>
                            </svg>
                            <span>Projects</span>
                          </div>
                          <div className="ap-nav">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h9"></path>
                            </svg>
                            <span>Tasks</span>
                          </div>
                          <div className="ap-nav">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z"></path>
                            </svg>
                            <span>Clients</span>
                          </div>
                          <div className="ap-plan">
                            <b>Premium</b>
                            <span>Unlimited invoices and bookings</span>
                          </div>
                        </aside>
                        <div className="ap-main">
                          <div className="ap-top">
                            <div>
                              <div className="ap-h">Inventory</div>
                              <div className="ap-sub">
                                Labelled with QR codes
                              </div>
                            </div>
                            <div className="ap-btn">Print labels</div>
                          </div>
                          <div className="ap-kpis">
                            <div className="ap-kpi">
                              <span>Good</span>
                              <b style={{ color: "#07294C" }}>412</b>
                            </div>
                            <div className="ap-kpi">
                              <span>Available</span>
                              <b style={{ color: "#1E7A3C" }}>286</b>
                            </div>
                            <div className="ap-kpi">
                              <span>Out on jobs</span>
                              <b style={{ color: "#5B3FA8" }}>118</b>
                            </div>
                            <div className="ap-kpi">
                              <span>Damaged</span>
                              <b style={{ color: "#B42318" }}>8</b>
                            </div>
                          </div>
                          <div className="ap-table">
                            <div className="ap-th inv">
                              <span>Item</span>
                              <span>Rate</span>
                              <span>Available</span>
                            </div>
                            <div className="ap-tr inv">
                              <span
                                style={{
                                  display: "flex",
                                  gap: "10px",
                                  alignItems: "center",
                                }}
                              >
                                <i
                                  className="ap-thumb"
                                  style={{ background: "#FFE3BF" }}
                                ></i>
                                <span>
                                  <b>LED screen panel</b>
                                  <em>Bulk · 48 units</em>
                                </span>
                              </span>
                              <span>
                                ₦15,000<em>per day</em>
                              </span>
                              <span>
                                <b style={{ fontSize: "12px" }}>36/48</b>
                                <div className="ap-meter">
                                  <i style={{ width: "75%" }}></i>
                                </div>
                              </span>
                            </div>
                            <div className="ap-tr inv">
                              <span
                                style={{
                                  display: "flex",
                                  gap: "10px",
                                  alignItems: "center",
                                }}
                              >
                                <i
                                  className="ap-thumb"
                                  style={{ background: "#E3ECF5" }}
                                ></i>
                                <span>
                                  <b>Teleprompter</b>
                                  <em>SN000021</em>
                                </span>
                              </span>
                              <span>
                                ₦25,000<em>per day</em>
                              </span>
                              <span>
                                <b style={{ fontSize: "12px" }}>Out</b>
                                <div className="ap-meter">
                                  <i style={{ width: "0%" }}></i>
                                </div>
                              </span>
                            </div>
                            <div className="ap-tr inv">
                              <span
                                style={{
                                  display: "flex",
                                  gap: "10px",
                                  alignItems: "center",
                                }}
                              >
                                <i
                                  className="ap-thumb"
                                  style={{ background: "#FFF4E6" }}
                                ></i>
                                <span>
                                  <b>Chiavari chair</b>
                                  <em>Bulk · 200 units</em>
                                </span>
                              </span>
                              <span>
                                ₦500<em>per day</em>
                              </span>
                              <span>
                                <b style={{ fontSize: "12px" }}>198/200</b>
                                <div className="ap-meter">
                                  <i style={{ width: "99%" }}></i>
                                </div>
                              </span>
                            </div>
                            <div className="ap-tr inv">
                              <span
                                style={{
                                  display: "flex",
                                  gap: "10px",
                                  alignItems: "center",
                                }}
                              >
                                <i
                                  className="ap-thumb"
                                  style={{ background: "#E3ECF5" }}
                                ></i>
                                <span>
                                  <b>360 video booth</b>
                                  <em>SN000003</em>
                                </span>
                              </span>
                              <span>
                                ₦120,000<em>per day</em>
                              </span>
                              <span>
                                <b style={{ fontSize: "12px" }}>1/2</b>
                                <div className="ap-meter">
                                  <i style={{ width: "50%" }}></i>
                                </div>
                              </span>
                            </div>
                            <div className="ap-tr inv">
                              <span
                                style={{
                                  display: "flex",
                                  gap: "10px",
                                  alignItems: "center",
                                }}
                              >
                                <i
                                  className="ap-thumb"
                                  style={{ background: "#FFE3BF" }}
                                ></i>
                                <span>
                                  <b>Wireless mic kit</b>
                                  <em>Bulk · 12 units</em>
                                </span>
                              </span>
                              <span>
                                ₦8,000<em>per day</em>
                              </span>
                              <span>
                                <b style={{ fontSize: "12px" }}>9/12</b>
                                <div className="ap-meter">
                                  <i style={{ width: "75%" }}></i>
                                </div>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      className="ap-float ne-float"
                      style={{
                        left: "-30px",
                        bottom: "34px",
                        width: "180px",
                        display: "flex",
                        gap: "10px",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          width: "30px",
                          height: "30px",
                          borderRadius: "9px",
                          background: "#FDECEC",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flex: "none",
                          fontWeight: "800",
                          color: "#B42318",
                        }}
                      >
                        !
                      </span>
                      <span>
                        <b style={{ fontSize: "12px", display: "block" }}>
                          LED panel #14 is faulty
                        </b>
                        <span style={{ fontSize: "11px", color: "#66717C" }}>
                          Held back from tomorrow's job
                        </span>
                      </span>
                    </div>
                    <div className="ap-phone ne-float">
                      <div className="ap-ph-notch"></div>
                      <div
                        style={{
                          display: "flex",
                          background: "#F1F5FA",
                          borderRadius: "999px",
                          padding: "3px",
                          fontSize: "10px",
                          fontWeight: "800",
                          marginTop: "8px",
                        }}
                      >
                        <span
                          style={{
                            flex: "1",
                            textAlign: "center",
                            padding: "5px",
                            color: "#66717C",
                          }}
                        >
                          Pickup
                        </span>
                        <span
                          style={{
                            flex: "1",
                            textAlign: "center",
                            padding: "5px",
                            background: "#07294C",
                            color: "#fff",
                            borderRadius: "999px",
                          }}
                        >
                          Return
                        </span>
                      </div>
                      <div className="ap-cam">
                        <svg
                          width="70"
                          height="70"
                          viewBox="-2 -2 25 25"
                          style={{ background: "#fff", borderRadius: "6px" }}
                          aria-hidden="true"
                        >
                          <path
                            fill="#07294C"
                            d="M0 0h1v1h-1zM0 1h1v1h-1zM0 2h1v1h-1zM0 3h1v1h-1zM0 4h1v1h-1zM0 5h1v1h-1zM0 6h1v1h-1zM0 8h1v1h-1zM0 9h1v1h-1zM0 11h1v1h-1zM0 14h1v1h-1zM0 15h1v1h-1zM0 16h1v1h-1zM0 17h1v1h-1zM0 18h1v1h-1zM0 19h1v1h-1zM0 20h1v1h-1zM1 0h1v1h-1zM1 6h1v1h-1zM1 8h1v1h-1zM1 9h1v1h-1zM1 11h1v1h-1zM1 12h1v1h-1zM1 14h1v1h-1zM1 20h1v1h-1zM2 0h1v1h-1zM2 2h1v1h-1zM2 3h1v1h-1zM2 4h1v1h-1zM2 6h1v1h-1zM2 8h1v1h-1zM2 9h1v1h-1zM2 10h1v1h-1zM2 12h1v1h-1zM2 14h1v1h-1zM2 16h1v1h-1zM2 17h1v1h-1zM2 18h1v1h-1zM2 20h1v1h-1zM3 0h1v1h-1zM3 2h1v1h-1zM3 3h1v1h-1zM3 4h1v1h-1zM3 6h1v1h-1zM3 8h1v1h-1zM3 12h1v1h-1zM3 14h1v1h-1zM3 16h1v1h-1zM3 17h1v1h-1zM3 18h1v1h-1zM3 20h1v1h-1zM4 0h1v1h-1zM4 2h1v1h-1zM4 3h1v1h-1zM4 4h1v1h-1zM4 6h1v1h-1zM4 9h1v1h-1zM4 11h1v1h-1zM4 12h1v1h-1zM4 14h1v1h-1zM4 16h1v1h-1zM4 17h1v1h-1zM4 18h1v1h-1zM4 20h1v1h-1zM5 0h1v1h-1zM5 6h1v1h-1zM5 8h1v1h-1zM5 9h1v1h-1zM5 11h1v1h-1zM5 14h1v1h-1zM5 20h1v1h-1zM6 0h1v1h-1zM6 1h1v1h-1zM6 2h1v1h-1zM6 3h1v1h-1zM6 4h1v1h-1zM6 5h1v1h-1zM6 6h1v1h-1zM6 9h1v1h-1zM6 11h1v1h-1zM6 12h1v1h-1zM6 14h1v1h-1zM6 15h1v1h-1zM6 16h1v1h-1zM6 17h1v1h-1zM6 18h1v1h-1zM6 19h1v1h-1zM6 20h1v1h-1zM7 8h1v1h-1zM7 10h1v1h-1zM7 11h1v1h-1zM8 0h1v1h-1zM8 1h1v1h-1zM8 4h1v1h-1zM8 9h1v1h-1zM8 11h1v1h-1zM8 12h1v1h-1zM8 14h1v1h-1zM8 16h1v1h-1zM9 0h1v1h-1zM9 4h1v1h-1zM9 7h1v1h-1zM9 9h1v1h-1zM9 14h1v1h-1zM9 15h1v1h-1zM9 17h1v1h-1zM9 18h1v1h-1zM9 19h1v1h-1zM9 20h1v1h-1zM10 0h1v1h-1zM10 2h1v1h-1zM10 3h1v1h-1zM10 4h1v1h-1zM10 6h1v1h-1zM10 7h1v1h-1zM10 12h1v1h-1zM10 13h1v1h-1zM10 14h1v1h-1zM10 17h1v1h-1zM10 18h1v1h-1zM10 19h1v1h-1zM10 20h1v1h-1zM11 2h1v1h-1zM11 3h1v1h-1zM11 4h1v1h-1zM11 5h1v1h-1zM11 12h1v1h-1zM11 17h1v1h-1zM11 18h1v1h-1zM11 19h1v1h-1zM12 0h1v1h-1zM12 1h1v1h-1zM12 2h1v1h-1zM12 3h1v1h-1zM12 4h1v1h-1zM12 5h1v1h-1zM12 6h1v1h-1zM12 7h1v1h-1zM12 8h1v1h-1zM12 9h1v1h-1zM12 10h1v1h-1zM12 13h1v1h-1zM12 14h1v1h-1zM12 15h1v1h-1zM12 16h1v1h-1zM12 17h1v1h-1zM12 20h1v1h-1zM13 9h1v1h-1zM13 10h1v1h-1zM13 11h1v1h-1zM13 12h1v1h-1zM13 14h1v1h-1zM13 15h1v1h-1zM13 18h1v1h-1zM13 20h1v1h-1zM14 0h1v1h-1zM14 1h1v1h-1zM14 2h1v1h-1zM14 3h1v1h-1zM14 4h1v1h-1zM14 5h1v1h-1zM14 6h1v1h-1zM14 12h1v1h-1zM14 13h1v1h-1zM14 14h1v1h-1zM14 18h1v1h-1zM14 19h1v1h-1zM15 0h1v1h-1zM15 6h1v1h-1zM15 13h1v1h-1zM15 15h1v1h-1zM15 16h1v1h-1zM15 17h1v1h-1zM15 18h1v1h-1zM15 19h1v1h-1zM16 0h1v1h-1zM16 2h1v1h-1zM16 3h1v1h-1zM16 4h1v1h-1zM16 6h1v1h-1zM16 9h1v1h-1zM16 13h1v1h-1zM16 14h1v1h-1zM16 15h1v1h-1zM16 16h1v1h-1zM16 17h1v1h-1zM17 0h1v1h-1zM17 2h1v1h-1zM17 3h1v1h-1zM17 4h1v1h-1zM17 6h1v1h-1zM17 8h1v1h-1zM17 11h1v1h-1zM17 16h1v1h-1zM17 17h1v1h-1zM17 19h1v1h-1zM18 0h1v1h-1zM18 2h1v1h-1zM18 3h1v1h-1zM18 4h1v1h-1zM18 6h1v1h-1zM18 9h1v1h-1zM18 10h1v1h-1zM18 13h1v1h-1zM18 14h1v1h-1zM18 15h1v1h-1zM18 18h1v1h-1zM19 0h1v1h-1zM19 6h1v1h-1zM19 9h1v1h-1zM19 11h1v1h-1zM19 12h1v1h-1zM19 17h1v1h-1zM19 20h1v1h-1zM20 0h1v1h-1zM20 1h1v1h-1zM20 2h1v1h-1zM20 3h1v1h-1zM20 4h1v1h-1zM20 5h1v1h-1zM20 6h1v1h-1zM20 8h1v1h-1zM20 9h1v1h-1zM20 10h1v1h-1zM20 12h1v1h-1zM20 13h1v1h-1zM20 14h1v1h-1zM20 16h1v1h-1zM20 17h1v1h-1zM20 20h1v1h-1z"
                          ></path>
                        </svg>
                        <i
                          className="ne-scan"
                          style={{
                            position: "absolute",
                            left: "18px",
                            right: "18px",
                            height: "2px",
                            background: "#FFC17D",
                            boxShadow: "0 0 12px #FFC17D",
                          }}
                        ></i>
                      </div>
                      <b style={{ fontSize: "12px", display: "block" }}>
                        Teleprompter
                      </b>
                      <span style={{ fontSize: "10px", color: "#66717C" }}>
                        SN000021 · HR Summit Lagos
                      </span>
                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          marginTop: "10px",
                        }}
                      >
                        <span
                          style={{
                            flex: "1",
                            textAlign: "center",
                            fontSize: "10px",
                            fontWeight: "800",
                            padding: "7px",
                            borderRadius: "8px",
                            background: "#E6F4EA",
                            color: "#1E7A3C",
                          }}
                        >
                          ✓ Good
                        </span>
                        <span
                          style={{
                            flex: "1",
                            textAlign: "center",
                            fontSize: "10px",
                            fontWeight: "800",
                            padding: "7px",
                            borderRadius: "8px",
                            border: "1px solid #E3E8EF",
                            color: "#4A5663",
                          }}
                        >
                          Damaged
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
            {t3.on && (
              <>
                <div className="pt-pane">
                  <div className="pt-copy">
                    <div
                      className="ne-eyebrow"
                      style={{ fontSize: "11px", color: "rgba(7,41,76,.55)" }}
                    >
                      04 · Bill
                    </div>
                    <h3>Quotes, invoices &amp; receipts</h3>
                    <p>
                      Send a branded quote, turn it into an invoice when the
                      client says yes, record part payments and know exactly who
                      still owes you.
                    </p>
                    <ul>
                      <li>
                        <span className="pt-tick">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#07294C"
                            strokeWidth="3"
                            aria-hidden="true"
                          >
                            <path d="M5 12l5 5 9-10"></path>
                          </svg>
                        </span>
                        Quotes become invoices once the client accepts
                      </li>
                      <li>
                        <span className="pt-tick">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#07294C"
                            strokeWidth="3"
                            aria-hidden="true"
                          >
                            <path d="M5 12l5 5 9-10"></path>
                          </svg>
                        </span>
                        Part payments with automatic receipts
                      </li>
                      <li>
                        <span className="pt-tick">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#07294C"
                            strokeWidth="3"
                            aria-hidden="true"
                          >
                            <path d="M5 12l5 5 9-10"></path>
                          </svg>
                        </span>
                        Upload an old invoice, get an AI draft
                      </li>
                    </ul>
                    <Link className="pt-link" to="/register">
                      Try it free{" "}
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        aria-hidden="true"
                      >
                        <path d="M5 12h14M13 6l6 6-6 6"></path>
                      </svg>
                    </Link>
                  </div>
                  <div className="pt-stage">
                    <div className="ap-frame">
                      <div className="ap-chrome">
                        <span></span>
                        <span></span>
                        <span></span>
                        <div className="ap-url">
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M5 11h14v10H5zM8 11V7a4 4 0 018 0v4"></path>
                          </svg>
                          getneoops.com/app/invoices/INV-0047
                        </div>
                      </div>
                      <div className="ap-body">
                        <aside className="ap-side">
                          <div className="ap-logo">
                            <span className="ap-mark">N</span>NeoOps
                          </div>
                          <div className="ap-biz">
                            NeoEdge Fusion
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#66717C"
                              strokeWidth="2.4"
                              aria-hidden="true"
                            >
                              <path d="M6 9l6 6 6-6"></path>
                            </svg>
                          </div>
                          <div className="ap-nav">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M3 13h8V3H3zm10 8h8V11h-8zM3 21h8v-6H3zm10-18v6h8V3z"></path>
                            </svg>
                            <span>Dashboard</span>
                          </div>
                          <div className="ap-nav">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"></path>
                            </svg>
                            <span>Bookings</span>
                          </div>
                          <div className="ap-nav">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8"></path>
                            </svg>
                            <span>Inventory</span>
                          </div>
                          <div className="ap-nav on">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M8 13h8M8 17h5"></path>
                            </svg>
                            <span>Invoices</span>
                          </div>
                          <div className="ap-nav">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M3 7h18v13H3zM8 7V4h8v3"></path>
                            </svg>
                            <span>Projects</span>
                          </div>
                          <div className="ap-nav">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h9"></path>
                            </svg>
                            <span>Tasks</span>
                          </div>
                          <div className="ap-nav">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z"></path>
                            </svg>
                            <span>Clients</span>
                          </div>
                          <div className="ap-plan">
                            <b>Premium</b>
                            <span>Unlimited invoices and bookings</span>
                          </div>
                        </aside>
                        <div className="ap-main">
                          <div className="ap-top">
                            <div>
                              <div className="ap-h">INV-0047</div>
                              <div className="ap-sub">
                                Halcyon staff party · due 20 Nov
                              </div>
                            </div>
                            <div className="ap-btn">Send invoice</div>
                          </div>
                          <div className="iv-grid">
                            <div className="iv-doc">
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "flex-start",
                                }}
                              >
                                <div>
                                  <b
                                    style={{
                                      fontSize: "14px",
                                      letterSpacing: "-.02em",
                                    }}
                                  >
                                    NeoEdge Fusion
                                  </b>
                                  <div className="iv-mut">Lekki, Lagos</div>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                  <div className="iv-mut">INVOICE</div>
                                  <b style={{ fontSize: "13px" }}>INV-0047</b>
                                </div>
                              </div>
                              <div
                                className="iv-mut"
                                style={{ marginTop: "14px" }}
                              >
                                BILL TO
                              </div>
                              <b style={{ fontSize: "12px" }}>
                                Halcyon Group · People Team
                              </b>
                              <div style={{ marginTop: "12px" }}>
                                <div className="iv-li">
                                  <span>
                                    LED wall 12×8ft<em>2 days</em>
                                  </span>
                                  <span>₦450,000</span>
                                </div>
                                <div className="iv-li">
                                  <span>
                                    Sound system<em>Full rig + engineer</em>
                                  </span>
                                  <span>₦520,000</span>
                                </div>
                                <div className="iv-li">
                                  <span>
                                    360 video booth<em>4 hours</em>
                                  </span>
                                  <span>₦230,000</span>
                                </div>
                              </div>
                              <div className="iv-li sm">
                                <span>Subtotal</span>
                                <span>₦1,200,000</span>
                              </div>
                              <div className="iv-li sm">
                                <span>VAT 7.5%</span>
                                <span>₦90,000</span>
                              </div>
                              <div className="iv-li tot">
                                <span>Total</span>
                                <span>₦1,290,000</span>
                              </div>
                            </div>
                            <div className="iv-side">
                              <div className="iv-mut">PAYMENT</div>
                              <div
                                style={{
                                  fontSize: "22px",
                                  fontWeight: "800",
                                  letterSpacing: "-.03em",
                                  marginTop: "4px",
                                }}
                              >
                                ₦570,000
                              </div>
                              <div
                                style={{ fontSize: "11px", color: "#66717C" }}
                              >
                                paid of ₦1,290,000
                              </div>
                              <div
                                className="ap-meter"
                                style={{ marginTop: "10px", height: "8px" }}
                              >
                                <i
                                  className="ne-barx"
                                  style={{ width: "44%" }}
                                ></i>
                              </div>
                              <div className="iv-ev">
                                <span
                                  className="ap-dot"
                                  style={{ background: "#1E7A3C" }}
                                ></span>
                                <span>
                                  <b>Part payment</b>
                                  <em>₦570,000 · 2 Nov</em>
                                </span>
                              </div>
                              <div className="iv-ev">
                                <span
                                  className="ap-dot"
                                  style={{ background: "#07294C" }}
                                ></span>
                                <span>
                                  <b>Receipt sent</b>
                                  <em>RCT-0112 · 2 Nov</em>
                                </span>
                              </div>
                              <div className="iv-ev">
                                <span
                                  className="ap-dot"
                                  style={{ background: "#FFC17D" }}
                                ></span>
                                <span>
                                  <b>Balance due</b>
                                  <em>₦720,000 · 20 Nov</em>
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      className="ap-float ne-float"
                      style={{
                        right: "-36px",
                        bottom: "40px",
                        width: "236px",
                        display: "flex",
                        gap: "10px",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          width: "34px",
                          height: "34px",
                          borderRadius: "10px",
                          background: "#FFF4E6",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flex: "none",
                        }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#07294C"
                          strokeWidth="2"
                          aria-hidden="true"
                        >
                          <path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z"></path>
                        </svg>
                      </span>
                      <span>
                        <b style={{ fontSize: "12px", display: "block" }}>
                          Upload an old invoice
                        </b>
                        <span style={{ fontSize: "11px", color: "#66717C" }}>
                          AI turns it into a draft
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
            {t4.on && (
              <>
                <div className="pt-pane">
                  <div className="pt-copy">
                    <div
                      className="ne-eyebrow"
                      style={{ fontSize: "11px", color: "rgba(7,41,76,.55)" }}
                    >
                      05 · Profit
                      <span
                        style={{
                          fontSize: "10px",
                          letterSpacing: ".1em",
                          textTransform: "uppercase",
                          background: "#FFC17D",
                          color: "#07294C",
                          padding: "2px 7px",
                          borderRadius: "999px",
                          verticalAlign: "middle",
                          marginLeft: "6px",
                        }}
                      >
                        Premium
                      </span>
                    </div>
                    <h3>Projects &amp; P&amp;L</h3>
                    <p>
                      See profit by event and by event type. Double down on the
                      jobs that pay, weddings or corporate, and fix the ones
                      that take more than they give.
                    </p>
                    <ul>
                      <li>
                        <span className="pt-tick">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#07294C"
                            strokeWidth="3"
                            aria-hidden="true"
                          >
                            <path d="M5 12l5 5 9-10"></path>
                          </svg>
                        </span>
                        Profit per event and per event type
                      </li>
                      <li>
                        <span className="pt-tick">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#07294C"
                            strokeWidth="3"
                            aria-hidden="true"
                          >
                            <path d="M5 12l5 5 9-10"></path>
                          </svg>
                        </span>
                        Expenses by vendor, project or general
                      </li>
                      <li>
                        <span className="pt-tick">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#07294C"
                            strokeWidth="3"
                            aria-hidden="true"
                          >
                            <path d="M5 12l5 5 9-10"></path>
                          </svg>
                        </span>
                        Privacy mode hides amounts on screen
                      </li>
                    </ul>
                    <Link className="pt-link" to="/register">
                      Try it free{" "}
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        aria-hidden="true"
                      >
                        <path d="M5 12h14M13 6l6 6-6 6"></path>
                      </svg>
                    </Link>
                  </div>
                  <div className="pt-stage">
                    <div className="ap-frame">
                      <div className="ap-chrome">
                        <span></span>
                        <span></span>
                        <span></span>
                        <div className="ap-url">
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M5 11h14v10H5zM8 11V7a4 4 0 018 0v4"></path>
                          </svg>
                          getneoops.com/app/dashboard
                        </div>
                      </div>
                      <div className="ap-body">
                        <aside className="ap-side">
                          <div className="ap-logo">
                            <span className="ap-mark">N</span>NeoOps
                          </div>
                          <div className="ap-biz">
                            NeoEdge Fusion
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#66717C"
                              strokeWidth="2.4"
                              aria-hidden="true"
                            >
                              <path d="M6 9l6 6 6-6"></path>
                            </svg>
                          </div>
                          <div className="ap-nav on">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M3 13h8V3H3zm10 8h8V11h-8zM3 21h8v-6H3zm10-18v6h8V3z"></path>
                            </svg>
                            <span>Dashboard</span>
                          </div>
                          <div className="ap-nav">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"></path>
                            </svg>
                            <span>Bookings</span>
                          </div>
                          <div className="ap-nav">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8"></path>
                            </svg>
                            <span>Inventory</span>
                          </div>
                          <div className="ap-nav">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M8 13h8M8 17h5"></path>
                            </svg>
                            <span>Invoices</span>
                          </div>
                          <div className="ap-nav">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M3 7h18v13H3zM8 7V4h8v3"></path>
                            </svg>
                            <span>Projects</span>
                          </div>
                          <div className="ap-nav">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h9"></path>
                            </svg>
                            <span>Tasks</span>
                          </div>
                          <div className="ap-nav">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z"></path>
                            </svg>
                            <span>Clients</span>
                          </div>
                          <div className="ap-plan">
                            <b>Premium</b>
                            <span>Unlimited invoices and bookings</span>
                          </div>
                        </aside>
                        <div className="ap-main">
                          <div className="ap-top">
                            <div>
                              <div className="ap-h">Dashboard</div>
                              <div className="ap-sub">October overview</div>
                            </div>
                            <div className="ap-btn">
                              <span
                                style={{
                                  display: "inline-flex",
                                  gap: "6px",
                                  alignItems: "center",
                                }}
                              >
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2.2"
                                  aria-hidden="true"
                                >
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"></path>
                                  <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                                Privacy mode
                              </span>
                            </div>
                          </div>
                          <div className="ap-kpis">
                            <div className="ap-kpi">
                              <span>Revenue</span>
                              <b style={{ color: "#07294C" }}>₦8.4m</b>
                              <em>↗ 18% vs Sep</em>
                            </div>
                            <div className="ap-kpi">
                              <span>Expenses</span>
                              <b style={{ color: "#07294C" }}>₦3.1m</b>
                              <em>Vendors, crew, fuel</em>
                            </div>
                            <div className="ap-kpi">
                              <span>Profit</span>
                              <b style={{ color: "#1E7A3C" }}>₦5.3m</b>
                              <em>63% margin</em>
                            </div>
                            <div className="ap-kpi">
                              <span>Unpaid</span>
                              <b style={{ color: "#9A5B12" }}>₦1.6m</b>
                              <em>4 invoices</em>
                            </div>
                          </div>
                          <div className="pl-grid">
                            <div className="pl-card">
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                }}
                              >
                                <b style={{ fontSize: "12px" }}>
                                  Revenue vs expenses
                                </b>
                                <span
                                  style={{
                                    fontSize: "10px",
                                    color: "#66717C",
                                    display: "flex",
                                    gap: "10px",
                                  }}
                                >
                                  <span>
                                    <i
                                      className="lg"
                                      style={{ background: "#07294C" }}
                                    ></i>
                                    Revenue
                                  </span>
                                  <span>
                                    <i
                                      className="lg"
                                      style={{ background: "#FFC17D" }}
                                    ></i>
                                    Expenses
                                  </span>
                                </span>
                              </div>
                              <div className="pl-chart">
                                <div className="pl-col">
                                  <div className="pl-bars">
                                    <i
                                      style={{
                                        height: "52%",
                                        background: "#07294C",
                                      }}
                                    ></i>
                                    <i
                                      style={{
                                        height: "22%",
                                        background: "#FFC17D",
                                      }}
                                    ></i>
                                  </div>
                                  <span>Jun</span>
                                </div>
                                <div className="pl-col">
                                  <div className="pl-bars">
                                    <i
                                      style={{
                                        height: "64%",
                                        background: "#07294C",
                                      }}
                                    ></i>
                                    <i
                                      style={{
                                        height: "30%",
                                        background: "#FFC17D",
                                      }}
                                    ></i>
                                  </div>
                                  <span>Jul</span>
                                </div>
                                <div className="pl-col">
                                  <div className="pl-bars">
                                    <i
                                      style={{
                                        height: "48%",
                                        background: "#07294C",
                                      }}
                                    ></i>
                                    <i
                                      style={{
                                        height: "20%",
                                        background: "#FFC17D",
                                      }}
                                    ></i>
                                  </div>
                                  <span>Aug</span>
                                </div>
                                <div className="pl-col">
                                  <div className="pl-bars">
                                    <i
                                      style={{
                                        height: "72%",
                                        background: "#07294C",
                                      }}
                                    ></i>
                                    <i
                                      style={{
                                        height: "28%",
                                        background: "#FFC17D",
                                      }}
                                    ></i>
                                  </div>
                                  <span>Sep</span>
                                </div>
                                <div className="pl-col">
                                  <div className="pl-bars">
                                    <i
                                      style={{
                                        height: "80%",
                                        background: "#07294C",
                                      }}
                                    ></i>
                                    <i
                                      style={{
                                        height: "31%",
                                        background: "#FFC17D",
                                      }}
                                    ></i>
                                  </div>
                                  <span>Oct</span>
                                </div>
                                <div className="pl-col">
                                  <div className="pl-bars">
                                    <i
                                      style={{
                                        height: "92%",
                                        background: "#07294C",
                                      }}
                                    ></i>
                                    <i
                                      style={{
                                        height: "34%",
                                        background: "#FFC17D",
                                      }}
                                    ></i>
                                  </div>
                                  <span>Nov</span>
                                </div>
                              </div>
                            </div>
                            <div className="pl-card">
                              <b style={{ fontSize: "12px" }}>
                                Profit by event type
                              </b>
                              <div style={{ marginTop: "8px" }}>
                                <div className="pl-pr">
                                  <span>
                                    <b>Corporate</b>
                                    <em>9 jobs</em>
                                  </span>
                                  <span>₦3.1m</span>
                                  <span
                                    className="pl-m"
                                    style={{
                                      background: "#E6F4EA",
                                      color: "#1E7A3C",
                                    }}
                                  >
                                    64%
                                  </span>
                                </div>
                                <div className="pl-pr">
                                  <span>
                                    <b>Weddings</b>
                                    <em>6 jobs</em>
                                  </span>
                                  <span>₦1.8m</span>
                                  <span
                                    className="pl-m"
                                    style={{
                                      background: "#E6F4EA",
                                      color: "#1E7A3C",
                                    }}
                                  >
                                    58%
                                  </span>
                                </div>
                                <div className="pl-pr">
                                  <span>
                                    <b>Concerts</b>
                                    <em>2 jobs</em>
                                  </span>
                                  <span>₦0.3m</span>
                                  <span
                                    className="pl-m"
                                    style={{
                                      background: "#FFF4E6",
                                      color: "#9A5B12",
                                    }}
                                  >
                                    22%
                                  </span>
                                </div>
                                <div className="pl-pr">
                                  <span>
                                    <b>Birthdays</b>
                                    <em>5 jobs</em>
                                  </span>
                                  <span>₦0.1m</span>
                                  <span
                                    className="pl-m"
                                    style={{
                                      background: "#FDECEC",
                                      color: "#B42318",
                                    }}
                                  >
                                    9%
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      className="ap-float ne-float"
                      style={{ left: "-30px", bottom: "34px", width: "180px" }}
                    >
                      <div style={{ fontSize: "11px", color: "#66717C" }}>
                        Corporate vs birthdays
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          gap: "8px",
                          marginTop: "2px",
                        }}
                      >
                        <b
                          style={{ fontSize: "20px", letterSpacing: "-.03em" }}
                        >
                          7× more
                        </b>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: "800",
                            color: "#1E7A3C",
                          }}
                        >
                          margin
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#66717C",
                          marginTop: "2px",
                        }}
                      >
                        Put your time where the profit is
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
            {t5.on && (
              <>
                <div className="pt-pane">
                  <div className="pt-copy">
                    <div
                      className="ne-eyebrow"
                      style={{ fontSize: "11px", color: "rgba(7,41,76,.55)" }}
                    >
                      03 · Run
                      <span
                        style={{
                          fontSize: "10px",
                          letterSpacing: ".1em",
                          textTransform: "uppercase",
                          background: "#FFC17D",
                          color: "#07294C",
                          padding: "2px 7px",
                          borderRadius: "999px",
                          verticalAlign: "middle",
                          marginLeft: "6px",
                        }}
                      >
                        Premium
                      </span>
                    </div>
                    <h3>Event checklists</h3>
                    <p>
                      Pre-event, on the day and after. Your crew works from one
                      list, so nothing gets forgotten.
                    </p>
                    <ul>
                      <li>
                        <span className="pt-tick">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#07294C"
                            strokeWidth="3"
                            aria-hidden="true"
                          >
                            <path d="M5 12l5 5 9-10"></path>
                          </svg>
                        </span>
                        Pre, during and post-event stages
                      </li>
                      <li>
                        <span className="pt-tick">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#07294C"
                            strokeWidth="3"
                            aria-hidden="true"
                          >
                            <path d="M5 12l5 5 9-10"></path>
                          </svg>
                        </span>
                        Duplicate a checklist for the next job
                      </li>
                      <li>
                        <span className="pt-tick">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#07294C"
                            strokeWidth="3"
                            aria-hidden="true"
                          >
                            <path d="M5 12l5 5 9-10"></path>
                          </svg>
                        </span>
                        Export to PDF for the crew
                      </li>
                    </ul>
                    <Link className="pt-link" to="/register">
                      Try it free{" "}
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        aria-hidden="true"
                      >
                        <path d="M5 12h14M13 6l6 6-6 6"></path>
                      </svg>
                    </Link>
                  </div>
                  <div className="pt-stage">
                    <div className="ap-frame">
                      <div className="ap-chrome">
                        <span></span>
                        <span></span>
                        <span></span>
                        <div className="ap-url">
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M5 11h14v10H5zM8 11V7a4 4 0 018 0v4"></path>
                          </svg>
                          getneoops.com/app/tasks
                        </div>
                      </div>
                      <div className="ap-body">
                        <aside className="ap-side">
                          <div className="ap-logo">
                            <span className="ap-mark">N</span>NeoOps
                          </div>
                          <div className="ap-biz">
                            NeoEdge Fusion
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#66717C"
                              strokeWidth="2.4"
                              aria-hidden="true"
                            >
                              <path d="M6 9l6 6 6-6"></path>
                            </svg>
                          </div>
                          <div className="ap-nav">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M3 13h8V3H3zm10 8h8V11h-8zM3 21h8v-6H3zm10-18v6h8V3z"></path>
                            </svg>
                            <span>Dashboard</span>
                          </div>
                          <div className="ap-nav">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"></path>
                            </svg>
                            <span>Bookings</span>
                          </div>
                          <div className="ap-nav">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8"></path>
                            </svg>
                            <span>Inventory</span>
                          </div>
                          <div className="ap-nav">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M8 13h8M8 17h5"></path>
                            </svg>
                            <span>Invoices</span>
                          </div>
                          <div className="ap-nav">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M3 7h18v13H3zM8 7V4h8v3"></path>
                            </svg>
                            <span>Projects</span>
                          </div>
                          <div className="ap-nav on">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h9"></path>
                            </svg>
                            <span>Tasks</span>
                          </div>
                          <div className="ap-nav">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z"></path>
                            </svg>
                            <span>Clients</span>
                          </div>
                          <div className="ap-plan">
                            <b>Premium</b>
                            <span>Unlimited invoices and bookings</span>
                          </div>
                        </aside>
                        <div className="ap-main">
                          <div className="ap-top">
                            <div>
                              <div className="ap-h">Halcyon staff party</div>
                              <div className="ap-sub">
                                Victoria Island · Fri 20 Nov · 6 crew
                              </div>
                            </div>
                            <div className="ap-btn">Duplicate checklist</div>
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                              margin: "2px 0 14px",
                            }}
                          >
                            <div
                              className="ap-meter"
                              style={{ flex: "1", height: "8px" }}
                            >
                              <i
                                className="ne-barx"
                                style={{ width: "38%" }}
                              ></i>
                            </div>
                            <b style={{ fontSize: "12px" }}>5 of 13 done</b>
                          </div>
                          <div className="ck-grid">
                            <div className="ck-col">
                              <div className="ck-h">
                                <b>Pre-event</b>
                                <span>3/4</span>
                              </div>
                              <div className="ne-task done">
                                Confirm venue access time
                              </div>
                              <div className="ne-task done">
                                Load LED panels &amp; frames
                              </div>
                              <div className="ne-task done">
                                Test teleprompter
                              </div>
                              <div className="ne-task">Print waybill</div>
                            </div>
                            <div className="ck-col">
                              <div className="ck-h">
                                <b>During event</b>
                                <span>1/4</span>
                              </div>
                              <div className="ne-task done">
                                Crew call time 6:00am
                              </div>
                              <div className="ne-task">Sound check with MC</div>
                              <div className="ne-task">
                                Hand over booth to host
                              </div>
                              <div className="ne-task">
                                Update client on WhatsApp
                              </div>
                            </div>
                            <div className="ck-col">
                              <div className="ck-h">
                                <b>Post-event</b>
                                <span>0/4</span>
                              </div>
                              <div className="ne-task">
                                Scan all items back in
                              </div>
                              <div className="ne-task">Log damaged items</div>
                              <div className="ne-task">Send feedback form</div>
                              <div className="ne-task">
                                Chase invoice balance
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      className="ap-float ne-float"
                      style={{
                        right: "-36px",
                        bottom: "40px",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <span style={{ display: "flex" }}>
                        <i className="ne-av" style={{ background: "#FFE3BF" }}>
                          TA
                        </i>
                        <i
                          className="ne-av"
                          style={{ background: "#E3ECF5", marginLeft: "-6px" }}
                        >
                          KO
                        </i>
                        <i
                          className="ne-av"
                          style={{ background: "#FFF4E6", marginLeft: "-6px" }}
                        >
                          BJ
                        </i>
                        <i
                          className="ne-av"
                          style={{ background: "#C9D8E8", marginLeft: "-6px" }}
                        >
                          +3
                        </i>
                      </span>
                      <span style={{ fontSize: "12px", fontWeight: "700" }}>
                        Crew sees the same list
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
            {t6.on && (
              <>
                <div className="pt-pane">
                  <div className="pt-copy">
                    <div
                      className="ne-eyebrow"
                      style={{ fontSize: "11px", color: "rgba(7,41,76,.55)" }}
                    >
                      06 · Keep
                    </div>
                    <h3>Clients that come back</h3>
                    <p>
                      Out of sight is out of mind. Keep every client's jobs and
                      payments in one profile, give them a portal for their own
                      quotes and invoices, and collect a rating after every
                      event.
                    </p>
                    <ul>
                      <li>
                        <span className="pt-tick">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#07294C"
                            strokeWidth="3"
                            aria-hidden="true"
                          >
                            <path d="M5 12l5 5 9-10"></path>
                          </svg>
                        </span>
                        Every job, invoice and payment per client
                      </li>
                      <li>
                        <span className="pt-tick">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#07294C"
                            strokeWidth="3"
                            aria-hidden="true"
                          >
                            <path d="M5 12l5 5 9-10"></path>
                          </svg>
                        </span>
                        Feedback forms with 5-star ratings and a QR code
                      </li>
                      <li>
                        <span className="pt-tick">
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="#07294C"
                            strokeWidth="3"
                            aria-hidden="true"
                          >
                            <path d="M5 12l5 5 9-10"></path>
                          </svg>
                        </span>
                        Status tags, from hot to dormant{" "}
                        <span
                          style={{
                            fontSize: "10px",
                            letterSpacing: ".1em",
                            textTransform: "uppercase",
                            background: "#07294C",
                            color: "#FFC17D",
                            padding: "2px 7px",
                            borderRadius: "999px",
                            verticalAlign: "middle",
                          }}
                        >
                          Soon
                        </span>
                      </li>
                    </ul>
                    <Link className="pt-link" to="/register">
                      Try it free{" "}
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        aria-hidden="true"
                      >
                        <path d="M5 12h14M13 6l6 6-6 6"></path>
                      </svg>
                    </Link>
                  </div>
                  <div className="pt-stage">
                    <div className="ap-frame">
                      <div className="ap-chrome">
                        <span></span>
                        <span></span>
                        <span></span>
                        <div className="ap-url">
                          <svg
                            width="11"
                            height="11"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M5 11h14v10H5zM8 11V7a4 4 0 018 0v4"></path>
                          </svg>
                          getneoops.com/app/clients
                        </div>
                      </div>
                      <div className="ap-body">
                        <aside className="ap-side">
                          <div className="ap-logo">
                            <span className="ap-mark">N</span>NeoOps
                          </div>
                          <div className="ap-biz">
                            NeoEdge Fusion
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="#66717C"
                              strokeWidth="2.4"
                              aria-hidden="true"
                            >
                              <path d="M6 9l6 6 6-6"></path>
                            </svg>
                          </div>
                          <div className="ap-nav">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M3 13h8V3H3zm10 8h8V11h-8zM3 21h8v-6H3zm10-18v6h8V3z"></path>
                            </svg>
                            <span>Dashboard</span>
                          </div>
                          <div className="ap-nav">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"></path>
                            </svg>
                            <span>Bookings</span>
                          </div>
                          <div className="ap-nav">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8"></path>
                            </svg>
                            <span>Inventory</span>
                          </div>
                          <div className="ap-nav">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M8 13h8M8 17h5"></path>
                            </svg>
                            <span>Invoices</span>
                          </div>
                          <div className="ap-nav">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M3 7h18v13H3zM8 7V4h8v3"></path>
                            </svg>
                            <span>Projects</span>
                          </div>
                          <div className="ap-nav">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h9"></path>
                            </svg>
                            <span>Tasks</span>
                          </div>
                          <div className="ap-nav on">
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z"></path>
                            </svg>
                            <span>Clients</span>
                          </div>
                          <div className="ap-plan">
                            <b>Premium</b>
                            <span>Unlimited invoices and bookings</span>
                          </div>
                        </aside>
                        <div className="ap-main">
                          <div className="ap-top">
                            <div>
                              <div className="ap-h">Clients</div>
                              <div className="ap-sub">
                                52 clients · 9 vendors
                              </div>
                            </div>
                            <div className="ap-btn">+ Add client</div>
                          </div>
                          <div className="ap-kpis">
                            <div className="ap-kpi">
                              <span>Active clients</span>
                              <b style={{ color: "#1E7A3C" }}>24</b>
                            </div>
                            <div className="ap-kpi">
                              <span>Avg. rating</span>
                              <b style={{ color: "#9A5B12" }}>4.8 ★</b>
                            </div>
                            <div className="ap-kpi">
                              <span>Open quotes</span>
                              <b style={{ color: "#07294C" }}>6</b>
                            </div>
                            <div className="ap-kpi">
                              <span>Unpaid invoices</span>
                              <b style={{ color: "#B42318" }}>3</b>
                            </div>
                          </div>
                          <div className="ap-table">
                            <div className="ap-th">
                              <span>Client</span>
                              <span>Lifetime</span>
                              <span>Status · soon</span>
                              <span></span>
                            </div>
                            <div className="ap-tr">
                              <span>
                                <b>Halcyon Group</b>
                                <em>Staff party · Nov</em>
                              </span>
                              <span>₦4.2m</span>
                              <span>
                                <span
                                  className="ap-pill"
                                  style={{
                                    background: "#E6F4EA",
                                    color: "#1E7A3C",
                                  }}
                                >
                                  Engaged
                                </span>
                              </span>
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: "700",
                                  color: "#07294C",
                                }}
                              ></span>
                            </div>
                            <div className="ap-tr">
                              <span>
                                <b>Adaeze Okafor</b>
                                <em>Quote sent · 2 days ago</em>
                              </span>
                              <span>₦1.45m</span>
                              <span>
                                <span
                                  className="ap-pill"
                                  style={{
                                    background: "#FDECEC",
                                    color: "#B42318",
                                  }}
                                >
                                  Hot
                                </span>
                              </span>
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: "700",
                                  color: "#07294C",
                                }}
                              >
                                Follow up
                              </span>
                            </div>
                            <div className="ap-tr">
                              <span>
                                <b>HR Summit Lagos</b>
                                <em>Conference · Nov</em>
                              </span>
                              <span>₦2.9m</span>
                              <span>
                                <span
                                  className="ap-pill"
                                  style={{
                                    background: "#FFF4E6",
                                    color: "#9A5B12",
                                  }}
                                >
                                  Warm
                                </span>
                              </span>
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: "700",
                                  color: "#07294C",
                                }}
                              ></span>
                            </div>
                            <div className="ap-tr hl">
                              <span>
                                <b>Kemi Events</b>
                                <em>Last job · 9 months ago</em>
                              </span>
                              <span>₦860k</span>
                              <span>
                                <span
                                  className="ap-pill"
                                  style={{
                                    background: "#EEE9FB",
                                    color: "#5B3FA8",
                                  }}
                                >
                                  Dormant
                                </span>
                              </span>
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: "700",
                                  color: "#07294C",
                                }}
                              >
                                Check in
                              </span>
                            </div>
                            <div className="ap-tr">
                              <span>
                                <b>Palmgrove Club</b>
                                <em>Quote cancelled · Mar</em>
                              </span>
                              <span>₦0</span>
                              <span>
                                <span
                                  className="ap-pill"
                                  style={{
                                    background: "#E3ECF5",
                                    color: "#07294C",
                                  }}
                                >
                                  Cold
                                </span>
                              </span>
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: "700",
                                  color: "#07294C",
                                }}
                              >
                                Check in
                              </span>
                            </div>
                            <div className="ap-tr">
                              <span>
                                <b>Tunde &amp; Co</b>
                                <em>No reply since Jan</em>
                              </span>
                              <span>₦310k</span>
                              <span>
                                <span
                                  className="ap-pill"
                                  style={{
                                    background: "#F1F3F5",
                                    color: "#4A5663",
                                  }}
                                >
                                  Lost
                                </span>
                              </span>
                              <span
                                style={{
                                  fontSize: "11px",
                                  fontWeight: "700",
                                  color: "#07294C",
                                }}
                              ></span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div
                      className="ap-float ne-float"
                      style={{ left: "-30px", bottom: "34px", width: "180px" }}
                    >
                      <div style={{ fontSize: "11px", color: "#66717C" }}>
                        New feedback
                      </div>
                      <div
                        style={{
                          color: "#FFC17D",
                          fontSize: "15px",
                          letterSpacing: "1px",
                          marginTop: "2px",
                        }}
                      >
                        ★★★★★
                      </div>
                      <b
                        style={{
                          fontSize: "12px",
                          display: "block",
                          marginTop: "2px",
                        }}
                      >
                        Halcyon staff party
                      </b>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "#66717C",
                          marginTop: "2px",
                        }}
                      >
                        Collected by QR at the venue
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function AlsoIncluded() {
  return (
    <section style={{ padding: "0" }}>
      <div className="ne-wrap">
        <div
          className="ne-reveal"
          style={{
            marginTop: "40px",
            background: "#F1F5FA",
            borderRadius: "28px",
            padding: "28px",
            marginBottom: "27px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <div className="ne-eyebrow" style={{ color: "#07294C" }}>
              Also in NeoOps
            </div>
            <span style={{ fontSize: "14px", color: "#66717C" }}>
              Built from real event jobs, not borrowed from another industry.
            </span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: "10px",
              marginTop: "20px",
            }}
          >
            <div
              className="ne-tile"
              style={{
                background: "#FFFFFF",
                borderRadius: "18px",
                padding: "18px",
              }}
            >
              <div
                className="ne-badge"
                style={{ width: "40px", height: "40px" }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#FFC17D"
                  strokeWidth="2.2"
                  aria-hidden="true"
                >
                  <circle cx="9" cy="8" r="3"></circle>
                  <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 4.5a3 3 0 010 6M18 14c2 .8 3 3 3 6"></path>
                </svg>
              </div>
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: "800",
                  color: "#07294C",
                  marginTop: "14px",
                }}
              >
                Clients &amp; vendors
              </div>
              <div
                style={{ fontSize: "13px", color: "#66717C", marginTop: "4px" }}
              >
                Profiles and history
              </div>
            </div>
            <div
              className="ne-tile"
              style={{
                background: "#FFFFFF",
                borderRadius: "18px",
                padding: "18px",
              }}
            >
              <div
                className="ne-badge"
                style={{ width: "40px", height: "40px" }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#FFC17D"
                  strokeWidth="2.2"
                  aria-hidden="true"
                >
                  <path d="M4 5h16v11H8l-4 4z"></path>
                  <path d="M8 9h8M8 12h5"></path>
                </svg>
              </div>
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: "800",
                  color: "#07294C",
                  marginTop: "14px",
                }}
              >
                Feedback forms
              </div>
              <div
                style={{ fontSize: "13px", color: "#66717C", marginTop: "4px" }}
              >
                Share by link or QR
              </div>
            </div>
            <div
              className="ne-tile"
              style={{
                background: "#FFFFFF",
                borderRadius: "18px",
                padding: "18px",
              }}
            >
              <div
                className="ne-badge"
                style={{ width: "40px", height: "40px" }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#FFC17D"
                  strokeWidth="2.2"
                  aria-hidden="true"
                >
                  <path d="M21 8l-9-5-9 5 9 5 9-5z"></path>
                  <path d="M3 8v8l9 5 9-5V8"></path>
                </svg>
              </div>
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: "800",
                  color: "#07294C",
                  marginTop: "14px",
                }}
              >
                Event marketplace{" "}
                <span
                  style={{
                    fontSize: "10px",
                    letterSpacing: ".1em",
                    textTransform: "uppercase",
                    background: "#07294C",
                    color: "#FFC17D",
                    padding: "2px 7px",
                    borderRadius: "999px",
                    verticalAlign: "middle",
                  }}
                >
                  Soon
                </span>
              </div>
              <div
                style={{ fontSize: "13px", color: "#66717C", marginTop: "4px" }}
              >
                List your gear in 22 rental categories
              </div>
            </div>
            <div
              className="ne-tile"
              style={{
                background: "#FFFFFF",
                borderRadius: "18px",
                padding: "18px",
              }}
            >
              <div
                className="ne-badge"
                style={{ width: "40px", height: "40px" }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#FFC17D"
                  strokeWidth="2.2"
                  aria-hidden="true"
                >
                  <rect x="5" y="11" width="14" height="10" rx="2"></rect>
                  <path d="M8 11V7a4 4 0 018 0v4"></path>
                </svg>
              </div>
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: "800",
                  color: "#07294C",
                  marginTop: "14px",
                }}
              >
                Roles &amp; permissions
              </div>
              <div
                style={{ fontSize: "13px", color: "#66717C", marginTop: "4px" }}
              >
                Your team, your rules
              </div>
            </div>
            <div
              className="ne-tile"
              style={{
                background: "#FFFFFF",
                borderRadius: "18px",
                padding: "18px",
              }}
            >
              <div
                className="ne-badge"
                style={{ width: "40px", height: "40px" }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#FFC17D"
                  strokeWidth="2.2"
                  aria-hidden="true"
                >
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"></path>
                  <path d="M3 3l18 18"></path>
                </svg>
              </div>
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: "800",
                  color: "#07294C",
                  marginTop: "14px",
                }}
              >
                Privacy mode
              </div>
              <div
                style={{ fontSize: "13px", color: "#66717C", marginTop: "4px" }}
              >
                Hide amounts on screen
              </div>
            </div>
            <div
              className="ne-tile"
              style={{
                background: "#FFF4E6",
                borderRadius: "18px",
                padding: "18px",
                border: "1px dashed rgba(7,41,76,.25)",
              }}
            >
              <div
                className="ne-badge"
                style={{ width: "40px", height: "40px" }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#FFC17D"
                  strokeWidth="2.2"
                  aria-hidden="true"
                >
                  <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"></path>
                  <path d="M9 12l2 2 4-4"></path>
                </svg>
              </div>
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: "800",
                  color: "#07294C",
                  marginTop: "14px",
                }}
              >
                Client contracts{" "}
                <span
                  style={{
                    fontSize: "10px",
                    letterSpacing: ".1em",
                    textTransform: "uppercase",
                    background: "#07294C",
                    color: "#FFC17D",
                    padding: "2px 7px",
                    borderRadius: "999px",
                    verticalAlign: "middle",
                  }}
                >
                  Soon
                </span>
              </div>
              <div
                style={{ fontSize: "13px", color: "#66717C", marginTop: "4px" }}
              >
                Ready contracts that protect you and your client
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
