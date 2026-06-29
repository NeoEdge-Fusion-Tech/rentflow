import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Download, Plus, Trash2, FileText } from 'lucide-react';
import { cn } from '@/src/utils';
import { useNotification } from '../context/NotificationContext';
import { ClientPicker } from '../components/ClientPicker';
import {
  InvoiceService,
  ClientService,
  CurrencyService,
  BankAccountService,
  AuthService,
  OrganizationService
} from '../api';

interface LineItem {
  line_item_id?: number;
  name: string;
  description: string;
  quantity: number;
  unit_price: number;
}

export function InvoiceEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const bookingIdParam = searchParams.get('booking_id');
  const isEditMode = !!id;
  const { showNotification } = useNotification();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [org, setOrg] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [invoiceMeta, setInvoiceMeta] = useState<any>(null);

  const [formData, setFormData] = useState({
    client: '' as number | string,
    booking: bookingIdParam || '',
    due_date: '',
    status: 'draft',
    currency: '' as number | string,
    bank_account: '' as number | string,
    discount_amount: 0,
    discount_percentage: 0,
    tax_percentage: 0,
    notes: '',
  });
  const [lineItems, setLineItems] = useState<LineItem[]>([{ name: '', description: '', quantity: 1, unit_price: 0 }]);

  const fetchClients = async () => {
    try {
      const res = await ClientService.getAll();
      setClients(res.data.results || res.data);
    } catch (e) { console.error(e); }
  };

  const fetchCurrencies = async () => {
    try {
      const res = await CurrencyService.getAll();
      setCurrencies(res.data.results || res.data);
    } catch (e) { console.error(e); }
  };

  const fetchBankAccounts = async () => {
    try {
      const res = await BankAccountService.getAll();
      setBankAccounts(res.data.results || res.data);
    } catch (e) { console.error(e); }
  };

  const fetchOrg = async () => {
    try {
      const me = await AuthService.getMe();
      if (me.data.organization_id) {
        const res = await OrganizationService.get(me.data.organization_id);
        setOrg(res.data);
        return res.data;
      }
    } catch (e) { console.error(e); }
    return null;
  };

  const loadInvoice = async (invoiceId: string) => {
    const res = await InvoiceService.get(invoiceId);
    const inv = res.data;
    setFormData({
      client: inv.client || '',
      booking: inv.booking || '',
      due_date: inv.due_date ? inv.due_date.split('T')[0] : '',
      status: inv.status,
      currency: inv.currency || '',
      bank_account: inv.bank_account || '',
      discount_amount: parseFloat(inv.discount_amount) || 0,
      discount_percentage: parseFloat(inv.discount_percentage) || 0,
      tax_percentage: parseFloat(inv.tax_percentage) || 0,
      notes: inv.notes || '',
    });
    setLineItems(
      (inv.line_items || []).map((li: any) => ({
        line_item_id: li.line_item_id,
        name: li.name,
        description: li.description || '',
        quantity: parseFloat(li.quantity),
        unit_price: parseFloat(li.unit_price),
      }))
    );
    setInvoiceMeta(inv);
  };

  const loadPrefill = async (bookingId: string) => {
    const res = await InvoiceService.prefillFromBooking(bookingId);
    const data = res.data;
    setFormData(prev => ({
      ...prev,
      client: data.client || '',
      booking: data.booking || '',
      discount_amount: parseFloat(data.discount_amount) || 0,
      discount_percentage: parseFloat(data.discount_percentage) || 0,
    }));
    if (data.line_items?.length) {
      setLineItems(data.line_items.map((li: any) => ({
        name: li.name,
        description: li.description || '',
        quantity: parseFloat(li.quantity),
        unit_price: parseFloat(li.unit_price),
      })));
    }
  };

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await Promise.all([fetchClients(), fetchCurrencies(), fetchBankAccounts()]);
      const orgData = await fetchOrg();
      try {
        if (id) {
          await loadInvoice(id);
        } else if (bookingIdParam) {
          await loadPrefill(bookingIdParam);
          if (orgData?.currency?.id) {
            setFormData(prev => ({ ...prev, currency: prev.currency || orgData.currency.id }));
          }
        } else if (orgData?.currency?.id) {
          setFormData(prev => ({ ...prev, currency: prev.currency || orgData.currency.id }));
        }
      } catch (err) {
        console.error("Failed to initialize invoice editor", err);
        showNotification("Failed to load invoice data.", 'error');
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const updateLineItem = (index: number, field: keyof LineItem, value: any) => {
    setLineItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addLineItem = () => setLineItems(prev => [...prev, { name: '', description: '', quantity: 1, unit_price: 0 }]);
  const removeLineItem = (index: number) => setLineItems(prev => prev.filter((_, i) => i !== index));

  const subtotal = lineItems.reduce((acc, li) => acc + (Number(li.quantity) || 0) * (Number(li.unit_price) || 0), 0);
  const discountValue = formData.discount_percentage > 0
    ? subtotal * (formData.discount_percentage / 100)
    : (formData.discount_amount || 0);
  const taxableAmount = Math.max(0, subtotal - discountValue);
  const taxValue = taxableAmount * ((formData.tax_percentage || 0) / 100);
  const grandTotal = Math.max(0, taxableAmount + taxValue);

  const selectedCurrency = currencies.find(c => c.id === parseInt(String(formData.currency)));
  const currencySymbol = selectedCurrency?.symbol || org?.currency?.symbol || localStorage.getItem('currencySymbol') || '$';

  const formatCurrency = (amount: number) => (amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const buildPayload = (statusOverride?: string) => ({
    client: formData.client ? parseInt(String(formData.client)) : null,
    booking: formData.booking ? parseInt(String(formData.booking)) : null,
    due_date: formData.due_date || null,
    status: statusOverride || formData.status,
    currency: formData.currency ? parseInt(String(formData.currency)) : null,
    bank_account: formData.bank_account ? parseInt(String(formData.bank_account)) : null,
    discount_amount: formData.discount_percentage > 0 ? 0 : formData.discount_amount,
    discount_percentage: formData.discount_percentage,
    tax_percentage: formData.tax_percentage,
    notes: formData.notes,
    line_items: lineItems.map(li => ({
      ...(li.line_item_id ? { line_item_id: li.line_item_id } : {}),
      name: li.name,
      description: li.description,
      quantity: li.quantity,
      unit_price: li.unit_price,
    })),
  });

  const handleSave = async (statusOverride?: string) => {
    if (!formData.client) {
      showNotification("Please select a client.", 'warning');
      return;
    }
    if (lineItems.length === 0 || lineItems.some(li => !li.name)) {
      showNotification("Every line item needs a name.", 'warning');
      return;
    }
    try {
      setIsSaving(true);
      const payload = buildPayload(statusOverride);
      const res = isEditMode
        ? await InvoiceService.patch(id, payload)
        : await InvoiceService.create(payload);
      showNotification(isEditMode ? "Invoice updated." : "Invoice created.", 'success');
      navigate(`/invoices/${res.data.invoice_id}/edit`, { replace: true });
      if (isEditMode) await loadInvoice(id!);
    } catch (err: any) {
      console.error("Failed to save invoice", err);
      const apiError = err.response?.data;
      const message = apiError?.client?.[0] || apiError?.line_items?.[0] || apiError?.detail || "Failed to save invoice.";
      showNotification(message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!id) return;
    try {
      const response = await InvoiceService.download(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${invoiceMeta?.invoice_number || id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Failed to download invoice", err);
      showNotification("Failed to download invoice", 'error');
    }
  };

  if (isLoading) {
    return <div className="bg-[var(--bg-surface)] p-12 text-center text-[var(--text-muted)] rounded-2xl border border-[var(--border-soft)]">Loading invoice editor...</div>;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/invoices')} className="p-2.5 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-xl text-[var(--text-main)] hover:bg-[var(--bg-app)] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-main)]">
              {isEditMode ? `Invoice ${invoiceMeta?.invoice_number || ''}` : 'New Invoice'}
            </h1>
            <p className="text-[var(--text-muted)]">Fill in the details, then save as draft or issue it.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isEditMode && (
            <button onClick={handleDownload} className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] font-bold rounded-xl hover:bg-[var(--bg-app)] transition-colors text-sm">
              <Download className="w-4 h-4" /> PDF
            </button>
          )}
          <button onClick={() => handleSave('draft')} disabled={isSaving} className="flex-1 sm:flex-none justify-center px-4 py-2.5 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] font-bold rounded-xl hover:bg-[var(--border-soft)] transition-colors text-sm disabled:opacity-50">
            Save Draft
          </button>
          <button onClick={() => handleSave('issued')} disabled={isSaving} className="flex-1 sm:flex-none justify-center px-4 py-2.5 text-white font-bold rounded-xl hover:opacity-90 transition-colors text-sm disabled:opacity-50 shadow-sm" style={{ backgroundColor: org?.primary_color || 'var(--color-brand-primary, #7c3aed)' }}>
            {isSaving ? 'Saving...' : 'Save & Issue'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left column */}
        <div className="lg:col-span-8 space-y-6">
          {/* From */}
          <section className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-soft)] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[var(--text-main)] text-sm uppercase tracking-wider">From</h3>
              <button onClick={() => navigate('/settings')} className="text-xs font-bold text-brand-primary hover:underline">Edit company details</button>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                {org?.company_logo && (
                  <img src={org.company_logo.startsWith('http') ? org.company_logo : `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${org.company_logo.startsWith('/') ? '' : '/'}${org.company_logo}`} alt="logo" className="w-full h-full object-contain" />
                )}
              </div>
              <div>
                <p className="font-bold text-[var(--text-main)]">{org?.name || 'Your Company'}</p>
                {org?.address && <p className="text-xs text-[var(--text-muted)]">{org.address}</p>}
                <p className="text-xs text-[var(--text-muted)]">{[org?.phone_number, org?.email].filter(Boolean).join(' · ')}</p>
              </div>
            </div>
          </section>

          {/* Bill To */}
          <section className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-soft)] p-6">
            <h3 className="font-bold text-[var(--text-main)] text-sm uppercase tracking-wider mb-4">Bill To</h3>
            <ClientPicker
              clients={clients}
              value={formData.client}
              onChange={(clientId) => setFormData({ ...formData, client: clientId })}
              onClientCreated={(client) => setClients(prev => [...prev, client])}
            />
          </section>

          {/* Meta */}
          <section className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-soft)] p-6">
            <h3 className="font-bold text-[var(--text-main)] text-sm uppercase tracking-wider mb-4">Invoice Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Due Date</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                  className="w-full h-11 px-3 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl outline-none focus:border-brand-primary text-sm font-medium text-[var(--text-main)]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Currency</label>
                <select
                  value={formData.currency}
                  onChange={e => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full h-11 px-3 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl outline-none focus:border-brand-primary text-sm font-medium text-[var(--text-main)]"
                >
                  <option value="">Select currency...</option>
                  {currencies.map(c => (
                    <option key={c.id} value={c.id}>{c.code} ({c.symbol})</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Bank Account (shown on PDF)</label>
                <select
                  value={formData.bank_account}
                  onChange={e => setFormData({ ...formData, bank_account: e.target.value })}
                  className="w-full h-11 px-3 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl outline-none focus:border-brand-primary text-sm font-medium text-[var(--text-main)]"
                >
                  <option value="">No bank account selected</option>
                  {bankAccounts.map(b => (
                    <option key={b.bank_account_id} value={b.bank_account_id}>
                      {b.bank_name} · {b.account_number} ({b.account_type === 'current' ? 'Current' : 'Savings'})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Line Items */}
          <section className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-soft)] p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[var(--text-main)] text-sm uppercase tracking-wider">Line Items</h3>
              <button onClick={addLineItem} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-white rounded-xl hover:opacity-90 transition-opacity shadow-sm" style={{ backgroundColor: org?.primary_color || 'var(--color-brand-primary, #7c3aed)' }}>
                <Plus className="w-3 h-3" /> ADD ITEM
              </button>
            </div>
            <div className="space-y-3">
              {lineItems.map((item, i) => (
                <div key={i} className="flex flex-col gap-3 bg-[var(--bg-app)] rounded-xl p-3 border border-[var(--border-subtle)]">
                  <div className="grid grid-cols-12 gap-3 items-start">
                    <div className="col-span-12 md:col-span-5">
                      <input
                        type="text"
                        placeholder="Item Name"
                        value={item.name}
                        onChange={e => updateLineItem(i, 'name', e.target.value)}
                        className="w-full h-10 px-3 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-lg outline-none focus:border-brand-primary text-sm font-bold text-[var(--text-main)]"
                      />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={e => updateLineItem(i, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full h-10 px-3 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-lg outline-none focus:border-brand-primary text-sm font-medium text-[var(--text-main)] text-center"
                      />
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs font-bold">{currencySymbol}</span>
                        <input
                          type="number"
                          placeholder="Price"
                          value={item.unit_price}
                          onChange={e => updateLineItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="w-full h-10 pl-6 pr-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-lg outline-none focus:border-brand-primary text-sm font-medium text-[var(--text-main)] text-right"
                        />
                      </div>
                    </div>
                    <div className="col-span-3 md:col-span-2 flex items-center justify-end h-10 text-sm font-bold text-[var(--text-main)]">
                      {currencySymbol}{formatCurrency((Number(item.quantity) || 0) * (Number(item.unit_price) || 0))}
                    </div>
                    <div className="col-span-1 flex items-center justify-end h-10">
                      <button onClick={() => removeLineItem(i)} className="p-1.5 text-[var(--text-muted)] hover:text-rose-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="w-full">
                    <textarea
                      placeholder="Add description..."
                      value={item.description || ''}
                      onChange={e => updateLineItem(i, 'description', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-lg outline-none focus:border-brand-primary text-sm font-medium text-[var(--text-muted)] resize-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Notes */}
          <section className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-soft)] p-6">
            <h3 className="font-bold text-[var(--text-main)] text-sm uppercase tracking-wider mb-4">Notes / Terms</h3>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Payment terms, thank-you note, or any extra instructions for the client..."
              rows={4}
              className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl outline-none focus:border-brand-primary text-sm font-medium text-[var(--text-main)] resize-none"
            />
          </section>
        </div>

        {/* Right column: Summary */}
        <div className="lg:col-span-4">
          <div className="sticky top-0 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-soft)] p-6 space-y-6">
            <h3 className="font-bold text-[var(--text-main)] text-sm uppercase tracking-wider">Summary</h3>

            <div className="flex justify-between text-sm">
              <span className="text-[var(--text-muted)] font-medium">Subtotal</span>
              <span className="font-bold text-[var(--text-main)]">{currencySymbol}{formatCurrency(subtotal)}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase mb-1">Discount ({currencySymbol})</label>
                <input
                  type="number"
                  value={formData.discount_amount}
                  onChange={e => setFormData({ ...formData, discount_amount: parseFloat(e.target.value) || 0, discount_percentage: 0 })}
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-lg p-2 text-sm outline-none focus:border-brand-primary font-bold text-[var(--text-main)]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase mb-1">Discount (%)</label>
                <input
                  type="number"
                  value={formData.discount_percentage}
                  onChange={e => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) || 0, discount_amount: 0 })}
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-lg p-2 text-sm outline-none focus:border-brand-primary font-bold text-[var(--text-main)]"
                />
              </div>
            </div>
            {discountValue > 0 && (
              <div className="flex justify-between text-xs font-bold text-brand-accent uppercase tracking-wide">
                <span>Discount</span>
                <span>-{currencySymbol}{formatCurrency(discountValue)}</span>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase mb-1">Tax (%)</label>
              <input
                type="number"
                value={formData.tax_percentage}
                onChange={e => setFormData({ ...formData, tax_percentage: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-lg p-2 text-sm outline-none focus:border-brand-primary font-bold text-[var(--text-main)]"
              />
            </div>
            {taxValue > 0 && (
              <div className="flex justify-between text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">
                <span>Tax</span>
                <span>{currencySymbol}{formatCurrency(taxValue)}</span>
              </div>
            )}

            <div className="pt-4 border-t border-[var(--border-soft)] flex justify-between items-baseline">
              <span className="text-sm font-black uppercase tracking-wide text-[var(--text-muted)]">Total</span>
              <span className="text-2xl font-black text-[var(--text-main)] tracking-tight">{currencySymbol}{formatCurrency(grandTotal)}</span>
            </div>

            {isEditMode && (
              <div className="pt-4 border-t border-[var(--border-soft)] space-y-2">
                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase">Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-lg p-2.5 text-sm outline-none focus:border-brand-primary font-bold text-[var(--text-main)] cursor-pointer"
                >
                  <option value="draft">Draft</option>
                  <option value="issued">Issued</option>
                  <option value="paid">Paid</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <button
                  onClick={() => handleSave()}
                  disabled={isSaving}
                  className={cn(
                    "w-full mt-2 py-2.5 rounded-lg font-bold text-sm transition-colors disabled:opacity-50",
                    "bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] hover:bg-[var(--border-soft)]"
                  )}
                >
                  Save Status & Changes
                </button>
              </div>
            )}
            

          </div>
        </div>
      </div>
    </div>
  );
}
