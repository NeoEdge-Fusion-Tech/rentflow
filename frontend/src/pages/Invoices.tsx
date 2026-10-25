import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  FileText,
  Download,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  CheckCircle,
  Eye,
  Copy,
  CreditCard,
  X,
  Upload,
  ReceiptText,
} from "lucide-react";
import { cn } from "@/src/utils";
import { useNotification } from "../context/NotificationContext";
import { InvoiceService, AuthService } from "../api";
import { RevenueDisplay } from "../components/RevenueDisplay";
import { UploadInvoiceModal } from "../components/UploadInvoiceModal";
import { ActionMenu } from "../components/ActionMenu";
import {
  DateFilterBar,
  DEFAULT_DATE_FILTER,
  DateFilterValue,
  dateFilterParams,
} from "../components/DateFilterBar";

export function Invoices() {
  const navigate = useNavigate();
  const { showNotification, showConfirm } = useNotification();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("All");
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Payment Modal State
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  // Debounced copy of the search box, so we don't query on every keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);
  const [dateFilter, setDateFilter] =
    useState<DateFilterValue>(DEFAULT_DATE_FILTER);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const defaultCurrencySymbol = localStorage.getItem("currencySymbol") || "$";
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

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

  const fetchInvoices = async (page = 1) => {
    try {
      setIsLoading(true);
      const params: any = { page, ...dateFilterParams(dateFilter) };
      if (debouncedSearch) params.search = debouncedSearch;
      if (activeTab !== "All") {
        if (activeTab.toLowerCase() === "trash") {
          params.status = "cancelled";
        } else {
          params.status = activeTab.toLowerCase();
        }
      }
      const res = await InvoiceService.getAll(params);
      setInvoices(res.data.results || res.data);
      setTotalCount(res.data.count || (res.data.results || res.data).length);
    } catch (err) {
      console.error("Failed to fetch invoices", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices(currentPage);
  }, [currentPage, debouncedSearch, activeTab, dateFilter]);

  const handleDownload = async (invoice: any) => {
    try {
      const response = await InvoiceService.download(invoice.invoice_id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `invoice_${invoice.invoice_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Failed to download invoice", err);
      showNotification("Failed to download invoice", "error");
    }
  };

  const handleMarkPaid = async (invoice: any) => {
    if (invoice.status === "paid") return;
    showConfirm({
      title: "Mark as Paid",
      message: `Mark invoice ${invoice.invoice_number} as paid? This will also update any linked booking status.`,
      confirmText: "Mark Paid",
      onConfirm: async () => {
        try {
          await InvoiceService.recordPayment(invoice.invoice_id, {
            amount: invoice.amount_left,
          });
          showNotification("Invoice marked as paid!", "success");
          fetchInvoices();
        } catch (err) {
          console.error("Failed to mark invoice as paid", err);
          showNotification("Failed to update invoice status.", "error");
        }
      },
    });
  };

  const submitPayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      showNotification("Please enter a valid amount", "error");
      return;
    }
    try {
      await InvoiceService.recordPayment(selectedInvoice.invoice_id, {
        amount,
      });
      showNotification("Payment recorded successfully", "success");
      setPaymentModalOpen(false);
      fetchInvoices();
    } catch (err: any) {
      console.error(err);
      showNotification(
        err.response?.data?.error || "Failed to record payment",
        "error",
      );
    }
  };

  const handleDelete = (id: number) => {
    const isTrash = activeTab === "Trash";
    showConfirm({
      title: isTrash ? "Permanently Delete Invoice" : "Move to Trash",
      message: isTrash
        ? "Are you sure you want to permanently delete this invoice? This action cannot be undone."
        : "Are you sure you want to move this invoice to the trash? It will be marked as cancelled.",
      type: "danger",
      confirmText: isTrash ? "Permanently Delete" : "Move to Trash",
      onConfirm: async () => {
        try {
          await InvoiceService.delete(id);
          showNotification(
            isTrash ? "Invoice permanently deleted" : "Invoice moved to trash",
            "success",
          );
          fetchInvoices();
        } catch (err: any) {
          console.error("Failed to delete invoice", err);
          showNotification(
            err.response?.data?.error ||
              err.response?.data?.detail ||
              "Failed to delete invoice",
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
        "Are you sure you want to permanently delete all invoices in the trash? This action cannot be undone.",
      type: "danger",
      confirmText: "Empty Trash",
      onConfirm: async () => {
        try {
          await InvoiceService.emptyTrash();
          showNotification("Trash emptied successfully", "success");
          fetchInvoices();
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

  const displayedInvoices = invoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)]">
            Invoices
          </h1>
          <p className="text-[var(--text-muted)]">
            Create, manage, and send branded invoices to your clients.
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
            onClick={() => setUploadModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] px-4 py-2.5 rounded-xl font-bold hover:bg-[var(--bg-app)] transition-colors shadow-sm"
          >
            <Upload className="w-5 h-5" />
            Upload Invoice
          </button>
          <button
            onClick={() => navigate("/invoices/new")}
            className="flex items-center justify-center gap-2 bg-brand-primary text-brand-accent px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-colors shadow-sm shadow-brand-primary/20"
          >
            <Plus className="w-5 h-5" />
            New Invoice
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border-soft)] pb-px overflow-x-auto">
        {["All", "draft", "issued", "partially_paid", "paid", "Trash"].map(
          (tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setCurrentPage(1);
              }}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-all relative capitalize whitespace-nowrap",
                activeTab === tab
                  ? "text-[var(--text-link)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)]",
              )}
            >
              {tab.replace("_", " ")}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--text-link)] rounded-full" />
              )}
            </button>
          ),
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setCurrentPage(1);
          }}
          placeholder="Search by invoice number, title, client, booking or item…"
          className="w-full pl-10 pr-4 py-3 bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all shadow-sm"
        />
      </div>

      <DateFilterBar
        value={dateFilter}
        onChange={(v) => {
          setDateFilter(v);
          setCurrentPage(1);
        }}
      />

      {/* List */}
      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="bg-[var(--bg-surface)] p-12 text-center text-[var(--text-muted)] rounded-2xl border border-[var(--border-soft)]">
            Loading invoices...
          </div>
        ) : displayedInvoices.length === 0 ? (
          <div className="bg-[var(--bg-surface)] p-12 text-center text-[var(--text-muted)] rounded-2xl border border-[var(--border-soft)]">
            No invoices found.
          </div>
        ) : (
          displayedInvoices.map((invoice) => (
            <div
              key={invoice.invoice_id}
              className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-soft)] hover:border-brand-primary/20 hover:shadow-md transition-all group"
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                <div className="flex-1 flex items-start gap-4">
                  <div className="p-3 bg-[var(--bg-app)] rounded-xl text-[var(--text-muted)] group-hover:bg-brand-primary/10 group-hover:text-[var(--text-link)] transition-colors">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                        {invoice.invoice_number}
                      </span>
                      <span
                        className={cn(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm border",
                          invoice.status === "issued"
                            ? "bg-blue-50 text-blue-700 border-blue-100"
                            : invoice.status === "partially_paid"
                              ? "bg-amber-50 text-amber-700 border-amber-100"
                              : invoice.status === "paid"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                : invoice.status === "cancelled"
                                  ? "bg-rose-50 text-rose-700 border-rose-100"
                                  : "bg-[var(--bg-app)] text-[var(--text-muted)] border-[var(--border-soft)]",
                        )}
                      >
                        {invoice.status.replace("_", " ")}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-[var(--text-main)] mt-0.5">
                      {invoice.client_name || "Client not set"}
                    </h3>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                        <Calendar className="w-3.5 h-3.5" />
                        Issued{" "}
                        {new Date(invoice.issue_date).toLocaleDateString()}
                      </div>
                      {invoice.due_date && (
                        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                          Due {new Date(invoice.due_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {(() => {
                  const sym = invoice.currency_symbol || defaultCurrencySymbol;
                  const total = Number(invoice.total_amount) || 0;
                  const paid = Number(invoice.amount_paid) || 0;
                  const balance = Math.max(total - paid, 0);
                  const partial =
                    paid > 0 && invoice.status !== "paid" && balance > 0;
                  const pct =
                    total > 0 ? Math.min(100, (paid / total) * 100) : 0;
                  return (
                    <div className="w-full lg:w-60 shrink-0">
                      <div className="flex items-baseline justify-between lg:justify-end gap-3">
                        <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest lg:hidden">
                          Total
                        </span>
                        <div className="text-right">
                          <p className="hidden lg:block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-0.5">
                            Total
                          </p>
                          <div className="text-xl font-black text-[var(--text-main)] tabular-nums flex justify-end">
                            <RevenueDisplay
                              amount={`${sym}${formatCurrency(total)}`}
                            />
                          </div>
                        </div>
                      </div>
                      {partial && (
                        <div className="mt-3">
                          <div
                            className="h-1.5 rounded-full bg-[var(--bg-app)] border border-[var(--border-soft)] overflow-hidden"
                            role="progressbar"
                            aria-valuenow={Math.round(pct)}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            title={`${Math.round(pct)}% paid`}
                          >
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
                            <div className="text-left">
                              <dt className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                Paid · {Math.round(pct)}%
                              </dt>
                              <dd className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                                <RevenueDisplay
                                  hideToggle
                                  amount={`${sym}${formatCurrency(paid)}`}
                                />
                              </dd>
                            </div>
                            <div className="text-right">
                              <dt className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                                Balance due
                              </dt>
                              <dd className="font-bold text-amber-600 dark:text-amber-400 tabular-nums flex justify-end">
                                <RevenueDisplay
                                  hideToggle
                                  amount={`${sym}${formatCurrency(balance)}`}
                                />
                              </dd>
                            </div>
                          </dl>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="flex items-center justify-end gap-2 border-t lg:border-t-0 lg:border-l border-[var(--border-subtle)] pt-4 lg:pt-0 lg:pl-6">
                  {invoice.status !== "paid" &&
                    invoice.status !== "cancelled" && (
                      <button
                        onClick={() => {
                          setSelectedInvoice(invoice);
                          setPaymentAmount("");
                          setPaymentModalOpen(true);
                        }}
                        className="px-3.5 py-2.5 bg-brand-primary/10 text-brand-primary rounded-xl hover:bg-brand-primary/20 transition-colors whitespace-nowrap text-sm font-bold flex items-center gap-1.5"
                      >
                        <CreditCard className="w-4 h-4" /> Record Payment
                      </button>
                    )}
                  <ActionMenu
                    label="Invoice actions"
                    className="p-2.5 bg-[var(--bg-app)] rounded-xl"
                    items={[
                      {
                        label: "View invoice",
                        icon: Eye,
                        onClick: () =>
                          navigate(`/invoices/${invoice.invoice_id}/preview`),
                      },
                      {
                        label: "Edit",
                        icon: Edit2,
                        onClick: () =>
                          navigate(`/invoices/${invoice.invoice_id}/edit`),
                      },
                      {
                        label: "Duplicate",
                        icon: Copy,
                        onClick: () =>
                          navigate(
                            `/invoices/new?duplicate_from=${invoice.invoice_id}`,
                          ),
                      },
                      {
                        label: "Download PDF",
                        icon: Download,
                        onClick: () => handleDownload(invoice),
                      },
                      ...(Number(invoice.amount_paid) > 0
                        ? [
                            {
                              label: "Payment receipts",
                              icon: ReceiptText,
                              onClick: () =>
                                navigate(
                                  `/invoices/${invoice.invoice_id}/preview`,
                                ),
                            },
                          ]
                        : []),
                      ...(invoice.status !== "paid" &&
                      invoice.status !== "cancelled"
                        ? [
                            {
                              label: "Mark as paid",
                              icon: CheckCircle,
                              onClick: () => handleMarkPaid(invoice),
                            },
                          ]
                        : []),
                      // Only drafts can be deleted (to trash); admins can
                      // permanently delete what's in the trash.
                      ...(invoice.status === "draft" ||
                      (invoice.status === "cancelled" &&
                        currentUser?.role === "admin")
                        ? [
                            {
                              label:
                                invoice.status === "cancelled"
                                  ? "Delete permanently"
                                  : "Delete",
                              icon: Trash2,
                              danger: true,
                              onClick: () => handleDelete(invoice.invoice_id),
                            },
                          ]
                        : []),
                    ]}
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {!isLoading && totalCount > 0 && (
        <div className="flex items-center justify-between mt-4 border-t border-[var(--border-soft)] pt-4">
          <p className="text-sm text-[var(--text-muted)]">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount}{" "}
            results
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
                  Math.min(Math.ceil(totalCount / itemsPerPage), p + 1),
                )
              }
              className="p-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-lg text-[var(--text-main)] hover:bg-[var(--bg-app)] disabled:opacity-50"
              disabled={currentPage === Math.ceil(totalCount / itemsPerPage)}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {paymentModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-[var(--bg-app)] rounded-3xl max-w-md w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-[var(--border-soft)]">
            <div className="p-6 border-b border-[var(--border-soft)] flex items-center justify-between shrink-0">
              <h3 className="text-2xl font-black text-[var(--text-main)] font-display">
                Record Payment
              </h3>
              <button
                onClick={() => setPaymentModalOpen(false)}
                className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)] rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="flex justify-between items-center py-3 border-b border-[var(--border-soft)]">
                <span className="text-[var(--text-muted)]">Invoice</span>
                <span className="font-bold text-[var(--text-main)]">
                  {selectedInvoice.invoice_number}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-[var(--border-soft)]">
                <span className="text-[var(--text-muted)]">Amount Left</span>
                <span className="font-bold text-[var(--text-main)] flex items-center justify-end">
                  <RevenueDisplay
                    amount={`${
                      selectedInvoice.currency_symbol || defaultCurrencySymbol
                    }${formatCurrency(
                      selectedInvoice.total_amount -
                        parseFloat(selectedInvoice.amount_paid),
                    )}`}
                  />
                </span>
              </div>
              <div>
                <label className="block text-sm font-bold text-[var(--text-main)] mb-2">
                  Payment Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-xl text-[var(--text-main)] outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all"
                  placeholder="Enter amount..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-[var(--border-soft)] flex gap-3 shrink-0 bg-[var(--bg-app)]">
              <button
                type="button"
                onClick={() => setPaymentModalOpen(false)}
                className="flex-1 px-4 py-3 border border-[var(--border-soft)] rounded-xl text-[var(--text-main)] font-bold hover:bg-[var(--bg-surface)] transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitPayment}
                disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                className="flex-1 px-4 py-3 bg-brand-primary text-white rounded-xl font-bold hover:bg-brand-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Invoice Modal */}
      <UploadInvoiceModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
      />
    </div>
  );
}
