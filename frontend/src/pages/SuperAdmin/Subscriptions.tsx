import React, { useState, useEffect } from 'react';
import { CreditCard, Search, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { api } from '@/src/api';
import { useNotification } from '@/src/context/NotificationContext';
import { format } from 'date-fns';

export function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // In a real app we'd have dedicated endpoints for super admin to get all subscriptions.
      // Assuming we have `/payment/subscription-payments/` which returns all for admin.
      const res = await api.get('/payment/subscription-payments/');
      setPayments(res.data.results || res.data);
      
      // Fetch organizations to see their plans
      const orgRes = await api.get('/users/organizations/');
      setSubscriptions(orgRes.data.results || orgRes.data);
    } catch (e: any) {
      showNotification('Failed to load subscriptions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrgs = subscriptions.filter(org => 
    org.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-brand-primary" />
            Platform Subscriptions
          </h1>
          <p className="text-[var(--text-muted)] mt-1">Manage tenant subscriptions and plans</p>
        </div>
      </div>

      <div className="mb-6 relative">
        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input 
          type="text" 
          placeholder="Search organizations..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full max-w-md pl-10 pr-4 py-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-lg text-[var(--text-main)] focus:outline-none focus:border-brand-primary"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-soft)] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[var(--border-soft)]">
            <h2 className="font-bold text-[var(--text-main)]">Organizations & Plans</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-app)] text-[var(--text-muted)] uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Organization</th>
                  <th className="px-4 py-3 font-medium">Plan</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {filteredOrgs.map(org => (
                  <tr key={org.id} className="hover:bg-[var(--bg-app)]">
                    <td className="px-4 py-3 font-medium text-[var(--text-main)]">{org.name}</td>
                    <td className="px-4 py-3 capitalize">{org.subscription?.plan_name || org.subscription_plan || 'Free'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        org.subscription_plan !== 'free' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-500/10 text-gray-500'
                      }`}>
                        {org.subscription_plan !== 'free' ? 'Active' : 'Free'}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredOrgs.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-[var(--text-muted)]">No organizations found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-soft)] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[var(--border-soft)]">
            <h2 className="font-bold text-[var(--text-main)]">Recent Subscription Payments</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-app)] text-[var(--text-muted)] uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Org ID</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {payments.map(payment => (
                  <tr key={payment.id} className="hover:bg-[var(--bg-app)]">
                    <td className="px-4 py-3 text-[var(--text-muted)]">
                      {payment.created_at ? format(new Date(payment.created_at), 'MMM d, yyyy') : '-'}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-main)]">{payment.organization}</td>
                    <td className="px-4 py-3 font-medium">{payment.amount}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500">
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-[var(--text-muted)]">No recent payments</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
