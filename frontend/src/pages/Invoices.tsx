import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  FileText,
  Download,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Calendar
} from 'lucide-react';
import { cn } from '@/src/utils';
import { useNotification } from '../context/NotificationContext';
import { InvoiceService } from '../api';

export function Invoices() {
  const navigate = useNavigate();
  const { showNotification, showConfirm } = useNotification();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const defaultCurrencySymbol = localStorage.getItem('currencySymbol') || '$';

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return (num || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      const params: any = {};
      if (activeTab !== 'All') params.status = activeTab;
      if (searchQuery) params.search = searchQuery;
      const res = await InvoiceService.getAll(params);
      setInvoices(res.data.results || res.data);
      setCurrentPage(1);
    } catch (err) {
      console.error("Failed to fetch invoices", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [activeTab]);

  useEffect(() => {
    const handler = setTimeout(() => fetchInvoices(), 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const handleDownload = async (invoice: any) => {
    try {
      const response = await InvoiceService.download(invoice.invoice_id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${invoice.invoice_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Failed to download invoice", err);
      showNotification("Failed to download invoice", 'error');
    }
  };

  const handleDelete = (id: number) => {
    showConfirm({
      title: 'Delete Invoice',
      message: 'Are you sure you want to delete this invoice? This action is permanent.',
      type: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await InvoiceService.delete(id);
          showNotification("Invoice deleted successfully", 'success');
          fetchInvoices();
        } catch (err) {
          console.error("Failed to delete invoice", err);
          showNotification("Failed to delete invoice", 'error');
        }
      }
    });
  };

  const counts = {
    total: invoices.length,
    draft: invoices.filter(i => i.status === 'draft').length,
    issued: invoices.filter(i => i.status === 'issued').length,
    paid: invoices.filter(i => i.status === 'paid').length,
  };

  const displayedInvoices = invoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)]">Invoices</h1>
          <p className="text-[var(--text-muted)]">Create, manage, and send branded invoices to your clients.</p>
        </div>
        <button onClick={() => navigate('/invoices/new')} className="flex items-center justify-center gap-2 bg-brand-accent text-brand-primary px-4 py-2.5 rounded-xl font-bold hover:bg-brand-accent-hover transition-colors shadow-sm shadow-brand-accent/20">
          <Plus className="w-5 h-5" />
          New Invoice
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 mb-2">
        {[
          { label: 'Total', value: counts.total, color: 'slate' },
          { label: 'Draft', value: counts.draft, color: 'amber' },
          { label: 'Issued', value: counts.issued, color: 'blue' },
          { label: 'Paid', value: counts.paid, color: 'emerald' },
        ].map((s, idx) => (
          <div key={idx} className="bg-[var(--bg-surface)] p-4 rounded-2xl border border-[var(--border-soft)] shadow-sm hover:shadow-md transition-all">
            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{s.label}</p>
            <p className={`text-xl font-black text-${s.color}-600 dark:text-${s.color}-400`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border-soft)] pb-px overflow-x-auto">
        {['All', 'draft', 'issued', 'paid', 'cancelled'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-all relative capitalize whitespace-nowrap",
              activeTab === tab ? "text-[var(--text-link)]" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
            )}
          >
            {tab}
            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--text-link)] rounded-full" />}
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
          placeholder="Search by invoice number..."
          className="w-full pl-10 pr-4 py-3 bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all shadow-sm"
        />
      </div>

      {/* List */}
      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="bg-[var(--bg-surface)] p-12 text-center text-[var(--text-muted)] rounded-2xl border border-[var(--border-soft)]">Loading invoices...</div>
        ) : displayedInvoices.length === 0 ? (
          <div className="bg-[var(--bg-surface)] p-12 text-center text-[var(--text-muted)] rounded-2xl border border-[var(--border-soft)]">No invoices found.</div>
        ) : displayedInvoices.map((invoice) => (
          <div key={invoice.invoice_id} className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-soft)] hover:border-brand-primary/20 hover:shadow-md transition-all group">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              <div className="flex-1 flex items-start gap-4">
                <div className="p-3 bg-[var(--bg-app)] rounded-xl text-[var(--text-muted)] group-hover:bg-brand-primary/10 group-hover:text-[var(--text-link)] transition-colors">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">{invoice.invoice_number}</span>
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm border",
                      invoice.status === 'issued' ? "bg-blue-50 text-blue-700 border-blue-100" :
                      invoice.status === 'paid' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                      invoice.status === 'cancelled' ? "bg-rose-50 text-rose-700 border-rose-100" :
                      "bg-[var(--bg-app)] text-[var(--text-muted)] border-[var(--border-soft)]"
                    )}>
                      {invoice.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[var(--text-main)] mt-0.5">{invoice.client_name || 'No client'}</h3>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                      <Calendar className="w-3.5 h-3.5" />
                      Issued {new Date(invoice.issue_date).toLocaleDateString()}
                    </div>
                    {invoice.due_date && (
                      <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                        Due {new Date(invoice.due_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right lg:min-w-[140px]">
                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-0.5">Total</p>
                <p className="text-xl font-black text-[var(--text-main)]">{invoice.currency_symbol || defaultCurrencySymbol}{formatCurrency(invoice.total_amount)}</p>
              </div>

              <div className="flex items-center gap-2 border-t lg:border-t-0 lg:border-l border-[var(--border-subtle)] pt-4 lg:pt-0 lg:pl-6">
                <button
                  onClick={() => navigate(`/invoices/${invoice.invoice_id}/edit`)}
                  className="p-2.5 bg-[var(--bg-app)] text-[var(--text-main)] rounded-xl hover:bg-[var(--border-soft)] transition-colors"
                  title="Edit Invoice"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDownload(invoice)}
                  className="p-2.5 bg-blue-500/10 text-blue-600 rounded-xl hover:bg-blue-500/20 transition-colors"
                  title="Download PDF"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(invoice.invoice_id)}
                  className="p-2.5 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors"
                  title="Delete Invoice"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {invoices.length > itemsPerPage && (
        <div className="flex items-center justify-between mt-4 border-t border-[var(--border-soft)] pt-4">
          <p className="text-sm text-[var(--text-muted)]">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, invoices.length)} of {invoices.length}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="p-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-lg text-[var(--text-main)] hover:bg-[var(--bg-app)] disabled:opacity-50" disabled={currentPage === 1}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setCurrentPage(p => Math.min(Math.ceil(invoices.length / itemsPerPage), p + 1))} className="p-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-lg text-[var(--text-main)] hover:bg-[var(--bg-app)] disabled:opacity-50" disabled={currentPage === Math.ceil(invoices.length / itemsPerPage)}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
