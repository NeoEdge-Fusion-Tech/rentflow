import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookingService } from '../../api';
import { Calendar, Package, ArrowRight, ScanLine, User } from 'lucide-react';
import { cn } from '@/src/utils';

export function Validation() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      const res = await BookingService.getAll();
      const allBookings = res.data.results || res.data;
      const activeBookings = allBookings.filter((b: any) => ['confirmed', 'picked_up'].includes(b.status));
      setBookings(activeBookings);
    } catch (error) {
      console.error("Failed to fetch bookings", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div className="flex items-center gap-3 px-4 sm:px-0">
        <div className="w-12 h-12 bg-brand-primary/10 rounded-2xl flex items-center justify-center">
          <ScanLine className="w-6 h-6 text-brand-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)]">Validation App</h1>
          <p className="text-sm text-[var(--text-muted)]">Select an active booking to process pickups or returns.</p>
        </div>
      </div>

      <div className="bg-[var(--bg-surface)] p-6 rounded-3xl border border-[var(--border-soft)] shadow-xl relative mx-4 sm:mx-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-10 h-10 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin mb-4" />
            <p className="text-sm font-bold text-[var(--text-muted)]">Loading bookings...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4 opacity-50" />
            <p className="text-[var(--text-main)] font-medium">No active bookings found.</p>
            <p className="text-[var(--text-muted)] text-sm mt-1">Bookings need to be confirmed before they can be validated.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {bookings.map((booking) => (
              <div
                key={booking.booking_id}
                onClick={() => navigate(`/validation/${booking.booking_id}`)}
                className="group flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-[var(--bg-app)] rounded-2xl border border-[var(--border-soft)] hover:border-brand-primary/50 cursor-pointer transition-all hover:shadow-md"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-[var(--text-main)] text-lg">
                      Booking #{booking.booking_id}
                    </h3>
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider",
                      booking.status === 'confirmed' ? "bg-amber-500/10 text-amber-500" : "bg-purple-500/10 text-purple-500"
                    )}>
                      {booking.status === 'confirmed' ? 'Ready for Pickup' : 'In Progress (Picked Up)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-[var(--text-muted)]">
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {booking.client?.business_name || booking.client?.contact_name || 'Walk-in Client'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(booking.pickup_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                <div className="mt-4 sm:mt-0 flex items-center justify-end text-brand-primary font-medium group-hover:translate-x-1 transition-transform">
                  Validate <ArrowRight className="w-5 h-5 ml-1" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
