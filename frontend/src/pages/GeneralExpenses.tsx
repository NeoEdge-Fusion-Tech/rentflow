import React, { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Edit2, ChevronLeft, ChevronRight } from 'lucide-react';
import { GeneralExpenseService } from '@/src/api';
import { useNotification } from '../context/NotificationContext';
import { cn } from '@/src/utils';

export function GeneralExpenses() {
  const { showNotification, showConfirm } = useNotification();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 20;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    expense_type: 'item',
    vendor: '' as number | string,
    name: '',
    amount: 0,
    description: '',
    date: '',
  });

  const defaultCurrencySymbol = localStorage.getItem('currencySymbol') || '$';

  const fetchExpenses = async (page = 1) => {
    try {
      setIsLoading(true);
      const params: any = { page };
      if (searchQuery) params.search = searchQuery;
      const res = await GeneralExpenseService.getAll(params);
      setExpenses(res.data.results || res.data);
      setTotalCount(res.data.count || (res.data.results || res.data).length);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses(currentPage);
  }, [currentPage, searchQuery]);

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ expense_type: 'item', vendor: '', name: '', amount: 0, description: '', date: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (expense: any) => {
    setEditingId(expense.general_expense_id);
    setFormData({
      expense_type: expense.expense_type,
      vendor: expense.vendor || '',
      name: expense.name,
      amount: parseFloat(expense.amount),
      description: expense.description || '',
      date: expense.date || '',
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    showConfirm({
      title: 'Delete Expense',
      message: 'Are you sure you want to delete this general expense?',
      type: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await GeneralExpenseService.delete(id);
          showNotification('Expense deleted', 'success');
          fetchExpenses(currentPage);
        } catch (err) {
          console.error(err);
          showNotification('Failed to delete expense', 'error');
        }
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    try {
      setIsSaving(true);
      const payload = {
        ...formData,
        vendor: formData.expense_type === 'vendor' ? parseInt(String(formData.vendor)) : null,
        date: formData.date || null,
      };
      
      if (editingId) {
        await GeneralExpenseService.update(editingId, payload);
        showNotification('Expense updated', 'success');
      } else {
        await GeneralExpenseService.create(payload);
        showNotification('Expense created', 'success');
      }
      setIsModalOpen(false);
      fetchExpenses(currentPage);
    } catch (err) {
      console.error(err);
      showNotification('Failed to save expense', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return (num || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)]">General Expenses</h1>
          <p className="text-[var(--text-muted)]">Track organization-wide expenses not linked to specific projects.</p>
        </div>
        <button onClick={openAddModal} className="flex items-center justify-center gap-2 bg-brand-primary text-brand-accent px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-colors shadow-sm shadow-brand-primary/20">
          <Plus className="w-5 h-5" />
          Add Expense
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          placeholder="Search expenses..."
          className="w-full pl-10 pr-4 py-3 bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all shadow-sm"
        />
      </div>

      <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-soft)] overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-[var(--text-muted)]">Loading expenses...</div>
        ) : expenses.length === 0 ? (
          <div className="p-12 text-center text-[var(--text-muted)]">No expenses found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[var(--text-muted)] text-xs uppercase tracking-wider border-b border-[var(--border-soft)]">
                  <th className="py-3 px-4 font-bold">Name</th>
                  <th className="py-3 px-4 font-bold">Type</th>
                  <th className="py-3 px-4 font-bold">Date</th>
                  <th className="py-3 px-4 font-bold text-right">Amount</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {expenses.map((exp: any) => (
                  <tr key={exp.general_expense_id} className="hover:bg-[var(--bg-app)] transition-colors">
                    <td className="py-3 px-4 font-bold text-[var(--text-main)]">
                      {exp.expense_type === 'vendor' ? exp.vendor_name : exp.name}
                      {exp.description && <p className="text-xs text-[var(--text-muted)] mt-0.5 font-normal line-clamp-1">{exp.description}</p>}
                    </td>
                    <td className="py-3 px-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                        exp.expense_type === 'vendor' ? "bg-blue-500/10 text-blue-500" : "bg-[var(--bg-app)] text-[var(--text-muted)]"
                      )}>
                        {exp.expense_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[var(--text-muted)]">{exp.date ? new Date(exp.date).toLocaleDateString() : '—'}</td>
                    <td className="py-3 px-4 text-right font-bold text-[var(--text-main)]">{defaultCurrencySymbol}{formatCurrency(exp.amount)}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEditModal(exp)} className="p-1.5 text-[var(--text-muted)] hover:text-brand-primary transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(exp.general_expense_id)} className="p-1.5 text-[var(--text-muted)] hover:text-rose-500 transition-colors">
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

      {!isLoading && totalCount > itemsPerPage && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-[var(--text-muted)]">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} results
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="p-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-lg text-[var(--text-main)] hover:bg-[var(--bg-app)] disabled:opacity-50" disabled={currentPage === 1}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalCount / itemsPerPage), p + 1))} className="p-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-lg text-[var(--text-main)] hover:bg-[var(--bg-app)] disabled:opacity-50" disabled={currentPage === Math.ceil(totalCount / itemsPerPage)}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-app)]/80 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-surface)] rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden border border-[var(--border-soft)] shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-soft)] bg-[var(--bg-app)]/50 shrink-0">
              <h2 className="text-lg font-bold text-[var(--text-main)]">{editingId ? 'Edit Expense' : 'Add Expense'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-app)] rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setFormData({ ...formData, expense_type: 'item' })} className={cn("py-2.5 rounded-xl border font-bold text-sm transition-colors", formData.expense_type === 'item' ? "bg-brand-primary text-white border-brand-primary" : "bg-[var(--bg-app)] text-[var(--text-muted)] border-[var(--border-soft)]")}>
                  Item
                </button>
                <button type="button" onClick={() => setFormData({ ...formData, expense_type: 'vendor' })} className={cn("py-2.5 rounded-xl border font-bold text-sm transition-colors", formData.expense_type === 'vendor' ? "bg-brand-primary text-white border-brand-primary" : "bg-[var(--bg-app)] text-[var(--text-muted)] border-[var(--border-soft)]")}>
                  Vendor
                </button>
              </div>

              {formData.expense_type === 'vendor' ? (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[var(--text-muted)]">Vendor ID <span className="text-rose-500">*</span></label>
                  <input required type="number" value={formData.vendor} onChange={e => setFormData({ ...formData, vendor: e.target.value })} className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:border-brand-primary transition-all" />
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[var(--text-muted)]">Item Name <span className="text-rose-500">*</span></label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:border-brand-primary transition-all" />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-bold text-[var(--text-muted)]">Amount <span className="text-rose-500">*</span></label>
                <input required type="number" step="0.01" value={formData.amount || ''} onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:border-brand-primary transition-all" />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-bold text-[var(--text-muted)]">Date (Optional)</label>
                <input type="date" value={formData.date || ''} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:border-brand-primary transition-all" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-[var(--text-muted)]">Description</label>
                <textarea rows={2} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:border-brand-primary transition-all resize-none" />
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 font-bold text-[var(--text-muted)] bg-[var(--bg-app)] hover:bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-xl transition-colors">Cancel</button>
                <button type="submit" disabled={isSaving} className="px-6 py-2.5 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {isSaving ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
