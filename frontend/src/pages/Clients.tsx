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
  History,
  Receipt,
  Upload,
  User
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
  
  const [viewingClient, setViewingClient] = useState<any>(null);
  const [customIndustry, setCustomIndustry] = useState('');
  
  // Form State
  const [formData, setFormData] = useState({
    business_name: '',
    email: '',
    phone_number: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    industry: '',
    address: '',
    city: '',
    state: '',
    country: 'Nigeria', // default from screenshot
    tax_information: '',
    shipping_details: '',
    additional_details: '',
    account_name: '',
    account_number: '',
    bank_name: '',
    bank_code: '',
    status: 'active',
    logo: null as File | string | null
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
    setCustomIndustry('');
    setFormData({
      business_name: '',
      email: '',
      phone_number: '',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      industry: '',
      address: '',
      city: '',
      state: '',
      country: 'Nigeria',
      tax_information: '',
      shipping_details: '',
      additional_details: '',
      account_name: '',
      account_number: '',
      bank_name: '',
      bank_code: '',
      status: 'active',
      logo: null
    });
    setIsModalOpen(true);
  };

  const openEditModal = (client: any) => {
    const isStandardIndustry = ['tech', 'retail', 'finance', 'other', ''].includes(client.industry || '');
    setEditingClient(client);
    setCustomIndustry(isStandardIndustry ? '' : (client.industry || ''));
    setFormData({
      business_name: client.business_name || '',
      email: client.email || '',
      phone_number: client.phone_number || '',
      contact_name: client.contact_name || '',
      contact_email: client.contact_email || '',
      contact_phone: client.contact_phone || '',
      industry: isStandardIndustry ? (client.industry || '') : 'other',
      address: client.address || '',
      city: client.city || '',
      state: client.state || '',
      country: client.country || 'Nigeria',
      tax_information: client.tax_information || '',
      shipping_details: client.shipping_details || '',
      additional_details: client.additional_details || '',
      account_name: client.account_name || '',
      account_number: client.account_number || '',
      bank_name: client.bank_name || '',
      bank_code: client.bank_code || '',
      status: client.status || 'active',
      logo: client.logo || null
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
    
    const payload = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (key === 'industry') {
        payload.append('industry', formData.industry === 'other' && customIndustry ? customIndustry : formData.industry);
      } else if (key === 'logo') {
        if (value instanceof File) {
          payload.append('logo', value);
        }
      } else if (value !== null && value !== '') {
        payload.append(key, value as string);
      }
    });

    try {
      if (editingClient) {
        await ClientService.update(editingClient.client_id, payload);
      } else {
        await ClientService.create(payload);
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
    const searchString = `${c.business_name} ${c.contact_name} ${c.email}`.toLowerCase();
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
                  {(client.business_name?.[0] || 'C').toUpperCase()}
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
                <h3 className="text-lg font-bold text-[var(--text-main)]">{client.business_name}</h3>
                <p className="text-sm text-[var(--text-muted)] font-medium">{client.contact_name || 'No Contact Person'}</p>
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
                <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
                  <MapPin className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                  <span className="truncate">{client.address || 'N/A'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-[var(--border-subtle)]">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <History className="w-4 h-4 text-[var(--text-muted)]" />
                    <span className="text-xs font-bold text-[var(--text-main)]">{client.bookings_count || 0}</span>
                    <span className="text-xs text-[var(--text-muted)]">Bookings</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-[var(--text-muted)]" />
                    <span className="text-xs font-bold text-[var(--text-main)]">{client.standalone_invoices_count || 0}</span>
                    <span className="text-xs text-[var(--text-muted)]">Invoices</span>
                  </div>
                </div>
                <button onClick={() => setViewingClient(client)} className="flex items-center gap-1.5 text-xs font-bold text-brand-primary hover:underline">
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
          <div className="bg-[var(--bg-surface)] rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-[var(--border-soft)] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-soft)] bg-[var(--bg-app)]/50 shrink-0">
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
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
              {/* Logo Upload */}
              <div className="flex flex-col items-center justify-center space-y-3">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full bg-[var(--bg-app)] border border-[var(--border-soft)] flex items-center justify-center overflow-hidden">
                    {formData.logo ? (
                      <img 
                        src={formData.logo instanceof File ? URL.createObjectURL(formData.logo) : formData.logo} 
                        alt="Logo Preview" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-10 h-10 text-[var(--text-muted)]" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 p-1.5 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-full shadow-sm cursor-pointer hover:bg-[var(--bg-app)] transition-colors">
                    <Upload className="w-4 h-4 text-[var(--text-main)]" />
                    <input 
                      type="file" 
                      accept="image/*"
                      className="hidden" 
                      onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          setFormData({...formData, logo: e.target.files[0]});
                        }
                      }}
                    />
                  </label>
                </div>
                <span className="text-xs font-bold text-[var(--text-muted)]">Client Logo (Optional)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[var(--text-muted)]">Business Name <span className="text-rose-500">*</span></label>
                  <input 
                    required
                    type="text" 
                    value={formData.business_name}
                    onChange={e => setFormData({...formData, business_name: e.target.value})}
                    placeholder="Business Name (Required)"
                    className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:bg-[var(--bg-surface)] focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[var(--text-muted)]">Client Industry</label>
                  <select 
                    value={formData.industry}
                    onChange={e => setFormData({...formData, industry: e.target.value})}
                    className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:bg-[var(--bg-surface)] focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all"
                  >
                    <option value="">-Select an Industry-</option>
                    <option value="tech">Technology</option>
                    <option value="retail">Retail</option>
                    <option value="finance">Finance</option>
                    <option value="other">Other</option>
                  </select>
                  {formData.industry === 'other' && (
                    <input
                      type="text"
                      placeholder="Specify Industry"
                      value={customIndustry}
                      onChange={e => setCustomIndustry(e.target.value)}
                      className="w-full px-4 py-3 mt-2 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:bg-[var(--bg-surface)] focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all"
                      required
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[var(--text-muted)]">Select Country <span className="text-rose-500">*</span></label>
                  <select 
                    required
                    value={formData.country}
                    onChange={e => setFormData({...formData, country: e.target.value})}
                    className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:bg-[var(--bg-surface)] focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all"
                  >
                    <option value="Nigeria">Nigeria</option>
                    <option value="United States">United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[var(--text-muted)]">City/Town</label>
                  <input 
                    type="text" 
                    value={formData.city}
                    onChange={e => setFormData({...formData, city: e.target.value})}
                    placeholder="City/Town Name"
                    className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:bg-[var(--bg-surface)] focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-[var(--text-muted)]">Email Address</label>
                <input 
                  type="email" 
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:bg-[var(--bg-surface)] focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-[var(--text-muted)]">Phone</label>
                <input 
                  type="tel" 
                  value={formData.phone_number}
                  onChange={e => setFormData({...formData, phone_number: e.target.value})}
                  className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:bg-[var(--bg-surface)] focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all"
                />
              </div>

              <details className="group cursor-pointer">
                <summary className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl outline-none flex items-center justify-between hover:bg-[var(--bg-surface)] focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-bold text-[var(--text-main)]">Tax Information</span>
                    <span className="text-xs font-medium text-[var(--text-muted)]">(optional)</span>
                  </div>
                  <span className="text-[var(--text-muted)] transition-transform group-open:rotate-180">
                    <svg fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20"><path d="m6 9 6 6 6-6"></path></svg>
                  </span>
                </summary>
                <div className="mt-3 pl-1 pr-1">
                  <textarea
                    rows={2}
                    value={formData.tax_information}
                    onChange={e => setFormData({...formData, tax_information: e.target.value})}
                    className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:bg-[var(--bg-surface)] focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all resize-none"
                    placeholder="Tax details..."
                  />
                </div>
              </details>

              <details className="group cursor-pointer">
                <summary className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl outline-none flex items-center justify-between hover:bg-[var(--bg-surface)] focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-bold text-[var(--text-main)]">Address</span>
                    <span className="text-xs font-medium text-[var(--text-muted)]">(optional)</span>
                  </div>
                  <span className="text-[var(--text-muted)] transition-transform group-open:rotate-180">
                    <svg fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20"><path d="m6 9 6 6 6-6"></path></svg>
                  </span>
                </summary>
                <div className="mt-3 pl-1 pr-1 space-y-4">
                  <input 
                    type="text" 
                    value={formData.state}
                    onChange={e => setFormData({...formData, state: e.target.value})}
                    placeholder="State/Province"
                    className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:bg-[var(--bg-surface)] focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all"
                  />
                  <textarea
                    rows={2}
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    placeholder="Street Address"
                    className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:bg-[var(--bg-surface)] focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all resize-none"
                  />
                </div>
              </details>

              <details className="group cursor-pointer">
                <summary className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl outline-none flex items-center justify-between hover:bg-[var(--bg-surface)] focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-bold text-[var(--text-main)]">Linked Contacts</span>
                    <span className="text-xs font-medium text-[var(--text-muted)]">(optional)</span>
                  </div>
                  <span className="text-[var(--text-muted)] transition-transform group-open:rotate-180">
                    <svg fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20"><path d="m6 9 6 6 6-6"></path></svg>
                  </span>
                </summary>
                <div className="mt-3 pl-1 pr-1 space-y-4">
                  <input 
                    type="text" 
                    value={formData.contact_name}
                    onChange={e => setFormData({...formData, contact_name: e.target.value})}
                    placeholder="Contact Name"
                    className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:bg-[var(--bg-surface)] focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all"
                  />
                  <input 
                    type="email" 
                    value={formData.contact_email}
                    onChange={e => setFormData({...formData, contact_email: e.target.value})}
                    placeholder="Contact Email"
                    className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:bg-[var(--bg-surface)] focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all"
                  />
                  <input 
                    type="tel" 
                    value={formData.contact_phone}
                    onChange={e => setFormData({...formData, contact_phone: e.target.value})}
                    placeholder="Contact Phone"
                    className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:bg-[var(--bg-surface)] focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all"
                  />
                </div>
              </details>

              <details className="group cursor-pointer">
                <summary className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl outline-none flex items-center justify-between hover:bg-[var(--bg-surface)] focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-bold text-[var(--text-main)]">Additional Details</span>
                    <span className="text-xs font-medium text-[var(--text-muted)]">(optional)</span>
                  </div>
                  <span className="text-[var(--text-muted)] transition-transform group-open:rotate-180">
                    <svg fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20"><path d="m6 9 6 6 6-6"></path></svg>
                  </span>
                </summary>
                <div className="mt-3 pl-1 pr-1">
                  <textarea
                    rows={2}
                    value={formData.additional_details}
                    onChange={e => setFormData({...formData, additional_details: e.target.value})}
                    className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:bg-[var(--bg-surface)] focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all resize-none"
                  />
                </div>
              </details>
              
              <details className="group cursor-pointer">
                <summary className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl outline-none flex items-center justify-between hover:bg-[var(--bg-surface)] focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary transition-all">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-bold text-[var(--text-main)]">Account Details</span>
                    <span className="text-xs font-medium text-[var(--text-muted)]">(optional)</span>
                  </div>
                  <span className="text-[var(--text-muted)] transition-transform group-open:rotate-180">
                    <svg fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="20"><path d="m6 9 6 6 6-6"></path></svg>
                  </span>
                </summary>
                <div className="mt-3 pl-1 pr-1">
                  <h4 className="font-bold text-[var(--text-main)] mb-3 text-sm">Account Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Account Name</label>
                      <input
                        type="text"
                        placeholder="e.g. John Doe"
                        value={formData.account_name}
                        onChange={e => setFormData({...formData, account_name: e.target.value})}
                        className="w-full h-11 px-4 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl outline-none focus:border-brand-primary text-sm font-medium text-[var(--text-main)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Account Number</label>
                      <input
                        type="text"
                        placeholder="e.g. 1234567890"
                        value={formData.account_number}
                        onChange={e => setFormData({...formData, account_number: e.target.value})}
                        className="w-full h-11 px-4 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl outline-none focus:border-brand-primary text-sm font-medium text-[var(--text-main)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Bank Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Chase Bank"
                        value={formData.bank_name}
                        onChange={e => setFormData({...formData, bank_name: e.target.value})}
                        className="w-full h-11 px-4 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl outline-none focus:border-brand-primary text-sm font-medium text-[var(--text-main)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Bank Code</label>
                      <input
                        type="text"
                        placeholder="e.g. Routing / Sort Code"
                        value={formData.bank_code}
                        onChange={e => setFormData({...formData, bank_code: e.target.value})}
                        className="w-full h-11 px-4 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl outline-none focus:border-brand-primary text-sm font-medium text-[var(--text-main)]"
                      />
                    </div>
                  </div>
                </div>
              </details>

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
                  className="px-6 py-2.5 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-secondary transition-colors"
                >
                  {editingClient ? 'Save Changes' : 'Create Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Profile Modal */}
      {viewingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-app)]/80 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-surface)] rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-[var(--border-soft)] shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-soft)] bg-[var(--bg-app)]/50 shrink-0">
              <h2 className="text-lg font-bold text-[var(--text-main)]">
                Client Profile
              </h2>
              <button 
                onClick={() => setViewingClient(null)}
                className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-app)] rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-[var(--bg-app)] border border-[var(--border-soft)] flex items-center justify-center overflow-hidden shrink-0">
                  {viewingClient.logo ? (
                    <img src={viewingClient.logo} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-[var(--text-muted)]" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[var(--text-main)]">{viewingClient.business_name}</h3>
                  <div className="flex items-center text-sm text-[var(--text-muted)] mt-1">
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-brand-primary/10 text-brand-primary uppercase">
                      {viewingClient.status}
                    </span>
                    {viewingClient.industry && (
                      <span className="ml-3 capitalize">{viewingClient.industry}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-[var(--text-muted)] uppercase">Contact Email</span>
                  <p className="text-sm font-medium text-[var(--text-main)]">{viewingClient.email || viewingClient.contact_email || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-bold text-[var(--text-muted)] uppercase">Contact Phone</span>
                  <p className="text-sm font-medium text-[var(--text-main)]">{viewingClient.phone_number || viewingClient.contact_phone || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-bold text-[var(--text-muted)] uppercase">Location</span>
                  <p className="text-sm font-medium text-[var(--text-main)]">
                    {[viewingClient.city, viewingClient.state, viewingClient.country].filter(Boolean).join(', ') || 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-bold text-[var(--text-muted)] uppercase">Contact Person</span>
                  <p className="text-sm font-medium text-[var(--text-main)]">{viewingClient.contact_name || 'N/A'}</p>
                </div>
              </div>

              {(viewingClient.account_name || viewingClient.bank_name || viewingClient.account_number) && (
                <div>
                  <h4 className="text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Account Details</h4>
                  <p className="text-sm font-medium text-[var(--text-main)]">
                    {viewingClient.bank_name && <span>{viewingClient.bank_name} </span>}
                    {viewingClient.account_number && <span>- {viewingClient.account_number}</span>}
                  </p>
                  {viewingClient.account_name && <p className="text-sm text-[var(--text-muted)] mt-1">{viewingClient.account_name}</p>}
                  {viewingClient.bank_code && <p className="text-xs text-[var(--text-muted)] mt-1">Code: {viewingClient.bank_code}</p>}
                </div>
              )}

              {viewingClient.address && (
                <div className="space-y-1">
                  <span className="text-xs font-bold text-[var(--text-muted)] uppercase">Address</span>
                  <p className="text-sm font-medium text-[var(--text-main)] whitespace-pre-wrap">{viewingClient.address}</p>
                </div>
              )}

              {viewingClient.tax_information && (
                <div className="space-y-1 pt-4 border-t border-[var(--border-soft)]">
                  <span className="text-xs font-bold text-[var(--text-muted)] uppercase">Tax Information</span>
                  <p className="text-sm font-medium text-[var(--text-main)] whitespace-pre-wrap">{viewingClient.tax_information}</p>
                </div>
              )}

              {viewingClient.account_details && (
                <div className="space-y-1 pt-4 border-t border-[var(--border-soft)]">
                  <span className="text-xs font-bold text-[var(--text-muted)] uppercase">Account Details</span>
                  <p className="text-sm font-medium text-[var(--text-main)] whitespace-pre-wrap">{viewingClient.account_details}</p>
                </div>
              )}

              <div className="flex items-center justify-end pt-6 border-t border-[var(--border-soft)]">
                <button
                  onClick={() => {
                    setViewingClient(null);
                    openEditModal(viewingClient);
                  }}
                  className="px-6 py-2.5 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] font-bold rounded-xl hover:bg-[var(--bg-surface)] transition-colors flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" /> Edit Client
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
