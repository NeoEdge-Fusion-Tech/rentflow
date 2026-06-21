import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { ClientService } from '../api';

interface ClientPickerProps {
  clients: any[];
  value: number | string | null;
  onChange: (clientId: number) => void;
  onClientCreated?: (client: any) => void;
}

export function ClientPicker({ clients, value, onChange, onClientCreated }: ClientPickerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    first_name: '', last_name: '', email: '', phone_number: '', company_name: ''
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      setIsSaving(true);
      const res = await ClientService.create(formData);
      onClientCreated?.(res.data);
      onChange(res.data.client_id);
      setIsModalOpen(false);
      setFormData({ first_name: '', last_name: '', email: '', phone_number: '', company_name: '' });
    } catch (err: any) {
      setError(err.response?.data?.email?.[0] || 'Failed to create client.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <select
          value={value ?? ''}
          onChange={e => onChange(parseInt(e.target.value))}
          className="flex-1 h-12 px-4 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-2xl outline-none focus:ring-4 focus:ring-brand-primary/5 focus:border-brand-primary text-sm font-medium text-[var(--text-main)] transition-all"
        >
          <option value="">Choose a client...</option>
          {clients.map(c => (
            <option key={c.client_id} value={String(c.client_id)}>
              {c.first_name} {c.last_name} {c.company_name ? `(${c.company_name})` : ''}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="h-12 px-4 flex items-center gap-1.5 bg-brand-primary/10 text-brand-primary border border-brand-primary/20 rounded-2xl font-bold text-sm hover:bg-brand-primary/20 transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> New
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[var(--bg-app)]/80 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-surface)] rounded-3xl w-full max-w-lg overflow-hidden border border-[var(--border-soft)] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-soft)] bg-[var(--bg-app)]/50">
              <h2 className="text-lg font-bold text-[var(--text-main)]">Add New Client</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-app)] rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-6">
              {error && (
                <div className="px-4 py-3 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-xl text-sm font-medium">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[var(--text-muted)]">First Name <span className="text-rose-500">*</span></label>
                  <input
                    required
                    type="text"
                    value={formData.first_name}
                    onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:bg-[var(--bg-surface)] focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[var(--text-muted)]">Last Name <span className="text-rose-500">*</span></label>
                  <input
                    required
                    type="text"
                    value={formData.last_name}
                    onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:bg-[var(--bg-surface)] focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-[var(--text-muted)]">Email Address <span className="text-rose-500">*</span></label>
                <input
                  required
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:bg-[var(--bg-surface)] focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[var(--text-muted)]">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone_number}
                    onChange={e => setFormData({ ...formData, phone_number: e.target.value })}
                    className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:bg-[var(--bg-surface)] focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[var(--text-muted)]">Company</label>
                  <input
                    type="text"
                    value={formData.company_name}
                    onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                    className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:bg-[var(--bg-surface)] focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-3 font-bold text-[var(--text-muted)] bg-[var(--bg-app)] hover:bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 px-6 py-3 font-bold text-brand-accent bg-brand-primary hover:opacity-90 rounded-xl transition-all shadow-lg shadow-brand-primary/20 whitespace-nowrap disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
