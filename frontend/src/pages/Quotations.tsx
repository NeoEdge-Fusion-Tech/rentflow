import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  FileSpreadsheet,
  Download,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  ArrowRightCircle,
  Copy,
} from "lucide-react";
import { cn } from "@/src/utils";
import { useNotification } from "../context/NotificationContext";
import { QuotationService, AuthService } from "../api";
import { RevenueDisplay } from "../components/RevenueDisplay";

export function Quotations() {
  const navigate = useNavigate();
  const { showNotification, showConfirm } = useNotification();
  const [quotations, setQuotations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const itemsPerPage = 8;
  const defaultCurrencySymbol = localStorage.getItem("currencySymbol") || "$";

  useEffect(() => {
    AuthService.getMe()
      .then((res) => setCurrentUser(res.data))
      .catch(console.error);
  }, []);

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return (num || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const fetchQuotations = async () => {
    try {
      setIsLoading(true);
      const params: any = {};
      if (activeTab !== "All") {
        if (activeTab === "Trash") {
          params.status = "cancelled";
        } else {
          params.status = activeTab;
        }
      }
      if (searchQuery) params.search = searchQuery;
      const res = await QuotationService.getAll(params);
      setQuotations(res.data.results || res.data);
      setCurrentPage(1);
    } catch (err) {
      console.error("Failed to fetch quotations", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, [activeTab]);

  useEffect(() => {
    const handler = setTimeout(() => fetchQuotations(), 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handleDownload = async (quotation: any) => {
    try {
      const response = await QuotationService.download(quotation.quotation_id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `quotation_${quotation.quotation_number}.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Failed to download quotation", err);
      showNotification("Failed to download quotation", "error");
    }
  };

  const handleConvert = (quotation: any) => {
    showConfirm({
      title: "Convert to Invoice",
      message: `Convert quotation ${quotation.quotation_number} into a real invoice? This will create a new invoice with the same line items.`,
      confirmText: "Convert",
      onConfirm: async () => {
        try {
          const res = await QuotationService.convertToInvoice(
            quotation.quotation_id,
          );
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

  const handleDelete = (id: number) => {
    const isTrash = activeTab === "Trash";
    showConfirm({
      title: isTrash ? "Permanently Delete Quotation" : "Move to Trash",
      message: isTrash
        ? "Are you sure you want to permanently delete this quotation? This action cannot be undone."
        : "Are you sure you want to move this quotation to the trash? It will be marked as cancelled.",
      type: "danger",
      confirmText: isTrash ? "Permanently Delete" : "Move to Trash",
      onConfirm: async () => {
        try {
          await QuotationService.delete(id);
          showNotification(
            isTrash
              ? "Quotation permanently deleted"
              : "Quotation moved to trash",
            "success",
          );
          fetchQuotations();
        } catch (err: any) {
          console.error("Failed to delete quotation", err);
          showNotification(
            err.response?.data?.detail || "Failed to delete quotation",
            "error",
          );
        }
      },
    });
  };

  const handleEmptyTrash = () => {
    showConfirm({
      title: "Empty Trash",
      message:
        "Are you sure you want to permanently delete all quotations in the trash? This action cannot be undone.",
      type: "danger",
      confirmText: "Empty Trash",
      onConfirm: async () => {
        try {
          await QuotationService.emptyTrash();
          showNotification("Trash emptied successfully", "success");
          fetchQuotations();
        } catch (err: any) {
          console.error("Failed to empty trash", err);
          showNotification(
            err.response?.data?.detail || "Failed to empty trash",
            "error",
          );
        }
      },
    });
  };

  const counts = {
    total: quotations.length,
    draft: quotations.filter((q) => q.status === "draft").length,
    sent: quotations.filter((q) => q.status === "sent").length,
    converted: quotations.filter((q) => q.status === "converted").length,
  };

  const displayedQuotations = quotations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)]">
            Quotations
          </h1>
          <p className="text-[var(--text-muted)]">
            Send price quotes to prospects and convert them into invoices once
            accepted.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === "Trash" && currentUser?.role === "admin" && (
            <button
              onClick={handleEmptyTrash}
              className="flex items-center justify-center gap-2 bg-rose-500/10 text-rose-600 px-4 py-2.5 rounded-xl font-bold hover:bg-rose-500/20 transition-colors shadow-sm"
            >
              <Trash2 className="w-5 h-5" />
              Empty Trash
            </button>
          )}
          <button
            onClick={() => navigate("/quotations/new")}
            className="flex items-center justify-center gap-2 bg-brand-primary text-brand-accent px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-colors shadow-sm shadow-brand-primary/20"
          >
            <Plus className="w-5 h-5" />
            New Quotation
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 mb-2">
        {[
          { label: "Total", value: counts.total, color: "slate" },
          { label: "Draft", value: counts.draft, color: "amber" },
          { label: "Sent", value: counts.sent, color: "blue" },
          { label: "Converted", value: counts.converted, color: "emerald" },
        ].map((s, idx) => (
          <div
            key={idx}
            className="bg-[var(--bg-surface)] p-4 rounded-2xl border border-[var(--border-soft)] shadow-sm hover:shadow-md transition-all"
          >
            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">
              {s.label}
            </p>
            <p
              className={`text-xl font-black text-${s.color}-600 dark:text-${s.color}-400`}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border-soft)] pb-px overflow-x-auto">
        {[
          "All",
          "draft",
          "sent",
          "accepted",
          "rejected",
          "converted",
          "Trash",
        ].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-all relative capitalize whitespace-nowrap",
              activeTab === tab
                ? "text-[var(--text-link)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-main)]",
            )}
          >
            {tab}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--text-link)] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by quotation number..."
          className="w-full pl-10 pr-4 py-3 bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all shadow-sm"
        />
      </div>

      {/* List */}
      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="bg-[var(--bg-surface)] p-12 text-center text-[var(--text-muted)] rounded-2xl border border-[var(--border-soft)]">
            Loading quotations...
          </div>
        ) : displayedQuotations.length === 0 ? (
          <div className="bg-[var(--bg-surface)] p-12 text-center text-[var(--text-muted)] rounded-2xl border border-[var(--border-soft)]">
            No quotations found.
          </div>
        ) : (
          displayedQuotations.map((quotation) => (
            <div
              key={quotation.quotation_id}
              className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-soft)] hover:border-brand-primary/20 hover:shadow-md transition-all group"
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                <div className="flex-1 flex items-start gap-4">
                  <div className="p-3 bg-[var(--bg-app)] rounded-xl text-[var(--text-muted)] group-hover:bg-brand-primary/10 group-hover:text-[var(--text-link)] transition-colors">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                        {quotation.quotation_number}
                      </span>
                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm border",
                          quotation.status === "sent"
                            ? "bg-blue-50 text-blue-700 border-blue-100"
                            : quotation.status === "accepted"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : quotation.status === "converted"
                                ? "bg-purple-50 text-purple-700 border-purple-100"
                                : quotation.status === "rejected" ||
                                    quotation.status === "cancelled"
                                  ? "bg-rose-50 text-rose-700 border-rose-100"
                                  : "bg-[var(--bg-app)] text-[var(--text-muted)] border-[var(--border-soft)]",
                        )}
                      >
                        {quotation.status}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-[var(--text-main)] mt-0.5">
                      {quotation.client_name || "No client"}
                    </h3>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                        <Calendar className="w-3.5 h-3.5" />
                        Issued{" "}
                        {new Date(quotation.issue_date).toLocaleDateString()}
                      </div>
                      {quotation.expiry_date && (
                        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                          Valid until{" "}
                          {new Date(quotation.expiry_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right lg:min-w-[140px]">
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-0.5">
                    Total
                  </p>
                  <p className="text-xl font-black text-[var(--text-main)] flex items-center justify-end">
                    <RevenueDisplay
                      amount={`${
                        quotation.currency_symbol || defaultCurrencySymbol
                      }${formatCurrency(quotation.total_amount)}`}
                    />
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap border-t lg:border-t-0 lg:border-l border-[var(--border-subtle)] pt-4 lg:pt-0 lg:pl-6">
                  <button
                    onClick={() =>
                      navigate(`/quotations/${quotation.quotation_id}/preview`)
                    }
                    className="p-2.5 bg-[var(--bg-app)] text-[var(--text-muted)] rounded-xl hover:bg-[var(--border-soft)] transition-colors"
                    title="Preview Quotation"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {quotation.status !== "converted" && (
                    <button
                      onClick={() =>
                        navigate(`/quotations/${quotation.quotation_id}/edit`)
                      }
                      className="p-2.5 bg-[var(--bg-app)] text-[var(--text-main)] rounded-xl hover:bg-[var(--border-soft)] transition-colors"
                      title="Edit Quotation"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() =>
                      navigate(
                        `/quotations/new?duplicate_from=${quotation.quotation_id}`,
                      )
                    }
                    className="p-2.5 bg-[var(--bg-app)] text-[var(--text-main)] rounded-xl hover:bg-[var(--border-soft)] transition-colors"
                    title="Duplicate Quotation"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  {quotation.status !== "converted" &&
                    quotation.status !== "cancelled" && (
                      <button
                        onClick={() => handleConvert(quotation)}
                        className="p-2.5 bg-emerald-500/10 text-emerald-600 rounded-xl hover:bg-emerald-500/20 transition-colors"
                        title="Convert to Invoice"
                      >
                        <ArrowRightCircle className="w-4 h-4" />
                      </button>
                    )}
                  <button
                    onClick={() => handleDownload(quotation)}
                    className="p-2.5 bg-blue-500/10 text-blue-600 rounded-xl hover:bg-blue-500/20 transition-colors"
                    title="Download PDF"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  {quotation.status !== "converted" &&
                    (quotation.status !== "cancelled" ||
                      currentUser?.role === "admin") && (
                      <button
                        onClick={() => handleDelete(quotation.quotation_id)}
                        className="p-2.5 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors"
                        title={
                          quotation.status === "cancelled"
                            ? "Permanently Delete"
                            : "Delete Quotation"
                        }
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {quotations.length > itemsPerPage && (
        <div className="flex items-center justify-between mt-4 border-t border-[var(--border-soft)] pt-4">
          <p className="text-sm text-[var(--text-muted)]">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, quotations.length)} of{" "}
            {quotations.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-lg text-[var(--text-main)] hover:bg-[var(--bg-app)] disabled:opacity-50"
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() =>
                setCurrentPage((p) =>
                  Math.min(Math.ceil(quotations.length / itemsPerPage), p + 1),
                )
              }
              className="p-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-lg text-[var(--text-main)] hover:bg-[var(--bg-app)] disabled:opacity-50"
              disabled={
                currentPage === Math.ceil(quotations.length / itemsPerPage)
              }
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
