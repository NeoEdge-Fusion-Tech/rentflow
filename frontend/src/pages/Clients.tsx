import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Mail, 
  Phone, 
  MapPin, 
  MoreHorizontal,
  ExternalLink,
  ShieldCheck,
  X,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  History
} from 'lucide-react';
import { cn } from '@/src/utils';
import { useNotification } from '../context/NotificationContext';
import { ClientService } from '@/src/api';

export function Clients() {
  const { showNotification, showConfirm } = useNotification();
  const [clients, setClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    company_name: '',
    status: 'active'
  });

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const response = await ClientService.getAll();
      setClients(response.data.results || response.data);
    } catch (e) {
      console.error("Failed to fetch clients", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const openAddModal = () => {
    setEditingClient(null);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone_number: '',
      company_name: '',
      status: 'active'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (client: any) => {
    setEditingClient(client);
    setFormData({
      first_name: client.first_name || '',
      last_name: client.last_name || '',
      email: client.email || '',
      phone_number: client.phone_number || '',
      company_name: client.company_name || '',
      status: client.status || 'active'
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    showConfirm({
      title: 'Delete Client',
      message: 'Are you sure you want to delete this client? All historic data will be preserved but the profile will be removed.',
      type: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await ClientService.delete(id);
          showNotification("Client deleted successfully", 'success');
          fetchClients();
        } catch (e) {
          console.error("Failed to delete client", e);
          showNotification("Failed to delete client", 'error');
        }
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await ClientService.update(editingClient.client_id, formData);
      } else {
        await ClientService.create(formData);
      }
      setIsModalOpen(false);
      showNotification(editingClient ? "Client updated!" : "Client created!", 'success');
      fetchClients();
    } catch (error) {
      console.error("Failed to save client", error);
      showNotification("Failed to save client", 'error');
    }
  };

  const filteredClients = clients.filter(c => {
    const searchString = `${c.first_name} ${c.last_name} ${c.email} ${c.company_name}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  const displayedClients = filteredClients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalBookings = clients.reduce((acc, c) => acc + (c.bookings_count || 0), 0);
  const activeClients = clients.filter(c => c.status === 'active').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)]">Client Directory</h1>
          <p className="text-[var(--text-muted)]">Manage customer profiles and rental history.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 bg-brand-primary text-brand-accent px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-colors shadow-sm shadow-brand-primary/20"
        >
          <Plus className="w-5 h-5" />
          Add Client
        </button>
      </div>

      {/* Module Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2 mt-4">
        <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-soft)] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--text-muted)]">Total Clients</p>
            <p className="text-2xl font-bold text-[var(--text-main)]">{clients.length}</p>
          </div>
          <div className="p-3 bg-brand-primary/10 rounded-xl text-brand-primary"><Users size={24}/></div>
        </div>
        <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-soft)] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--text-muted)]">Active Clients</p>
            <p className="text-2xl font-bold text-[var(--text-main)]">{activeClients}</p>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500"><ShieldCheck size={24}/></div>
        </div>
        <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-soft)] shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--text-muted)]">Total Historic Bookings</p>
            <p className="text-2xl font-bold text-[var(--text-main)]">{totalBookings}</p>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-500"><History size={24}/></div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          placeholder="Search by name, email, or company..." 
          className="w-full pl-10 pr-4 py-3 bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all shadow-sm"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {displayedClients.map((client) => (
            <div key={client.client_id} className="bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-soft)] p-6 hover:shadow-xl hover:border-brand-primary/10 transition-all group">
              <div className="flex items-start justify-between mb-6">
                <div className="w-14 h-14 bg-[var(--bg-app)] rounded-2xl flex items-center justify-center text-xl font-bold text-[var(--text-muted)] group-hover:bg-brand-primary/10 group-hover:text-brand-primary border border-[var(--border-soft)] transition-colors">
                  {(client.first_name?.[0] || '') + (client.last_name?.[0] || '')}
                </div>
                <div className="flex gap-2 items-center">
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    client.status === 'active' ? "bg-emerald-500/10 text-emerald-500" : "bg-[var(--bg-app)] text-[var(--text-muted)]"
                  )}>
                    {client.status}
                  </span>
                  
                  <button onClick={() => openEditModal(client)} className="p-1 text-[var(--text-muted)] hover:text-brand-primary" title="Edit">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(client.client_id)} className="p-1 text-[var(--text-muted)] hover:text-rose-500" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-1 mb-6">
                <h3 className="text-lg font-bold text-[var(--text-main)]">{client.first_name} {client.last_name}</h3>
                <p className="text-sm text-[var(--text-muted)] font-medium">{client.company_name || 'No Company'}</p>
              </div>

              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
                  <Mail className="w-4 h-4 text-[var(--text-muted)]" />
                  <span className="truncate">{client.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
                  <Phone className="w-4 h-4 text-[var(--text-muted)]" />
                  {client.phone_number || 'N/A'}
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-[var(--border-subtle)]">
                <div className="flex items-center gap-1.5">
                  <History className="w-4 h-4 text-[var(--text-muted)]" />
                  <span className="text-xs font-bold text-[var(--text-main)]">{client.bookings_count || 0}</span>
                  <span className="text-xs text-[var(--text-muted)]">Bookings</span>
                </div>
                <button className="flex items-center gap-1.5 text-xs font-bold text-brand-primary hover:underline">
                  View Profile
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
          {filteredClients.length === 0 && (
            <div className="col-span-full text-center py-12 text-[var(--text-muted)] bg-[var(--bg-app)] rounded-2xl border border-dashed border-[var(--border-soft)]">
              No clients found.
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && filteredClients.length > 0 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-[var(--text-muted)]">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredClients.length)} of {filteredClients.length} results
          </p>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="p-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-lg text-[var(--text-main)] hover:bg-[var(--bg-app)] disabled:opacity-50" 
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredClients.length / itemsPerPage), p + 1))}
              className="p-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-lg text-[var(--text-main)] hover:bg-[var(--bg-app)] disabled:opacity-50"
              disabled={currentPage === Math.ceil(filteredClients.length / itemsPerPage)}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-app)]/80 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-surface)] rounded-3xl w-full max-w-lg overflow-hidden border border-[var(--border-soft)] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-soft)] bg-[var(--bg-app)]/50">
              <h2 className="text-lg font-bold text-[var(--text-main)]">
                {editingClient ? 'Edit Client' : 'Add New Client'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-app)] rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[var(--text-muted)]">First Name <span className="text-rose-500">*</span></label>
                  <input 
                    required
                    type="text" 
                    value={formData.first_name}
                    onChange={e => setFormData({...formData, first_name: e.target.value})}
                    className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:bg-[var(--bg-surface)] focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[var(--text-muted)]">Last Name <span className="text-rose-500">*</span></label>
                  <input 
                    required
                    type="text" 
                    value={formData.last_name}
                    onChange={e => setFormData({...formData, last_name: e.target.value})}
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
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:bg-[var(--bg-surface)] focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[var(--text-muted)]">Phone</label>
                  <input 
                    type="tel" 
                    value={formData.phone_number}
                    onChange={e => setFormData({...formData, phone_number: e.target.value})}
                    className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:bg-[var(--bg-surface)] focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[var(--text-muted)]">Company</label>
                  <input 
                    type="text" 
                    value={formData.company_name}
                    onChange={e => setFormData({...formData, company_name: e.target.value})}
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
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
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
                  className="flex-1 px-6 py-3 font-bold text-brand-accent bg-brand-primary hover:opacity-90 rounded-xl transition-all shadow-lg shadow-brand-primary/20 whitespace-nowrap"
                >
                  {editingClient ? 'Save Changes' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
