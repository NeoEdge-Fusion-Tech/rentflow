import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  Printer,
  Edit2,
  ChevronDown,
  Copy,
  ArrowRightCircle,
} from "lucide-react";
import { QuotationService, AuthService, OrganizationService } from "../api";
import { useNotification } from "../context/NotificationContext";

export function QuotationPreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showNotification, showConfirm } = useNotification();

  const [quotation, setQuotation] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    let blobUrl = "";
    (async () => {
      setIsLoading(true);
      try {
        if (!id) return;
        const qRes = await QuotationService.get(id);
        setQuotation(qRes.data);
        const meRes = await AuthService.getMe();
        if (meRes.data.organization_id) {
          const orgRes = await OrganizationService.get(
            meRes.data.organization_id,
          );
          setOrg(orgRes.data);
        }
        const response = await QuotationService.download(id);
        blobUrl = window.URL.createObjectURL(
          new Blob([response.data], { type: "application/pdf" }),
        );
        setPdfUrl(blobUrl);
      } catch (err) {
        console.error("Failed to load preview", err);
        showNotification("Failed to load quotation preview.", "error");
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
      const response = await QuotationService.download(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `quotation_${quotation?.quotation_number || id}.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Failed to download quotation", err);
      showNotification("Failed to download quotation", "error");
    }
  };

  const handleConvert = () => {
    if (!id) return;
    showConfirm({
      title: "Convert to Invoice",
      message:
        "Convert this quotation into a real invoice? This will create a new invoice with the same line items.",
      confirmText: "Convert",
      onConfirm: async () => {
        try {
          const res = await QuotationService.convertToInvoice(id);
          showNotification("Quotation converted to invoice!", "success");
          navigate(`/invoices/${res.data.invoice_id}/edit`);
        } catch (err: any) {
          console.error("Failed to convert quotation", err);
          showNotification(
            err.response?.data?.error || "Failed to convert quotation.",
            "error",
          );
        }
      },
    });
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
        Loading quotation preview...
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="bg-[var(--bg-surface)] p-12 text-center text-[var(--text-muted)] rounded-2xl border border-[var(--border-soft)]">
        Quotation not found.
      </div>
    );
  }

  const primaryColor = org?.primary_color || "#7c3aed";
  const currencySymbol =
    quotation.currency_symbol || org?.currency?.symbol || "$";
  const isConverted = quotation.status === "converted";

  return (
    <>
      <div className="max-w-5xl mx-auto space-y-4 pb-20">
        {/* Top Action Bar */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border-soft)] pb-4">
          <button
            onClick={() => navigate("/quotations")}
            className="flex items-center gap-2 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Quotations</span>
            <span className="sm:hidden">Back</span>
          </button>

          {/* Desktop actions */}
          <div className="hidden sm:flex items-center gap-2 flex-wrap justify-end">
            {!isConverted && (
              <button
                onClick={() =>
                  navigate(`/quotations/${quotation.quotation_id}/edit`)
                }
                className="px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] font-bold rounded-lg hover:bg-[var(--bg-app)] transition-colors text-sm flex items-center gap-1.5"
              >
                <Edit2 className="w-4 h-4" /> Edit
              </button>
            )}
            <button
              onClick={() =>
                navigate(
                  `/quotations/new?duplicate_from=${quotation.quotation_id}`,
                )
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
            {!isConverted && (
              <button
                onClick={handleConvert}
                className="px-3 py-2 bg-brand-primary text-brand-accent font-bold rounded-lg hover:opacity-90 transition-all text-sm flex items-center gap-1.5 shadow-md shadow-brand-primary/20"
              >
                <ArrowRightCircle className="w-4 h-4" /> Convert to Invoice
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
            {!isConverted && (
              <button
                onClick={() =>
                  navigate(`/quotations/${quotation.quotation_id}/edit`)
                }
                className="p-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-lg"
                title="Edit"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {!isConverted && (
              <button
                onClick={handleConvert}
                className="p-2 bg-brand-primary text-brand-accent rounded-lg"
                title="Convert to Invoice"
              >
                <ArrowRightCircle className="w-4 h-4" />
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
                  <button
                    onClick={() =>
                      navigate(
                        `/quotations/new?duplicate_from=${quotation.quotation_id}`,
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

        {/* Quotation Document */}
        <div className="bg-white text-gray-900 rounded-lg shadow-sm border border-gray-200 overflow-hidden h-[80vh] min-h-[800px] print:shadow-none print:border-none">
          {pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full border-0"
              title="Quotation PDF"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
              Loading PDF...
            </div>
          )}
        </div>
      </div>
    </>
  );
}
