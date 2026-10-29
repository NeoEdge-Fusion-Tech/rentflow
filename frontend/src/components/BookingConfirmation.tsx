import React, { useState } from "react";
import {
  CheckCircle,
  Copy,
  Check,
  Download,
  Mail,
  Phone,
  MapPin,
  FileText,
  ReceiptText,
} from "lucide-react";

export interface Confirmation {
  booking_id: number;
  status: string;
  payment_status: string;
  total_amount: string;
  amount_paid: string;
  balance: string;
  currency_symbol: string;
  guest_email: string;
  vendor: {
    name: string;
    phone: string;
    email: string;
    address: string;
    logo?: string | null;
  };
  invoice_url: string | null;
  receipt_url: string | null;
}

const money = (symbol: string, value: string | number) =>
  `${symbol}${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/**
 * Shown after a guest books: request sent, or paid ("booked"). Booking ID up
 * front, documents to download, and the vendor's contact details.
 */
export function BookingConfirmation({
  data,
  paid,
  onDone,
  doneLabel = "Back to store",
  notice,
}: {
  data: Confirmation;
  paid: boolean;
  onDone?: () => void;
  doneLabel?: string;
  notice?: string;
}) {
  const [copied, setCopied] = useState(false);
  const { vendor } = data;
  const symbol = data.currency_symbol || "";

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(String(data.booking_id));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-app)] flex items-center justify-center p-4 py-10">
      <div className="max-w-lg w-full bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-3xl p-6 sm:p-8 shadow-xl">
        <div className="text-center">
          <div className="w-16 h-16 bg-emerald-500/15 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-black text-[var(--text-main)]">
            {paid ? "Payment received — you're booked!" : "Request received!"}
          </h2>
          <p className="text-[var(--text-muted)] mt-2">
            {paid
              ? `Your booking with ${vendor.name} is confirmed as booked.`
              : `${vendor.name} will review your request and reach out with a quotation and next steps.`}
          </p>
        </div>

        {notice && (
          <p className="mt-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-sm">
            {notice}
          </p>
        )}

        {/* Booking ID */}
        <div className="mt-6 p-4 rounded-2xl border-2 border-dashed border-brand-primary/40 bg-brand-primary/5 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">
            Your booking ID
          </p>
          <div className="flex items-center justify-center gap-2 mt-1">
            <span className="text-3xl font-black text-[var(--text-main)] tabular-nums">
              #{data.booking_id}
            </span>
            <button
              type="button"
              onClick={copyId}
              title="Copy booking ID"
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-app)]"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Please note this ID and quote it whenever you contact the vendor.
          </p>
        </div>

        {/* Amounts */}
        {paid && (
          <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
            {[
              [
                "Paid",
                data.amount_paid,
                "text-emerald-600 dark:text-emerald-400",
              ],
              ["Total", data.total_amount, "text-[var(--text-main)]"],
              ["Balance", data.balance, "text-[var(--text-main)]"],
            ].map(([label, value, cls]) => (
              <div
                key={label}
                className="p-3 rounded-xl bg-[var(--bg-app)] border border-[var(--border-soft)]"
              >
                <dt className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  {label}
                </dt>
                <dd
                  className={`font-black mt-0.5 text-sm sm:text-base ${cls}`}
                  style={{ fontFamily: "'Noto Sans', sans-serif" }}
                >
                  {money(symbol, value)}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {/* Documents */}
        {paid && (data.invoice_url || data.receipt_url) && (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.invoice_url && (
              <a
                href={data.invoice_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 py-3 rounded-xl border border-[var(--border-soft)] font-bold text-sm text-[var(--text-main)] hover:bg-[var(--bg-app)] transition-colors"
              >
                <FileText className="w-4 h-4" /> Invoice
                <Download className="w-3.5 h-3.5 opacity-60" />
              </a>
            )}
            {data.receipt_url && (
              <a
                href={data.receipt_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 py-3 rounded-xl border border-[var(--border-soft)] font-bold text-sm text-[var(--text-main)] hover:bg-[var(--bg-app)] transition-colors"
              >
                <ReceiptText className="w-4 h-4" /> Receipt
                <Download className="w-3.5 h-3.5 opacity-60" />
              </a>
            )}
          </div>
        )}

        {/* Email notice */}
        {data.guest_email && (
          <p className="mt-5 flex items-start gap-2 text-sm text-[var(--text-muted)]">
            <Mail className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              We've sent{" "}
              {paid
                ? "your confirmation, invoice and receipt"
                : "a confirmation of your request"}{" "}
              to{" "}
              <strong className="text-[var(--text-main)]">
                {data.guest_email}
              </strong>
              . Check your spam folder if you don't see it.
            </span>
          </p>
        )}

        {/* Vendor contact */}
        {(vendor.phone || vendor.email || vendor.address) && (
          <div className="mt-5 p-4 rounded-2xl bg-[var(--bg-app)] border border-[var(--border-soft)]">
            <p className="text-sm font-bold text-[var(--text-main)] mb-2">
              Questions? Contact {vendor.name}
            </p>
            <ul className="space-y-1.5 text-sm">
              {vendor.phone && (
                <li>
                  <a
                    href={`tel:${vendor.phone}`}
                    className="flex items-center gap-2 text-[var(--text-link)] hover:underline"
                  >
                    <Phone className="w-4 h-4 shrink-0" /> {vendor.phone}
                  </a>
                </li>
              )}
              {vendor.email && (
                <li>
                  <a
                    href={`mailto:${vendor.email}?subject=Booking%20%23${data.booking_id}`}
                    className="flex items-center gap-2 text-[var(--text-link)] hover:underline break-all"
                  >
                    <Mail className="w-4 h-4 shrink-0" /> {vendor.email}
                  </a>
                </li>
              )}
              {vendor.address && (
                <li className="flex items-start gap-2 text-[var(--text-muted)]">
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5" />{" "}
                  {vendor.address}
                </li>
              )}
            </ul>
          </div>
        )}

        {onDone && (
          <button
            onClick={onDone}
            className="mt-6 w-full py-3 bg-brand-primary text-[var(--text-on-brand)] rounded-xl font-bold hover:opacity-90 transition-opacity"
          >
            {doneLabel}
          </button>
        )}
      </div>
    </div>
  );
}
