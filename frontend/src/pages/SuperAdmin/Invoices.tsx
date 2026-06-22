import React, { useState, useEffect } from 'react';
import { InvoiceService } from '../../api';
import { FileText, Building2, Search, Filter } from 'lucide-react';
import { cn } from '@/src/utils';
import { useNotification } from '../../context/NotificationContext';

export function Invoices() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const { showNotification } = useNotification();
  const currencySymbol = localStorage.getItem('currencySymbol') || '$';

  useEffect(() => {
    fetchInvoices();
  }, [activeTab]);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchInvoices();
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      let params: any = {};
      if (activeTab !== 'All') params.status = activeTab;
      if (searchQuery) params.search = searchQuery;

      const res = await InvoiceService.getAll(params);
      setInvoices(res.data.results || res.data);
    } catch (e) {
      showNotification('Failed to fetch invoices', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return (num || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-main)]">Global Invoices</h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">View all invoices and financial records</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-[var(--border-soft)] pb-px overflow-x-auto w-full md:w-auto">
          {['All', 'draft', 'sent', 'paid', 'overdue', 'cancelled'].map((tab) => (
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
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input 
            type="text" 
            placeholder="Search invoice number..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-4 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-xl outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all text-sm"
          />
        </div>
      </div>

      <div className="bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--bg-app)] text-[var(--text-muted)] border-b border-[var(--border-soft)]">
              <tr>
                <th className="px-6 py-4 font-semibold">Invoice No.</th>
                <th className="px-6 py-4 font-semibold">Organization</th>
                <th className="px-6 py-4 font-semibold">Client</th>
                <th className="px-6 py-4 font-semibold">Issue Date</th>
                <th className="px-6 py-4 font-semibold">Amount</th>
                <th className="px-6 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-soft)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[var(--text-muted)]">
                    <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading invoices...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[var(--text-muted)]">No invoices found.</td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.invoice_id} className="hover:bg-[var(--bg-app)] transition-colors">
                    <td className="px-6 py-4 font-bold text-[var(--text-main)] flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[var(--text-muted)]" />
                      {invoice.invoice_number}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[var(--text-muted)]" />
                        <span className="font-medium text-[var(--text-main)]">{invoice.organization_name || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[var(--text-muted)]">{invoice.client_name}</td>
                    <td className="px-6 py-4 text-[var(--text-muted)]">
                      {new Date(invoice.issue_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-bold text-[var(--text-main)]">
                      {invoice.currency_symbol || currencySymbol}{formatCurrency(invoice.total_amount)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border",
                        invoice.status === 'paid' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                        invoice.status === 'sent' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                        invoice.status === 'overdue' ? "bg-rose-500/10 text-rose-500 border-rose-500/20" :
                        "bg-[var(--bg-app)] text-[var(--text-muted)] border-[var(--border-soft)]"
                      )}>
                        {invoice.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
