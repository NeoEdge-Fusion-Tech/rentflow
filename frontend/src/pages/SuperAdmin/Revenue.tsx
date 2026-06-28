import React, { useState, useEffect } from 'react';
import { Coins, TrendingUp, BarChart3, Users } from 'lucide-react';
import { api } from '@/src/api';
import { useNotification } from '@/src/context/NotificationContext';
import { format } from 'date-fns';

export function Revenue() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const res = await api.get('/payment/super-admin/revenue/');
      setMetrics(res.data);
    } catch (e: any) {
      showNotification('Failed to load revenue metrics', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-2">
            <Coins className="w-6 h-6 text-brand-primary" />
            Revenue & Payments
          </h1>
          <p className="text-[var(--text-muted)] mt-1">Platform-wide financial metrics</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-soft)] shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-[var(--text-muted)] font-medium text-sm mb-1">Total SaaS Revenue</h3>
          <p className="text-2xl font-bold text-[var(--text-main)]">
            ₦{metrics?.total_saas_revenue?.toLocaleString(undefined, {minimumFractionDigits: 2}) || '0.00'}
          </p>
        </div>

        <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-soft)] shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-[var(--text-muted)] font-medium text-sm mb-1">Active Subscriptions</h3>
          <p className="text-2xl font-bold text-[var(--text-main)]">
            {metrics?.active_subscriptions || 0}
          </p>
        </div>

        <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-soft)] shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-500">
              <BarChart3 className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-[var(--text-muted)] font-medium text-sm mb-1">Estimated MRR</h3>
          <p className="text-2xl font-bold text-[var(--text-main)]">
            ₦{metrics?.mrr?.toLocaleString(undefined, {minimumFractionDigits: 2}) || '0.00'}
          </p>
        </div>
      </div>

      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-soft)] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[var(--border-soft)]">
          <h2 className="font-bold text-[var(--text-main)]">Recent Global Transactions (Tenants)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--bg-app)] text-[var(--text-muted)] uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Payment ID</th>
                <th className="px-4 py-3 font-medium">Organization</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-soft)]">
              {metrics?.recent_payments?.map((payment: any) => (
                <tr key={payment.id} className="hover:bg-[var(--bg-app)]">
                  <td className="px-4 py-3 text-[var(--text-muted)]">{payment.id}</td>
                  <td className="px-4 py-3 font-medium text-[var(--text-main)]">{payment.organization}</td>
                  <td className="px-4 py-3 font-medium text-[var(--text-main)]">{payment.amount}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500">
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">
                    {payment.created_at ? format(new Date(payment.created_at), 'MMM d, yyyy') : '-'}
                  </td>
                </tr>
              ))}
              {(!metrics?.recent_payments || metrics.recent_payments.length === 0) && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[var(--text-muted)]">No recent transactions</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
