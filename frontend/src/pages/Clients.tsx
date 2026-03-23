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
import { ClientService } from '@/src/api';

export function Clients() {
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
    if (confirm('Are you sure you want to delete this client?')) {
      try {
        await ClientService.delete(id);
        fetchClients();
      } catch (e) {
        console.error("Failed to delete client", e);
      }
    }
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
      fetchClients();
    } catch (error) {
      console.error("Failed to save client", error);
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
          <h1 className="text-2xl font-bold text-slate-900">Client Directory</h1>
          <p className="text-slate-500">Manage customer profiles and rental history.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="flex items-center justify-center gap-2 bg-brand-accent text-brand-primary px-4 py-2.5 rounded-xl font-bold hover:bg-brand-accent-hover transition-colors shadow-sm shadow-brand-accent/20"
        >
          <Plus className="w-5 h-5" />
          Add Client
        </button>
      </div>

      {/* Module Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2 mt-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Total Clients</p>
            <p className="text-2xl font-bold text-slate-900">{clients.length}</p>
          </div>
          <div className="p-3 bg-brand-primary/5 rounded-xl text-brand-primary"><Users size={24}/></div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Active Clients</p>
            <p className="text-2xl font-bold text-slate-900">{activeClients}</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600"><ShieldCheck size={24}/></div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Total Historic Bookings</p>
            <p className="text-2xl font-bold text-slate-900">{totalBookings}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600"><History size={24}/></div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          placeholder="Search by name, email, or company..." 
          className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all shadow-sm"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {displayedClients.map((client) => (
            <div key={client.client_id} className="bg-white rounded-3xl border border-slate-200 p-6 hover:shadow-xl hover:border-brand-primary/10 transition-all group">
              <div className="flex items-start justify-between mb-6">
                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-xl font-bold text-slate-400 group-hover:bg-brand-primary/5 group-hover:text-brand-primary transition-colors">
                  {(client.first_name?.[0] || '') + (client.last_name?.[0] || '')}
                </div>
                <div className="flex gap-2 items-center">
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    client.status === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                  )}>
                    {client.status}
                  </span>
                  
                  <button onClick={() => openEditModal(client)} className="p-1 text-slate-400 hover:text-blue-600" title="Edit">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(client.client_id)} className="p-1 text-slate-400 hover:text-red-600" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-1 mb-6">
                <h3 className="text-lg font-bold text-slate-900">{client.first_name} {client.last_name}</h3>
                <p className="text-sm text-slate-500 font-medium">{client.company_name || 'No Company'}</p>
              </div>

              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span className="truncate">{client.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400" />
                  {client.phone_number || 'N/A'}
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                <div className="flex items-center gap-1.5">
                  <History className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-900">{client.bookings_count || 0}</span>
                  <span className="text-xs text-slate-500">Bookings</span>
                </div>
                <button className="flex items-center gap-1.5 text-xs font-bold text-brand-primary hover:underline">
                  View Profile
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
          {filteredClients.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              No clients found.
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && filteredClients.length > 0 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-slate-500">
            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredClients.length)} of {filteredClients.length} results
          </p>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50" 
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredClients.length / itemsPerPage), p + 1))}
              className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              disabled={currentPage === Math.ceil(filteredClients.length / itemsPerPage)}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                {editingClient ? 'Edit Client' : 'Add New Client'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">First Name <span className="text-red-500">*</span></label>
                  <input 
                    required
                    type="text" 
                    value={formData.first_name}
                    onChange={e => setFormData({...formData, first_name: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Last Name <span className="text-red-500">*</span></label>
                  <input 
                    required
                    type="text" 
                    value={formData.last_name}
                    onChange={e => setFormData({...formData, last_name: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Email Address <span className="text-red-500">*</span></label>
                <input 
                  required
                  type="email" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Phone</label>
                  <input 
                    type="tel" 
                    value={formData.phone_number}
                    onChange={e => setFormData({...formData, phone_number: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Company</label>
                  <input 
                    type="text" 
                    value={formData.company_name}
                    onChange={e => setFormData({...formData, company_name: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Status</label>
                <select 
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="pt-2 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-3 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-6 py-3 font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-lg shadow-brand-primary/20"
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
