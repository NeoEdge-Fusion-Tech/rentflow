import React, { useState } from 'react';
import { 
  Calendar, 
  Search, 
  Plus, 
  Filter, 
  Clock, 
  Package,
  User,
  ExternalLink,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { cn } from '@/src/utils';

import { BookingService, ClientService, ProductService, PaymentService, StatsService } from '../api';

export function Bookings() {
  const [activeTab, setActiveTab] = useState('All');
  const [isAddingBooking, setIsAddingBooking] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [isManagingBooking, setIsManagingBooking] = useState(false);
  const [isViewingDetails, setIsViewingDetails] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [availableUnitsMap, setAvailableUnitsMap] = useState<Record<string, any[]>>({});
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);
  const [lastCreatedBooking, setLastCreatedBooking] = useState<any | null>(null);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const formatDateForInput = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      // Correct for timezone offset to get local time in ISO format
      return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    } catch (e) {
      return '';
    }
  };
  
  // Refactored Booking Form State
  const [formData, setFormData] = useState({
    client_id: '',
    delivery_mode: 'pickup',
    pickup_date: '',
    return_date: '',
    event_location: '',
    contact_name: '',
    contact_phone: '',
    event_name: '',
    status: 'pending',
    discount_amount: 0,
    discount_percentage: 0
  });

  const [bookingItems, setBookingItems] = useState<any[]>([
    { product_id: '', quantity_booked: 1, unit_price: 0, available_qty: 0, available_units: [], selected_unit_ids: [] }
  ]);
  
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const currencySymbol = localStorage.getItem('currencySymbol') || '$';

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return (num || 0).toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  };

  React.useEffect(() => {
    fetchBookings();
    fetchClients();
    fetchProducts();
    fetchStats();
  }, [activeTab, startDate, endDate]);

  // Debounced search
  React.useEffect(() => {
    const handler = setTimeout(() => {
      fetchBookings();
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchStats = async () => {
    try {
      const res = await StatsService.getTenantStats();
      setStats(res.data);
    } catch (e) {
      console.error("Failed to fetch stats", e);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await ClientService.getAll();
      setClients(res.data.results || res.data);
    } catch(e) {}
  };

  const fetchProducts = async () => {
    try {
      const res = await ProductService.getAll();
      setProducts(res.data.results || res.data);
    } catch(e) {}
  };

  const fetchAvailability = async (index: number, productId: string) => {
    if (!productId || !formData.pickup_date || !formData.return_date) return;
    try {
      const res = await ProductService.getAvailability(productId, formData.pickup_date, formData.return_date);
      setBookingItems(prev => {
        const newItems = [...prev];
        if (newItems[index]) {
          newItems[index] = { 
            ...newItems[index], 
            available_qty: res.data.available_quantity, 
            available_units: res.data.available_units 
          };
        }
        return newItems;
      });
    } catch (e) {
      console.error("Failed to fetch availability", e);
    }
  };

  // Re-fetch availability for all items when dates change
  React.useEffect(() => {
    bookingItems.forEach((item, index) => {
      if (item.product_id) fetchAvailability(index, item.product_id);
    });
  }, [formData.pickup_date, formData.return_date]);

  const handleCreateBooking = async () => {
    try {
      setIsLoading(true);
      
      if (!formData.client_id || bookingItems.some(i => !i.product_id)) {
        alert("Please select a client and products for all items.");
        return;
      }

      const payload = {
        client: parseInt(formData.client_id),
        delivery_mode: formData.delivery_mode,
        pickup_date: formData.pickup_date || null,
        return_date: formData.return_date || null,
        event_location: formData.event_location,
        contact_name: formData.contact_name,
        contact_phone: formData.contact_phone,
        event_name: formData.event_name,
        status: formData.status,
        discount_amount: formData.discount_amount,
        discount_percentage: formData.discount_percentage,
        items: bookingItems.map(item => ({
          product: parseInt(item.product_id),
          quantity_booked: item.quantity_booked,
          unit_price: item.unit_price,
          units: item.selected_unit_ids.map((id: number) => ({ product_unit: id }))
        }))
      };

      const res = await BookingService.create(payload);
      setLastCreatedBooking(res.data);
      setShowSuccessOverlay(true);
      setPaymentLink(null);
      fetchBookings();
    } catch (e: any) {
      console.error(e);
      const errorMsg = e.response?.data?.non_field_errors?.[0] || e.response?.data?.detail || "Failed to create booking.";
      alert(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePaymentLink = async (booking: any) => {
    if (!booking) return;
    try {
      setIsLoading(true);
      const res = await PaymentService.createLink(booking.booking_id, booking.total_amount);
      setPaymentLink(res.data.payment_link);
    } catch (e) {
      alert("Failed to generate payment link");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      client_id: '',
      delivery_mode: 'pickup',
      pickup_date: '',
      return_date: '',
      event_location: '',
      contact_name: '',
      contact_phone: '',
      event_name: '',
      status: 'pending',
      discount_amount: 0,
      discount_percentage: 0
    });
    setBookingItems([{ product_id: '', quantity_booked: 1, unit_price: 0, available_qty: 0, available_units: [], selected_unit_ids: [] }]);
  };

  const handleUpdatePaymentStatus = async (bookingId: number, newPaymentStatus: string) => {
    try {
      setIsLoading(true);
      await BookingService.patch(bookingId, { payment_status: newPaymentStatus });
      // Update selectedBooking locally so the UI reflects it immediately
      setSelectedBooking((prev: any) => prev ? { ...prev, payment_status: newPaymentStatus } : prev);
      fetchBookings();
    } catch (e) {
      alert('Failed to update payment status');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      let params: any = {};
      if (activeTab !== 'All') params.status = activeTab;
      if (searchQuery) params.search = searchQuery;
      if (startDate) params.pickup_after = startDate;
      if (endDate) params.pickup_before = endDate;

      const response = await BookingService.getAll(params);
      setBookings(response.data.results || response.data);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveBookingEdits = async () => {
    if (!selectedBooking || !editFormData) return;
    try {
      setIsLoading(true);
      // Construct items for update
      const itemsUpdate = editFormData.items.map((item: any) => ({
        booking_item_id: item.booking_item_id,
        product: item.product_id || item.product,
        quantity_booked: item.quantity_booked,
        unit_price: item.unit_price,
        units: (item.selected_unit_ids || []).map((id: number) => ({ product_unit: id }))
      }));

      const payload = {
        ...editFormData,
        items: itemsUpdate
      };

      await BookingService.patch(selectedBooking.booking_id, payload);
      fetchBookings();
      setIsManagingBooking(false);
      setSelectedBooking(null);
      setEditFormData(null);
    } catch (e) {
      alert("Failed to save changes");
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageAddItem = () => {
    if (!editFormData) return;
    const newItem = {
      product: '',
      product_name: 'Select Product',
      quantity_booked: 1,
      unit_price: 0,
      units: [],
      selected_unit_ids: [],
      is_new: true
    };
    setEditFormData({
      ...editFormData,
      items: [...editFormData.items, newItem]
    });
  };

  const handleManageRemoveItem = (index: number) => {
    if (!editFormData) return;
    const newItems = editFormData.items.filter((_: any, i: number) => i !== index);
    setEditFormData({
      ...editFormData,
      items: newItems
    });
  };

  const calculateEditTotal = () => {
    if (!editFormData?.items) return 0;
    const itemsTotal = editFormData.items.reduce((acc: number, item: any) => acc + (parseFloat(item.unit_price) * item.quantity_booked), 0);
    const discPercentage = selectedBooking?.discount_percentage || 0;
    const discAmount = parseFloat(selectedBooking?.discount_amount || 0);
    
    const discountVal = discPercentage > 0 
      ? itemsTotal * (discPercentage / 100)
      : discAmount;
      
    return Math.max(0, itemsTotal - discountVal);
  };

  const fetchAvailableUnitsForManage = async (productId: string, bookingId: number, start: string, end: string) => {
    if (!productId || !start || !end) return;
    try {
      const res = await ProductService.getAvailability(productId, start, end, bookingId);
      setAvailableUnitsMap(prev => ({
        ...prev,
        [productId]: res.data.available_units
      }));
    } catch (e) {
      console.error("Failed to fetch units for manage", e);
    }
  };

  const handleUpdateStatus = async (bookingId: number, newStatus: string) => {
    try {
      setIsLoading(true);
      await BookingService.patch(bookingId, { status: newStatus });
      fetchBookings();
      setIsManagingBooking(false);
      setSelectedBooking(null);
      setShowSuccessOverlay(false);
      setLastCreatedBooking(null);
      if (setIsAddingBooking) setIsAddingBooking(false);
      resetForm();
    } catch (e) {
      alert("Failed to update status");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBooking = async (bookingId: number) => {
    if (!confirm("Are you sure you want to delete this booking?")) return;
    try {
      setIsLoading(true);
      await BookingService.delete(bookingId);
      fetchBookings();
      setActiveMenuId(null);
    } catch (e) {
      alert("Failed to delete booking");
    } finally {
      setIsLoading(false);
    }
  };

  const totalBeforeDiscount = bookingItems.reduce((acc, item) => acc + (item.unit_price * item.quantity_booked), 0);
  const discountVal = formData.discount_percentage > 0 
    ? totalBeforeDiscount * (formData.discount_percentage / 100)
    : formData.discount_amount;
  const grandTotal = Math.max(0, totalBeforeDiscount - discountVal);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Booking Management</h1>
          <p className="text-slate-500">Track rentals, schedules, and fulfillment status.</p>
        </div>
        <button onClick={() => setIsAddingBooking(true)} className="flex items-center justify-center gap-2 bg-brand-accent text-brand-primary px-4 py-2.5 rounded-xl font-bold hover:bg-brand-accent-hover transition-colors shadow-sm shadow-brand-accent/20">
          <Plus className="w-5 h-5" />
          New Booking
        </button>
      </div>

      {/* Module Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4 mb-2">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-sm font-medium text-slate-500">Active Bookings</p>
            <p className="text-2xl font-black text-slate-900">{stats?.active_bookings ?? '...'}</p>
          </div>
          <div className="p-3 bg-brand-primary/10 rounded-xl text-brand-primary"><Calendar size={24}/></div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-sm font-medium text-slate-500">Monthly Revenue</p>
            <p className="text-2xl font-black text-emerald-600">
              {currencySymbol}{formatCurrency(stats?.monthly_revenue)}
            </p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 font-bold">
            <CheckCircle2 size={24}/>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
          <div>
            <p className="text-sm font-medium text-slate-500">Total Clients</p>
            <p className="text-2xl font-black text-slate-900">{stats?.total_clients ?? '...'}</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600"><User size={24}/></div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-px">
        {['All', 'pending', 'confirmed', 'picked_up', 'returned'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-all relative capitalize",
              activeTab === tab ? "text-brand-primary" : "text-slate-500 hover:text-slate-700"
            )}
          >
            {tab.replace('_', ' ')}
            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-primary rounded-full" />}
          </button>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by ID, client, or location..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-brand-primary/5 focus:border-brand-primary transition-all text-sm font-medium"
          />
        </div>
        
        <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 gap-1 w-full md:w-auto">
          <div className="flex items-center gap-2 px-3 border-r border-slate-100 mr-1">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Pickup Window</span>
          </div>
          <div className="flex items-center gap-1">
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 px-3 bg-slate-50 border-none rounded-lg text-xs font-bold text-slate-700 focus:ring-2 focus:ring-brand-primary/20 outline-none"
            />
            <span className="text-slate-300 font-bold">-</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 px-3 bg-slate-50 border-none rounded-lg text-xs font-bold text-slate-700 focus:ring-2 focus:ring-brand-primary/20 outline-none"
            />
          </div>
        </div>

        {(searchQuery || startDate || endDate) && (
          <button 
            onClick={() => { setSearchQuery(''); setStartDate(''); setEndDate(''); }}
            className="h-11 px-4 text-rose-500 font-bold rounded-xl hover:bg-rose-50 transition-all text-xs flex items-center gap-2 whitespace-nowrap"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Booking Cards */}
      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="bg-white p-12 text-center text-slate-500 rounded-2xl border border-slate-200">Loading bookings...</div>
        ) : bookings.length === 0 ? (
          <div className="bg-white p-12 text-center text-slate-500 rounded-2xl border border-slate-200">No bookings found.</div>
        ) : bookings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((booking) => (
          <div key={booking.booking_id} className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-brand-primary/20 hover:shadow-md transition-all group">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              <div className="flex-1 flex items-start gap-4">
                <div className="p-3 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-brand-primary/5 group-hover:text-brand-primary transition-colors">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">#{booking.booking_id}</span>
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm border",
                      booking.status === 'confirmed' ? "bg-blue-50 text-blue-700 border-blue-100" :
                      booking.status === 'picked_up' ? "bg-amber-50 text-amber-700 border-amber-100" :
                      booking.status === 'returned' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                      booking.status === 'cancelled' ? "bg-rose-50 text-rose-700 border-rose-100" :
                      "bg-slate-50 text-slate-700 border-slate-100"
                    )}>
                      {booking.status === 'pending' ? 'Pending Approval' : booking.status.replace('_', ' ')}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                    {booking.event_name || (booking.contact_name ? `${booking.contact_name} Event` : booking.client_name || 'Generic Event')}
                  </h3>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(booking.booking_date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Package className="w-3.5 h-3.5" />
                      {booking.items?.length || 0} items
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-2 lg:min-w-[150px]">
                <p className="text-xl font-bold text-slate-900">{currencySymbol}{formatCurrency(booking.total_amount)}</p>
                <span className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-semibold uppercase",
                  booking.payment_status === 'paid' ? "bg-emerald-50 text-emerald-700" :
                  booking.payment_status === 'partial' ? "bg-amber-50 text-amber-700" :
                  "bg-slate-100 text-slate-600"
                )}>
                  <span className="opacity-60 mr-1.5">Payment:</span> {booking.payment_status}
                </span>
              </div>

              <div className="flex items-center gap-2 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6 relative">
                <button 
                  onClick={() => { setSelectedBooking(booking); setIsViewingDetails(true); }}
                  className="px-4 py-2 bg-slate-50 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-colors text-sm"
                >
                  Details
                </button>
                <button 
                  onClick={() => { 
                    setSelectedBooking(booking); 
                    setIsManagingBooking(true); 
                    const initialItems = booking.items.map((item: any) => ({
                      ...item,
                      selected_unit_ids: item.units.map((u: any) => u.product_unit_id || u.product_unit)
                    }));
                    setEditFormData({
                      pickup_date: formatDateForInput(booking.pickup_date),
                      return_date: formatDateForInput(booking.return_date),
                      event_location: booking.event_location || '',
                      contact_name: booking.contact_name || '',
                      contact_phone: booking.contact_phone || '',
                      event_name: booking.event_name || '',
                      items: initialItems
                    });
                    // Fetch available units for each product
                    booking.items.forEach((item: any) => {
                      fetchAvailableUnitsForManage(item.product, booking.booking_id, booking.pickup_date, booking.return_date);
                    });
                  }}
                  className="px-4 py-2 bg-brand-primary text-brand-accent font-bold rounded-xl hover:bg-brand-primary/90 transition-colors text-sm"
                >
                  Manage
                </button>
                <div className="relative">
                  <button 
                    onClick={() => setActiveMenuId(activeMenuId === booking.booking_id ? null : booking.booking_id)}
                    className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  
                  {activeMenuId === booking.booking_id && (
                    <div className="absolute right-0 bottom-full mb-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 z-20 animate-in fade-in slide-in-from-bottom-2">
                      <button onClick={() => handleDeleteBooking(booking.booking_id)} className="w-full px-4 py-2.5 text-left text-sm font-bold text-rose-500 hover:bg-rose-50 flex items-center gap-2">
                        Delete Booking
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {bookings.length > itemsPerPage && (
        <div className="flex items-center justify-between mt-4 border-t border-slate-100 pt-4">
          <p className="text-sm text-slate-500">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, bookings.length)} of {bookings.length}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50" disabled={currentPage === 1}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setCurrentPage(p => Math.min(Math.ceil(bookings.length / itemsPerPage), p + 1))} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50" disabled={currentPage === Math.ceil(bookings.length / itemsPerPage)}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Add Booking Modal */}
      {isAddingBooking && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h2 className="text-xl font-bold text-slate-900">New Booking</h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Fill in the details to create a new rental reservation.</p>
              </div>
              <button 
                onClick={() => setIsAddingBooking(false)} 
                className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-200 shadow-sm hover:shadow-md"
              >
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Left Column: Form Sections */}
                <div className="lg:col-span-8 space-y-10">
                  
                  {/* Section 1: Client & Schedule */}
                  <section className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                        <User className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Customer & Schedule</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pl-11">
                      <div className="col-span-full">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Event Name (Optional)</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Wedding Reception"
                          value={formData.event_name}
                          onChange={e => setFormData({...formData, event_name: e.target.value})}
                          className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-brand-primary/5 focus:border-brand-primary text-sm font-medium transition-all"
                        />
                      </div>

                      <div className="col-span-full">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Client Selection</label>
                        <select 
                          value={formData.client_id}
                          onChange={e => setFormData({...formData, client_id: e.target.value})}
                          className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-brand-primary/5 focus:border-brand-primary text-sm font-medium transition-all"
                        >
                          <option value="">Choose a client...</option>
                          {clients.map(c => (
                            <option key={c.client_id} value={String(c.client_id)}>
                              {c.first_name} {c.last_name} {c.company_name ? `(${c.company_name})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Pickup Date & Time</label>
                        <div className="relative">
                          <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          <input 
                            type="datetime-local" 
                            value={formData.pickup_date}
                            onChange={e => setFormData({...formData, pickup_date: e.target.value})}
                            className="w-full h-12 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-brand-primary text-sm font-medium transition-all" 
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Return Date & Time</label>
                        <div className="relative">
                          <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          <input 
                            type="datetime-local"
                            value={formData.return_date}
                            onChange={e => setFormData({...formData, return_date: e.target.value})}
                            className="w-full h-12 pl-11 pr-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-brand-primary text-sm font-medium transition-all" 
                          />
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Section 2: Items Selection */}
                  <section className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
                          <Package className="w-4 h-4" />
                        </div>
                        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Inventory Items</h3>
                      </div>
                      <button 
                        onClick={() => setBookingItems([...bookingItems, { product_id: '', quantity_booked: 1, unit_price: 0, available_qty: 0, available_units: [], selected_unit_ids: [] }])}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-black bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
                      >
                        <Plus className="w-3 h-3" /> ADD ITEM
                      </button>
                    </div>

                    <div className="space-y-4 pl-11">
                      {bookingItems.length === 0 && (
                        <div className="text-center py-10 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                          <p className="text-sm text-slate-400 font-medium italic">No items added yet. Click "Add Item" to start.</p>
                        </div>
                      )}
                      
                      {bookingItems.map((item, i) => (
                        <div key={i} className="group relative bg-white border border-slate-200 rounded-[1.25rem] p-5 hover:border-brand-primary transition-all hover:shadow-xl hover:shadow-slate-200/50">
                          <div className="grid grid-cols-12 gap-5 items-start">
                            <div className="col-span-12 md:col-span-5 space-y-2">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Product</label>
                              <select 
                                value={item.product_id}
                                onChange={e => {
                                  const prodId = e.target.value;
                                  const prod = products.find(p => p.product_id === parseInt(prodId));
                                  setBookingItems(prev => {
                                    const newItems = [...prev];
                                    newItems[i] = { ...newItems[i], product_id: prodId, unit_price: prod?.price_per_day || 0, selected_unit_ids: [] };
                                    return newItems;
                                  });
                                  fetchAvailability(i, prodId);
                                }}
                                className="w-full h-11 px-3 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-brand-primary text-sm font-bold transition-all"
                              >
                                <option value="">Select a product...</option>
                                {products.map(p => <option key={p.product_id} value={String(p.product_id)}>{p.name}</option>)}
                              </select>
                            </div>
                            
                            <div className="col-span-6 md:col-span-2 space-y-2">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Qty</label>
                              <input 
                                type="number" 
                                value={item.quantity_booked}
                                min="1"
                                onChange={e => {
                                  const q = parseInt(e.target.value) || 1;
                                  setBookingItems(prev => {
                                    const next = [...prev];
                                    next[i].quantity_booked = q;
                                    return next;
                                  });
                                }}
                                className="w-full h-11 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-brand-primary text-sm font-black text-center"
                              />
                            </div>

                            <div className="col-span-6 md:col-span-3 space-y-2 text-right">
                              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest pr-1">Unit Price</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">{currencySymbol}</span>
                                <input 
                                  type="number"
                                  value={item.unit_price}
                                  onChange={e => {
                                    const p = parseFloat(e.target.value) || 0;
                                    setBookingItems(prev => {
                                      const next = [...prev];
                                      next[i].unit_price = p;
                                      return next;
                                    });
                                  }}
                                  className="w-full h-11 pl-7 pr-4 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-brand-primary text-sm font-black text-right"
                                />
                              </div>
                            </div>

                            <div className="col-span-12 md:col-span-2 pt-6 flex justify-end">
                              <button 
                                onClick={() => setBookingItems(bookingItems.filter((_, idx) => idx !== i))}
                                className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                              >
                                <Plus className="w-5 h-5 rotate-45" />
                              </button>
                            </div>
                          </div>

                          {item.product_id && (
                            <div className="mt-4 pt-4 border-t border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <div className={cn("w-2 h-2 rounded-full", (item.available_qty < item.quantity_booked) ? "bg-rose-500 animate-pulse" : "bg-emerald-500")} />
                                <span className={cn("text-[11px] font-black uppercase tracking-tight", (item.available_qty < item.quantity_booked) ? "text-rose-600" : "text-emerald-600")}>
                                  {formData.pickup_date && formData.return_date ? (
                                    (item.available_qty < item.quantity_booked) ? `OVERBOOKED: Only ${item.available_qty} left` : `${item.available_qty} Units Available`
                                  ) : "Set dates to check stock"}
                                </span>
                              </div>
                              <div className="text-xs font-bold text-slate-400 flex items-center gap-2">
                                <span className="uppercase tracking-widest text-[9px]">Subtotal</span>
                                <span className="text-slate-900 text-sm font-black">{currencySymbol}{formatCurrency(item.unit_price * item.quantity_booked)}</span>
                              </div>
                            </div>
                          )}

                          {/* Refined Particular Unit Selection */}
                          {item.available_units.length > 0 && (
                            <div className="mt-4 bg-slate-50/50 rounded-xl p-3 border border-slate-100">
                              <div className="flex items-center justify-between mb-2">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Assign Specific Units (Selected {item.selected_unit_ids.length}/{item.quantity_booked})</label>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {item.available_units.map((u: any) => (
                                  <button
                                    key={u.product_unit_id}
                                    onClick={() => {
                                      setBookingItems(prev => {
                                        const next = [...prev];
                                        const current = next[i].selected_unit_ids;
                                        if (current.includes(u.product_unit_id)) {
                                          next[i].selected_unit_ids = current.filter((id: number) => id !== u.product_unit_id);
                                        } else if (current.length < next[i].quantity_booked) {
                                          next[i].selected_unit_ids = [...current, u.product_unit_id];
                                        }
                                        return next;
                                      });
                                    }}
                                    className={cn(
                                      "text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all",
                                      item.selected_unit_ids.includes(u.product_unit_id) 
                                        ? "bg-brand-primary text-white border-brand-primary shadow-sm" 
                                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                                    )}
                                  >
                                    {u.serial_number}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Section 3: Logistics */}
                  <section className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                        <ExternalLink className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Logistics & Address</h3>
                    </div>

                    <div className="space-y-4 pl-11">
                      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-[1.25rem] w-full md:w-64">
                        <button onClick={() => setFormData({...formData, delivery_mode: 'pickup'})} className={cn("py-2.5 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest", formData.delivery_mode === 'pickup' ? "bg-white text-brand-primary shadow-sm" : "text-slate-500 hover:text-slate-600")}>Self Pickup</button>
                        <button onClick={() => setFormData({...formData, delivery_mode: 'delivery'})} className={cn("py-2.5 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest", formData.delivery_mode === 'delivery' ? "bg-white text-brand-primary shadow-sm" : "text-slate-500 hover:text-slate-600")}>Delivery</button>
                      </div>
                      
                      <div className="relative">
                        <Search className="absolute left-4 top-4 w-4 h-4 text-slate-400" />
                        <textarea 
                          placeholder="Full Address or Event Location" 
                          value={formData.event_location}
                          onChange={e => setFormData({...formData, event_location: e.target.value})}
                          className="w-full h-24 pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-brand-primary text-sm font-medium resize-none transition-all" 
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <input 
                          type="text" 
                          placeholder="Point of Contact Name" 
                          value={formData.contact_name}
                          onChange={e => setFormData({...formData, contact_name: e.target.value})}
                          className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-brand-primary text-sm font-medium" 
                        />
                        <input 
                          type="tel" 
                          placeholder="Contact Phone Number" 
                          value={formData.contact_phone}
                          onChange={e => setFormData({...formData, contact_phone: e.target.value})}
                          className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-brand-primary text-sm font-medium" 
                        />
                      </div>
                    </div>
                  </section>
                </div>

                {/* Right Column: Order Summary */}
                <div className="lg:col-span-4">
                  <div className="sticky top-0 space-y-6">
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-200">
                      <h3 className="text-lg font-black uppercase tracking-[0.2em] mb-10 text-slate-400 opacity-60">Order Summary</h3>
                      
                      <div className="space-y-6">
                        <div className="flex justify-between items-baseline mb-2">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Base Amount</span>
                          <span className="text-lg font-black">{currencySymbol}{formatCurrency(totalBeforeDiscount)}</span>
                        </div>

                        <div className="space-y-4 pt-6 border-t border-white/10">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Discount ({currencySymbol})</label>
                              <input 
                                type="number" 
                                value={formData.discount_amount} 
                                onChange={e => setFormData({...formData, discount_amount: parseFloat(e.target.value) || 0, discount_percentage: 0})} 
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-all font-black" 
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Discount (%)</label>
                              <input 
                                type="number" 
                                value={formData.discount_percentage} 
                                onChange={e => setFormData({...formData, discount_percentage: parseFloat(e.target.value) || 0, discount_amount: 0})} 
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-all font-black" 
                              />
                            </div>
                          </div>
                          {discountVal > 0 && (
                            <div className="flex justify-between text-brand-accent font-bold text-xs uppercase tracking-widest px-1">
                              <span>Saved</span>
                              <span>- {currencySymbol}{formatCurrency(discountVal)}</span>
                            </div>
                          )}
                        </div>

                        <div className="pt-10 space-y-2">
                          <div className="flex justify-between items-baseline">
                            <span className="text-sm font-black uppercase tracking-[0.1em] text-slate-400">Total Price</span>
                            <span className="text-4xl font-black text-brand-accent tracking-tighter">
                              {currencySymbol}{formatCurrency(grandTotal)}
                            </span>
                          </div>
                        </div>

                        {/* Booking Status Selector */}
                        <div className="pt-6 border-t border-white/10 space-y-2">
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Initial Booking Status</label>
                          <select
                            value={formData.status}
                            onChange={e => setFormData({...formData, status: e.target.value})}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-all font-bold text-white"
                          >
                            <option value="pending" className="text-slate-900">Pending</option>
                            <option value="confirmed" className="text-slate-900">Confirmed</option>
                            <option value="picked_up" className="text-slate-900">Picked Up</option>
                            <option value="returned" className="text-slate-900">Returned</option>
                            <option value="cancelled" className="text-slate-900">Cancelled</option>
                          </select>
                        </div>

                        <button 
                          onClick={handleCreateBooking}
                          disabled={isLoading}
                          className="w-full mt-6 h-16 bg-brand-accent text-brand-primary rounded-2xl font-black text-sm uppercase tracking-[0.3em] hover:bg-brand-accent-hover active:scale-95 transition-all shadow-xl shadow-brand-accent/20 disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                          {isLoading ? (
                            <div className="w-5 h-5 border-2 border-brand-primary/30 border-t-brand-primary rounded-full animate-spin" />
                          ) : (
                            <>PROCEED BOOKING</>
                          )}
                        </button>
                        
                        <p className="text-[10px] text-center text-slate-500 font-bold uppercase tracking-widest mt-4">Authorized by {localStorage.getItem('username') || 'Agent'}</p>
                      </div>
                    </div>

                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 italic">
                      <p className="text-[10px] text-slate-400 font-bold leading-relaxed tracking-wider uppercase">
                        By proceeding, you verify all items are in good condition and the rental dates are locked. All availability checks are final for the selected window.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Booking Manager Modal (View/Manage) */}
      {(isViewingDetails || isManagingBooking) && selectedBooking && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-5xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-slate-200">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Booking #{selectedBooking.booking_id}
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  {isViewingDetails ? 'Viewing details' : 'Manage booking status'}
                </p>
              </div>
              <button 
                onClick={() => { setIsViewingDetails(false); setIsManagingBooking(false); setSelectedBooking(null); }}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50 transition-all"
              >
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 overflow-hidden min-h-[500px]">
              {/* Left Column: Details & Logistics (42%) */}
              <div className="lg:col-span-5 p-8 space-y-8 border-r border-slate-100 overflow-y-auto custom-scrollbar max-h-[70vh]">
                <section className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                      <User className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Client Details</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6 pl-11">
                    <div className="col-span-full">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Event Name</label>
                      {isManagingBooking ? (
                        <input 
                          type="text" 
                          value={editFormData?.event_name || ''}
                          onChange={(e) => setEditFormData({...editFormData, event_name: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:border-brand-primary"
                          placeholder="e.g. Wedding Reception"
                        />
                      ) : (
                        <p className="text-sm font-bold text-slate-900">{selectedBooking.event_name || 'N/A'}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Company / Name</label>
                      <p className="text-sm font-bold text-slate-900">{selectedBooking.client_name}</p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Status</label>
                      <div className="flex">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                          selectedBooking.status === 'confirmed' ? "bg-blue-50 text-blue-600" :
                          selectedBooking.status === 'picked_up' ? "bg-amber-50 text-amber-600" :
                          selectedBooking.status === 'returned' ? "bg-emerald-50 text-emerald-600" :
                          "bg-slate-50 text-slate-600"
                        )}>
                          {selectedBooking.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Rental Window</h3>
                  </div>

                  <div className="grid grid-cols-1 gap-5 pl-11">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pickup Date/Time</label>
                        {isManagingBooking ? (
                          <input 
                            type="datetime-local" 
                            value={editFormData?.pickup_date || ''} 
                            onChange={(e) => {
                              const newDate = e.target.value;
                              setEditFormData({...editFormData, pickup_date: newDate});
                              editFormData.items.forEach((item: any) => {
                                fetchAvailableUnitsForManage(item.product_id || item.product, selectedBooking.booking_id, newDate, editFormData.return_date);
                              });
                            }}
                            className="w-full text-[13px] font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-brand-primary/20 outline-none"
                          />
                        ) : (
                          <p className="text-sm font-medium text-slate-700">{new Date(selectedBooking.pickup_date).toLocaleString()}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Return Date/Time</label>
                        {isManagingBooking ? (
                          <input 
                            type="datetime-local" 
                            value={editFormData?.return_date || ''} 
                            onChange={(e) => {
                              const newDate = e.target.value;
                              setEditFormData({...editFormData, return_date: newDate});
                              editFormData.items.forEach((item: any) => {
                                fetchAvailableUnitsForManage(item.product_id || item.product, selectedBooking.booking_id, editFormData.pickup_date, newDate);
                              });
                            }}
                            className="w-full text-[13px] font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-brand-primary/20 outline-none"
                          />
                        ) : (
                          <p className="text-sm font-medium text-slate-700">{new Date(selectedBooking.return_date).toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-500/10 flex items-center justify-center text-slate-600">
                      <Search className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Logistics</h3>
                  </div>

                  <div className="space-y-4 pl-11">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Event Location</label>
                      {isManagingBooking ? (
                        <textarea 
                          value={editFormData?.event_location || ''} 
                          onChange={(e) => setEditFormData({...editFormData, event_location: e.target.value})}
                          className="w-full text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-brand-primary/20 outline-none resize-none"
                          rows={2}
                        />
                      ) : (
                        <p className="text-sm font-medium text-slate-700">{selectedBooking.event_location || 'Not specified'}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Point of Contact</label>
                        {isManagingBooking ? (
                          <input 
                            type="text" 
                            value={editFormData?.contact_name || ''} 
                            onChange={(e) => setEditFormData({...editFormData, contact_name: e.target.value})}
                            className="w-full text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-1.5 focus:ring-2 focus:ring-brand-primary/20 outline-none"
                          />
                        ) : (
                          <p className="text-sm font-medium text-slate-700">{selectedBooking.contact_name || 'N/A'}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Phone Number</label>
                        {isManagingBooking ? (
                          <input 
                            type="text" 
                            value={editFormData?.contact_phone || ''} 
                            onChange={(e) => setEditFormData({...editFormData, contact_phone: e.target.value})}
                            className="w-full text-sm font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-1.5 focus:ring-2 focus:ring-brand-primary/20 outline-none"
                          />
                        ) : (
                          <p className="text-sm font-medium text-slate-700">{selectedBooking.contact_phone || 'N/A'}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              </div>

              {/* Right Column: Items & Actions (58%) */}
              <div className="lg:col-span-7 bg-slate-50/50 p-8 flex flex-col h-[70vh]">
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
                        <Package className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Line Items</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {isManagingBooking ? editFormData?.items?.length : selectedBooking.items?.length} Objects
                      </span>
                      {isManagingBooking && (
                        <button 
                          onClick={handleManageAddItem}
                          className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
                        >
                          <Plus className="w-3 h-3" /> ADD ITEM
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    {(isManagingBooking ? editFormData?.items : selectedBooking.items)?.map((item: any, i: number) => (
                      <div 
                        key={i} 
                        onClick={() => !isManagingBooking && setExpandedItemId(expandedItemId === i ? null : i)}
                        className={cn(
                          "p-5 bg-white rounded-[1.5rem] border border-slate-100 transition-all shadow-sm relative group",
                          !isManagingBooking && "cursor-pointer hover:border-slate-300 hover:shadow-md"
                        )}
                      >
                        {isManagingBooking && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleManageRemoveItem(i); }}
                            className="absolute -top-2 -right-2 w-8 h-8 bg-white border border-slate-100 text-rose-500 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex-1 flex items-center gap-4">
                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100">
                              <Package className="w-5 h-5 text-brand-primary" />
                            </div>
                            <div className="flex-1">
                              {item.is_new ? (
                                <select 
                                  value={item.product_id || item.product || ''}
                                  onChange={e => {
                                    const prodId = e.target.value;
                                    const prod = products.find(p => p.product_id === parseInt(prodId));
                                    const newItems = [...editFormData.items];
                                    newItems[i] = { 
                                      ...item, 
                                      product: parseInt(prodId), 
                                      product_id: parseInt(prodId),
                                      product_name: prod?.name || '', 
                                      unit_price: prod?.price_per_day || 0, 
                                      selected_unit_ids: [] 
                                    };
                                    setEditFormData({ ...editFormData, items: newItems });
                                    fetchAvailableUnitsForManage(prodId, selectedBooking.booking_id, editFormData.pickup_date, editFormData.return_date);
                                  }}
                                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-primary text-sm font-bold transition-all"
                                >
                                  <option value="">Select a product...</option>
                                  {products.map(p => <option key={p.product_id} value={String(p.product_id)}>{p.name}</option>)}
                                </select>
                              ) : (
                                <span className="text-sm font-bold text-slate-800 block">{item.product_name}</span>
                              )}
                              <div className="flex gap-3 mt-1">
                                {isManagingBooking ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quantity:</span>
                                    <input 
                                      type="number" 
                                      min="1"
                                      value={item.quantity_booked}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value) || 1;
                                        const newItems = [...editFormData.items];
                                        newItems[i] = { ...item, quantity_booked: val };
                                        setEditFormData({ ...editFormData, items: newItems });
                                      }}
                                      className="w-16 h-7 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-brand-primary"
                                    />
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                                    {item.quantity_booked} Units
                                  </span>
                                )}
                                {!isManagingBooking && (
                                  <span className="text-[10px] text-brand-primary font-bold uppercase tracking-widest flex items-center gap-1">
                                    {expandedItemId === i ? "Hide details" : "Show units"}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <span className="text-sm font-black text-slate-900 block">{currencySymbol}{formatCurrency(item.unit_price)}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Per unit</span>
                          </div>
                        </div>
                        
                        {(isManagingBooking || expandedItemId === i) && (
                          <div className="pt-4 mt-4 border-t border-slate-100 animate-in slide-in-from-top-1 duration-200">
                            {isManagingBooking ? (
                              <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-3 h-3 text-brand-primary" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assign Identifiers (SN)</p>
                                  </div>
                                  <span className={cn(
                                    "text-[10px] font-black px-2 py-0.5 rounded-full transition-all",
                                    item.selected_unit_ids?.length === item.quantity_booked 
                                      ? "bg-emerald-100 text-emerald-600"
                                      : "bg-brand-primary/10 text-brand-primary"
                                  )}>
                                    {item.selected_unit_ids?.length || 0} / {item.quantity_booked}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {availableUnitsMap[item.product_id || item.product]?.map((unit: any) => (
                                    <button
                                      key={unit.product_unit_id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const currentIds = item.selected_unit_ids || [];
                                        const newIds = currentIds.includes(unit.product_unit_id)
                                          ? currentIds.filter((id: number) => id !== unit.product_unit_id)
                                          : [...currentIds, unit.product_unit_id].slice(0, item.quantity_booked);
                                        
                                        const newItems = [...editFormData.items];
                                        newItems[i] = { ...item, selected_unit_ids: newIds };
                                        setEditFormData({ ...editFormData, items: newItems });
                                      }}
                                      className={cn(
                                        "px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all",
                                        (item.selected_unit_ids || []).includes(unit.product_unit_id)
                                          ? "bg-brand-primary text-brand-accent border-brand-primary shadow-sm ring-2 ring-brand-primary/20"
                                          : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                                      )}
                                    >
                                      {unit.serial_number}
                                    </button>
                                  ))}
                                  {(!availableUnitsMap[item.product_id || item.product] || availableUnitsMap[item.product_id || item.product].length === 0) && (
                                    <div className="w-full p-3 bg-amber-50/50 rounded-xl border border-amber-100/50">
                                      <p className="text-[10px] text-amber-600 font-bold italic">No physical units available for these dates.</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {item.units?.map((unit: any, ui: number) => (
                                  <span key={ui} className="px-3 py-1.5 bg-slate-50 border border-slate-200 text-[11px] font-black text-slate-600 rounded-xl shadow-sm flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 bg-brand-primary rounded-full shadow-sm shadow-brand-primary/40" />
                                    {unit.serial_number}
                                  </span>
                                ))}
                                {(!item.units || item.units.length === 0) && (
                                  <span className="text-[10px] text-slate-400 italic font-medium">No units assigned to this booking yet.</span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Final Actions & Total */}
                <div className="pt-6 border-t border-slate-200/60 p-2 space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Grand Total</p>
                      <p className="text-3xl font-black text-slate-900 tracking-tight">
                        {currencySymbol}
                        {formatCurrency(isManagingBooking ? calculateEditTotal() : selectedBooking.total_amount)}
                      </p>
                    </div>
                    {/* Payment Status Badge */}
                    <span className={cn(
                      "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider",
                      selectedBooking.payment_status === 'paid' ? "bg-emerald-100 text-emerald-700" :
                      selectedBooking.payment_status === 'partial' ? "bg-amber-100 text-amber-700" :
                      "bg-rose-100 text-rose-700"
                    )}>
                      {selectedBooking.payment_status || 'unpaid'}
                    </span>
                  </div>

                  {/* Payment & Booking Status Update Row */}
                  <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex-1 min-w-[140px] space-y-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Update Payment</label>
                      <div className="flex gap-2">
                        <select
                          id="paymentStatusSelect"
                          defaultValue={selectedBooking.payment_status || 'unpaid'}
                          className="flex-1 text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-brand-primary transition-all"
                        >
                          <option value="unpaid">Unpaid</option>
                          <option value="partial">Partial</option>
                          <option value="paid">Paid</option>
                        </select>
                        <button
                          onClick={() => {
                            const sel = document.getElementById('paymentStatusSelect') as HTMLSelectElement;
                            handleUpdatePaymentStatus(selectedBooking.booking_id, sel.value);
                          }}
                          disabled={isLoading}
                          className="px-3 py-2 bg-emerald-500 text-white font-black text-[10px] uppercase rounded-xl hover:bg-emerald-600 transition-all disabled:opacity-50 whitespace-nowrap"
                        >
                          {isLoading ? (
                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : 'Save'}
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 min-w-[140px] space-y-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Update Status</label>
                      <div className="flex gap-2">
                        <select
                          id="bookingStatusSelect"
                          defaultValue={selectedBooking.status}
                          className="flex-1 text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-brand-primary transition-all"
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="picked_up">Picked Up</option>
                          <option value="returned">Returned</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <button
                          onClick={() => {
                            const sel = document.getElementById('bookingStatusSelect') as HTMLSelectElement;
                            handleUpdateStatus(selectedBooking.booking_id, sel.value);
                          }}
                          disabled={isLoading}
                          className="px-3 py-2 bg-brand-primary text-brand-accent font-black text-[10px] uppercase rounded-xl hover:bg-brand-primary/90 transition-all disabled:opacity-50 whitespace-nowrap"
                        >
                          {isLoading ? (
                            <div className="w-3 h-3 border-2 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
                          ) : 'Save'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {!isViewingDetails && (
                    <div className="flex flex-wrap items-center gap-3">
                      <button 
                        onClick={handleSaveBookingEdits}
                        disabled={isLoading}
                        className="px-8 py-5 bg-brand-primary text-brand-accent font-black text-[11px] uppercase tracking-widest rounded-2xl shadow-xl shadow-brand-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100 w-full"
                      >
                        {isLoading ? (
                          <div className="w-4 h-4 border-2 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        Update Booking Details
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50 px-8 py-5 flex justify-end">
              <button 
                onClick={() => { setIsViewingDetails(false); setIsManagingBooking(false); setSelectedBooking(null); }}
                className="px-6 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-all shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Overlay for Booking Creation */}
      {showSuccessOverlay && lastCreatedBooking && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-slate-100 p-10 text-center space-y-8">
            <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto text-4xl animate-bounce">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900">Booking Created!</h2>
              <p className="text-slate-500 font-medium">#{lastCreatedBooking.booking_id} has been created successfully.</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {paymentLink ? (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 animate-in slide-in-from-bottom-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-left">Payment Link Generated</p>
                  <div className="flex items-center gap-2">
                    <input readOnly value={paymentLink} className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-600 outline-none" />
                    <button 
                      onClick={() => { navigator.clipboard.writeText(paymentLink); alert("Copied to clipboard!"); }}
                      className="p-2 bg-brand-primary text-brand-accent rounded-xl hover:bg-brand-primary/90"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => handleGeneratePaymentLink(lastCreatedBooking)}
                  disabled={isLoading}
                  className="w-full py-4 bg-brand-primary text-brand-accent font-black text-sm uppercase tracking-[0.2em] rounded-2xl hover:shadow-xl hover:shadow-brand-primary/20 transition-all flex items-center justify-center gap-3"
                >
                  {isLoading ? (
                     <div className="w-4 h-4 border-2 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4" />
                  )}
                  Generate Payment Link
                </button>
              )}

              <button 
                onClick={() => handleUpdateStatus(lastCreatedBooking.booking_id, 'confirmed')}
                className="w-full py-4 bg-slate-900 text-white font-black text-sm uppercase tracking-[0.2em] rounded-2xl hover:bg-slate-800 transition-all flex items-center justify-center gap-3"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirm Order
              </button>

              <button 
                onClick={() => { setShowSuccessOverlay(false); setLastCreatedBooking(null); setIsAddingBooking(false); resetForm(); }}
                className="w-full py-4 text-slate-400 font-bold text-sm hover:text-slate-600 transition-all"
              >
                Close & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
