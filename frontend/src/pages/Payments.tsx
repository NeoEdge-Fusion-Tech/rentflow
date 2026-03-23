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
          <h1 className="text-2xl font-bold text-slate-900">Payment History</h1>
          <p className="text-slate-500">Track invoices, receipts, and transaction status.</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-medium hover:bg-slate-50 transition-colors">
            <Download className="w-5 h-5" />
            Export CSV
          </button>
          <button className="flex items-center justify-center gap-2 bg-brand-accent text-brand-primary px-4 py-2.5 rounded-xl font-bold hover:bg-brand-accent-hover transition-colors shadow-sm shadow-brand-accent/20">
            <FileText className="w-5 h-5" />
            Generate Invoice
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Displayed Revenue</p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-2xl font-bold text-slate-900">
              {currencySymbol}{formatCurrency(payments.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0))}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Pending Payments Count</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {payments.filter(p => p.status === 'pending').length}
          </p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Failed Transactions Count</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {payments.filter(p => p.status === 'failed').length}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by transaction ID, client..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-medium transition-colors">
            <Filter className="w-4 h-4" />
            Status
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Transaction</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Booking</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Loading payments...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No payments found.
                  </td>
                </tr>
              ) : payments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((payment) => (
                <tr key={payment.payment_id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 rounded-lg text-slate-500">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-semibold text-slate-900">{payment.payment_id}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-600 font-medium">{payment.booking_ref}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-900 font-medium">{payment.client_name || 'System Generated'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-slate-900">{currencySymbol}{formatCurrency(payment.amount)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                      payment.status === 'completed' ? "bg-emerald-50 text-emerald-700" :
                      payment.status === 'pending' ? "bg-amber-50 text-amber-700" :
                      "bg-rose-50 text-rose-700"
                    )}>
                      {payment.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                      {payment.status === 'pending' && <Clock className="w-3 h-3" />}
                      {payment.status === 'failed' && <AlertCircle className="w-3 h-3" />}
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-500">{new Date(payment.payment_date).toLocaleDateString()}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing {payments.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, payments.length)} of {payments.length} results
          </p>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50" 
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setCurrentPage(p => Math.min(Math.ceil(payments.length / itemsPerPage), p + 1))}
              className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              disabled={currentPage === Math.ceil(payments.length / itemsPerPage) || payments.length === 0}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
