import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { LogOut, Calendar, FileText, ArrowRight, Home } from "lucide-react";
import axios from "axios";

export function ClientPortalDashboard() {
  const { identifier } = useParams();
  const navigate = useNavigate();
  const [clientInfo, setClientInfo] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("client_token");
    const info = localStorage.getItem("client_info");

    if (!token || !info) {
      navigate(`/public/store/${identifier}/login`);
      return;
    }

    setClientInfo(JSON.parse(info));
    fetchDashboardData(token);
  }, [identifier]);

  const fetchDashboardData = async (token: string) => {
    try {
      const baseUrl =
        import.meta.env.VITE_API_URL || "http://localhost:8000/api";
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [bookingsRes, quotesRes] = await Promise.all([
        axios.get(
          `${baseUrl}/public/organizations/${identifier}/client/bookings/`,
          config,
        ),
        axios.get(
          `${baseUrl}/public/organizations/${identifier}/client/quotations/`,
          config,
        ),
      ]);

      setBookings(bookingsRes.data);
      setQuotations(quotesRes.data);
    } catch (err: any) {
      if (err.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("client_token");
    localStorage.removeItem("client_info");
    navigate(`/public/store/${identifier}/login`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-brand-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center text-white font-bold text-sm">
              {clientInfo?.first_name?.[0] || "C"}
            </div>
            <div>
              <h1 className="text-lg font-black text-gray-900 leading-none">
                {clientInfo?.first_name} {clientInfo?.last_name}
              </h1>
              <p className="text-xs text-gray-500 font-medium">Client Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/public/store/${identifier}`)}
              className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-brand-primary hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Home className="w-4 h-4" />
              Storefront
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="mb-8">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">
            Your Dashboard
          </h2>
          <p className="text-gray-500 mt-1">
            Manage your bookings, track rentals, and view invoices.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Bookings Section */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                Recent Bookings
              </h3>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto max-h-[500px]">
              {bookings.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-gray-500">No bookings found.</p>
                </div>
              ) : (
                bookings.map((booking: any) => (
                  <div
                    key={booking.booking_id}
                    className="p-4 rounded-2xl border border-gray-100 bg-gray-50 hover:border-blue-200 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-gray-900 truncate pr-4">
                        {booking.booking_title ||
                          `Booking #${booking.booking_id}`}
                      </h4>
                      <span
                        className={`px-2 py-1 text-[10px] font-bold uppercase rounded flex-shrink-0 ${
                          booking.status === "confirmed"
                            ? "bg-green-100 text-green-700"
                            : booking.status === "request"
                              ? "bg-amber-100 text-amber-700"
                              : booking.status === "completed"
                                ? "bg-gray-200 text-gray-700"
                                : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {booking.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-end mt-4">
                      <p className="text-xs text-gray-500">
                        {new Date(booking.start_date).toLocaleDateString()} -{" "}
                        {new Date(booking.end_date).toLocaleDateString()}
                      </p>
                      <p className="font-black text-blue-600">
                        ${Number(booking.total_amount).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quotations / Invoices Section */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">
                Quotations & Invoices
              </h3>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto max-h-[500px]">
              {quotations.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-gray-500">No documents found.</p>
                </div>
              ) : (
                quotations.map((quote: any) => (
                  <div
                    key={quote.quotation_id}
                    className="p-4 rounded-2xl border border-gray-100 bg-gray-50 hover:border-emerald-200 transition-colors flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-bold text-gray-900 truncate pr-4">
                        {quote.title}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(quote.created_at).toLocaleDateString()}
                      </p>
                      <span
                        className={`inline-block mt-2 px-2 py-1 text-[10px] font-bold uppercase rounded ${
                          quote.status === "accepted"
                            ? "bg-emerald-100 text-emerald-700"
                            : quote.status === "draft"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {quote.status}
                      </span>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <p className="font-black text-emerald-600 mb-2">
                        ${Number(quote.total_amount).toFixed(2)}
                      </p>
                      <button className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-600 transition-colors">
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
