import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Download, Plus, Trash2, Eye, Edit2, ArrowRightCircle } from 'lucide-react';
import { cn } from '@/src/utils';
import { useNotification } from '../context/NotificationContext';
import { ClientPicker } from '../components/ClientPicker';
import {
  QuotationService,
  ClientService,
  CurrencyService,
  BankAccountService,
  AuthService,
  OrganizationService,
  ProductService
} from '../api';

interface LineItem {
  line_item_id?: number;
  name: string;
  description: string;
  quantity: number;
  unit_price: number;
}

export function QuotationEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const duplicateFromParam = searchParams.get('duplicate_from');
  const isEditMode = !!id;
  const { showNotification, showConfirm } = useNotification();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [org, setOrg] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [quotationMeta, setQuotationMeta] = useState<any>(null);
  const [lastQuotationMeta, setLastQuotationMeta] = useState<any>(null);

  const [formData, setFormData] = useState({
    client: '' as number | string,
    quotation_number: '',
    issue_date: new Date().toISOString().slice(0, 10),
    expiry_date: '',
    status: 'draft',
    currency: '' as number | string,
    bank_account: '' as number | string,
    show_bank_details: true,
    discount_amount: 0,
    discount_percentage: 0,
    tax_percentage: 0,
    notes: '',
    title: 'Quotation',
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

  const fetchProducts = async () => {
    try {
      const res = await ProductService.getAll();
      setProducts(res.data.results || res.data);
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

  const loadQuotation = async (quotationId: string, isDuplicate = false) => {
    const res = await QuotationService.get(quotationId);
    const q = res.data;
    setFormData(prev => ({
      ...prev,
      client: q.client || '',
      quotation_number: isDuplicate ? prev.quotation_number : (q.quotation_number || ''),
      issue_date: q.issue_date ? new Date(q.issue_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      expiry_date: q.expiry_date ? new Date(q.expiry_date).toISOString().slice(0, 10) : '',
      status: isDuplicate ? 'draft' : (q.status || 'draft'),
      currency: q.currency || '',
      bank_account: q.bank_account || '',
      show_bank_details: q.show_bank_details !== false,
      discount_amount: parseFloat(q.discount_amount) || 0,
      discount_percentage: parseFloat(q.discount_percentage) || 0,
      tax_percentage: parseFloat(q.tax_percentage) || 0,
      notes: q.notes || '',
      title: isDuplicate ? `Copy of ${q.title || 'Quotation'}` : (q.title || 'Quotation'),
    }));
    setLineItems(
      (q.line_items || []).map((li: any) => ({
        ...(isDuplicate ? {} : { line_item_id: li.line_item_id }),
        name: li.name,
        description: li.description || '',
        quantity: parseFloat(li.quantity),
        unit_price: parseFloat(li.unit_price),
      }))
    );
    if (!isDuplicate) {
      setQuotationMeta(q);
    }
  };

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await Promise.all([fetchClients(), fetchCurrencies(), fetchBankAccounts(), fetchProducts()]);
      const orgData = await fetchOrg();
      try {
        if (!id) {
          const nextMeta = await QuotationService.getNextNumber();
          if (nextMeta.data) {
            setLastQuotationMeta(nextMeta.data);
            setFormData(prev => ({ ...prev, quotation_number: nextMeta.data.next_quotation_number }));
          }
        }

        if (id) {
          await loadQuotation(id);
        } else if (duplicateFromParam) {
          await loadQuotation(duplicateFromParam, true);
          if (orgData?.currency?.id) {
            setFormData(prev => ({ ...prev, currency: prev.currency || orgData.currency.id }));
          }
        } else if (orgData?.currency?.id) {
          setFormData(prev => ({ ...prev, currency: prev.currency || orgData.currency.id }));
        }
      } catch (err) {
        console.error("Failed to initialize quotation editor", err);
        showNotification("Failed to load quotation data.", 'error');
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
    issue_date: formData.issue_date,
    expiry_date: formData.expiry_date || null,
    status: statusOverride || formData.status,
    currency: formData.currency ? parseInt(String(formData.currency)) : null,
    bank_account: formData.show_bank_details ? (formData.bank_account ? parseInt(String(formData.bank_account)) : null) : null,
    show_bank_details: formData.show_bank_details,
    discount_amount: formData.discount_percentage > 0 ? 0 : formData.discount_amount,
    discount_percentage: formData.discount_percentage,
    tax_percentage: formData.tax_percentage,
    notes: formData.notes,
    title: formData.title,
    quotation_number: formData.quotation_number || undefined,
    line_items: lineItems.map(li => ({
      ...(li.line_item_id ? { line_item_id: li.line_item_id } : {}),
      name: li.name,
      description: li.description,
      quantity: li.quantity,
      unit_price: li.unit_price,
    })),
  });

  const handleSave = async (statusOverride?: string, skipNavigate = false) => {
    if (!formData.client) {
      showNotification("Please select a client.", 'warning');
      return null;
    }
    if (lineItems.length === 0 || lineItems.some(li => !li.name)) {
      showNotification("Every line item needs a name.", 'warning');
      return null;
    }
    try {
      setIsSaving(true);
      const payload = buildPayload(statusOverride);
      const res = isEditMode
        ? await QuotationService.patch(id, payload)
        : await QuotationService.create(payload);
      showNotification(isEditMode ? "Quotation updated." : "Quotation created.", 'success');
      if (!skipNavigate) {
        navigate(`/quotations/${res.data.quotation_id}/edit`, { replace: true });
      }
      if (isEditMode) await loadQuotation(id!);
      return res.data.quotation_id;
    } catch (err: any) {
      console.error("Failed to save quotation", err);
      const apiError = err.response?.data;
      const message = apiError?.client?.[0] || apiError?.line_items?.[0] || apiError?.detail || "Failed to save quotation.";
      showNotification(message, 'error');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = async () => {
    if (!isEditMode) {
      const newId = await handleSave('draft', true);
      if (newId) navigate(`/quotations/${newId}/preview`);
    } else {
      navigate(`/quotations/${id}/preview`);
    }
  };

  const handleDownload = async () => {
    if (!id) return;
    try {
      const response = await QuotationService.download(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `quotation_${quotationMeta?.quotation_number || id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Failed to download quotation", err);
      showNotification("Failed to download quotation", 'error');
    }
  };

  const handleConvert = () => {
    if (!id) return;
    showConfirm({
      title: 'Convert to Invoice',
      message: 'Convert this quotation into a real invoice? This will create a new invoice with the same line items.',
      confirmText: 'Convert',
      onConfirm: async () => {
        try {
          const res = await QuotationService.convertToInvoice(id);
          showNotification('Quotation converted to invoice!', 'success');
          navigate(`/invoices/${res.data.invoice_id}/edit`);
        } catch (err: any) {
          console.error('Failed to convert quotation', err);
          showNotification(err.response?.data?.error || 'Failed to convert quotation.', 'error');
        }
      }
    });
  };

  if (isLoading) {
    return <div className="bg-[var(--bg-surface)] p-12 text-center text-[var(--text-muted)] rounded-2xl border border-[var(--border-soft)]">Loading quotation editor...</div>;
  }

  const isConverted = formData.status === 'converted';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/quotations')} className="p-2.5 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-xl text-[var(--text-main)] hover:bg-[var(--bg-app)] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-2 group">
              Quotation
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={formData.quotation_number}
                  onChange={e => setFormData({ ...formData, quotation_number: e.target.value })}
                  placeholder="e.g. QUO-0001"
                  className="bg-transparent border-b border-dashed border-transparent group-hover:border-[var(--border-soft)] focus:border-brand-primary outline-none px-1 py-0.5 text-2xl font-bold max-w-[280px] transition-colors"
                />
                <Edit2 className="w-4 h-4 text-[var(--text-muted)] absolute -right-6 pointer-events-none" />
              </div>
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-[var(--text-muted)]">Fill in the details, then save as draft or send it.</p>
              {lastQuotationMeta?.last_quotation_number && !isEditMode && (
                <span className="text-xs text-[var(--text-muted)] bg-[var(--bg-surface)] border border-[var(--border-soft)] px-2 py-0.5 rounded-full">
                  Last: {lastQuotationMeta.last_quotation_number}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handlePreview} disabled={isSaving} className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] font-bold rounded-xl hover:bg-[var(--bg-app)] transition-colors text-sm">
            <Eye className="w-4 h-4" /> Preview
          </button>
          {isEditMode && (
            <button onClick={handleDownload} className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] font-bold rounded-xl hover:bg-[var(--bg-app)] transition-colors text-sm">
              <Download className="w-4 h-4" /> PDF
            </button>
          )}
          {isEditMode && !isConverted && (
            <button onClick={handleConvert} className="flex-1 sm:flex-none justify-center flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 text-emerald-600 font-bold rounded-xl hover:bg-emerald-500/20 transition-colors text-sm">
              <ArrowRightCircle className="w-4 h-4" /> Convert to Invoice
            </button>
          )}
          {!isConverted && (
            <>
              <button onClick={() => handleSave('draft')} disabled={isSaving} className="flex-1 sm:flex-none justify-center px-4 py-2.5 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] font-bold rounded-xl hover:bg-[var(--border-soft)] transition-colors text-sm disabled:opacity-50">
                Save Draft
              </button>
              <button onClick={() => handleSave('sent')} disabled={isSaving} className="flex-1 sm:flex-none justify-center px-4 py-2.5 text-white font-bold rounded-xl hover:opacity-90 transition-colors text-sm disabled:opacity-50 shadow-sm" style={{ backgroundColor: org?.primary_color || 'var(--color-brand-primary, #7c3aed)' }}>
                {isSaving ? 'Saving...' : 'Save & Mark Sent'}
              </button>
            </>
          )}
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

          {/* Quote To */}
          <section className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-soft)] p-6">
            <h3 className="font-bold text-[var(--text-main)] text-sm uppercase tracking-wider mb-4">Quote To</h3>
            <ClientPicker
              clients={clients}
              value={formData.client}
              onChange={(clientId) => setFormData({ ...formData, client: clientId })}
              onClientCreated={(client) => setClients(prev => [...prev, client])}
            />
          </section>

          {/* Meta */}
          <section className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-soft)] p-6">
            <h3 className="font-bold text-[var(--text-main)] text-sm uppercase tracking-wider mb-4">Quotation Details</h3>

            <div className="mb-4">
              <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Quotation Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Website Redesign Quotation"
                className="w-full h-11 px-3 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl outline-none focus:border-brand-primary text-sm font-medium text-[var(--text-main)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Issue Date</label>
                <input
                  type="date"
                  value={formData.issue_date}
                  onChange={e => setFormData({ ...formData, issue_date: e.target.value })}
                  className="w-full h-11 px-3 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl outline-none focus:border-brand-primary text-sm font-medium text-[var(--text-main)]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Valid Until</label>
                <input
                  type="date"
                  value={formData.expiry_date}
                  onChange={e => setFormData({ ...formData, expiry_date: e.target.value })}
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
              <div className="col-span-2 flex items-center justify-between bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl px-3 h-11">
                <label htmlFor="show-bank-details" className="text-xs font-bold text-[var(--text-muted)] uppercase cursor-pointer">
                  Include Bank Details on Quotation
                </label>
                <button
                  id="show-bank-details"
                  type="button"
                  role="switch"
                  aria-checked={formData.show_bank_details}
                  onClick={() => setFormData({ ...formData, show_bank_details: !formData.show_bank_details })}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0",
                    formData.show_bank_details ? "bg-brand-primary" : "bg-[var(--border-soft)]"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      formData.show_bank_details ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
              {formData.show_bank_details && (
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
              )}
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
                    <div className="relative col-span-12 md:col-span-5">
                      <input
                        type="text"
                        placeholder="Item Name (Search Products...)"
                        value={item.name}
                        onFocus={() => setActiveDropdown(i)}
                        onBlur={() => setTimeout(() => setActiveDropdown(null), 200)}
                        onChange={e => {
                          updateLineItem(i, 'name', e.target.value);
                          setActiveDropdown(i);
                        }}
                        className="w-full h-10 px-3 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-lg outline-none focus:border-brand-primary text-sm font-bold text-[var(--text-main)]"
                      />
                      {activeDropdown === i && products.length > 0 && (
                        <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-lg shadow-xl max-h-48 overflow-y-auto">
                          {products
                            .filter(p => p.name.toLowerCase().includes(item.name.toLowerCase()))
                            .map(p => (
                              <div
                                key={p.product_id}
                                className="px-3 py-2.5 hover:bg-[var(--bg-surface)] cursor-pointer flex justify-between items-center border-b border-[var(--border-subtle)] last:border-0"
                                onClick={() => {
                                  updateLineItem(i, 'name', p.name);
                                  updateLineItem(i, 'unit_price', parseFloat(p.units?.[0]?.rental_price || 0));
                                  setActiveDropdown(null);
                                }}
                              >
                                <div>
                                  <p className="text-sm font-bold text-[var(--text-main)]">{p.name}</p>
                                  <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase mt-0.5">{p.category?.name || 'Product'}</p>
                                </div>
                                <span className="text-xs font-bold text-[var(--text-main)]">
                                  {currencySymbol} {parseFloat(p.units?.[0]?.rental_price || 0).toLocaleString()}
                                </span>
                              </div>
                            ))}
                          {products.filter(p => p.name.toLowerCase().includes(item.name.toLowerCase())).length === 0 && (
                            <div className="px-3 py-4 text-center text-xs text-[var(--text-muted)] font-medium">
                              No products found.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="col-span-4 md:col-span-2">
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity === 0 ? '' : item.quantity}
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
                          value={item.unit_price === 0 ? '' : item.unit_price}
                          onChange={e => updateLineItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="w-full h-10 pl-12 pr-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-lg outline-none focus:border-brand-primary text-sm font-medium text-[var(--text-main)] text-right"
                        />
                      </div>
                    </div>
                    <div className="col-span-3 md:col-span-2 flex items-center justify-end h-10 text-sm font-bold text-[var(--text-main)]">
                      {currencySymbol} {formatCurrency((Number(item.quantity) || 0) * (Number(item.unit_price) || 0))}
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
              placeholder="Terms, thank-you note, or any extra instructions for the client..."
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
              <span className="font-bold text-[var(--text-main)]">{currencySymbol} {formatCurrency(subtotal)}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase mb-1">Discount ({currencySymbol})</label>
                <input
                  type="number"
                  value={formData.discount_amount || ''}
                  onChange={e => setFormData({ ...formData, discount_amount: parseFloat(e.target.value) || 0, discount_percentage: 0 })}
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-lg p-2 text-sm outline-none focus:border-brand-primary font-bold text-[var(--text-main)]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase mb-1">Discount (%)</label>
                <input
                  type="number"
                  value={formData.discount_percentage || ''}
                  onChange={e => setFormData({ ...formData, discount_percentage: parseFloat(e.target.value) || 0, discount_amount: 0 })}
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-lg p-2 text-sm outline-none focus:border-brand-primary font-bold text-[var(--text-main)]"
                />
              </div>
            </div>
            {discountValue > 0 && (
              <div className="flex justify-between text-xs font-bold text-brand-accent uppercase tracking-wide">
                <span>Discount</span>
                <span>-{currencySymbol} {formatCurrency(discountValue)}</span>
              </div>
            )}

            <div className="pt-4 border-t border-[var(--border-soft)]">
              <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase mb-1">Tax (%)</label>
              <input
                type="number"
                value={formData.tax_percentage || ''}
                onChange={e => setFormData({ ...formData, tax_percentage: parseFloat(e.target.value) || 0 })}
                className="w-full bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-lg p-2 text-sm outline-none focus:border-brand-primary font-bold text-[var(--text-main)]"
              />
            </div>
            {taxValue > 0 && (
              <div className="flex justify-between text-xs font-bold text-[var(--text-muted)] uppercase tracking-wide">
                <span>Tax</span>
                <span>{currencySymbol} {formatCurrency(taxValue)}</span>
              </div>
            )}

            <div className="pt-4 border-t border-[var(--border-soft)] flex justify-between items-baseline">
              <span className="text-sm font-black uppercase tracking-wide text-[var(--text-muted)]">Total</span>
              <span className="text-2xl font-black text-[var(--text-main)] tracking-tight">{currencySymbol} {formatCurrency(grandTotal)}</span>
            </div>

            {isEditMode && (
              <div className="pt-4 border-t border-[var(--border-soft)] space-y-2">
                <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase">Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  disabled={isConverted}
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-lg p-2.5 text-sm outline-none focus:border-brand-primary font-bold text-[var(--text-main)] cursor-pointer disabled:opacity-50"
                >
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                  <option value="expired">Expired</option>
                  {isConverted && <option value="converted">Converted</option>}
                </select>
                {!isConverted && (
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
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
