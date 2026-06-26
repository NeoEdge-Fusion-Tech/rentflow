import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotification } from '../context/NotificationContext';
import { 
  User,
  Plus,
  Trash2,
  Search,
  DollarSign,
  Truck,
  Calendar,
  Clock,
  Package,
  Filter,
  ExternalLink,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  FileText,
  Receipt,
  Edit2,
  Edit3,
  Save,
  X,
  Download,
  Eye,
  ReceiptText
} from 'lucide-react';
import { cn } from '@/src/utils';

import { BookingService, ClientService, ProductService, PaymentService, StatsService, InvoiceService, ReceiptService } from '../api';

export function Bookings() {
  const navigate = useNavigate();
  const { showNotification, showConfirm } = useNotification();
  const [activeTab, setActiveTab] = useState('All');
  const [isAddingBooking, setIsAddingBooking] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<any>(null);
  const [isGeneratingPaymentLink, setIsGeneratingPaymentLink] = useState<any | null>(null);
  const [paymentLinkAmount, setPaymentLinkAmount] = useState<number>(0);
  useEffect(() => {
    if (selectedBooking) {
      fetchBillingDocs(selectedBooking.booking_id);
    }
  }, [selectedBooking]);

  const fetchBillingDocs = async (bookingId: any) => {
    try {
      const invRes = await InvoiceService.getAll({ booking: bookingId });
      setBookingInvoices(invRes.data.results || invRes.data);
      
      const recRes = await ReceiptService.getAll({ payment__booking: bookingId });
      setBookingReceipts(recRes.data.results || recRes.data);
    } catch (err) {
      console.error("Failed to fetch billing docs", err);
    }
  };

  const handleGenerateReceipt = async () => {
    try {
      setIsLoading(true);
      if (editingReceipt) {
        await ReceiptService.update(editingReceipt.receipt_id, {
          notes: editingReceipt.notes,
          status: editingReceipt.status
        });
        showNotification("Receipt updated successfully.", 'success');
      }
      fetchBookings();
      setShowReceiptPreview(false);
      setEditingReceipt(null);
    } catch (e) {
      showNotification("Failed to process receipt.", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateDocument = async (docType: 'invoice' | 'receipt', id: any, data: any) => {
    setIsLoading(true);
    try {
      if (docType === 'invoice') {
        await InvoiceService.update(id, data);
      } else {
        await ReceiptService.update(id, data);
      }
      setEditingDoc(null);
      await fetchBillingDocs(selectedBooking?.booking_id);
    } catch (err) {
      console.error("Failed to update document", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePayment = async (bookingId: number, amount: number) => {
    setIsLoading(true);
    try {
      await PaymentService.create({
        booking: bookingId,
        amount: amount,
        status: 'completed'
      });
      // Refresh booking data to get updated payments and total_paid
      const res = await BookingService.get(bookingId);
      setSelectedBooking(res.data);
      await fetchBillingDocs(bookingId);
      fetchBookings();
    } catch (err) {
      console.error("Failed to create payment", err);
      showNotification("Failed to record payment", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadDocument = async (docType: 'invoice' | 'receipt', id: any, fileName: string) => {
    try {
      const response = docType === 'invoice' 
        ? await InvoiceService.download(id)
        : await ReceiptService.download(id);
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Failed to download document", err);
      showNotification("Failed to download document", 'error');
    }
  };
  const [isManagingBooking, setIsManagingBooking] = useState(false);
  const [activeManagerTab, setActiveManagerTab] = useState<'items' | 'billing'>('items');
  const [bookingInvoices, setBookingInvoices] = useState<any[]>([]);
  const [bookingReceipts, setBookingReceipts] = useState<any[]>([]);
  const [editingDoc, setEditingDoc] = useState<{ type: 'invoice' | 'receipt', data: any } | null>(null);
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
    amount_paid: 0,
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
  const [currentUser, setCurrentUser] = useState<any>(null);

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
    fetchCurrentUser();
  }, [activeTab, startDate, endDate]);

  const fetchCurrentUser = async () => {
    try {
      const res = await AuthService.getMe();
      setCurrentUser(res.data);
    } catch (e) {
      console.error("Failed to fetch current user", e);
    }
  };

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

  const validateForm = () => {
    if (!formData.client_id) {
      showNotification("Please select a client.", 'warning');
      return false;
    }
    if (!formData.pickup_date || !formData.return_date) {
      showNotification("Please select both pickup and return dates.", 'warning');
      return false;
    }
    if (new Date(formData.pickup_date) >= new Date(formData.return_date)) {
      showNotification("Return date must be after pickup date.", 'warning');
      return false;
    }
    if (bookingItems.length === 0) {
      showNotification("Please add at least one product.", 'warning');
      return false;
    }
    if (bookingItems.some(i => !i.product_id)) {
      showNotification("One or more items have no product selected.", 'warning');
      return false;
    }
    
    // Overbooked check
    const overbookedItem = bookingItems.find(i => i.quantity_booked > i.available_qty);
    if (overbookedItem) {
      const prod = products.find(p => p.product_id === parseInt(overbookedItem.product_id));
      showNotification(`Overbooked: Only ${overbookedItem.available_qty} of "${prod?.name || 'product'}" available.`, 'error');
      return false;
    }
    
    return true;
  };

  const handleCreateBooking = async () => {
    if (!validateForm()) return;

    try {
      setIsLoading(true);

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
        amount_paid: formData.amount_paid,
        discount_amount: formData.discount_amount,
        discount_percentage: formData.discount_percentage,
        items: bookingItems.map(item => ({
          product: parseInt(item.product_id),
          quantity_booked: item.quantity_booked,
          unit_price: item.unit_price,
          units: (item.units || []).map((u: any) => ({
          booking_item_unit_id: u.booking_item_unit_id,
          product_unit: u.product_unit,
          quantity: u.quantity,
          quantity_picked_up: u.quantity_picked_up || 0,
          quantity_returned_good: u.quantity_returned_good || 0,
          quantity_returned_damaged: u.quantity_returned_damaged || 0
        }))
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
      showNotification(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePaymentLink = async (booking: any, amount: number) => {
    if (!booking || !amount) return;
    try {
      setIsLoading(true);
      const res = await PaymentService.createLink(booking.booking_id, amount);
      setPaymentLink(res.data.payment_link);
    } catch (e) {
      showNotification("Failed to generate payment link", 'error');
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

  const handleUpdateAmountPaid = async (bookingId: number, newAmountPaid: number) => {
    try {
      setIsLoading(true);
      const res = await BookingService.patch(bookingId, { amount_paid: newAmountPaid });
      // Update local state with the full response from backend (includes auto-calculated status)
      setSelectedBooking(res.data);
      fetchBookings();
    } catch (e) {
      showNotification('Failed to update amount paid', 'error');
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
    
    if (!editFormData.pickup_date || !editFormData.return_date) {
      showNotification("Pickup and return dates are required.", 'warning');
      return;
    }
    if (new Date(editFormData.pickup_date) >= new Date(editFormData.return_date)) {
      showNotification("Return date must be after pickup date.", 'warning');
      return;
    }
    if (editFormData.items.length === 0) {
      showNotification("At least one item is required.", 'warning');
      return;
    }

    try {
      setIsLoading(true);

      // Overbooking check
      const overbookedItem = editFormData.items.find((i: any) => i.quantity_booked > (i.available_qty ?? Infinity));
      if (overbookedItem) {
        showNotification(`Overbooked: Only ${overbookedItem.available_qty} of "${overbookedItem.product_name}" available.`, 'error');
        return;
      }

      // Construct items for update
      const itemsUpdate = editFormData.items.map((item: any) => ({
        booking_item_id: item.booking_item_id,
        product: item.product_id || item.product,
        quantity_booked: item.quantity_booked,
        unit_price: item.unit_price,
        units: (item.units || []).map((u: any) => ({
          booking_item_unit_id: u.booking_item_unit_id,
          product_unit: u.product_unit,
          quantity: u.quantity,
          quantity_picked_up: u.quantity_picked_up || 0,
          quantity_returned_good: u.quantity_returned_good || 0,
          quantity_returned_damaged: u.quantity_returned_damaged || 0
        }))
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
      showNotification("Failed to save changes", 'error');
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

  const updateUnitTracking = (itemIndex: number, unitIndex: number, field: string, value: number) => {
    if (!editFormData) return;
    const newItems = [...editFormData.items];
    const newUnits = [...(newItems[itemIndex].units || [])];
    newUnits[unitIndex] = { ...newUnits[unitIndex], [field]: value };
    newItems[itemIndex] = { ...newItems[itemIndex], units: newUnits };
    setEditFormData({ ...editFormData, items: newItems });
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
      const availQty = res.data.available_quantity;
      setAvailableUnitsMap(prev => ({
        ...prev,
        [productId]: res.data.available_units
      }));
      setEditFormData(prev => {
        if (!prev) return prev;
        const newItems = prev.items.map((item: any) => {
          if ((item.product_id || item.product) === parseInt(productId)) {
            return { ...item, available_qty: availQty };
          }
          return item;
        });
        return { ...prev, items: newItems };
      });
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
      showNotification("Failed to update status", 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    showConfirm({
      title: 'Delete Booking',
      message: 'Are you sure you want to delete this booking? This action is permanent.',
      type: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          setIsLoading(true);
          await BookingService.delete(id);
          showNotification("Booking deleted successfully", 'success');
          fetchBookings();
        } catch (e) {
          console.error(e);
          showNotification("Failed to delete booking", 'error');
        } finally {
          setIsLoading(false);
        }
      }
    });
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
          <h1 className="text-2xl font-bold text-[var(--text-main)]">Booking Management</h1>
          <p className="text-[var(--text-muted)]">Track rentals, schedules, and fulfillment status.</p>
        </div>
        <button onClick={() => setIsAddingBooking(true)} className="flex items-center justify-center gap-2 bg-brand-primary text-brand-accent px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-colors shadow-sm shadow-brand-primary/20">
          <Plus className="w-5 h-5" />
          New Booking
        </button>
      </div>

      {/* Module Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-4 mb-2">
        {[
          { label: 'Total', value: stats?.booking_stats?.total, color: 'slate' },
          { label: 'Pending', value: stats?.booking_stats?.pending, color: 'amber' },
          { label: 'Confirmed', value: stats?.booking_stats?.confirmed, color: 'blue' },
          { label: 'Picked Up', value: stats?.booking_stats?.picked_up, color: 'indigo' },
          { label: 'Returned', value: stats?.booking_stats?.returned, color: 'emerald' },
          { label: 'Completed', value: stats?.booking_stats?.completed, color: 'brand' },
        ].map((s, idx) => (
          <div key={idx} className="bg-[var(--bg-surface)] p-4 rounded-2xl border border-[var(--border-soft)] shadow-sm hover:shadow-md transition-all">
            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{s.label}</p>
            <p className={`text-xl font-black ${s.color === 'brand' ? 'text-[var(--text-link)]' : 'text-' + s.color + '-600 dark:text-' + s.color + '-400'}`}>
              {s.value ?? 0}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border-soft)] pb-px">
        {['All', 'pending', 'confirmed', 'picked_up', 'returned'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-2 text-sm font-medium transition-all relative capitalize",
              activeTab === tab ? "text-[var(--text-link)]" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
            )}
          >
            {tab.replace('_', ' ')}
            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--text-link)] rounded-full" />}
          </button>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
          <input 
            type="text" 
            placeholder="Search by ID, client, or location..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-xl outline-none focus:ring-4 focus:ring-brand-primary/5 focus:border-brand-primary transition-all text-sm font-medium text-[var(--text-main)]"
          />
        </div>
        
        <div className="flex items-center bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-xl p-1 gap-1 w-full md:w-auto">
          <div className="flex items-center gap-2 px-3 border-r border-[var(--border-subtle)] mr-1">
            <Calendar className="w-4 h-4 text-[var(--text-muted)]" />
            <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest whitespace-nowrap">Pickup Window</span>
          </div>
          <div className="flex items-center gap-1">
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-9 px-3 bg-[var(--bg-app)] border-none rounded-lg text-xs font-bold text-[var(--text-main)] focus:ring-2 focus:ring-brand-primary/20 outline-none"
            />
            <span className="text-[var(--border-soft)] font-bold">-</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-9 px-3 bg-[var(--bg-app)] border-none rounded-lg text-xs font-bold text-[var(--text-main)] focus:ring-2 focus:ring-brand-primary/20 outline-none"
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
          <div className="bg-[var(--bg-surface)] p-12 text-center text-[var(--text-muted)] rounded-2xl border border-[var(--border-soft)]">Loading bookings...</div>
        ) : bookings.length === 0 ? (
          <div className="bg-[var(--bg-surface)] p-12 text-center text-[var(--text-muted)] rounded-2xl border border-[var(--border-soft)]">No bookings found.</div>
        ) : bookings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((booking) => (
          <div key={booking.booking_id} className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-soft)] hover:border-brand-primary/20 hover:shadow-md transition-all group">
            <div className="flex flex-col lg:flex-row lg:items-center gap-6">
              <div className="flex-1 flex items-start gap-4">
                <div className="p-3 bg-[var(--bg-app)] rounded-xl text-[var(--text-muted)] group-hover:bg-brand-primary/10 group-hover:text-[var(--text-link)] transition-colors">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">#{booking.booking_id}</span>
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm border",
                      booking.status === 'confirmed' ? "bg-blue-50 text-blue-700 border-blue-100" :
                      booking.status === 'picked_up' ? "bg-amber-50 text-amber-700 border-amber-100" :
                      booking.status === 'returned' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                      booking.status === 'cancelled' ? "bg-rose-50 text-rose-700 border-rose-100" :
                      "bg-[var(--bg-app)] text-[var(--text-muted)] border-[var(--border-soft)]"
                    )}>
                      {booking.status === 'pending' ? 'Pending Approval' : booking.status.replace('_', ' ')}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[var(--text-main)] mt-0.5">
                    {booking.event_name || (booking.contact_name ? `${booking.contact_name} Event` : booking.client_name || 'Generic Event')}
                  </h3>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(booking.booking_date).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                      <Package className="w-3.5 h-3.5" />
                      {booking.items?.length || 0} items
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:min-w-[200px]">
                <div className="text-right">
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-0.5">Total Amount</p>
                  <p className="text-xl font-black text-[var(--text-main)]">{currencySymbol}{formatCurrency(booking.total_amount)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-0.5">Paid: {currencySymbol}{formatCurrency(booking.amount_paid)}</p>
                  <span className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm border block mt-1",
                    booking.payment_status === 'paid' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                    booking.payment_status === 'partial' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                    "bg-rose-500/10 text-rose-500 border-rose-500/20"
                  )}>
                    {booking.payment_status || 'unpaid'}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-4 border-t lg:border-t-0 lg:border-l border-[var(--border-subtle)] pt-4 lg:pt-0 lg:pl-6 relative">
                <div className="flex items-center gap-2 flex-wrap">
                  <button 
                    onClick={() => { setSelectedBooking(booking); setIsViewingDetails(true); }}
                    className="px-4 py-2 bg-[var(--bg-app)] text-[var(--text-main)] font-bold rounded-xl hover:bg-[var(--border-soft)] transition-colors text-sm"
                  >
                    Details
                  </button>
                  {booking.has_invoice ? (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        setIsLoading(true);
                        try {
                          const res = await InvoiceService.getAll({ booking: booking.booking_id });
                          const inv = res.data.results?.[0] || res.data[0];
                          if (inv) navigate(`/invoices/${inv.invoice_id}/edit`);
                        } finally {
                          setIsLoading(false);
                        }
                      }}
                      className="px-4 py-2 bg-blue-500/10 text-blue-600 border border-blue-500/20 font-bold rounded-xl hover:bg-blue-500/20 transition-colors text-sm flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Invoice
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/invoices/new?booking_id=${booking.booking_id}`);
                      }}
                      className="px-4 py-2 bg-amber-500/10 text-amber-600 border border-amber-500/20 font-bold rounded-xl hover:bg-amber-500/20 transition-colors text-sm flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      Generate
                    </button>
                  )}
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
                        delivery_mode: booking.delivery_mode || 'pickup',
                        items: initialItems
                      });
                      // Fetch available units for each product
                      booking.items.forEach((item: any) => {
                        fetchAvailableUnitsForManage(item.product, booking.booking_id, booking.pickup_date, booking.return_date);
                      });
                    }}
                    className="p-2.5 bg-brand-primary text-brand-accent rounded-xl hover:shadow-lg hover:shadow-brand-primary/20 transition-all active:scale-95"
                  >
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Documents Row (Invoices & Receipts) */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  {/* Invoices List */}
                  {booking.invoices_summary && booking.invoices_summary.map((inv: any) => (
                    <button
                      key={inv.invoice_id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadDocument('invoice', inv.invoice_id, `invoice_${inv.invoice_number}`);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-500/5 hover:bg-blue-500/10 text-blue-600 rounded-lg text-[10px] font-black border border-blue-500/10 transition-all"
                      title={`Download Invoice ${inv.invoice_number}`}
                    >
                      <FileText className="w-3 h-3" />
                      {inv.invoice_number}
                    </button>
                  ))}

                  {/* Receipts List */}
                  {booking.receipts_summary && booking.receipts_summary.map((r: any) => (
                    <button
                      key={r.receipt_id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadDocument('receipt', r.receipt_id, `receipt_${r.receipt_number}`);
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-600 rounded-lg text-[10px] font-black border border-emerald-500/10 transition-all"
                      title={`Download Receipt ${r.receipt_number}`}
                    >
                      <Receipt className="w-3 h-3" />
                      {r.receipt_number}
                    </button>
                  ))}
                  
                  {/* Empty State / Prompt */}
                  {!booking.has_invoice && (!booking.receipts_summary || booking.receipts_summary.length === 0) && (
                    <p className="text-[10px] text-[var(--text-muted)] italic font-medium">No documents issued yet</p>
                  )}
                </div>
                <div className="relative">
                   <button 
                    onClick={() => handleDelete(booking.booking_id)}
                    className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Delete Booking"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {bookings.length > itemsPerPage && (
        <div className="flex items-center justify-between mt-4 border-t border-[var(--border-soft)] pt-4">
          <p className="text-sm text-[var(--text-muted)]">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, bookings.length)} of {bookings.length}
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="p-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-lg text-[var(--text-main)] hover:bg-[var(--bg-app)] disabled:opacity-50" disabled={currentPage === 1}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setCurrentPage(p => Math.min(Math.ceil(bookings.length / itemsPerPage), p + 1))} className="p-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-lg text-[var(--text-main)] hover:bg-[var(--bg-app)] disabled:opacity-50" disabled={currentPage === Math.ceil(bookings.length / itemsPerPage)}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Add Booking Modal */}
      {isAddingBooking && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] rounded-[2rem] w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-[var(--border-soft)]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-[var(--border-subtle)] bg-[var(--bg-app)]/50">
              <div>
                <h2 className="text-xl font-bold text-[var(--text-main)]">New Booking</h2>
                <p className="text-xs text-[var(--text-muted)] font-medium mt-0.5">Fill in the details to create a new rental reservation.</p>
              </div>
              <button 
                onClick={() => setIsAddingBooking(false)} 
                className="p-2.5 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-surface)] rounded-xl transition-all border border-transparent hover:border-[var(--border-soft)] shadow-sm hover:shadow-md"
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
                      <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center text-[var(--text-link)]">
                        <User className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-[var(--text-main)] text-sm uppercase tracking-wider">Customer & Schedule</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pl-11">
                      <div className="col-span-full">
                        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-2 ml-1">Event Name (Optional)</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Wedding Reception"
                          value={formData.event_name}
                          onChange={e => setFormData({...formData, event_name: e.target.value})}
                          className="w-full h-12 px-4 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-2xl outline-none focus:ring-4 focus:ring-brand-primary/5 focus:border-brand-primary text-sm font-medium text-[var(--text-main)] transition-all"
                        />
                      </div>

                      <div className="col-span-full">
                        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-2 ml-1">Client Selection</label>
                        <select 
                          value={formData.client_id}
                          onChange={e => setFormData({...formData, client_id: e.target.value})}
                          className="w-full h-12 px-4 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-2xl outline-none focus:ring-4 focus:ring-brand-primary/5 focus:border-brand-primary text-sm font-medium text-[var(--text-main)] transition-all"
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
                        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1 ml-1">Pickup Date & Time</label>
                        <div className="relative">
                          <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                          <input 
                            type="datetime-local" 
                            value={formData.pickup_date}
                            onChange={e => setFormData({...formData, pickup_date: e.target.value})}
                            className="w-full h-12 pl-11 pr-4 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-2xl outline-none focus:border-brand-primary text-sm font-medium text-[var(--text-main)] transition-all" 
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-1 ml-1">Return Date & Time</label>
                        <div className="relative">
                          <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                          <input 
                            type="datetime-local"
                            value={formData.return_date}
                            onChange={e => setFormData({...formData, return_date: e.target.value})}
                            className="w-full h-12 pl-11 pr-4 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-2xl outline-none focus:border-brand-primary text-sm font-medium text-[var(--text-main)] transition-all" 
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
                        <h3 className="font-bold text-[var(--text-main)] text-sm uppercase tracking-wider">Inventory Items</h3>
                      </div>
                      <button 
                        onClick={() => setBookingItems([...bookingItems, { product_id: '', quantity_booked: 1, unit_price: 0, available_qty: 0, available_units: [], selected_unit_ids: [] }])}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-black bg-brand-primary text-brand-accent rounded-xl hover:bg-brand-primary/90 transition-colors shadow-sm"
                      >
                        <Plus className="w-3 h-3" /> ADD ITEM
                      </button>
                    </div>

                    <div className="space-y-4 pl-11">
                      {bookingItems.length === 0 && (
                        <div className="text-center py-10 bg-[var(--bg-app)] rounded-2xl border-2 border-dashed border-[var(--border-soft)]">
                          <p className="text-sm text-[var(--text-muted)] font-medium italic">No items added yet. Click "Add Item" to start.</p>
                        </div>
                      )}
                      
                      {bookingItems.map((item, i) => (
                        <div key={i} className="group relative bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-[1.25rem] p-5 hover:border-brand-primary transition-all hover:shadow-xl hover:shadow-brand-primary/5">
                          <div className="grid grid-cols-12 gap-5 items-start">
                            <div className="col-span-12 md:col-span-5 space-y-2">
                              <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pl-1">Product</label>
                              <select 
                                value={item.product_id}
                                onChange={e => {
                                  const prodId = e.target.value;
                                  const prod = products.find(p => p.product_id === parseInt(prodId));
                                  setBookingItems(prev => {
                                    const newItems = [...prev];
                                    newItems[i] = { ...newItems[i], product_id: prodId, unit_price: prod?.units?.[0]?.rental_price || 0, selected_unit_ids: [] };
                                    return newItems;
                                  });
                                  fetchAvailability(i, prodId);
                                }}
                                className="w-full h-11 px-3 bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-xl outline-none focus:border-brand-primary text-sm font-bold text-[var(--text-main)] transition-all"
                              >
                                <option value="">Select a product...</option>
                                {products.map(p => <option key={p.product_id} value={String(p.product_id)}>{p.name}</option>)}
                              </select>
                            </div>
                            
                            <div className="col-span-6 md:col-span-2 space-y-2">
                              <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest text-center">Qty</label>
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
                                className="w-full h-11 bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-xl outline-none focus:border-brand-primary text-sm font-black text-[var(--text-main)] text-center"
                              />
                            </div>

                            <div className="col-span-6 md:col-span-3 space-y-2 text-right">
                              <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pr-1">Unit Price</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-bold text-sm">{currencySymbol}</span>
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
                                  className="w-full h-11 pl-8 pr-3 bg-[var(--bg-app)] border border-[var(--border-subtle)] rounded-xl outline-none focus:border-brand-primary text-sm font-bold text-[var(--text-main)] text-right"
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
                            <div className="mt-4 pt-4 border-t border-[var(--border-soft)] flex flex-col md:flex-row md:items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <div className={cn("w-2 h-2 rounded-full", (item.available_qty < item.quantity_booked) ? "bg-rose-500 animate-pulse" : "bg-emerald-500")} />
                                <span className={cn("text-[11px] font-black uppercase tracking-tight", (item.available_qty < item.quantity_booked) ? "text-rose-600" : "text-emerald-600")}>
                                  {formData.pickup_date && formData.return_date ? (
                                    (item.available_qty < item.quantity_booked) ? `OVERBOOKED: Only ${item.available_qty} left` : `${item.available_qty} Units Available`
                                  ) : "Set dates to check stock"}
                                </span>
                              </div>
                              <div className="text-xs font-bold text-[var(--text-muted)] flex items-center gap-2">
                                <span className="uppercase tracking-widest text-[9px]">Subtotal</span>
                                <span className="text-[var(--text-main)] text-sm font-black">{currencySymbol}{formatCurrency(item.unit_price * item.quantity_booked)}</span>
                              </div>
                            </div>
                          )}

                          {/* Refined Particular Unit Selection */}
                          {item.available_units.length > 0 && (
                            <div className="mt-4 bg-[var(--bg-app)]/50 rounded-xl p-3 border border-[var(--border-subtle)]">
                              <div className="flex items-center justify-between mb-2">
                                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Assign Specific Units (Selected {item.selected_unit_ids.length}/{item.quantity_booked})</label>
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
                                          } else if (current.length < Number(next[i].quantity_booked)) {
                                            next[i].selected_unit_ids = [...current, u.product_unit_id];
                                          }
                                        return next;
                                      });
                                    }}
                                    className={cn(
                                      "text-[10px] font-bold px-3 py-1.5 rounded-lg border transition-all",
                                      item.selected_unit_ids.includes(u.product_unit_id) 
                                        ? "bg-brand-primary text-white border-brand-primary shadow-sm" 
                                        : "bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-soft)] hover:border-brand-primary/50"
                                    )}
                                  >
                                    <div className="flex flex-col items-center gap-1">
                                      <span>{u.serial_number}</span>
                                      {(u.quantity_picked_up > 0 || u.quantity_returned_good > 0 || u.quantity_returned_damaged > 0) && (
                                        <div className="flex gap-1.5 text-[8px] opacity-80 font-black tracking-tighter uppercase">
                                          <span className="text-blue-200">P:{u.quantity_picked_up}</span>
                                          <span className="text-emerald-200">G:{u.quantity_returned_good}</span>
                                          <span className="text-rose-200">D:{u.quantity_returned_damaged}</span>
                                        </div>
                                      )}
                                    </div>
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
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                        <ExternalLink className="w-4 h-4" />
                      </div>
                      <h3 className="font-bold text-[var(--text-main)] text-sm uppercase tracking-wider">Logistics & Address</h3>
                    </div>

                    <div className="space-y-4 pl-11">
                      <div className="grid grid-cols-2 gap-2 p-1 bg-[var(--bg-app)] rounded-[1.25rem] w-full md:w-64 border border-[var(--border-soft)]">
                        <button onClick={() => setFormData({...formData, delivery_mode: 'pickup'})} className={cn("py-2.5 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest", formData.delivery_mode === 'pickup' ? "bg-brand-primary text-brand-accent shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-main)]")}>Self Pickup</button>
                        <button onClick={() => setFormData({...formData, delivery_mode: 'delivery'})} className={cn("py-2.5 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest", formData.delivery_mode === 'delivery' ? "bg-brand-primary text-brand-accent shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-main)]")}>Delivery</button>
                      </div>
                      
                      <AnimatePresence>
                        {formData.delivery_mode === 'delivery' && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden space-y-4"
                          >
                            <div className="relative pt-2">
                              <Search className="absolute left-4 top-6 w-4 h-4 text-[var(--text-muted)]" />
                              <textarea 
                                placeholder="Full Address or Event Location" 
                                value={formData.event_location}
                                onChange={e => setFormData({...formData, event_location: e.target.value})}
                                className="w-full h-24 pl-11 pr-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-2xl outline-none focus:border-brand-primary text-sm font-medium resize-none transition-all text-[var(--text-main)]" 
                              />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pb-2">
                              <input 
                                type="text" 
                                placeholder="Point of Contact Name" 
                                value={formData.contact_name}
                                onChange={e => setFormData({...formData, contact_name: e.target.value})}
                                className="w-full h-12 px-4 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-2xl outline-none focus:border-brand-primary text-sm font-medium text-[var(--text-main)]" 
                              />
                              <input 
                                type="tel" 
                                placeholder="Contact Phone Number" 
                                value={formData.contact_phone}
                                onChange={e => setFormData({...formData, contact_phone: e.target.value})}
                                className="w-full h-12 px-4 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-2xl outline-none focus:border-brand-primary text-sm font-medium text-[var(--text-main)]" 
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </section>
                </div>

                {/* Right Column: Order Summary */}
                <div className="lg:col-span-4">
                  <div className="sticky top-0 space-y-6">
                    <div className="bg-[var(--bg-surface)] rounded-[2.5rem] p-8 text-[var(--text-main)] shadow-2xl border border-[var(--border-soft)] transition-colors">
                      <h3 className="text-lg font-black uppercase tracking-[0.2em] mb-10 text-[var(--text-muted)] opacity-60">Order Summary</h3>
                      
                      <div className="space-y-6">
                        <div className="flex justify-between items-baseline mb-2 gap-2 flex-wrap">
                          <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">Base Amount</span>
                          <span className="text-lg font-black break-all text-right">{currencySymbol}{formatCurrency(totalBeforeDiscount)}</span>
                        </div>

                        <div className="space-y-4 pt-6 border-t border-[var(--border-soft)]">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase mb-2">Discount ({currencySymbol})</label>
                              <input 
                                type="number" 
                                value={formData.discount_amount} 
                                onChange={e => setFormData({...formData, discount_amount: parseFloat(e.target.value) || 0, discount_percentage: 0})} 
                                className="w-full bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-all font-black text-[var(--text-main)]" 
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase mb-2">Discount (%)</label>
                              <input 
                                type="number" 
                                value={formData.discount_percentage} 
                                onChange={e => setFormData({...formData, discount_percentage: parseFloat(e.target.value) || 0, discount_amount: 0})} 
                                className="w-full bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-all font-black text-[var(--text-main)]" 
                              />
                            </div>
                          </div>
                          {discountVal > 0 && (
                            <div className="flex justify-between text-brand-accent font-bold text-xs uppercase tracking-widest px-1 gap-2 flex-wrap">
                              <span>Saved</span>
                              <span className="break-all text-right">- {currencySymbol}{formatCurrency(discountVal)}</span>
                            </div>
                          )}
                          
                          <div className="pt-4 mt-4 border-t border-[var(--border-soft)]">
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase mb-2">Amount Paid ({currencySymbol})</label>
                            <input 
                              type="number" 
                              value={formData.amount_paid} 
                              onChange={e => setFormData({...formData, amount_paid: parseFloat(e.target.value) || 0})} 
                              className="w-full bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-all font-black text-[var(--text-main)]" 
                            />
                          </div>
                        </div>

                        <div className="pt-10 space-y-4">
                          <div className="flex justify-between items-baseline gap-2 flex-wrap min-h-[3rem]">
                            <span className="text-sm font-black uppercase tracking-[0.1em] text-[var(--text-muted)]">Total Amount</span>
                            <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-[var(--text-main)] tracking-tighter break-all text-right">
                              {currencySymbol}{formatCurrency(grandTotal)}
                            </span>
                          </div>
                          
                          <div className="flex justify-between items-baseline border-t border-[var(--border-subtle)] pt-4 gap-2 flex-wrap min-h-[2.5rem]">
                            <span className="text-sm font-black uppercase tracking-[0.1em] text-[var(--text-muted)]">Remaining Balance</span>
                            <span className="text-xl sm:text-2xl font-black text-brand-accent tracking-tighter break-all text-right">
                              {currencySymbol}{formatCurrency(Math.max(0, grandTotal - formData.amount_paid))}
                            </span>
                          </div>
                        </div>

                        {/* Booking Status Selector */}
                        <div className="pt-6 border-t border-[var(--border-soft)] space-y-2">
                          <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Initial Booking Status</label>
                          <select
                            value={formData.status}
                            onChange={e => setFormData({...formData, status: e.target.value})}
                            className="w-full bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-brand-accent/30 focus:border-brand-accent transition-all font-bold text-[var(--text-main)] cursor-pointer"
                          >
                            <option value="pending" className="bg-[var(--bg-surface)] text-[var(--text-main)]">Pending</option>
                            <option value="confirmed" className="bg-[var(--bg-surface)] text-[var(--text-main)]">Confirmed</option>
                            <option value="picked_up" className="bg-[var(--bg-surface)] text-[var(--text-main)]">Picked Up</option>
                            <option value="returned" className="bg-[var(--bg-surface)] text-[var(--text-main)]">Returned</option>
                            <option value="completed" className="bg-[var(--bg-surface)] text-[var(--text-main)]">Completed</option>
                            <option value="cancelled" className="bg-[var(--bg-surface)] text-[var(--text-main)]">Cancelled</option>
                          </select>
                        </div>

                        <button 
                          onClick={handleCreateBooking}
                          disabled={isLoading}
                          className="w-full mt-6 h-16 bg-brand-primary text-brand-accent rounded-2xl font-black text-sm uppercase tracking-[0.3em] hover:opacity-90 active:scale-95 transition-all shadow-xl shadow-brand-primary/20 disabled:opacity-50 flex items-center justify-center gap-3"
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

                    <div className="p-6 bg-[var(--bg-app)] rounded-3xl border border-[var(--border-soft)] italic">
                      <p className="text-[10px] text-[var(--text-muted)] font-bold leading-relaxed tracking-wider uppercase">
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
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-[4px] z-50 flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] rounded-[2.5rem] w-full max-w-7xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-[var(--border-soft)]">
            <div className="px-8 py-6 border-b border-[var(--border-soft)] flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[var(--text-main)]">
                  Booking #{selectedBooking.booking_id}
                </h2>
                <p className="text-xs text-[var(--text-muted)] font-medium">
                  {isViewingDetails ? 'Viewing details' : 'Manage booking status'}
                </p>
              </div>
              <button 
                onClick={() => { setIsViewingDetails(false); setIsManagingBooking(false); setSelectedBooking(null); }}
                className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-xl hover:bg-[var(--bg-app)] transition-all"
              >
                <Plus className="w-5 h-5 rotate-45" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 overflow-hidden min-h-[500px]">
              {/* Left Column: Details & Logistics (42%) */}
              <div className="lg:col-span-5 p-8 space-y-8 border-r border-[var(--border-soft)] overflow-y-auto custom-scrollbar max-h-[70vh]">
                <section className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center text-[var(--text-link)]">
                      <User className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-[var(--text-main)] text-sm uppercase tracking-wider">Client Details</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6 pl-11">
                    <div className="col-span-full">
                      <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Event Name</label>
                      {isManagingBooking ? (
                        <input 
                          type="text" 
                          value={editFormData?.event_name || ''}
                          onChange={(e) => setEditFormData({...editFormData, event_name: e.target.value})}
                          className="w-full bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl px-4 py-2 text-sm font-bold text-[var(--text-main)] outline-none focus:border-brand-primary"
                          placeholder="e.g. Wedding Reception"
                        />
                      ) : (
                        <p className="text-sm font-bold text-[var(--text-main)]">{selectedBooking.event_name || 'N/A'}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Company / Name</label>
                      <p className="text-sm font-bold text-[var(--text-main)]">{selectedBooking.client_name}</p>
                    </div>
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className={cn(
                          "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border",
                          selectedBooking.status === 'confirmed' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                          selectedBooking.status === 'picked_up' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                          selectedBooking.status === 'returned' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                          selectedBooking.status === 'completed' ? "bg-emerald-500/20 text-emerald-600 border-emerald-500/30 font-black shadow-sm" :
                          "bg-[var(--bg-app)] text-[var(--text-muted)] border-[var(--border-soft)]"
                        )}>
                          {selectedBooking.status?.replace('_', ' ') || 'Pending'}
                        </span>
                        {/* Payment Status Badge */}
                        <span className={cn(
                          "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border",
                          (parseFloat(selectedBooking.amount_paid) >= parseFloat(selectedBooking.total_amount)) ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                          (parseFloat(selectedBooking.amount_paid) > 0) ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" :
                          "bg-rose-500/10 text-rose-500 border-rose-500/20"
                        )}>
                          {(parseFloat(selectedBooking.amount_paid) >= parseFloat(selectedBooking.total_amount)) ? 'Fully Paid' :
                           (parseFloat(selectedBooking.amount_paid) > 0) ? `Partially Paid (${currencySymbol}${formatCurrency(selectedBooking.amount_paid)})` :
                           'Unpaid'}
                        </span>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-[var(--text-main)] text-sm uppercase tracking-wider">Rental Window</h3>
                  </div>

                  <div className="grid grid-cols-1 gap-5 pl-11">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Pickup Date/Time</label>
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
                            className="w-full text-[13px] font-medium text-[var(--text-main)] bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-lg p-2 focus:ring-2 focus:ring-brand-primary/20 outline-none"
                          />
                        ) : (
                          <p className="text-sm font-medium text-[var(--text-main)]">{new Date(selectedBooking.pickup_date).toLocaleString()}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Return Date/Time</label>
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
                            className="w-full text-[13px] font-medium text-[var(--text-main)] bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-lg p-2 focus:ring-2 focus:ring-brand-primary/20 outline-none"
                          />
                        ) : (
                          <p className="text-sm font-medium text-[var(--text-main)]">{new Date(selectedBooking.return_date).toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="pt-6 border-t border-[var(--border-soft)] space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-[var(--text-main)] text-sm uppercase tracking-wider">Financial Overview</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6 pl-11">
                    <div>
                      <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Amount Paid ({currencySymbol})</label>
                      {isManagingBooking ? (
                        <input 
                          type="number"
                          step="0.01"
                          value={editFormData?.amount_paid || 0}
                          onChange={(e) => setEditFormData({...editFormData, amount_paid: parseFloat(e.target.value) || 0})}
                          className="w-full h-11 px-4 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl outline-none focus:border-brand-primary text-sm font-bold text-emerald-500 transition-all shadow-sm"
                        />
                      ) : (
                        <p className="text-xl font-black text-emerald-500 tracking-tight">
                          {currencySymbol}{formatCurrency(selectedBooking.amount_paid)}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Balance Due</label>
                      <p className={cn(
                        "text-xl font-black tracking-tight",
                        (parseFloat(selectedBooking.total_amount) - parseFloat(selectedBooking.amount_paid)) <= 0 ? "text-[var(--text-muted)]" : "text-rose-500"
                      )}>
                        {currencySymbol}{formatCurrency(Math.max(0, parseFloat(selectedBooking.total_amount) - (isManagingBooking ? editFormData?.amount_paid : parseFloat(selectedBooking.amount_paid))))}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--bg-app)] flex items-center justify-center text-[var(--text-muted)] border border-[var(--border-soft)]">
                      <Truck className="w-4 h-4" />
                    </div>
                    <h3 className="font-bold text-[var(--text-main)] text-sm uppercase tracking-wider">Logistics</h3>
                  </div>

                  <div className="space-y-4 pl-11">
                    {isManagingBooking && (
                      <div className="grid grid-cols-2 gap-2 p-1 bg-[var(--bg-app)] rounded-xl w-full md:w-48 border border-[var(--border-soft)] mb-2">
                        <button onClick={() => setEditFormData({...editFormData, delivery_mode: 'pickup'})} className={cn("py-1.5 text-[9px] font-black rounded-lg transition-all uppercase tracking-widest", editFormData.delivery_mode === 'pickup' ? "bg-brand-primary text-brand-accent shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-main)]")}>Self Pickup</button>
                        <button onClick={() => setEditFormData({...editFormData, delivery_mode: 'delivery'})} className={cn("py-1.5 text-[9px] font-black rounded-lg transition-all uppercase tracking-widest", editFormData.delivery_mode === 'delivery' ? "bg-brand-primary text-brand-accent shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-main)]")}>Delivery</button>
                      </div>
                    )}

                    <AnimatePresence>
                      {((isManagingBooking ? editFormData?.delivery_mode : selectedBooking.delivery_mode) === 'delivery') && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden space-y-4"
                        >
                          <div>
                            <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Event Location</label>
                            {isManagingBooking ? (
                              <textarea 
                                value={editFormData?.event_location || ''} 
                                onChange={(e) => setEditFormData({...editFormData, event_location: e.target.value})}
                                className="w-full text-sm font-medium text-[var(--text-main)] bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl p-3 focus:ring-2 focus:ring-brand-primary/20 outline-none resize-none"
                                rows={2}
                              />
                            ) : (
                              <p className="text-sm font-medium text-[var(--text-main)]">{selectedBooking.event_location || 'Not specified'}</p>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-4 pb-1">
                            <div>
                              <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Point of Contact</label>
                              {isManagingBooking ? (
                                <input 
                                  type="text" 
                                  value={editFormData?.contact_name || ''} 
                                  onChange={(e) => setEditFormData({...editFormData, contact_name: e.target.value})}
                                  className="w-full text-sm font-medium text-[var(--text-main)] bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-lg p-1.5 focus:ring-2 focus:ring-brand-primary/20 outline-none"
                                />
                              ) : (
                                <p className="text-sm font-medium text-[var(--text-main)]">{selectedBooking.contact_name || 'N/A'}</p>
                              )}
                            </div>
                            <div>
                              <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Phone Number</label>
                              {isManagingBooking ? (
                                <input 
                                  type="text" 
                                  value={editFormData?.contact_phone || ''} 
                                  onChange={(e) => setEditFormData({...editFormData, contact_phone: e.target.value})}
                                  className="w-full text-sm font-medium text-[var(--text-main)] bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-lg p-1.5 focus:ring-2 focus:ring-brand-primary/20 outline-none"
                                />
                              ) : (
                                <p className="text-sm font-medium text-[var(--text-main)]">{selectedBooking.contact_phone || 'N/A'}</p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    {(!isManagingBooking && selectedBooking.delivery_mode === 'pickup') && (
                      <div className="flex items-center gap-2 py-2 px-4 bg-indigo-500/5 rounded-xl border border-indigo-500/10 w-fit">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Self Pickup Arranged</span>
                      </div>
                    )}
                  </div>
                </section>
              </div>

              {/* Right Column: Items & Actions (58%) */}
              <div className="lg:col-span-7 bg-[var(--bg-app)]/50 p-8 flex flex-col h-[70vh]">
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 mb-6 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex bg-[var(--bg-app)] p-1 rounded-xl border border-[var(--border-soft)] w-fit">
                      <button 
                        onClick={() => setActiveManagerTab('items')}
                        className={cn(
                          "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                          activeManagerTab === 'items' ? "bg-[var(--bg-surface)] text-brand-primary shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                        )}
                      >
                        Line Items
                      </button>
                      {(currentUser?.role === 'Admin' || currentUser?.is_superuser) && (
                        <button 
                          onClick={() => setActiveManagerTab('billing')}
                          className={cn(
                            "px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                            activeManagerTab === 'billing' ? "bg-[var(--bg-surface)] text-brand-primary shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                          )}
                        >
                          Billing & Documents
                        </button>
                      )}
                    </div>
                    {activeManagerTab === 'items' && (
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                          {isManagingBooking ? editFormData?.items?.length : selectedBooking.items?.length} Objects
                        </span>
                        {!selectedBooking.has_invoice && !isManagingBooking && (
                           <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/invoices/new?booking_id=${selectedBooking.booking_id}`);
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors shadow-sm"
                          >
                            <FileText className="w-3 h-3" /> GENERATE INVOICE
                          </button>
                        )}
                        {isManagingBooking && (
                           <button 
                            onClick={handleManageAddItem}
                            className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black bg-brand-primary text-brand-accent rounded-xl hover:bg-brand-primary/90 transition-colors shadow-sm"
                          >
                            <Plus className="w-3 h-3" /> ADD ITEM
                          </button>
                        )}
                      </div>
                    )}
                    {activeManagerTab === 'billing' && (
                      <div className="flex items-center gap-3">
                        {!selectedBooking.has_invoice && !isManagingBooking && (
                           <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/invoices/new?booking_id=${selectedBooking.booking_id}`);
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-black bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors shadow-sm"
                          >
                            <FileText className="w-3 h-3" /> GENERATE INVOICE
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Documents Quick Bar (Always visible in Details mode) */}
                  {!isManagingBooking && (
                    <div className="flex flex-wrap gap-2 pb-4 border-b border-[var(--border-subtle)]">
                      {selectedBooking.invoices_summary?.map((inv: any) => (
                        <div key={inv.invoice_id} className="flex items-center bg-blue-500/5 rounded-xl border border-blue-500/10 shadow-sm overflow-hidden group">
                           <button
                            onClick={() => handleDownloadDocument('invoice', inv.invoice_id, `invoice_${inv.invoice_number}`)}
                            className="flex items-center gap-1.5 px-3 py-2 hover:bg-blue-500/10 text-blue-600 text-[10px] font-black transition-all"
                          >
                            <FileText className="w-3.5 h-3.5" /> INV: {inv.invoice_number}
                          </button>
                          <button
                            onClick={() => navigate(`/invoices/${inv.invoice_id}/edit`)}
                            className="p-2 border-l border-blue-500/10 hover:bg-blue-500/10 text-blue-400 hover:text-blue-600 transition-all opacity-0 group-hover:opacity-100"
                            title="Edit Invoice"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {selectedBooking.receipts_summary?.map((r: any) => (
                        <div key={r.receipt_id} className="flex items-center bg-emerald-500/5 rounded-xl border border-emerald-500/10 shadow-sm overflow-hidden group">
                           <button
                            onClick={() => handleDownloadDocument('receipt', r.receipt_id, `receipt_${r.receipt_number}`)}
                            className="flex items-center gap-1.5 px-3 py-2 hover:bg-emerald-500/10 text-emerald-600 text-[10px] font-black transition-all"
                          >
                            <Receipt className="w-3.5 h-3.5" /> REC: {r.receipt_number}
                          </button>
                          <button 
                            onClick={() => {
                              setEditingReceipt(r);
                              setShowReceiptPreview(true);
                            }}
                            className="p-2 border-l border-emerald-500/10 hover:bg-emerald-500/10 text-emerald-400 hover:text-emerald-600 transition-all opacity-0 group-hover:opacity-100"
                            title="Edit Receipt"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeManagerTab === 'items' ? (
                    <>

                  <div className="space-y-4">
                    {(isManagingBooking ? editFormData?.items : selectedBooking.items)?.map((item: any, i: number) => (
                      <div 
                        key={i} 
                        onClick={() => !isManagingBooking && setExpandedItemId(expandedItemId === i ? null : i)}
                        className={cn(
                          "p-5 bg-[var(--bg-surface)] rounded-[1.5rem] border border-[var(--border-soft)] transition-all shadow-sm relative group",
                          !isManagingBooking && "cursor-pointer hover:border-brand-primary/30 hover:shadow-md"
                        )}
                      >
                        {isManagingBooking && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleManageRemoveItem(i); }}
                            className="absolute -top-2 -right-2 w-8 h-8 bg-[var(--bg-surface)] border border-[var(--border-soft)] text-rose-500 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex-1 flex items-center gap-4">
                            <div className="w-10 h-10 bg-[var(--bg-app)] rounded-xl flex items-center justify-center border border-[var(--border-soft)]">
                              <Package className="w-5 h-5 text-[var(--text-link)]" />
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
                                      unit_price: prod?.units?.[0]?.rental_price || 0, 
                                      selected_unit_ids: [] 
                                    };
                                    setEditFormData({ ...editFormData, items: newItems });
                                    fetchAvailableUnitsForManage(prodId, selectedBooking.booking_id, editFormData.pickup_date, editFormData.return_date);
                                  }}
                                  className="w-full h-10 px-3 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl outline-none focus:border-brand-primary text-sm font-bold transition-all text-[var(--text-main)]"
                                >
                                  <option value="">Select a product...</option>
                                  {products.map(p => <option key={p.product_id} value={String(p.product_id)} className="bg-[var(--bg-surface)]">{p.name}</option>)}
                                </select>
                              ) : (
                                <span className="text-sm font-bold text-[var(--text-main)] block">{item.product_name}</span>
                              )}
                              <div className="flex gap-3 mt-1">
                                {isManagingBooking ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Quantity:</span>
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
                                      className="w-16 h-7 px-2 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-lg text-xs font-bold outline-none focus:border-brand-primary text-[var(--text-main)]"
                                    />
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest flex items-center gap-1">
                                    {item.quantity_booked} Units
                                  </span>
                                )}
                                {isManagingBooking && item.available_qty !== undefined && (
                                  <div className="flex items-center gap-1.5 ml-1">
                                    <div className={cn("w-1.5 h-1.5 rounded-full", (item.available_qty < item.quantity_booked) ? "bg-rose-500 animate-pulse" : "bg-emerald-500")} />
                                    <span className={cn("text-[9px] font-black uppercase tracking-tight", (item.available_qty < item.quantity_booked) ? "text-rose-600" : "text-emerald-600")}>
                                      {item.available_qty < item.quantity_booked ? `Overbooked (Max: ${item.available_qty})` : 'In Stock'}
                                    </span>
                                  </div>
                                )}
                                {!isManagingBooking && (
                                  <span className="text-[10px] text-[var(--text-link)] font-bold uppercase tracking-widest flex items-center gap-1">
                                    {expandedItemId === i ? "Hide details" : "Show units"}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                           <div className="text-right ml-4">
                             {isManagingBooking ? (
                               <div className="relative inline-block w-24">
                                 <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-bold text-xs">{currencySymbol}</span>
                                 <input 
                                   type="number" 
                                   value={item.unit_price}
                                   onChange={(e) => {
                                     const p = parseFloat(e.target.value) || 0;
                                     const newItems = [...editFormData.items];
                                     newItems[i] = { ...item, unit_price: p };
                                     setEditFormData({ ...editFormData, items: newItems });
                                   }}
                                   className="w-full h-8 pl-5 pr-2 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-lg text-xs font-black outline-none focus:border-brand-primary text-right text-[var(--text-main)]"
                                 />
                               </div>
                             ) : (
                               <span className="text-sm font-black text-[var(--text-main)] block">{currencySymbol}{formatCurrency(item.unit_price)}</span>
                             )}
                             <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest block">Per unit</span>
                           </div>
                        </div>
                        
                        {(isManagingBooking || expandedItemId === i) && (
                          <div className="pt-4 mt-4 border-t border-[var(--border-subtle)] animate-in slide-in-from-top-1 duration-200">
                            {isManagingBooking ? (
                              <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-3 h-3 text-[var(--text-link)]" />
                                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Assign Identifiers (SN)</p>
                                  </div>
                                  <span className={cn(
                                    "text-[10px] font-black px-2 py-0.5 rounded-full transition-all",
                                    item.selected_unit_ids?.length === item.quantity_booked 
                                      ? "bg-emerald-100 text-emerald-600"
                                      : "bg-brand-primary/10 text-[var(--text-link)]"
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
                                          : [...currentIds, unit.product_unit_id].slice(0, Number(item.quantity_booked));
                                        
                                        const newItems = [...editFormData.items];
                                        newItems[i] = { ...item, selected_unit_ids: newIds };
                                        setEditFormData({ ...editFormData, items: newItems });
                                      }}
                                      className={cn(
                                        "px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all",
                                        (item.selected_unit_ids || []).includes(unit.product_unit_id)
                                          ? "bg-brand-primary text-brand-accent border-brand-primary shadow-sm ring-2 ring-brand-primary/20"
                                          : "bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-soft)] hover:border-brand-primary/50"
                                      )}
                                    >
                                      <div className="flex flex-col items-center gap-1">
                                        <span>{unit.serial_number}</span>
                                        {(unit.quantity_picked_up > 0 || unit.quantity_returned_good > 0 || unit.quantity_returned_damaged > 0) && (
                                          <div className="flex gap-1.5 text-[8px] opacity-80 font-black tracking-tighter uppercase">
                                            <span className="text-blue-200">P:{unit.quantity_picked_up}</span>
                                            <span className="text-emerald-200">G:{unit.quantity_returned_good}</span>
                                            <span className="text-rose-200">D:{unit.quantity_returned_damaged}</span>
                                          </div>
                                        )}
                                      </div>
                                    </button>
                                  ))}
                                  {(!availableUnitsMap[item.product_id || item.product] || availableUnitsMap[item.product_id || item.product].length === 0) && (
                                    <div className="w-full p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                                      <p className="text-[10px] text-amber-500 font-bold italic">No physical units available for these dates.</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {item.units?.map((unit: any, ui: number) => (
                                  <div key={ui} className="p-3 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl shadow-sm flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[11px] font-black text-[var(--text-main)] flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 bg-brand-primary rounded-full" />
                                        {unit.unit_type === 'bulk' ? 'Bulk Pool' : (unit.serial_number || 'Single Unit')}
                                      </span>
                                      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase bg-[var(--bg-surface)] px-2 py-0.5 rounded border border-[var(--border-soft)]">
                                        {unit.unit_type}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2 mt-1">
                                    <div className="text-center p-1.5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg">
                                      <p className="text-[7px] font-black text-[var(--text-muted)] uppercase leading-tight">Booked</p>
                                      <p className="text-[11px] font-bold text-[var(--text-main)]">{unit.quantity}</p>
                                    </div>
                                      
                                    {/* Picked Up Control */}
                                    <div className="text-center p-1.5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg">
                                      <p className="text-[7px] font-black text-[var(--text-muted)] uppercase leading-tight">Picked</p>
                                      {isManagingBooking ? (
                                        unit.unit_type === 'single' ? (
                                          <button 
                                            onClick={() => updateUnitTracking(i, ui, 'quantity_picked_up', unit.quantity_picked_up ? 0 : 1)}
                                            className={cn("mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase leading-none", unit.quantity_picked_up ? "bg-emerald-500 text-brand-accent" : "bg-[var(--bg-app)] text-[var(--text-muted)]")}
                                          >
                                            {unit.quantity_picked_up ? 'YES' : 'NO'}
                                          </button>
                                        ) : (
                                          <input 
                                            type="number"
                                            min="0"
                                            max={unit.quantity}
                                            value={unit.quantity_picked_up || 0}
                                            onChange={(e) => updateUnitTracking(i, ui, 'quantity_picked_up', parseInt(e.target.value) || 0)}
                                            className="w-full mt-1 text-center text-[11px] font-bold text-emerald-500 bg-[var(--bg-app)] rounded outline-none"
                                          />
                                        )
                                      ) : (
                                        <p className="text-[11px] font-bold text-emerald-500">{unit.quantity_picked_up || 0}</p>
                                      )}
                                    </div>

                                    {/* Returned Good Control */}
                                    <div className="text-center p-1.5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg">
                                      <p className="text-[7px] font-black text-[var(--text-muted)] uppercase leading-tight">Ret. Good</p>
                                      {isManagingBooking ? (
                                        unit.unit_type === 'single' ? (
                                          <button 
                                            onClick={() => {
                                              updateUnitTracking(i, ui, 'quantity_returned_good', unit.quantity_returned_good ? 0 : 1);
                                              if (!unit.quantity_returned_good) updateUnitTracking(i, ui, 'quantity_returned_damaged', 0);
                                            }}
                                            className={cn("mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase leading-none", unit.quantity_returned_good ? "bg-brand-primary text-brand-accent" : "bg-[var(--bg-app)] text-[var(--text-muted)]")}
                                          >
                                            {unit.quantity_returned_good ? 'YES' : 'NO'}
                                          </button>
                                        ) : (
                                          <input 
                                            type="number"
                                            min="0"
                                            max={unit.quantity_picked_up || unit.quantity}
                                            value={unit.quantity_returned_good || 0}
                                            onChange={(e) => updateUnitTracking(i, ui, 'quantity_returned_good', parseInt(e.target.value) || 0)}
                                            className="w-full mt-1 text-center text-[11px] font-bold text-[var(--text-main)] bg-[var(--bg-app)] rounded outline-none"
                                          />
                                        )
                                      ) : (
                                        <p className="text-[11px] font-bold text-[var(--text-main)]">{unit.quantity_returned_good || 0}</p>
                                      )}
                                    </div>

                                    {/* Returned Damaged Control */}
                                    <div className="text-center p-1.5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg">
                                      <p className="text-[7px] font-black text-[var(--text-muted)] uppercase leading-tight">Ret. Dmg</p>
                                      {isManagingBooking ? (
                                        unit.unit_type === 'single' ? (
                                          <button 
                                            onClick={() => {
                                              updateUnitTracking(i, ui, 'quantity_returned_damaged', unit.quantity_returned_damaged ? 0 : 1);
                                              if (!unit.quantity_returned_damaged) updateUnitTracking(i, ui, 'quantity_returned_good', 0);
                                            }}
                                            className={cn("mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase leading-none", unit.quantity_returned_damaged ? "bg-rose-500 text-brand-accent" : "bg-[var(--bg-app)] text-[var(--text-muted)]")}
                                          >
                                            {unit.quantity_returned_damaged ? 'YES' : 'NO'}
                                          </button>
                                        ) : (
                                          <input 
                                            type="number"
                                            min="0"
                                            max={(unit.quantity_picked_up || unit.quantity) - (unit.quantity_returned_good || 0)}
                                            value={unit.quantity_returned_damaged || 0}
                                            onChange={(e) => updateUnitTracking(i, ui, 'quantity_returned_damaged', parseInt(e.target.value) || 0)}
                                            className="w-full mt-1 text-center text-[11px] font-bold text-rose-500 bg-[var(--bg-app)] rounded outline-none"
                                          />
                                        )
                                      ) : (
                                        <p className="text-[11px] font-bold text-rose-500">{unit.quantity_returned_damaged || 0}</p>
                                      )}
                                    </div>
                                    </div>
                                  </div>
                                ))}
                                {(!item.units || item.units.length === 0) && (
                                  <span className="text-[10px] text-[var(--text-muted)] italic font-medium">No units assigned to this booking yet.</span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                {/* Final Actions & Total */}
                <div className="pt-6 border-t border-[var(--border-subtle)] p-2 space-y-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Grand Total</p>
                      <p className="text-xl sm:text-2xl lg:text-3xl font-black text-[var(--text-main)] tracking-tight break-all">
                        {currencySymbol}
                        {formatCurrency(isManagingBooking ? calculateEditTotal() : selectedBooking.total_amount)}
                      </p>
                    </div>
                    {/* Payment Status Badge */}
                    <div className="text-right">
                      <span className={cn(
                        "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider block mb-2",
                        selectedBooking.payment_status === 'paid' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                        selectedBooking.payment_status === 'partial' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                        "bg-rose-500/10 text-rose-500 border-rose-500/20"
                      )}>
                        {selectedBooking.payment_status || 'unpaid'}
                      </span>
                      <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">
                        Paid: {currencySymbol}{formatCurrency(selectedBooking.amount_paid)}
                      </p>
                    </div>
                  </div>

                  {/* Amount Paid Update Row */}
                  <div className="flex flex-wrap gap-2 p-3 bg-[var(--bg-app)] rounded-2xl border border-[var(--border-soft)]">
                    <div className="flex-1 min-w-[140px] space-y-1">
                      <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Update Amount Paid ({currencySymbol})</label>
                      <div className="flex gap-2">
                        <input
                          id="amountPaidInput"
                          type="number"
                          step="0.01"
                          defaultValue={selectedBooking.amount_paid || 0}
                          className="flex-1 text-xs font-bold bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-xl px-3 py-2 outline-none focus:border-brand-primary transition-all text-[var(--text-main)]"
                        />
                        <button
                          onClick={() => {
                            const inp = document.getElementById('amountPaidInput') as HTMLInputElement;
                            const val = parseFloat(inp.value) || 0;
                            handleUpdateAmountPaid(selectedBooking.booking_id, val);
                          }}
                          disabled={isLoading}
                          className="px-3 py-2 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-black text-[10px] uppercase rounded-xl hover:bg-emerald-500/20 transition-all disabled:opacity-50 whitespace-nowrap"
                        >
                          {isLoading ? (
                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : 'Save'}
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 min-w-[140px] space-y-1">
                      <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Update Status</label>
                      <div className="flex gap-2">
                        <select
                          id="bookingStatusSelect"
                          defaultValue={selectedBooking.status}
                          className="flex-1 text-xs font-bold bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-xl px-3 py-2 outline-none focus:border-brand-primary transition-all text-[var(--text-main)] cursor-pointer"
                        >
                          <option value="pending" className="bg-[var(--bg-surface)]">Pending</option>
                          <option value="confirmed" className="bg-[var(--bg-surface)]">Confirmed</option>
                          <option value="picked_up" className="bg-[var(--bg-surface)]">Picked Up</option>
                          <option value="returned" className="bg-[var(--bg-surface)]">Returned</option>
                          <option value="completed" className="bg-[var(--bg-surface)]">Completed</option>
                          <option value="cancelled" className="bg-[var(--bg-surface)]">Cancelled</option>
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

                  {/* Danger Zone */}
                  <div className="pt-6 border-t border-rose-100 mt-6">
                    <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-3">Danger Zone</p>
                    <button 
                      onClick={() => {
                        setIsViewingDetails(false);
                        setIsManagingBooking(false);
                        handleDelete(selectedBooking.booking_id);
                      }}
                      className="w-full py-3 bg-rose-50 text-rose-600 border border-rose-100 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Entire Booking
                    </button>
                  </div>
                </div>
              </>
            ) : (
                      <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* Invoice Section */}
                        <div className="bg-[var(--bg-surface)] p-6 rounded-[2rem] border border-[var(--border-soft)] shadow-sm">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wide">Sales Invoice</h4>
                                <p className="text-[10px] text-[var(--text-muted)] font-medium">Standard billing document</p>
                              </div>
                            </div>
                            {bookingInvoices.length > 0 && (
                              <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-black rounded-lg uppercase tracking-widest border border-emerald-500/20">
                                DOCUMENT ISSUED
                              </span>
                            )}
                          </div>

                          {bookingInvoices.map((inv: any) => (
                            <div key={inv.invoice_id} className="mt-4 p-4 bg-[var(--bg-app)] rounded-2xl border border-[var(--border-soft)] group relative overflow-hidden">
                              <div className="flex items-start justify-between relative z-10">
                                <div className="space-y-1">
                                  <p className="text-xs font-black text-[var(--text-main)]">Invoice #{inv.invoice_number}</p>
                                  <p className="text-[10px] text-[var(--text-muted)] font-medium">Issued: {new Date(inv.issue_date).toLocaleDateString()}</p>
                                  {inv.due_date && <p className="text-[10px] text-rose-500 font-bold">Due: {new Date(inv.due_date).toLocaleDateString()}</p>}
                                  {inv.notes && (
                                    <div className="mt-2 text-[11px] text-[var(--text-main)] bg-[var(--bg-surface)] p-2 rounded-lg italic border border-[var(--border-soft)]">
                                      "{inv.notes}"
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  <button 
                                    onClick={() => handleDownloadDocument('invoice', inv.invoice_id, `invoice_${inv.invoice_number}`)}
                                    className="p-2 text-[var(--text-muted)] hover:text-brand-primary hover:bg-[var(--bg-surface)] rounded-lg transition-all"
                                    title="Download PDF"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => setEditingDoc({ type: 'invoice', data: inv })}
                                    className="p-2 text-[var(--text-muted)] hover:text-brand-primary hover:bg-[var(--bg-surface)] rounded-lg transition-all"
                                    title="Edit"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                              <div className="mt-4 pt-4 border-t border-[var(--border-soft)] flex justify-between items-center relative z-10">
                                 <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest text-left">Status: {inv.status}</p>
                                 <p className="text-lg font-black text-[var(--text-main)]">{currencySymbol}{formatCurrency(inv.total_amount)}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Receipt Section */}
                        <div className="bg-[var(--bg-surface)] p-6 rounded-[2rem] border border-[var(--border-soft)] shadow-sm">
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500">
                                <Receipt className="w-5 h-5" />
                              </div>
                              <div>
                                <h4 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wide">Payment Receipts</h4>
                                <p className="text-[10px] text-[var(--text-muted)] font-medium">Funds received confirmation</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => {
                                  setIsGeneratingPaymentLink(selectedBooking);
                                  setPaymentLinkAmount(selectedBooking.total_amount - (selectedBooking.amount_paid || 0));
                                }}
                                className="px-4 py-2 bg-blue-500 text-white text-[10px] font-black rounded-xl hover:bg-blue-600 transition-all shadow-md active:scale-95 flex items-center gap-2"
                              >
                                <ExternalLink className="w-3 h-3" />
                                PAY LINK
                              </button>
                              <button 
                                onClick={() => {
                                  const amount = prompt("Enter payment amount:");
                                  if (amount) handleCreatePayment(selectedBooking.booking_id, parseFloat(amount));
                                }}
                                className="px-4 py-2 bg-emerald-500 text-white text-[10px] font-black rounded-xl hover:bg-emerald-600 transition-all shadow-md active:scale-95"
                              >
                                RECORD PAYMENT
                              </button>
                            </div>
                          </div>
                          
                          {paymentLink && (
                            <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl animate-in slide-in-from-top-2">
                              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2">Active Payment Link</p>
                              <div className="flex items-center gap-2">
                                <input readOnly value={paymentLink} className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--text-main)] outline-none" />
                                <button 
                                  onClick={() => { navigator.clipboard.writeText(paymentLink); showNotification("Copied to clipboard!", 'success'); }}
                                  className="p-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => setPaymentLink(null)}
                                  className="p-2 text-[var(--text-muted)] hover:text-rose-500"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )}

                          <div className="space-y-4">
                            {(selectedBooking.payments || []).map((payment: any) => {
                              const receipt = bookingReceipts.find(r => r.payment === payment.payment_id);
                              return (
                                <div key={payment.payment_id} className="p-4 bg-[var(--bg-app)] rounded-2xl border border-[var(--border-soft)] flex items-center justify-between group">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <p className="text-xs font-black text-[var(--text-main)]">{currencySymbol}{formatCurrency(payment.amount)}</p>
                                      <span className={cn(
                                        "text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest",
                                        payment.status === 'completed' ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                                      )}>
                                        {payment.status}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-[var(--text-muted)] font-medium">{new Date(payment.payment_date).toLocaleDateString()}</p>
                                    {receipt && (
                                      <div className="mt-2 flex items-center gap-2">
                                        <p className="text-[11px] font-bold text-emerald-500 tracking-tight">Receipt #{receipt.receipt_number}</p>
                                        {receipt.notes && <span className="text-[10px] text-[var(--text-muted)] italic leading-none border-l border-emerald-500/20 pl-2 ml-1">{receipt.notes}</span>}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {receipt ? (
                                      <div className="flex items-center gap-1">
                                        <button 
                                          onClick={() => handleDownloadDocument('receipt', receipt.receipt_id, `receipt_${receipt.receipt_number}`)}
                                          className="p-2 text-[var(--text-muted)] hover:text-brand-primary hover:bg-[var(--bg-surface)] rounded-lg transition-all"
                                          title="Download PDF"
                                        >
                                          <Download className="w-4 h-4" />
                                        </button>
                                        <button 
                                          onClick={() => setEditingDoc({ type: 'receipt', data: receipt })}
                                          className="p-2 text-[var(--text-muted)] hover:text-brand-primary hover:bg-[var(--bg-surface)] rounded-lg transition-all"
                                          title="Edit"
                                        >
                                          <Edit2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    ) : (
                                      payment.status === 'completed' && (
                                        <button 
                                          onClick={() => handleGenerateReceipt(payment.payment_id)}
                                          disabled={isLoading}
                                          className="px-3 py-1.5 bg-[var(--bg-surface)] border border-emerald-500/30 text-emerald-500 text-[10px] font-black rounded-lg hover:bg-emerald-500/5 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                        >
                                          GENERATE RECEIPT
                                        </button>
                                      )
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
      )}

      {/* Success Overlay for Booking Creation */}
      {showSuccessOverlay && lastCreatedBooking && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-[var(--border-soft)] p-10 text-center space-y-8">
            <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto text-4xl animate-bounce">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-[var(--text-main)]">Booking Created!</h2>
              <p className="text-[var(--text-muted)] font-medium">#{lastCreatedBooking.booking_id} has been created successfully.</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {paymentLink ? (
                <div className="p-4 bg-[var(--bg-app)] rounded-2xl border border-[var(--border-soft)] animate-in slide-in-from-bottom-2">
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2 text-left">Payment Link Generated</p>
                  <div className="flex items-center gap-2">
                    <input readOnly value={paymentLink} className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-xl px-3 py-2 text-xs font-mono text-[var(--text-main)] outline-none" />
                    <button 
                      onClick={() => { navigator.clipboard.writeText(paymentLink); showNotification("Copied to clipboard!", 'success'); }}
                      className="p-2 bg-brand-primary text-brand-accent rounded-xl hover:bg-brand-primary/90"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => {
                    setIsGeneratingPaymentLink(lastCreatedBooking);
                    setPaymentLinkAmount(lastCreatedBooking.total_amount - (lastCreatedBooking.amount_paid || 0));
                  }}
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
                className="w-full py-4 bg-brand-primary text-brand-accent font-black text-sm uppercase tracking-[0.2em] rounded-2xl hover:bg-brand-primary/90 transition-all flex items-center justify-center gap-3"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirm Order
              </button>

              <button
                onClick={() => navigate(`/invoices/new?booking_id=${lastCreatedBooking.booking_id}`)}
                className="w-full py-4 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] font-black text-sm uppercase tracking-[0.2em] rounded-2xl hover:bg-[var(--border-soft)] transition-all flex items-center justify-center gap-3"
              >
                <FileText className="w-4 h-4" />
                Create Invoice
              </button>

              <button
                onClick={() => { setShowSuccessOverlay(false); setLastCreatedBooking(null); setIsAddingBooking(false); resetForm(); }}
                className="w-full py-4 text-[var(--text-muted)] font-bold text-sm hover:text-[var(--text-main)] transition-all"
              >
                Close & Continue
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Document Editor Modal */}
      {editingDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] rounded-[2rem] w-full max-w-lg shadow-2xl border border-[var(--border-soft)] animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-[var(--border-soft)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-xl",
                  editingDoc.type === 'invoice' ? "bg-blue-500/10 text-blue-500" : "bg-emerald-500/10 text-emerald-500"
                )}>
                  {editingDoc.type === 'invoice' ? <FileText className="w-5 h-5" /> : <Receipt className="w-5 h-5" />}
                </div>
                <h3 className="font-black text-[var(--text-main)] uppercase tracking-widest">Edit {editingDoc.type}</h3>
              </div>
              <button 
                onClick={() => setEditingDoc(null)}
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-8 space-y-6">
              {editingDoc.type === 'invoice' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5 pl-1">Due Date</label>
                    <input 
                      type="date"
                      value={editingDoc.data.due_date ? editingDoc.data.due_date.split('T')[0] : ''}
                      onChange={(e) => setEditingDoc({ ...editingDoc, data: { ...editingDoc.data, due_date: e.target.value } })}
                      className="w-full h-11 px-4 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl outline-none focus:border-brand-primary text-sm font-bold text-[var(--text-main)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5 pl-1">Total Amount ({currencySymbol})</label>
                    <input 
                      type="number"
                      step="0.01"
                      value={editingDoc.data.total_amount || 0}
                      onChange={(e) => setEditingDoc({ ...editingDoc, data: { ...editingDoc.data, total_amount: parseFloat(e.target.value) || 0 } })}
                      className="w-full h-11 px-4 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl outline-none focus:border-brand-primary text-sm font-bold text-[var(--text-main)]"
                    />
                  </div>
                </div>
              )}

              {editingDoc.type === 'receipt' && (
                <div>
                  <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5 pl-1">Amount Paid ({currencySymbol})</label>
                  <input 
                    type="number"
                    step="0.01"
                    value={editingDoc.data.amount || 0}
                    onChange={(e) => setEditingDoc({ ...editingDoc, data: { ...editingDoc.data, amount: parseFloat(e.target.value) || 0 } })}
                    className="w-full h-11 px-4 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl outline-none focus:border-brand-primary text-sm font-bold text-[var(--text-main)]"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1.5 pl-1">Notes</label>
                <textarea 
                  value={editingDoc.data.notes || ''}
                  onChange={(e) => setEditingDoc({ ...editingDoc, data: { ...editingDoc.data, notes: e.target.value } })}
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-2xl p-4 text-sm font-medium text-[var(--text-main)] outline-none focus:border-brand-primary resize-none h-32"
                  placeholder={`Add any specific details for this ${editingDoc.type}...`}
                />
              </div>
            </div>

            <div className="px-8 pb-8 pt-2">
              <button 
                onClick={() => handleUpdateDocument(editingDoc.type, editingDoc.type === 'invoice' ? editingDoc.data.invoice_id : editingDoc.data.receipt_id, editingDoc.data)}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-4 bg-brand-primary text-brand-accent rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:opacity-95 transition-all shadow-xl shadow-brand-primary/20 active:scale-[0.98] disabled:opacity-50"
              >
                {isLoading ? <div className="w-4 h-4 border-2 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" /> : <><Save className="w-4 h-4" /> SAVE CHANGES</>}
              </button>
            </div>
          </div>
        </div>
      )}
      {showReceiptPreview && editingReceipt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[70] flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-[var(--border-soft)]">
            <div className="p-8 border-b border-[var(--border-soft)] flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500">
                  <ReceiptText className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-black text-[var(--text-main)] uppercase tracking-widest">Receipt View</h3>
              </div>
              <button onClick={() => { setShowReceiptPreview(false); setEditingReceipt(null); }} className="p-2 hover:bg-[var(--bg-app)] rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 max-h-[60vh] overflow-y-auto space-y-8">
              <div className="grid grid-cols-2 gap-8 pb-8 border-b border-[var(--border-soft)]">
                <div>
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">Received From</p>
                  <p className="text-sm font-bold text-[var(--text-main)]">{selectedBooking.client_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">Receipt Details</p>
                  <p className="text-sm font-bold text-[var(--text-main)]">No: {editingReceipt.receipt_number}</p>
                  <p className="text-xs text-[var(--text-muted)]">{new Date(editingReceipt.issue_date).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest">Amount Received</span>
                  <span className="text-2xl font-black text-emerald-800">{currencySymbol}{formatCurrency(editingReceipt.amount)}</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase mb-2">Notes</label>
                <textarea 
                  value={editingReceipt.notes || ''}
                  onChange={(e) => setEditingReceipt(prev => ({...prev, notes: e.target.value}))}
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl p-4 text-sm font-bold outline-none focus:border-brand-primary min-h-[100px]"
                />
              </div>

              <div className="flex items-center gap-4 pt-8">
                <div className="w-12 h-12 rounded-full border-4 border-emerald-100 border-t-emerald-500 animate-pulse flex items-center justify-center">
                  <span className="text-[10px] font-black text-emerald-500">NEO</span>
                </div>
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest italic">Official Receipt • Branded by Neo Event</p>
              </div>
            </div>

            <div className="p-8 bg-[var(--bg-app)] flex gap-4">
              <button 
                onClick={() => { setShowReceiptPreview(false); setEditingReceipt(null); }}
                className="flex-1 py-4 text-[var(--text-muted)] font-bold text-sm"
              >
                Close
              </button>
              <button 
                onClick={handleGenerateReceipt}
                disabled={isLoading}
                className="flex-[2] py-4 bg-emerald-500 text-white font-black text-sm uppercase tracking-[0.2em] rounded-2xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-3"
              >
                {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save className="w-4 h-4" /> Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Payment Link Amount Modal */}
      {isGeneratingPaymentLink && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[80] flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] rounded-[2rem] w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-[var(--border-soft)]">
            <div className="p-6 border-b border-[var(--border-soft)] flex justify-between items-center bg-[var(--bg-app)]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500">
                  <ExternalLink className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-widest">Payment Link</h3>
              </div>
              <button onClick={() => setIsGeneratingPaymentLink(null)} className="p-2 hover:bg-[var(--bg-surface)] rounded-full transition-colors text-[var(--text-muted)]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">Amount to Charge ({currencySymbol})</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[var(--text-muted)]">{currencySymbol}</span>
                  <input 
                    type="number"
                    value={paymentLinkAmount}
                    onChange={(e) => setPaymentLinkAmount(parseFloat(e.target.value))}
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-2xl py-4 pl-8 pr-4 text-xl font-black text-[var(--text-main)] focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                    autoFocus
                  />
                </div>
                <p className="mt-2 text-[10px] text-[var(--text-muted)] font-medium italic">Balance remaining: {currencySymbol}{formatCurrency(isGeneratingPaymentLink.total_amount - (isGeneratingPaymentLink.amount_paid || 0))}</p>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setIsGeneratingPaymentLink(null)}
                  className="flex-1 py-3.5 text-[var(--text-muted)] font-bold text-xs uppercase tracking-widest hover:text-[var(--text-main)] transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    handleGeneratePaymentLink(isGeneratingPaymentLink, paymentLinkAmount);
                    setIsGeneratingPaymentLink(null);
                  }}
                  disabled={isLoading || !paymentLinkAmount}
                  className="flex-[2] py-3.5 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                  Generate Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
