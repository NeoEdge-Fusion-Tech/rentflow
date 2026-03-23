import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Users, 
  Settings as SettingsIcon, 
  Calendar, 
  Shield, 
  Mail,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  TrendingUp,
  CreditCard,
  Plus,
  Save,
  X
} from 'lucide-react';
import { SuperAdminService, StatsService, OrganizationService, CurrencyService } from '../../api';

export function OrganizationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [org, setOrg] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Edit form state
  const [editName, setEditName] = useState('');
  const [editCurrencyId, setEditCurrencyId] = useState('');
  const [editPayoutId, setEditPayoutId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (id) {
      fetchData();
      fetchCurrencies();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [orgRes, usersRes, statsRes] = await Promise.all([
        SuperAdminService.getOrganization(id!),
        SuperAdminService.getUsers({ organization: id }),
        StatsService.getTenantStats({ organization: id })
      ]);
      setOrg(orgRes.data);
      setUsers(usersRes.data.results || usersRes.data);
      setStats(statsRes.data);
      
      // Initialize edit form
      setEditName(orgRes.data.name);
      setEditCurrencyId(orgRes.data.currency?.id || '');
      setEditPayoutId(orgRes.data.payout_account_id || '');
    } catch (error) {
      console.error("Failed to fetch organization details", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCurrencies = async () => {
    try {
      const res = await CurrencyService.getAll();
      setCurrencies(res.data.results || res.data);
    } catch (error) {
      console.error("Failed to fetch currencies", error);
    }
  };

  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await SuperAdminService.updateOrganization(id!, {
        name: editName,
        currency_id: editCurrencyId,
        payout_account_id: editPayoutId
      });
      setIsEditModalOpen(false);
      fetchData(); // Refresh data
    } catch (error) {
      console.error("Failed to update organization", error);
      alert("Failed to update organization. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    const newStatus = !org.is_active;
    if (!window.confirm(`Are you sure you want to ${newStatus ? 'activate' : 'deactivate'} this organization?`)) return;
    
    try {
      await SuperAdminService.updateOrganization(id!, { is_active: newStatus });
      fetchData();
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  const handleToggleUserStatus = async (userId: string | number, currentStatus: boolean) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this user?`)) return;
    try {
      await SuperAdminService.updateUser(userId, { is_active: !currentStatus });
      fetchData();
    } catch (error) {
      console.error("Failed to update user status", error);
      alert("Failed to update user.");
    }
  };

  const handleDeleteOrg = async () => {
    if (!window.confirm("Are you SURE you want to delete this organization? This will soft-delete the organization and modify user accounts.")) return;
    try {
      await SuperAdminService.deleteOrganization(id!);
      navigate('/superadmin/organizations');
    } catch (error) {
      console.error("Failed to delete organization", error);
      alert("Failed to delete organization.");
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading organization details...</div>;
  }

  if (!org) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500 mb-4">Organization not found.</p>
        <button onClick={() => navigate('/superadmin/organizations')} className="text-brand-primary font-bold">
          Back to Organizations
        </button>
      </div>
    );
  }

  const currencySymbol = stats?.currency_symbol || localStorage.getItem('currencySymbol') || '$';

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/superadmin/organizations')}
          className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{org.name}</h1>
          <p className="text-sm text-slate-500 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            Organization ID: {id}
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Status</p>
          <div className="flex items-center gap-2">
            {org.is_active ? (
              <><CheckCircle2 className="w-4 h-4 text-emerald-500" /> <span className="font-bold text-emerald-600">Active</span></>
            ) : (
              <><XCircle className="w-4 h-4 text-rose-500" /> <span className="font-bold text-rose-600">Deactivated</span></>
            )}
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Plan</p>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-brand-primary" />
            <span className="font-bold text-slate-900">{org.subscription?.plan_name || 'Free'}</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Bookings</p>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <span className="font-bold text-slate-900">{stats?.total_bookings || 0}</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Revenue</p>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span className="font-bold text-slate-900">{currencySymbol}{stats?.monthly_revenue?.toLocaleString() || '0.00'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-brand-primary" />
                Team Members ({users.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase">User</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-slate-500 uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold">
                            {user.first_name?.[0] || user.username?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm text-slate-900">{user.first_name} {user.last_name}</p>
                            <p className="text-[10px] text-slate-500 flex items-center gap-1"><Mail className="w-2.5 h-2.5" />{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-600 capitalize">{user.role}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${user.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                          {user.is_active ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                          className="text-xs font-medium text-slate-500 hover:text-brand-primary transition-colors"
                        >
                          {user.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Settings & Controls */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <SettingsIcon className="w-4 h-4 text-slate-400" />
              Controls
            </h3>
            <div className="space-y-3">
              <button 
                onClick={() => setIsEditModalOpen(true)}
                className="w-full py-2 px-4 bg-slate-50 hover:bg-slate-100 text-slate-900 rounded-xl text-sm font-bold border border-slate-200 transition-colors flex items-center justify-between"
              >
                Edit Organization Settings
                <SettingsIcon className="w-4 h-4 opacity-40" />
              </button>
              <button 
                onClick={() => {
                  localStorage.setItem('selectedOrganizationId', id!);
                  window.location.href = '/';
                }}
                className="w-full py-2 px-4 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary rounded-xl text-sm font-bold border border-brand-primary/20 transition-colors flex items-center justify-between"
              >
                Impersonate Workspace
                <TrendingUp className="w-4 h-4" />
              </button>
              <div className="pt-2">
                <button 
                  onClick={handleToggleStatus}
                  className={`w-full py-2 px-4 rounded-xl text-sm font-bold border transition-colors ${
                    org.is_active 
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 border-rose-200' 
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border-emerald-200'
                  }`}
                >
                  {org.is_active ? 'Deactivate Organization' : 'Activate Organization'}
                </button>
                <button 
                  onClick={handleDeleteOrg}
                  className="w-full mt-3 py-2 px-4 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-sm font-bold border border-rose-200 transition-colors"
                >
                  Delete Organization
                </button>
              </div>
            </div>
          </div>

          <div className="bg-indigo-600 p-6 rounded-2xl text-white shadow-lg shadow-indigo-200">
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Subscription
            </h3>
            <p className="text-sm text-indigo-100 mb-4">Manage billing and tier levels for this organization.</p>
            <button className="w-full py-2 px-4 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold border border-white/20 transition-colors">
              Manage Tier
            </button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-bold text-slate-900">Edit Organization</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateOrg} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Organization Name</label>
                <input 
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-brand-primary outline-none transition-all"
                  placeholder="Company Name"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Default Currency</label>
                <select 
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-brand-primary outline-none transition-all"
                  value={editCurrencyId}
                  onChange={(e) => setEditCurrencyId(e.target.value)}
                  required
                >
                  <option value="">Select Currency</option>
                  {currencies.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.symbol})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase px-1">Payout Account ID (Stripe)</label>
                <input 
                  type="text"
                  value={editPayoutId}
                  onChange={(e) => setEditPayoutId(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-brand-primary outline-none transition-all"
                  placeholder="acct_..."
                />
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-3 bg-brand-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all disabled:opacity-50 shadow-lg shadow-brand-primary/20"
                >
                  {isSaving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
