import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import { Printer, X, Copy, Check, QrCode } from "lucide-react";
import { AuthService, OrganizationService } from "../api";

interface Props {
  url: string;
  formTitle: string;
  eventName: string;
  startDate?: string | null;
  endDate?: string | null;
  onClose: () => void;
}

const fmtDate = (d?: string | null) =>
  d
    ? new Date(d).toLocaleDateString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

const dateRange = (start?: string | null, end?: string | null) => {
  if (!start && !end) return "";
  if (!start || !end || start.slice(0, 10) === end.slice(0, 10))
    return fmtDate(start || end);
  return `${fmtDate(start)} – ${fmtDate(end)}`;
};

/** Black or white, whichever reads better on `hex`. */
const textOn = (hex: string) => {
  const m = hex.replace("#", "").match(/^([0-9a-f]{6})$/i);
  if (!m) return "#ffffff";
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? "#0f172a" : "#ffffff";
};

/**
 * One printable feedback card. Sized in mm so it fills exactly half an A4
 * page; the preview scales the same markup down.
 */
function FeedbackCard({
  url,
  formTitle,
  eventName,
  when,
  brand,
  orgName,
  logo,
}: {
  url: string;
  formTitle: string;
  eventName: string;
  when: string;
  brand: string;
  orgName: string;
  logo?: string | null;
}) {
  const onBrand = textOn(brand);
  const shortUrl = url.replace(/^https?:\/\//, "");
  return (
    <div
      style={{
        width: "210mm",
        height: "148mm",
        padding: "8mm",
        boxSizing: "border-box",
        background: "#ffffff",
        fontFamily: "Inter, Arial, sans-serif",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      <div
        style={{
          height: "100%",
          border: `3mm solid ${brand}`,
          borderRadius: "6mm",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
        }}
      >
        {/* Header band */}
        <div
          style={{
            background: brand,
            color: onBrand,
            padding: "4mm 7mm",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "4mm",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "3mm" }}>
            {logo && (
              <img
                src={logo}
                alt=""
                style={{
                  width: "11mm",
                  height: "11mm",
                  objectFit: "contain",
                  background: "#fff",
                  borderRadius: "2.5mm",
                  padding: "1mm",
                }}
              />
            )}
            <span style={{ fontSize: "5.5mm", fontWeight: 800 }}>
              {orgName}
            </span>
          </div>
          <span
            style={{
              fontSize: "3.6mm",
              fontWeight: 700,
              letterSpacing: "0.4mm",
              textTransform: "uppercase",
              opacity: 0.9,
            }}
          >
            Feedback
          </span>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: "8mm",
            padding: "6mm 8mm",
            color: "#0f172a",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: "4mm",
                fontWeight: 700,
                color: brand,
                textTransform: "uppercase",
                letterSpacing: "0.3mm",
              }}
            >
              We'd love your feedback
            </p>
            <h2
              style={{
                margin: "2mm 0 0",
                fontSize: "9mm",
                lineHeight: 1.1,
                fontWeight: 900,
                wordBreak: "break-word",
              }}
            >
              {eventName}
            </h2>
            {when && (
              <p
                style={{
                  margin: "2.5mm 0 0",
                  fontSize: "4.5mm",
                  color: "#475569",
                }}
              >
                {when}
              </p>
            )}
            {formTitle && (
              <p
                style={{
                  margin: "1.5mm 0 0",
                  fontSize: "4mm",
                  color: "#64748b",
                }}
              >
                {formTitle}
              </p>
            )}
            <div
              style={{
                marginTop: "7mm",
                padding: "3mm 4mm",
                borderLeft: `1.5mm solid ${brand}`,
                background: "#f8fafc",
                borderRadius: "1.5mm",
              }}
            >
              <p style={{ margin: 0, fontSize: "4.2mm", fontWeight: 700 }}>
                Scan with your phone camera
              </p>
              <p
                style={{
                  margin: "1mm 0 0",
                  fontSize: "3.2mm",
                  color: "#64748b",
                  wordBreak: "break-all",
                }}
              >
                or visit {shortUrl}
              </p>
            </div>
          </div>

          {/* QR — kept large: Chrome garbles small QR codes when printing */}
          <div
            style={{
              padding: "4mm",
              border: `1.2mm solid ${brand}`,
              borderRadius: "4mm",
              background: "#ffffff",
              flexShrink: 0,
            }}
          >
            <QRCodeSVG
              value={url}
              size={512}
              level="M"
              fgColor="#0f172a"
              style={{ width: "72mm", height: "72mm", display: "block" }}
            />
          </div>
        </div>

        <div
          style={{
            textAlign: "center",
            fontSize: "3.4mm",
            color: "#94a3b8",
            paddingBottom: "3mm",
          }}
        >
          Thank you for celebrating with us!
        </div>
      </div>
    </div>
  );
}

/**
 * Preview + print for a feedback form's QR code: an A4 sheet with two
 * identical cards (cut along the dashed line), in the organization's colour.
 */
export function FeedbackQrSheet({
  url,
  formTitle,
  eventName,
  startDate,
  endDate,
  onClose,
}: Props) {
  const [org, setOrg] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await AuthService.getMe();
        if (me.data.organization_id) {
          const res = await OrganizationService.get(me.data.organization_id);
          setOrg(res.data);
        }
      } catch {
        /* fall back to defaults */
      }
    })();
  }, []);

  // Reuse the app's QR print mode: only .qr-print-only is printed.
  useEffect(() => {
    document.body.classList.add("is-printing-qr");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.classList.remove("is-printing-qr");
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const brand = /^#[0-9a-f]{6}$/i.test(org?.primary_color || "")
    ? org.primary_color
    : "#0f172a";
  const card = {
    url,
    formTitle,
    eventName,
    when: dateRange(startDate, endDate),
    brand,
    orgName: org?.name || "",
    logo: org?.company_logo || null,
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      {createPortal(
        <div className="hidden print:block qr-print-only">
          <style>{`@page { size: A4 portrait; margin: 0; }`}</style>
          <div style={{ width: "210mm" }}>
            <FeedbackCard {...card} />
            <div
              style={{
                borderTop: "0.3mm dashed #94a3b8",
                margin: "0 6mm",
              }}
            />
            <FeedbackCard {...card} />
          </div>
        </div>,
        document.body,
      )}

      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-[var(--bg-app)]/80 backdrop-blur-sm print:hidden">
        <div className="bg-[var(--bg-surface)] rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden border border-[var(--border-soft)] shadow-2xl">
          <div className="flex items-center justify-between gap-3 p-5 border-b border-[var(--border-soft)] shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-brand-primary/10 text-[var(--text-link)] shrink-0">
                <QrCode className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-[var(--text-main)]">
                  Printable feedback QR
                </h2>
                <p className="text-xs text-[var(--text-muted)] truncate">
                  A4 · 2 cards per page · cut along the dashed line
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              title="Close"
              className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-app)] rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Preview: the real card, scaled to fit */}
          <div className="flex-1 min-h-0 overflow-auto p-5 bg-[var(--bg-app)]">
            <div className="mx-auto shadow-lg rounded-lg overflow-hidden bg-white w-fit">
              <div
                style={{
                  transform: "scale(0.62)",
                  transformOrigin: "top left",
                  width: "calc(210mm * 0.62)",
                  height: "calc(148mm * 0.62)",
                }}
              >
                <FeedbackCard {...card} />
              </div>
            </div>
            <p className="text-center text-xs text-[var(--text-muted)] mt-3">
              Colour from your company profile
              {org?.primary_color ? "" : " (none set — using dark navy)"}. Tip:
              in the print dialog, turn on “Background graphics”.
            </p>
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 p-5 border-t border-[var(--border-soft)] shrink-0">
            <button
              onClick={copy}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-[var(--border-soft)] font-bold text-sm text-[var(--text-main)] hover:bg-[var(--bg-app)]"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              {copied ? "Link copied" : "Copy link"}
            </button>
            <button
              onClick={() => window.print()}
              className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-primary text-[var(--text-on-brand)] font-bold text-sm hover:opacity-90"
            >
              <Printer className="w-4 h-4" /> Print A4 (2 per page) / Save PDF
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
