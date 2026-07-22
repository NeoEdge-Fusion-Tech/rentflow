import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Edit2,
  X,
  ListChecks,
  ArrowUpRight,
  Building2,
  Mail,
  Phone,
  User
} from 'lucide-react';
import { cn } from '@/src/utils';
import { useNotification } from '../context/NotificationContext';
import { EventService, ExpenseService, VendorService, InvoiceService } from '../api';

export function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showNotification, showConfirm } = useNotification();

  const [event, setEvent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const defaultCurrencySymbol = localStorage.getItem('currencySymbol') || '$';

  // Edit event modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);

  // Expenses
  const [expenses, setExpenses] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isExpenseSaving, setIsExpenseSaving] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [expenseForm, setExpenseForm] = useState({
    expense_type: 'item',
    vendor: '' as number | string,
    name: '',
    amount: 0,
    description: '',
  });

  const fetchEvent = async () => {
    if (!id) return;
    try {
      const res = await EventService.get(id);
      setEvent(res.data);
      setEditForm({
        name: res.data.name || '',
        description: res.data.description || '',
        status: res.data.status || 'planned',
        start_date: res.data.start_date || '',
        end_date: res.data.end_date || '',
        invoice: res.data.invoice || '',
      });
    } catch (e) {
      console.error("Failed to fetch event", e);
    }
  };

  const fetchExpenses = async () => {
    if (!id) return;
    try {
      const res = await ExpenseService.getAll({ event: id });
      setExpenses(res.data.results || res.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await Promise.all([
        fetchEvent(),
        fetchExpenses(),
        VendorService.getAll().then(res => setVendors(res.data.results || res.data)).catch(console.error),
        InvoiceService.getAll().then(res => setInvoices(res.data.results || res.data)).catch(console.error),
      ]);
      setIsLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return (num || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // --- Event edit ---
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || isEditSaving) return;
    try {
      setIsEditSaving(true);
      await EventService.patch(id, {
        ...editForm,
        start_date: editForm.start_date || null,
        end_date: editForm.end_date || null,
        invoice: editForm.invoice ? parseInt(String(editForm.invoice)) : null,
      });
      setIsEditOpen(false);
      showNotification("Project updated!", 'success');
      fetchEvent();
    } catch (err) {
      console.error("Failed to update project", err);
      showNotification("Failed to update project", 'error');
    } finally {
      setIsEditSaving(false);
    }
  };

  // --- Expenses ---
  const openAddExpense = () => {
    setEditingExpense(null);
    setExpenseForm({ expense_type: 'item', vendor: '', name: '', amount: 0, description: '' });
    setIsAddExpenseOpen(true);
  };

  const openEditExpense = (expense: any) => {
    setEditingExpense(expense);
    setExpenseForm({
      expense_type: expense.expense_type,
      vendor: expense.vendor || '',
      name: expense.expense_type === 'item' ? expense.name : '',
      amount: parseFloat(expense.amount) || 0,
      description: expense.description || '',
    });
    setIsAddExpenseOpen(true);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || isExpenseSaving) return;
    try {
      setIsExpenseSaving(true);
      const payload = {
        event: parseInt(id),
        expense_type: expenseForm.expense_type,
        vendor: expenseForm.expense_type === 'vendor' ? parseInt(String(expenseForm.vendor)) : null,
        name: expenseForm.expense_type === 'item' ? expenseForm.name : undefined,
        amount: expenseForm.amount,
        description: expenseForm.description,
      };
      if (editingExpense) {
        await ExpenseService.update(editingExpense.expense_id, payload);
      } else {
        await ExpenseService.create(payload);
      }
      setIsAddExpenseOpen(false);
      setEditingExpense(null);
      showNotification(editingExpense ? "Expense updated!" : "Expense added!", 'success');
      fetchExpenses();
      fetchEvent();
    } catch (err: any) {
      console.error("Failed to save expense", err);
      showNotification(err.response?.data?.vendor?.[0] || err.response?.data?.name?.[0] || "Failed to save expense", 'error');
    } finally {
      setIsExpenseSaving(false);
    }
  };

  const handleDeleteExpense = (expenseId: number) => {
    showConfirm({
      title: 'Delete Expense',
      message: 'Remove this expense from the project?',
      type: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await ExpenseService.delete(expenseId);
          showNotification("Expense removed", 'success');
          fetchExpenses();
          fetchEvent();
        } catch (err) {
          console.error("Failed to delete expense", err);
          showNotification("Failed to delete expense", 'error');
        }
      }
    });
  };

  if (isLoading || !event) {
    return <div className="bg-[var(--bg-surface)] p-12 text-center text-[var(--text-muted)] rounded-2xl border border-[var(--border-soft)]">Loading project...</div>;
  }

  const profit = parseFloat(event.profit) || 0;
  const isProfit = profit >= 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/events')} className="p-2.5 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-xl text-[var(--text-main)] hover:bg-[var(--bg-app)] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-main)]">{event.name}</h1>
            <p className="text-[var(--text-muted)] text-sm capitalize">{event.status}{event.invoice_number ? ` · Linked to ${event.invoice_number}` : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => navigate(`/task-checklist?event=${id}`)} className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] font-bold rounded-xl hover:bg-[var(--bg-app)] transition-colors text-sm">
            <ListChecks className="w-4 h-4" /> Task Checklist <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setIsEditOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] font-bold rounded-xl hover:bg-[var(--bg-app)] transition-colors text-sm">
            <Edit2 className="w-4 h-4" /> Edit Project
          </button>
        </div>
      </div>

      {/* Client details (from the linked invoice) */}
      {event.client_details && (
        <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-soft)] p-5">
          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3">Client</p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[var(--text-muted)]" />
              <span className="font-bold text-[var(--text-main)]">{event.client_details.business_name}</span>
            </div>
            {event.client_details.contact_name && (
              <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <User className="w-4 h-4" />
                {event.client_details.contact_name}
              </div>
            )}
            {(event.client_details.email || event.client_details.contact_email) && (
              <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <Mail className="w-4 h-4" />
                {event.client_details.email || event.client_details.contact_email}
              </div>
            )}
            {(event.client_details.phone_number || event.client_details.contact_phone) && (
              <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <Phone className="w-4 h-4" />
                {event.client_details.phone_number || event.client_details.contact_phone}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-soft)] shadow-sm">
          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Revenue</p>
          <p className="text-xl font-black text-[var(--text-main)]">{defaultCurrencySymbol}{formatCurrency(event.revenue)}</p>
        </div>
        <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-soft)] shadow-sm">
          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Total Expenses</p>
          <p className="text-xl font-black text-[var(--text-main)]">{defaultCurrencySymbol}{formatCurrency(event.total_expenses)}</p>
        </div>
        <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-soft)] shadow-sm">
          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">{isProfit ? 'Profit' : 'Loss'}</p>
          <p className={cn("text-xl font-black flex items-center gap-1.5", isProfit ? "text-emerald-500" : "text-rose-500")}>
            {isProfit ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {defaultCurrencySymbol}{formatCurrency(Math.abs(profit))}
          </p>
        </div>
      </div>

      {/* Profit & Loss */}
      <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-soft)] p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[var(--text-main)] text-sm uppercase tracking-wider">Expenses</h3>
          <button onClick={openAddExpense} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-white rounded-xl hover:opacity-90 transition-opacity shadow-sm bg-brand-primary">
            <Plus className="w-3 h-3" /> Add Expense
          </button>
        </div>

        {expenses.length === 0 ? (
          <div className="text-center py-10 text-[var(--text-muted)] bg-[var(--bg-app)] rounded-xl border border-dashed border-[var(--border-soft)]">
            No expenses logged yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[var(--text-muted)] text-xs uppercase tracking-wider border-b border-[var(--border-soft)]">
                  <th className="py-2 pr-4 font-bold">Expense</th>
                  <th className="py-2 pr-4 font-bold">Type</th>
                  <th className="py-2 pr-4 font-bold">Description</th>
                  <th className="py-2 pr-4 font-bold text-right">Amount</th>
                  <th className="py-2 pr-0 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {expenses.map((exp: any) => (
                  <tr key={exp.expense_id}>
                    <td className="py-3 pr-4 font-bold text-[var(--text-main)]">{exp.name}</td>
                    <td className="py-3 pr-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                        exp.expense_type === 'vendor' ? "bg-blue-500/10 text-blue-500" : "bg-[var(--bg-app)] text-[var(--text-muted)]"
                      )}>
                        {exp.expense_type}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-[var(--text-muted)] max-w-xs truncate">{exp.description || '—'}</td>
                    <td className="py-3 pr-4 text-right font-bold text-[var(--text-main)]">{defaultCurrencySymbol}{formatCurrency(exp.amount)}</td>
                    <td className="py-3 pr-0 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEditExpense(exp)} className="p-1.5 text-[var(--text-muted)] hover:text-brand-primary transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteExpense(exp.expense_id)} className="p-1.5 text-[var(--text-muted)] hover:text-rose-500 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Project Modal */}
      {isEditOpen && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-app)]/80 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-surface)] rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-[var(--border-soft)] shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-soft)] bg-[var(--bg-app)]/50 shrink-0">
              <h2 className="text-lg font-bold text-[var(--text-main)]">Edit Project</h2>
              <button onClick={() => setIsEditOpen(false)} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-app)] rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div className="space-y-2">
                <label className="text-sm font-bold text-[var(--text-muted)]">Project / Event Name</label>
                <input required type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:border-brand-primary transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-[var(--text-muted)]">Description</label>
                <textarea rows={2} value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:border-brand-primary transition-all resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[var(--text-muted)]">Start Date</label>
                  <input type="date" value={editForm.start_date} onChange={e => setEditForm({ ...editForm, start_date: e.target.value })} className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:border-brand-primary transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[var(--text-muted)]">End Date</label>
                  <input type="date" value={editForm.end_date} onChange={e => setEditForm({ ...editForm, end_date: e.target.value })} className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:border-brand-primary transition-all" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-[var(--text-muted)]">Status</label>
                <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })} className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:border-brand-primary transition-all">
                  <option value="planned">Planned</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-[var(--text-muted)]">Revenue Invoice</label>
                <select value={editForm.invoice} onChange={e => setEditForm({ ...editForm, invoice: e.target.value })} className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:border-brand-primary transition-all">
                  <option value="">No invoice linked</option>
                  {invoices.map((inv: any) => (
                    <option key={inv.invoice_id} value={inv.invoice_id}>{inv.invoice_number} — {inv.client_name || 'No client'}</option>
                  ))}
                </select>
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsEditOpen(false)} className="flex-1 px-6 py-3 font-bold text-[var(--text-muted)] bg-[var(--bg-app)] hover:bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={isEditSaving} className="px-6 py-2.5 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{isEditSaving ? 'Saving...' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {isAddExpenseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-app)]/80 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-surface)] rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden border border-[var(--border-soft)] shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-soft)] bg-[var(--bg-app)]/50 shrink-0">
              <h2 className="text-lg font-bold text-[var(--text-main)]">{editingExpense ? 'Edit Expense' : 'Add Expense'}</h2>
              <button onClick={() => { setIsAddExpenseOpen(false); setEditingExpense(null); }} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-app)] rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddExpense} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setExpenseForm({ ...expenseForm, expense_type: 'item' })} className={cn("py-2.5 rounded-xl border font-bold text-sm transition-colors", expenseForm.expense_type === 'item' ? "bg-brand-primary text-white border-brand-primary" : "bg-[var(--bg-app)] text-[var(--text-muted)] border-[var(--border-soft)]")}>
                  Item
                </button>
                <button type="button" onClick={() => setExpenseForm({ ...expenseForm, expense_type: 'vendor' })} className={cn("py-2.5 rounded-xl border font-bold text-sm transition-colors", expenseForm.expense_type === 'vendor' ? "bg-brand-primary text-white border-brand-primary" : "bg-[var(--bg-app)] text-[var(--text-muted)] border-[var(--border-soft)]")}>
                  Vendor
                </button>
              </div>

              {expenseForm.expense_type === 'vendor' ? (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[var(--text-muted)]">Vendor <span className="text-rose-500">*</span></label>
                  <select required value={expenseForm.vendor} onChange={e => setExpenseForm({ ...expenseForm, vendor: e.target.value })} className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:border-brand-primary transition-all">
                    <option value="">Select a vendor...</option>
                    {vendors.map((v: any) => (
                      <option key={v.vendor_id} value={v.vendor_id}>{v.business_name} — {v.service}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[var(--text-muted)]">Item Name <span className="text-rose-500">*</span></label>
                  <input required type="text" value={expenseForm.name} onChange={e => setExpenseForm({ ...expenseForm, name: e.target.value })} placeholder="e.g. Chairs & Tables Rental" className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:border-brand-primary transition-all" />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-bold text-[var(--text-muted)]">Amount <span className="text-rose-500">*</span></label>
                <input required type="number" step="0.01" value={expenseForm.amount || ''} onChange={e => setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:border-brand-primary transition-all" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-[var(--text-muted)]">Description</label>
                <textarea rows={2} value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:border-brand-primary transition-all resize-none" />
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => { setIsAddExpenseOpen(false); setEditingExpense(null); }} className="flex-1 px-6 py-3 font-bold text-[var(--text-muted)] bg-[var(--bg-app)] hover:bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={isExpenseSaving} className="px-6 py-2.5 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {isExpenseSaving ? 'Saving...' : (editingExpense ? 'Save Changes' : 'Add Expense')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
