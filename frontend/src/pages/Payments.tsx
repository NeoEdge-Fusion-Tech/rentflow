import React, { useState } from 'react';
import { 
  CreditCard, 
  Search, 
  Download, 
  Filter, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Clock
} from 'lucide-react';
import { cn } from '@/src/utils';

import { PaymentService } from '../api';

export function Payments() {
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const currencySymbol = localStorage.getItem('currencySymbol') || '$';
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  
  const formatCurrency = (amount: number | string) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(amount));
  };

  React.useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setIsLoading(true);
      const res = await PaymentService.getAll();
      setPayments(res.data.results || res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)]">Payment History</h1>
          <p className="text-[var(--text-muted)]">Track invoices, receipts, and transaction status.</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center justify-center gap-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] px-4 py-2.5 rounded-xl font-medium hover:bg-[var(--bg-app)] transition-colors">
            <Download className="w-5 h-5" />
            Export CSV
          </button>
          <button className="flex items-center justify-center gap-2 bg-brand-primary text-brand-accent px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-colors shadow-sm shadow-brand-primary/20">
            <FileText className="w-5 h-5" />
            Generate Invoice
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-soft)] shadow-sm">
          <p className="text-sm font-medium text-[var(--text-muted)]">Total Displayed Revenue</p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-2xl font-bold text-[var(--text-main)]">
              {currencySymbol}{formatCurrency(payments.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0))}
            </p>
          </div>
        </div>
        <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-soft)] shadow-sm">
          <p className="text-sm font-medium text-[var(--text-muted)]">Pending Payments Count</p>
          <p className="text-2xl font-bold text-[var(--text-main)] mt-1">
            {payments.filter(p => p.status === 'pending').length}
          </p>
        </div>
        <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-soft)] shadow-sm">
          <p className="text-sm font-medium text-[var(--text-muted)]">Failed Transactions Count</p>
          <p className="text-2xl font-bold text-rose-500 mt-1">
            {payments.filter(p => p.status === 'failed').length}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-soft)] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[var(--border-soft)] flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search by transaction ID, client..."
              className="w-full pl-10 pr-4 py-2 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-[var(--border-soft)] rounded-xl text-[var(--text-main)] hover:bg-[var(--bg-app)] font-medium transition-colors shrink-0">
            <Filter className="w-4 h-4" /> Status
          </button>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[var(--bg-app)] border-b border-[var(--border-soft)]">
                <th className="px-6 py-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Transaction</th>
                <th className="px-6 py-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Booking</th>
                <th className="px-6 py-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Client</th>
                <th className="px-6 py-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-[var(--text-muted)]">Loading payments...</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-[var(--text-muted)]">No payments found.</td></tr>
              ) : payments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((payment) => (
                <tr key={payment.payment_id} className="hover:bg-[var(--bg-app)] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-[var(--bg-app)] rounded-lg text-[var(--text-muted)] border border-[var(--border-soft)]"><CreditCard className="w-4 h-4" /></div>
                      <span className="text-sm font-semibold text-[var(--text-main)]">{payment.payment_id}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4"><span className="text-sm text-[var(--text-muted)] font-medium">{payment.booking_ref}</span></td>
                  <td className="px-6 py-4"><span className="text-sm text-[var(--text-main)] font-medium">{payment.client_name || 'System Generated'}</span></td>
                  <td className="px-6 py-4"><span className="text-sm font-bold text-[var(--text-main)]">{currencySymbol}{formatCurrency(payment.amount)}</span></td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                      payment.status === 'completed' ? "bg-emerald-500/10 text-emerald-500" :
                      payment.status === 'pending' ? "bg-amber-500/10 text-amber-500" : "bg-rose-500/10 text-rose-500"
                    )}>
                      {payment.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                      {payment.status === 'pending' && <Clock className="w-3 h-3" />}
                      {payment.status === 'failed' && <AlertCircle className="w-3 h-3" />}
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4"><span className="text-sm text-[var(--text-muted)]">{new Date(payment.payment_date).toLocaleDateString()}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile card list */}
        <div className="md:hidden divide-y divide-[var(--border-subtle)]">
          {isLoading ? (
            <div className="p-8 text-center text-[var(--text-muted)]">Loading payments...</div>
          ) : payments.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-muted)]">No payments found.</div>
          ) : payments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((payment) => (
            <div key={payment.payment_id} className="p-4 hover:bg-[var(--bg-app)] transition-colors">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[var(--bg-app)] rounded-lg text-[var(--text-muted)] border border-[var(--border-soft)] shrink-0"><CreditCard className="w-4 h-4" /></div>
                  <div>
                    <p className="font-bold text-[var(--text-main)] text-sm">{payment.client_name || 'System'}</p>
                    <p className="text-xs text-[var(--text-muted)]">#{payment.payment_id}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-[var(--text-main)]">{currencySymbol}{formatCurrency(payment.amount)}</p>
                  <span className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase mt-1",
                    payment.status === 'completed' ? "bg-emerald-500/10 text-emerald-500" :
                    payment.status === 'pending' ? "bg-amber-500/10 text-amber-500" : "bg-rose-500/10 text-rose-500"
                  )}>
                    {payment.status}
                  </span>
                </div>
              </div>
              <div className="flex gap-4 text-xs text-[var(--text-muted)] pl-11">
                {payment.booking_ref && <span>Booking: {payment.booking_ref}</span>}
                <span>{new Date(payment.payment_date).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="px-4 py-4 border-t border-[var(--border-soft)] flex items-center justify-between">
          <p className="text-xs sm:text-sm text-[var(--text-muted)]">
            {payments.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, payments.length)} of {payments.length}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="p-2 border border-[var(--border-soft)] rounded-lg text-[var(--text-main)] hover:bg-[var(--bg-app)] disabled:opacity-50" disabled={currentPage === 1}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setCurrentPage(p => Math.min(Math.ceil(payments.length / itemsPerPage), p + 1))} className="p-2 border border-[var(--border-soft)] rounded-lg text-[var(--text-main)] hover:bg-[var(--bg-app)] disabled:opacity-50" disabled={currentPage === Math.ceil(payments.length / itemsPerPage) || payments.length === 0}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
