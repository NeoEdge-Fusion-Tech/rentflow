import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Search,
  Plus,
  Calendar,
  TrendingUp,
  TrendingDown,
  X,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight
} from 'lucide-react';
import { cn } from '@/src/utils';
import { useNotification } from '../context/NotificationContext';
import { EventService, InvoiceService } from '@/src/api';

export function Events() {
  const navigate = useNavigate();
  const { showNotification, showConfirm } = useNotification();
  const [events, setEvents] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;
  const defaultCurrencySymbol = localStorage.getItem('currencySymbol') || '$';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'planned',
    start_date: '',
    end_date: '',
    invoice: '' as number | string,
  });

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const response = await EventService.getAll();
      setEvents(response.data.results || response.data);
    } catch (e) {
      console.error("Failed to fetch events", e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchInvoices = async () => {
    try {
      const response = await InvoiceService.getAll();
      setInvoices(response.data.results || response.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchEvents();
    fetchInvoices();
  }, []);

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return (num || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const openAddModal = () => {
    setFormData({ name: '', description: '', status: 'planned', start_date: '', end_date: '', invoice: '' });
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    showConfirm({
      title: 'Delete Project',
      message: 'Are you sure you want to delete this project? Its expenses and task checklist will also be removed.',
      type: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await EventService.delete(id);
          showNotification("Project deleted successfully", 'success');
          fetchEvents();
        } catch (e) {
          console.error("Failed to delete project", e);
          showNotification("Failed to delete project", 'error');
        }
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        invoice: formData.invoice ? parseInt(String(formData.invoice)) : null,
      };
      const res = await EventService.create(payload);
      setIsModalOpen(false);
      showNotification("Project created!", 'success');
      navigate(`/events/${res.data.event_id}`);
    } catch (error) {
      console.error("Failed to save project", error);
      showNotification("Failed to save project", 'error');
    }
  };

  const filteredEvents = events.filter(ev => ev.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const displayedEvents = filteredEvents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)]">Projects</h1>
          <p className="text-[var(--text-muted)]">Track profit & loss and task checklists for each event or project.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 bg-brand-primary text-brand-accent px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-colors shadow-sm shadow-brand-primary/20"
        >
          <Plus className="w-5 h-5" />
          New Project
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          placeholder="Search projects..."
          className="w-full pl-10 pr-4 py-3 bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all shadow-sm"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {displayedEvents.map((ev) => {
            const profit = parseFloat(ev.profit) || 0;
            return (
              <div key={ev.event_id} onClick={() => navigate(`/events/${ev.event_id}`)} className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-soft)] p-6 hover:shadow-xl hover:border-brand-primary/10 transition-all group cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-brand-primary/10 rounded-xl text-brand-primary"><Briefcase size={20}/></div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      ev.status === 'ongoing' ? "bg-blue-500/10 text-blue-500" :
                      ev.status === 'completed' ? "bg-emerald-500/10 text-emerald-500" :
                      ev.status === 'cancelled' ? "bg-rose-500/10 text-rose-500" :
                      "bg-[var(--bg-app)] text-[var(--text-muted)]"
                    )}>
                      {ev.status}
                    </span>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(ev.event_id); }} className="p-1 text-[var(--text-muted)] hover:text-rose-500" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-[var(--text-main)] mb-1">{ev.name}</h3>
                {(ev.start_date || ev.end_date) && (
                  <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-4">
                    <Calendar className="w-3.5 h-3.5" />
                    {ev.start_date ? new Date(ev.start_date).toLocaleDateString() : '—'} - {ev.end_date ? new Date(ev.end_date).toLocaleDateString() : '—'}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-[var(--border-subtle)] text-center">
                  <div>
                    <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Revenue</p>
                    <p className="text-sm font-bold text-[var(--text-main)]">{defaultCurrencySymbol}{formatCurrency(ev.revenue)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-0.5">Expenses</p>
                    <p className="text-sm font-bold text-[var(--text-main)]">{defaultCurrencySymbol}{formatCurrency(ev.total_expenses)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider mb-0.5">{profit >= 0 ? 'Profit' : 'Loss'}</p>
                    <p className={cn("text-sm font-bold flex items-center justify-center gap-1", profit >= 0 ? "text-emerald-500" : "text-rose-500")}>
                      {profit >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {defaultCurrencySymbol}{formatCurrency(Math.abs(profit))}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end mt-4">
                  <span className="flex items-center gap-1 text-xs font-bold text-brand-primary">
                    Open Project <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
          {filteredEvents.length === 0 && (
            <div className="col-span-full text-center py-12 text-[var(--text-muted)] bg-[var(--bg-app)] rounded-2xl border border-dashed border-[var(--border-soft)]">
              No projects found.
            </div>
          )}
        </div>
      )}

      {!isLoading && filteredEvents.length > itemsPerPage && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-[var(--text-muted)]">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredEvents.length)} of {filteredEvents.length} results
          </p>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="p-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-lg text-[var(--text-main)] hover:bg-[var(--bg-app)] disabled:opacity-50" disabled={currentPage === 1}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredEvents.length / itemsPerPage), p + 1))} className="p-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-lg text-[var(--text-main)] hover:bg-[var(--bg-app)] disabled:opacity-50" disabled={currentPage === Math.ceil(filteredEvents.length / itemsPerPage)}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-app)]/80 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-surface)] rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-[var(--border-soft)] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-soft)] bg-[var(--bg-app)]/50 shrink-0">
              <h2 className="text-lg font-bold text-[var(--text-main)]">New Project</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-app)] rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div className="space-y-2">
                <label className="text-sm font-bold text-[var(--text-muted)]">Project / Event Name <span className="text-rose-500">*</span></label>
                <input
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Adebayo Wedding — Sept 2026"
                  className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:bg-[var(--bg-surface)] focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-[var(--text-muted)]">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:bg-[var(--bg-surface)] focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[var(--text-muted)]">Start Date</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={e => setFormData({...formData, start_date: e.target.value})}
                    className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:bg-[var(--bg-surface)] focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[var(--text-muted)]">End Date</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={e => setFormData({...formData, end_date: e.target.value})}
                    className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:bg-[var(--bg-surface)] focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-[var(--text-muted)]">Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value})}
                  className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:bg-[var(--bg-surface)] focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all"
                >
                  <option value="planned">Planned</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-[var(--text-muted)]">Revenue Invoice (optional)</label>
                <select
                  value={formData.invoice}
                  onChange={e => setFormData({...formData, invoice: e.target.value})}
                  className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:bg-[var(--bg-surface)] focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all"
                >
                  <option value="">No invoice linked</option>
                  {invoices.map((inv: any) => (
                    <option key={inv.invoice_id} value={inv.invoice_id}>{inv.invoice_number} — {inv.client_name || 'No client'}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-3 font-bold text-[var(--text-muted)] bg-[var(--bg-app)] hover:bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-xl transition-colors">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2.5 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-secondary transition-colors">
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
