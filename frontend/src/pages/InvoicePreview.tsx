import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  FileText,
  Share2,
  Printer,
  Edit2,
  ChevronDown,
  Link,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import { InvoiceService, AuthService, OrganizationService } from "../api";
import { useNotification } from "../context/NotificationContext";

export function InvoicePreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const [invoice, setInvoice] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    let blobUrl = "";
    (async () => {
      setIsLoading(true);
      try {
        if (!id) return;
        const invRes = await InvoiceService.get(id);
        setInvoice(invRes.data);
        const meRes = await AuthService.getMe();
        if (meRes.data.organization_id) {
          const orgRes = await OrganizationService.get(
            meRes.data.organization_id,
          );
          setOrg(orgRes.data);
        }
        const response = await InvoiceService.download(id);
        blobUrl = window.URL.createObjectURL(
          new Blob([response.data], { type: "application/pdf" }),
        );
        setPdfUrl(blobUrl);
      } catch (err) {
        console.error("Failed to load preview", err);
        showNotification("Failed to load invoice preview.", "error");
      } finally {
        setIsLoading(false);
      }
    })();
    return () => {
      if (blobUrl) window.URL.revokeObjectURL(blobUrl);
    };
  }, [id, showNotification]);

  const handleDownload = async () => {
    if (!id) return;
    try {
      const response = await InvoiceService.download(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `invoice_${invoice?.invoice_number || id}.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Failed to download invoice", err);
      showNotification("Failed to download invoice", "error");
    }
  };

  const handleGeneratePaymentLink = async () => {
    if (!id) return;
    setIsGeneratingLink(true);
    try {
      const res = await InvoiceService.generatePaymentLink(id);
      setPaymentLink(res.data.payment_url);
      setShowMobileMenu(false);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error || "Failed to generate payment link";
      showNotification(msg, "error");
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleCopyLink = () => {
    if (!paymentLink) return;
    navigator.clipboard.writeText(paymentLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !paymentAmount) return;
    setIsRecordingPayment(true);
    try {
      const res = await InvoiceService.recordPayment(id, {
        amount: parseFloat(paymentAmount),
      });
      setInvoice(res.data);
      setShowPaymentModal(false);
      setPaymentAmount("");
      showNotification("Payment recorded successfully", "success");
    } catch (err: any) {
      showNotification(
        err.response?.data?.error || "Failed to record payment",
        "error",
      );
    } finally {
      setIsRecordingPayment(false);
    }
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return (num || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  if (isLoading) {
    return (
      <div className="bg-[var(--bg-surface)] p-12 text-center text-[var(--text-muted)] rounded-2xl border border-[var(--border-soft)]">
        Loading invoice preview...
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="bg-[var(--bg-surface)] p-12 text-center text-[var(--text-muted)] rounded-2xl border border-[var(--border-soft)]">
        Invoice not found.
      </div>
    );
  }

  const primaryColor = org?.primary_color || "#7c3aed";
  const currencySymbol =
    invoice.currency_symbol || org?.currency?.symbol || "$";

  return (
    <>
      <div className="max-w-5xl mx-auto space-y-4 pb-20">
        {/* Top Action Bar */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border-soft)] pb-4">
          <button
            onClick={() => navigate("/invoices")}
            className="flex items-center gap-2 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Invoices</span>
            <span className="sm:hidden">Back</span>
          </button>

          {/* Desktop actions */}
          <div className="hidden sm:flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={() => navigate(`/invoices/${invoice.invoice_id}/edit`)}
              className="px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] font-bold rounded-lg hover:bg-[var(--bg-app)] transition-colors text-sm flex items-center gap-1.5"
            >
              <Edit2 className="w-4 h-4" /> Edit
            </button>
            <button
              onClick={() =>
                navigate(`/invoices/new?duplicate_from=${invoice.invoice_id}`)
              }
              className="px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] font-bold rounded-lg hover:bg-[var(--bg-app)] transition-colors text-sm flex items-center gap-1.5"
            >
              <Copy className="w-4 h-4" /> Duplicate
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] font-bold rounded-lg hover:bg-[var(--bg-app)] transition-colors text-sm flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" /> Print
            </button>
            <button
              onClick={handleDownload}
              className="px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] font-bold rounded-lg hover:bg-[var(--bg-app)] transition-colors text-sm flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" /> Download
            </button>
            {invoice.status !== "paid" && invoice.status !== "cancelled" && (
              <button
                onClick={() => {
                  setPaymentAmount(invoice.amount_left || invoice.total_amount);
                  setShowPaymentModal(true);
                }}
                className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-all text-sm flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
              >
                <Check className="w-4 h-4" /> Record Payment
              </button>
            )}
            {invoice.status !== "paid" && (
              <button
                onClick={handleGeneratePaymentLink}
                disabled={isGeneratingLink}
                className="px-3 py-2 bg-brand-primary text-brand-accent font-bold rounded-lg hover:opacity-90 transition-all text-sm flex items-center gap-1.5 shadow-md shadow-brand-primary/20 disabled:opacity-60"
              >
                <Link className="w-4 h-4" />
                {isGeneratingLink ? "Generating..." : "Get Payment Link"}
              </button>
            )}
          </div>

          {/* Mobile actions */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-lg"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate(`/invoices/${invoice.invoice_id}/edit`)}
              className="p-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-lg"
              title="Edit"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            {invoice.status !== "paid" && (
              <button
                onClick={handleGeneratePaymentLink}
                disabled={isGeneratingLink}
                className="p-2 bg-brand-primary text-brand-accent rounded-lg disabled:opacity-60"
                title="Get Payment Link"
              >
                <Link className="w-4 h-4" />
              </button>
            )}
            <div className="relative">
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-lg flex items-center gap-1"
              >
                <span className="text-xs font-bold">More</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {showMobileMenu && (
                <div className="absolute right-0 top-10 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-xl shadow-xl z-50 w-40 py-1">
                  {invoice.status !== "paid" &&
                    invoice.status !== "cancelled" && (
                      <button
                        onClick={() => {
                          setShowMobileMenu(false);
                          setPaymentAmount(
                            invoice.amount_left || invoice.total_amount,
                          );
                          setShowPaymentModal(true);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-emerald-600 hover:bg-[var(--bg-app)] flex items-center gap-2 font-medium"
                      >
                        <Check className="w-4 h-4" /> Record Payment
                      </button>
                    )}
                  <button
                    onClick={() =>
                      navigate(
                        `/invoices/new?duplicate_from=${invoice.invoice_id}`,
                      )
                    }
                    className="w-full text-left px-4 py-2.5 text-sm text-[var(--text-main)] hover:bg-[var(--bg-app)] flex items-center gap-2"
                  >
                    <Copy className="w-4 h-4" /> Duplicate
                  </button>
                  <button
                    onClick={() => {
                      window.print();
                      setShowMobileMenu(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-[var(--text-main)] hover:bg-[var(--bg-app)] flex items-center gap-2"
                  >
                    <Printer className="w-4 h-4" /> Print
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Invoice Document */}
        <div className="bg-white text-gray-900 rounded-lg shadow-sm border border-gray-200 overflow-hidden h-[80vh] min-h-[800px] print:shadow-none print:border-none">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title="Invoice PDF"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
              Loading PDF...
            </div>
          )}
        </div>
      </div>

      {/* Payment Link Modal */}
      {paymentLink && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setPaymentLink(null)}
        >
          <div
            className="bg-[var(--bg-surface)] rounded-2xl shadow-2xl border border-[var(--border-soft)] w-full max-w-md p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  backgroundColor: `${org?.primary_color || "#7c3aed"}18`,
                }}
              >
                <Link
                  className="w-5 h-5"
                  style={{ color: org?.primary_color || "#7c3aed" }}
                />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-main)]">
                  Payment Link Ready
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Share this link with <strong>{invoice.client_name}</strong> to
                  collect payment via Paystack.
                </p>
              </div>
            </div>

            {/* Amount callout */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-app)]">
              <span className="text-sm text-[var(--text-muted)] font-medium">
                Amount Due
              </span>
              <span className="text-lg font-black text-[var(--text-main)]">
                {invoice.currency_symbol || "$"}
                {(parseFloat(invoice.total_amount) || 0).toLocaleString(
                  undefined,
                  { minimumFractionDigits: 2 },
                )}
              </span>
            </div>

            {/* Link input + copy */}
            <div className="flex gap-2">
              <div className="flex-1 px-3 py-2.5 text-xs font-mono bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl text-[var(--text-muted)] truncate select-all">
                {paymentLink}
              </div>
              <button
                onClick={handleCopyLink}
                className="px-3 py-2.5 rounded-xl border border-[var(--border-soft)] text-[var(--text-main)] hover:bg-[var(--bg-app)] transition-colors shrink-0 flex items-center gap-1.5 text-sm font-bold"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => window.open(paymentLink, "_blank")}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl border border-[var(--border-soft)] text-[var(--text-main)] hover:bg-[var(--bg-app)] transition-colors"
              >
                <ExternalLink className="w-4 h-4" /> Open Link
              </button>
              <button
                onClick={() => setPaymentLink(null)}
                className="flex-1 py-2.5 text-sm font-bold rounded-xl text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: org?.primary_color || "#7c3aed" }}
              >
                Done
              </button>
            </div>

            <p className="text-xs text-[var(--text-muted)] text-center">
              Once paid, this invoice will automatically be marked as{" "}
              <strong>Paid</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setShowPaymentModal(false)}
        >
          <div
            className="bg-[var(--bg-surface)] rounded-2xl shadow-2xl border border-[var(--border-soft)] w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-[var(--text-main)] mb-4">
              Record Payment
            </h3>
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-[var(--text-muted)] mb-1.5">
                  Amount ({currencySymbol})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={invoice.amount_left || invoice.total_amount}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary"
                  required
                />
                <p className="text-xs text-[var(--text-muted)] mt-1.5">
                  Balance due: {currencySymbol}
                  {formatCurrency(invoice.amount_left || invoice.total_amount)}
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-2.5 text-sm font-bold rounded-xl border border-[var(--border-soft)] text-[var(--text-main)] hover:bg-[var(--bg-app)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRecordingPayment}
                  className="flex-1 py-2.5 text-sm font-bold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                  {isRecordingPayment ? "Saving..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
