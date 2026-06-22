import React, { useState, useEffect } from 'react';
import { BookingService } from '../../api';
import { Calendar, Building2, Search, Filter } from 'lucide-react';
import { cn } from '@/src/utils';
import { useNotification } from '../../context/NotificationContext';

export function Bookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const { showNotification } = useNotification();
  const currencySymbol = localStorage.getItem('currencySymbol') || '$';

  useEffect(() => {
    fetchBookings();
  }, [activeTab]);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchBookings();
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      let params: any = {};
      if (activeTab !== 'All') params.status = activeTab;
      if (searchQuery) params.search = searchQuery;

      const res = await BookingService.getAll(params);
      setBookings(res.data.results || res.data);
    } catch (e) {
      showNotification('Failed to fetch bookings', 'error');
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
        <h1 className="text-2xl font-bold text-[var(--text-main)]">Global Bookings</h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">View all bookings across the platform</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        {/* Tabs */}
        <div className="flex items-center gap-2 border-b border-[var(--border-soft)] pb-px overflow-x-auto w-full md:w-auto">
          {['All', 'pending', 'confirmed', 'picked_up', 'returned'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-all relative capitalize whitespace-nowrap",
                activeTab === tab ? "text-[var(--text-link)]" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              )}
            >
              {tab.replace('_', ' ')}
              {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--text-link)] rounded-full" />}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input 
            type="text" 
            placeholder="Search by ID or event..." 
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
                <th className="px-6 py-4 font-semibold">Booking ID</th>
                <th className="px-6 py-4 font-semibold">Organization</th>
                <th className="px-6 py-4 font-semibold">Event</th>
                <th className="px-6 py-4 font-semibold">Client</th>
                <th className="px-6 py-4 font-semibold">Amount</th>
                <th className="px-6 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-soft)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[var(--text-muted)]">
                    <div className="w-6 h-6 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading bookings...
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[var(--text-muted)]">No bookings found.</td>
                </tr>
              ) : (
                bookings.map((booking) => (
                  <tr key={booking.booking_id} className="hover:bg-[var(--bg-app)] transition-colors">
                    <td className="px-6 py-4 font-bold text-[var(--text-main)]">#{booking.booking_id}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[var(--text-muted)]" />
                        <span className="font-medium text-[var(--text-main)]">{booking.organization_name || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-[var(--text-main)] truncate max-w-[150px]">
                        {booking.event_name || 'Generic Event'}
                      </p>
                      <p className="text-xs text-[var(--text-muted)] flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(booking.booking_date).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-[var(--text-muted)]">{booking.client_name}</td>
                    <td className="px-6 py-4 font-bold text-[var(--text-main)]">
                      {currencySymbol}{formatCurrency(booking.total_amount)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border",
                        booking.status === 'confirmed' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                        booking.status === 'picked_up' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                        booking.status === 'returned' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                        booking.status === 'cancelled' ? "bg-rose-500/10 text-rose-500 border-rose-500/20" :
                        "bg-[var(--bg-app)] text-[var(--text-muted)] border-[var(--border-soft)]"
                      )}>
                        {booking.status.replace('_', ' ')}
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
