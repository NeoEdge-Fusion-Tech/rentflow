import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Share2, Printer, Edit2, ChevronDown, Link, Copy, Check, ExternalLink } from 'lucide-react';
import { InvoiceService, AuthService, OrganizationService } from '../api';
import { useNotification } from '../context/NotificationContext';

export function InvoicePreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  
  const [invoice, setInvoice] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        if (!id) return;
        const invRes = await InvoiceService.get(id);
        setInvoice(invRes.data);
        const meRes = await AuthService.getMe();
        if (meRes.data.organization_id) {
          const orgRes = await OrganizationService.get(meRes.data.organization_id);
          setOrg(orgRes.data);
        }
      } catch (err) {
        console.error("Failed to load preview", err);
        showNotification("Failed to load invoice preview.", 'error');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id, showNotification]);

  const handleDownload = async () => {
    if (!id) return;
    try {
      const response = await InvoiceService.download(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice_${invoice?.invoice_number || id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Failed to download invoice", err);
      showNotification("Failed to download invoice", 'error');
    }
  };

  const handleGeneratePaymentLink = async () => {
    if (!id) return;
    setIsGeneratingLink(true);
    try {
      const res = await InvoiceService.generatePaymentLink(id);
      setPaymentLink(res.data.payment_url);
      setShowMobileMenu(false);
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Failed to generate payment link';
      showNotification(msg, 'error');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleCopyLink = () => {
    if (!paymentLink) return;
    navigator.clipboard.writeText(paymentLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return (num || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (isLoading) {
    return <div className="bg-[var(--bg-surface)] p-12 text-center text-[var(--text-muted)] rounded-2xl border border-[var(--border-soft)]">Loading invoice preview...</div>;
  }

  if (!invoice) {
    return <div className="bg-[var(--bg-surface)] p-12 text-center text-[var(--text-muted)] rounded-2xl border border-[var(--border-soft)]">Invoice not found.</div>;
  }

  const primaryColor = org?.primary_color || '#7c3aed';
  const currencySymbol = invoice.currency_symbol || org?.currency?.symbol || '$';

  return (
    <>
    <div className="max-w-5xl mx-auto space-y-4 pb-20">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border-soft)] pb-4">
        <button
          onClick={() => navigate('/invoices')}
          className="flex items-center gap-2 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Back to Invoices</span>
          <span className="sm:hidden">Back</span>
        </button>

        {/* Desktop actions */}
        <div className="hidden sm:flex items-center gap-2 flex-wrap justify-end">
          <button onClick={() => navigate(`/invoices/${invoice.invoice_id}/edit`)} className="px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] font-bold rounded-lg hover:bg-[var(--bg-app)] transition-colors text-sm flex items-center gap-1.5">
            <Edit2 className="w-4 h-4" /> Edit
          </button>
          <button onClick={() => navigate(`/invoices/new?duplicate_from=${invoice.invoice_id}`)} className="px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] font-bold rounded-lg hover:bg-[var(--bg-app)] transition-colors text-sm flex items-center gap-1.5">
            <Copy className="w-4 h-4" /> Duplicate
          </button>
          <button onClick={() => window.print()} className="px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] font-bold rounded-lg hover:bg-[var(--bg-app)] transition-colors text-sm flex items-center gap-1.5">
            <Printer className="w-4 h-4" /> Print
          </button>
          <button onClick={handleDownload} className="px-3 py-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] font-bold rounded-lg hover:bg-[var(--bg-app)] transition-colors text-sm flex items-center gap-1.5">
            <Download className="w-4 h-4" /> Download
          </button>
          {invoice.status !== 'paid' && (
            <button
              onClick={handleGeneratePaymentLink}
              disabled={isGeneratingLink}
              className="px-3 py-2 bg-brand-primary text-brand-accent font-bold rounded-lg hover:opacity-90 transition-all text-sm flex items-center gap-1.5 shadow-md shadow-brand-primary/20 disabled:opacity-60"
            >
              <Link className="w-4 h-4" />
              {isGeneratingLink ? 'Generating...' : 'Get Payment Link'}
            </button>
          )}
        </div>

        {/* Mobile actions */}
        <div className="flex sm:hidden items-center gap-2">
          <button onClick={handleDownload} className="p-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-lg" title="Download">
            <Download className="w-4 h-4" />
          </button>
          <button onClick={() => navigate(`/invoices/${invoice.invoice_id}/edit`)} className="p-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-lg" title="Edit">
            <Edit2 className="w-4 h-4" />
          </button>
          {invoice.status !== 'paid' && (
            <button
              onClick={handleGeneratePaymentLink}
              disabled={isGeneratingLink}
              className="p-2 bg-brand-primary text-brand-accent rounded-lg disabled:opacity-60"
              title="Get Payment Link"
            >
              <Link className="w-4 h-4" />
            </button>
          )}
          <div className="relative">
            <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="p-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-lg flex items-center gap-1">
              <span className="text-xs font-bold">More</span><ChevronDown className="w-3 h-3" />
            </button>
            {showMobileMenu && (
              <div className="absolute right-0 top-10 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-xl shadow-xl z-50 w-40 py-1">
                <button onClick={() => navigate(`/invoices/new?duplicate_from=${invoice.invoice_id}`)} className="w-full text-left px-4 py-2.5 text-sm text-[var(--text-main)] hover:bg-[var(--bg-app)] flex items-center gap-2">
                  <Copy className="w-4 h-4" /> Duplicate
                </button>
                <button onClick={() => { window.print(); setShowMobileMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm text-[var(--text-main)] hover:bg-[var(--bg-app)] flex items-center gap-2">
                  <Printer className="w-4 h-4" /> Print
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invoice Document */}
      <div className="bg-white text-gray-900 rounded-lg shadow-sm border border-gray-200 overflow-hidden print:shadow-none print:border-none">
        <div className="p-4 sm:p-8 lg:p-10">

          {/* Header: logo top-right, text below on mobile */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-start gap-4 mb-8">
            <div>
              <h1 className="text-xl sm:text-3xl font-bold mb-3" style={{ color: primaryColor }}>
                {invoice.title || `${org?.name || 'Your Company'} Invoice`}
              </h1>
              <div className="grid grid-cols-[90px_1fr] sm:grid-cols-[110px_1fr] gap-y-1 text-sm font-medium">
                <span className="text-gray-500">Invoice No #</span>
                <span className="text-gray-900 font-bold">{invoice.invoice_number}</span>
                <span className="text-gray-500">Invoice Date</span>
                <span className="text-gray-900">{new Date(invoice.issue_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                {invoice.due_date && (
                  <>
                    <span className="text-gray-500">Due Date</span>
                    <span className="text-gray-900">{new Date(invoice.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </>
                )}
                <span className="text-gray-500">Status</span>
                <span className={`capitalize font-bold text-xs mt-0.5 ${invoice.status === 'paid' ? 'text-emerald-600' : invoice.status === 'issued' ? 'text-blue-600' : 'text-gray-500'}`}>{invoice.status}</span>
              </div>
            </div>
            {org?.company_logo && (
              <div className="w-14 h-14 sm:w-24 sm:h-24 flex items-center justify-center overflow-hidden bg-gray-50 rounded-lg border border-gray-100 shrink-0">
                <img src={org.company_logo.startsWith('http') ? org.company_logo : `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${org.company_logo.startsWith('/') ? '' : '/'}${org.company_logo}`} alt="Company logo" className="max-w-full max-h-full object-contain" />
              </div>
            )}
          </div>

          {/* Billing Info — 1 col mobile, 2 col tablet+ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
            <div className="p-4 rounded-lg" style={{ backgroundColor: `${primaryColor}12` }}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Billed By</h3>
              <p className="font-bold text-gray-900">{org?.name}</p>
              {org?.address && <p className="text-sm text-gray-700 whitespace-pre-wrap mt-0.5">{org.address}</p>}
              {org?.phone_number && <p className="text-sm text-gray-700">{org.phone_number}</p>}
              {org?.email && <p className="text-sm text-gray-700">{org.email}</p>}
            </div>
            <div className="p-4 rounded-lg" style={{ backgroundColor: `${primaryColor}12` }}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Billed To</h3>
              <p className="font-bold text-gray-900">{invoice.client_name}</p>
            </div>
          </div>

          {/* Line Items — full table on sm+, cards on mobile */}
          <div className="mb-8">
            {/* Desktop table */}
            <div className="hidden sm:block overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="text-white" style={{ backgroundColor: primaryColor }}>
                    <th className="py-3 px-4 font-bold w-[40%]">Item</th>
                    <th className="py-3 px-4 font-bold text-center">Qty</th>
                    <th className="py-3 px-4 font-bold text-right">Rate</th>
                    <th className="py-3 px-4 font-bold text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200" style={{ backgroundColor: `${primaryColor}05` }}>
                  {invoice.line_items?.map((item: any, idx: number) => (
                    <tr key={item.line_item_id || idx}>
                      <td className="py-4 px-4 align-top">
                        <p className="font-bold text-gray-900">{idx + 1}. {item.name}</p>
                        {item.description && <p className="text-gray-500 mt-1 text-xs pl-4 whitespace-pre-wrap">{item.description}</p>}
                      </td>
                      <td className="py-4 px-4 align-top text-center text-gray-800">{parseFloat(item.quantity)}</td>
                      <td className="py-4 px-4 align-top text-right text-gray-800">{currencySymbol}{formatCurrency(item.unit_price)}</td>
                      <td className="py-4 px-4 align-top text-right font-bold text-gray-900">{currencySymbol}{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="sm:hidden space-y-2">
              <div className="pb-2 border-b border-gray-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Items</h3>
              </div>
              {invoice.line_items?.map((item: any, idx: number) => (
                <div key={item.line_item_id || idx} className="p-3 rounded-lg border border-gray-200" style={{ backgroundColor: `${primaryColor}05` }}>
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <p className="font-bold text-gray-900 text-sm">{idx + 1}. {item.name}</p>
                    <p className="font-bold text-gray-900 text-sm shrink-0">{currencySymbol}{formatCurrency(item.total)}</p>
                  </div>
                  {item.description && <p className="text-gray-500 text-xs mb-2 pl-3 whitespace-pre-wrap">{item.description}</p>}
                  <div className="flex gap-4 text-xs text-gray-500 border-t border-gray-100 pt-2">
                    <span>Qty: <strong className="text-gray-700">{parseFloat(item.quantity)}</strong></span>
                    <span>Rate: <strong className="text-gray-700">{currencySymbol}{formatCurrency(item.unit_price)}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals + Notes */}
          <div className="flex flex-col sm:flex-row justify-between gap-6 mb-8">
            <div className="flex-1">
              {invoice.notes && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                  <h4 className="font-bold text-gray-900 mb-1">Notes</h4>
                  <p className="text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              )}
            </div>
            <div className="w-full sm:w-72">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>{currencySymbol}{formatCurrency(invoice.subtotal)}</span>
                </div>
                {parseFloat(invoice.discount_amount) > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Discount</span>
                    <span>-{currencySymbol}{formatCurrency(invoice.discount_amount)}</span>
                  </div>
                )}
                {parseFloat(invoice.tax_amount) > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Tax</span>
                    <span>{currencySymbol}{formatCurrency(invoice.tax_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-gray-900 border-t border-gray-300 pt-2.5 mt-1">
                  <span>Total ({currencySymbol})</span>
                  <span>{currencySymbol}{formatCurrency(invoice.total_amount)}</span>
                </div>
              </div>
            </div>
          </div>


        </div>
      </div>
    </div>

      {/* Payment Link Modal */}
      {paymentLink && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setPaymentLink(null)}>
          <div
            className="bg-[var(--bg-surface)] rounded-2xl shadow-2xl border border-[var(--border-soft)] w-full max-w-md p-6 space-y-5"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${org?.primary_color || '#7c3aed'}18` }}>
                <Link className="w-5 h-5" style={{ color: org?.primary_color || '#7c3aed' }} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[var(--text-main)]">Payment Link Ready</h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Share this link with <strong>{invoice.client_name}</strong> to collect payment via Paystack.
                </p>
              </div>
            </div>

            {/* Amount callout */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-[var(--border-soft)] bg-[var(--bg-app)]">
              <span className="text-sm text-[var(--text-muted)] font-medium">Amount Due</span>
              <span className="text-lg font-black text-[var(--text-main)]">
                {invoice.currency_symbol || '$'}{(parseFloat(invoice.total_amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Link input + copy */}
            <div className="flex gap-2">
              <div className="flex-1 px-3 py-2.5 text-xs font-mono bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl text-[var(--text-muted)] truncate select-all">
                {paymentLink}
              </div>
              <button
                onClick={handleCopyLink}
                className="px-3 py-2.5 rounded-xl border border-[var(--border-soft)] text-[var(--text-main)] hover:bg-[var(--bg-app)] transition-colors shrink-0 flex items-center gap-1.5 text-sm font-bold"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => window.open(paymentLink, '_blank')}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl border border-[var(--border-soft)] text-[var(--text-main)] hover:bg-[var(--bg-app)] transition-colors"
              >
                <ExternalLink className="w-4 h-4" /> Open Link
              </button>
              <button
                onClick={() => setPaymentLink(null)}
                className="flex-1 py-2.5 text-sm font-bold rounded-xl text-white transition-opacity hover:opacity-90"
                style={{ backgroundColor: org?.primary_color || '#7c3aed' }}
              >
                Done
              </button>
            </div>

            <p className="text-xs text-[var(--text-muted)] text-center">
              Once paid, this invoice will automatically be marked as <strong>Paid</strong>.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
