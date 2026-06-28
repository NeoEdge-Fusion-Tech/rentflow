import React, { useState, useEffect } from 'react';
import { CreditCard, Search, Plus, Edit2, Check, X } from 'lucide-react';
import { api } from '@/src/api';
import { useNotification } from '@/src/context/NotificationContext';

export function SubscriptionPlans() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0.0,
    billing_cycle: 'monthly',
    max_invoices_per_month: 10,
    max_inventory_booking_per_month: 10,
    has_booking: true,
    has_invoice: true,
    is_free: false,
    is_active: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await api.get('/users/subscription-plans/');
      setPlans(res.data.results || res.data);
    } catch (e: any) {
      showNotification('Failed to load subscription plans', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      description: '',
      price: 0.0,
      billing_cycle: 'monthly',
      max_invoices_per_month: 10,
      max_inventory_booking_per_month: 10,
      has_booking: true,
      has_invoice: true,
      is_free: false,
      is_active: true
    });
    setIsModalOpen(true);
  };

  const openEditModal = (plan: any) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || '',
      price: plan.price,
      billing_cycle: plan.billing_cycle,
      max_invoices_per_month: plan.max_invoices_per_month,
      max_inventory_booking_per_month: plan.max_inventory_booking_per_month,
      has_booking: plan.has_booking,
      has_invoice: plan.has_invoice,
      is_free: plan.is_free,
      is_active: plan.is_active
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPlan) {
        await api.patch(`/users/subscription-plans/${editingPlan.id}/`, formData);
        showNotification('Subscription plan updated successfully', 'success');
      } else {
        await api.post('/users/subscription-plans/', formData);
        showNotification('Subscription plan created successfully', 'success');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      showNotification(error.response?.data?.name?.[0] || 'An error occurred while saving the plan', 'error');
    }
  };

  const filteredPlans = plans.filter(plan => 
    plan.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-brand-primary" />
            Subscription Plans Catalog
          </h1>
          <p className="text-[var(--text-muted)] mt-1">Create and modify the available subscription plans</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-brand-primary text-white px-4 py-2 rounded-lg hover:bg-brand-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Plan
        </button>
      </div>

      <div className="mb-6 relative">
        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input 
          type="text" 
          placeholder="Search plans..." 
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full max-w-md pl-10 pr-4 py-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-lg text-[var(--text-main)] focus:outline-none focus:border-brand-primary"
        />
      </div>

      <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-soft)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--bg-app)] text-[var(--text-muted)] uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Cycle</th>
                <th className="px-4 py-3 font-medium">Inv Limit</th>
                <th className="px-4 py-3 font-medium">Booking Limit</th>
                <th className="px-4 py-3 font-medium">Free Plan</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-soft)]">
              {filteredPlans.map(plan => (
                <tr key={plan.id} className="hover:bg-[var(--bg-app)]">
                  <td className="px-4 py-3 font-medium text-[var(--text-main)]">{plan.name}</td>
                  <td className="px-4 py-3">${plan.price}</td>
                  <td className="px-4 py-3 capitalize">{plan.billing_cycle}</td>
                  <td className="px-4 py-3">{plan.max_invoices_per_month === -1 ? 'Unlimited' : plan.max_invoices_per_month}</td>
                  <td className="px-4 py-3">{plan.max_inventory_booking_per_month === -1 ? 'Unlimited' : plan.max_inventory_booking_per_month}</td>
                  <td className="px-4 py-3">
                    {plan.is_free ? (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-brand-primary/10 text-brand-primary">Yes</span>
                    ) : (
                      <span className="text-[var(--text-muted)]">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      plan.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-gray-500/10 text-gray-500'
                    }`}>
                      {plan.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button 
                      onClick={() => openEditModal(plan)}
                      className="text-brand-primary hover:text-brand-primary/80"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredPlans.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--text-muted)]">No subscription plans found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-soft)] shadow-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b border-[var(--border-soft)]">
              <h2 className="text-xl font-bold text-[var(--text-main)]">
                {editingPlan ? 'Edit Subscription Plan' : 'Create Subscription Plan'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Plan Name</label>
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-lg text-[var(--text-main)] focus:outline-none focus:border-brand-primary"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Description</label>
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-lg text-[var(--text-main)] focus:outline-none focus:border-brand-primary h-20"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Price ($)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="0"
                    required
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})}
                    className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-lg text-[var(--text-main)] focus:outline-none focus:border-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Billing Cycle</label>
                  <select
                    value={formData.billing_cycle}
                    onChange={e => setFormData({...formData, billing_cycle: e.target.value})}
                    className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-lg text-[var(--text-main)] focus:outline-none focus:border-brand-primary"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Max Invoices/Month (-1 = unltd)</label>
                  <input 
                    type="number" 
                    required
                    value={formData.max_invoices_per_month}
                    onChange={e => setFormData({...formData, max_invoices_per_month: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-lg text-[var(--text-main)] focus:outline-none focus:border-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Max Bookings/Month (-1 = unltd)</label>
                  <input 
                    type="number" 
                    required
                    value={formData.max_inventory_booking_per_month}
                    onChange={e => setFormData({...formData, max_inventory_booking_per_month: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-lg text-[var(--text-main)] focus:outline-none focus:border-brand-primary"
                  />
                </div>
              </div>
              
              <div className="pt-2 border-t border-[var(--border-soft)]">
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Included Modules</label>
                <select
                  value={formData.has_booking ? 'inventory' : 'invoice'}
                  onChange={e => {
                    const val = e.target.value;
                    if (val === 'inventory') {
                      setFormData({...formData, has_booking: true, has_invoice: true});
                    } else {
                      setFormData({...formData, has_booking: false, has_invoice: true});
                    }
                  }}
                  className="w-full px-3 py-2 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-lg text-[var(--text-main)] focus:outline-none focus:border-brand-primary"
                >
                  <option value="invoice">Invoice Only</option>
                  <option value="inventory">Inventory & Invoicing</option>
                </select>
                <p className="text-xs text-[var(--text-muted)] mt-1">Inventory inherently includes Invoicing capabilities.</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="isFree"
                    checked={formData.is_free}
                    onChange={e => setFormData({...formData, is_free: e.target.checked})}
                    className="mr-2"
                  />
                  <label htmlFor="isFree" className="text-sm font-medium text-[var(--text-main)]">Is Free Plan (Unique)</label>
                </div>
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="isActive"
                    checked={formData.is_active}
                    onChange={e => setFormData({...formData, is_active: e.target.checked})}
                    className="mr-2"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-[var(--text-main)]">Active Plan</label>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--border-soft)]">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-[var(--border-soft)] text-[var(--text-main)] rounded-lg hover:bg-[var(--bg-app)]"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Save Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
