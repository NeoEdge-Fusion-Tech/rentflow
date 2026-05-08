import React, { useEffect, useState } from 'react';
import { useNotification } from '../../context/NotificationContext';
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
import { SuperAdminService, StatsService, OrganizationService, CurrencyService, AuthService } from '../../api';

export function OrganizationDetail() {
  const { showNotification } = useNotification();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [org, setOrg] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Edit form state
  const [editName, setEditName] = useState('');
  const [editCurrencyId, setEditCurrencyId] = useState('');
  const [editPayoutId, setEditPayoutId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Password Reset Modal state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isSettingPassword, setIsSettingPassword] = useState(false);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const res = await AuthService.getMe();
      setCurrentUser(res.data);
    } catch (e) {
      console.error("Failed to fetch current user", e);
    }
  };

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
      showNotification("Failed to update organization. Please try again.", 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    const newStatus = !org.is_active;
    showConfirm({
      title: `${newStatus ? 'Activate' : 'Deactivate'} Organization`,
      message: `Are you sure you want to ${newStatus ? 'activate' : 'deactivate'} this organization?`,
      type: newStatus ? 'info' : 'danger',
      onConfirm: async () => {
        try {
          await SuperAdminService.updateOrganization(id!, { is_active: newStatus });
          showNotification(`Organization ${newStatus ? 'activated' : 'deactivated'}`, 'success');
          fetchData();
        } catch (error) {
          console.error("Failed to update status", error);
          showNotification('Failed to update status', 'error');
        }
      }
    });
  };

  const handleToggleUserStatus = async (userId: string | number, currentStatus: boolean) => {
    showConfirm({
      title: `${currentStatus ? 'Deactivate' : 'Activate'} User`,
      message: `Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this user?`,
      type: currentStatus ? 'danger' : 'info',
      onConfirm: async () => {
        try {
          await SuperAdminService.deactivateUser(userId);
          showNotification(`User ${currentStatus ? 'deactivated' : 'activated'}`, 'success');
          fetchData();
        } catch (error) {
          console.error("Failed to update user status", error);
          showNotification("Failed to update user.", 'error');
        }
      }
    });
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;

    try {
      setIsSettingPassword(true);
      await SuperAdminService.setPassword(selectedUser.id, { new_password: newPassword });
      setIsPasswordModalOpen(false);
      setNewPassword('');
      setSelectedUser(null);
      showNotification("Password updated successfully.", 'success');
    } catch (error) {
      console.error("Failed to set password", error);
      showNotification("Failed to update password.", 'error');
    } finally {
      setIsSettingPassword(false);
    }
  };

  const handleDeleteOrg = async () => {
    showConfirm({
      title: 'Delete Organization',
      message: 'Are you SURE you want to delete this organization? This will soft-delete the organization and modify user accounts.',
      type: 'danger',
      confirmText: 'Delete Everything',
      onConfirm: async () => {
        try {
          await SuperAdminService.deleteOrganization(id!);
          showNotification('Organization deleted', 'success');
          navigate('/superadmin/organizations');
        } catch (error) {
          console.error("Failed to delete organization", error);
          showNotification("Failed to delete organization.", 'error');
        }
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[var(--text-muted)] font-medium animate-pulse">Loading organization details...</p>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-[var(--bg-surface)] rounded-3xl border border-[var(--border-soft)]">
        <div className="p-4 bg-rose-500/10 rounded-2xl text-rose-500 mb-4">
          <XCircle className="w-12 h-12" />
        </div>
        <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">Organization not found</h3>
        <p className="text-[var(--text-muted)] mb-6 max-w-sm">The organization you're looking for might have been removed or the ID is incorrect.</p>
        <button onClick={() => navigate('/superadmin/organizations')} className="bg-brand-primary text-brand-accent px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-brand-primary/20">
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
          className="p-2 hover:bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl transition-colors text-[var(--text-muted)]"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)]">{org.name}</h1>
          <p className="text-sm text-[var(--text-muted)] flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            Organization ID: {id}
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-soft)] shadow-sm">
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Status</p>
          <div className="flex items-center gap-2">
            {org.is_active ? (
              <><CheckCircle2 className="w-4 h-4 text-emerald-500" /> <span className="font-bold text-emerald-500">Active</span></>
            ) : (
              <><XCircle className="w-4 h-4 text-rose-500" /> <span className="font-bold text-rose-500">Deactivated</span></>
            )}
          </div>
        </div>
        <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-soft)] shadow-sm">
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Plan</p>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-brand-primary" />
            <span className="font-bold text-[var(--text-main)]">{org.subscription?.plan_name || 'Free'}</span>
          </div>
        </div>
        <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-soft)] shadow-sm">
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Total Bookings</p>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <span className="font-bold text-[var(--text-main)]">{stats?.total_bookings || 0}</span>
          </div>
        </div>
        <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-soft)] shadow-sm">
          <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">Revenue</p>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span className="font-bold text-[var(--text-main)]">{currencySymbol}{stats?.monthly_revenue?.toLocaleString() || '0.00'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-soft)] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
              <h3 className="font-bold text-[var(--text-main)] flex items-center gap-2">
                <Users className="w-4 h-4 text-brand-primary" />
                Team Members ({users.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[var(--bg-app)]/50">
                  <tr>
                    <th className="px-6 py-3 text-[10px] font-bold text-[var(--text-muted)] uppercase">User</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-[var(--text-muted)] uppercase">Role</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-[var(--text-muted)] uppercase">Status</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-[var(--text-muted)] uppercase text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)] font-medium">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[var(--bg-app)] text-[var(--text-main)] border border-[var(--border-soft)] flex items-center justify-center text-xs font-bold">
                            {user.first_name?.[0] || user.username?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm text-[var(--text-main)]">{user.first_name} {user.last_name}</p>
                            <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1"><Mail className="w-2.5 h-2.5" />{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-[var(--text-muted)] font-medium capitalize">{user.role}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${user.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                          {user.is_active ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button 
                            onClick={() => {
                              setSelectedUser(user);
                              setIsPasswordModalOpen(true);
                            }}
                            className="text-xs font-medium text-brand-primary hover:underline transition-colors"
                          >
                            Set Password
                          </button>
                          {user.id !== currentUser?.id && (
                            <button 
                              onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                              className={`text-xs font-medium transition-colors ${
                                user.is_active ? 'text-[var(--text-muted)] hover:text-rose-500' : 'text-emerald-500 hover:opacity-80'
                              }`}
                            >
                              {user.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                          )}
                        </div>
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
          <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-soft)] shadow-sm">
            <h3 className="font-bold text-[var(--text-main)] mb-4 flex items-center gap-2">
              <SettingsIcon className="w-4 h-4 text-[var(--text-muted)]" />
              Controls
            </h3>
            <div className="space-y-3">
              <button 
                onClick={() => setIsEditModalOpen(true)}
                className="w-full py-2 px-4 bg-[var(--bg-app)] hover:opacity-80 text-[var(--text-main)] rounded-xl text-sm font-bold border border-[var(--border-soft)] transition-colors flex items-center justify-between"
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
                      ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border-rose-500/20' 
                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border-emerald-500/20'
                  }`}
                >
                  {org.is_active ? 'Deactivate Organization' : 'Activate Organization'}
                </button>
                <button 
                  onClick={handleDeleteOrg}
                  className="w-full mt-3 py-2 px-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl text-sm font-bold border border-rose-500/20 transition-colors"
                >
                  Delete Organization
                </button>
              </div>
            </div>
          </div>

          <div className="bg-brand-primary p-6 rounded-2xl text-brand-accent shadow-lg shadow-brand-primary/20">
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Subscription
            </h3>
            <p className="text-sm opacity-80 mb-4">Manage billing and tier levels for this organization.</p>
            <button className="w-full py-2 px-4 bg-brand-accent/10 hover:bg-brand-accent/20 rounded-xl text-sm font-bold border border-brand-accent/20 transition-colors">
              Manage Tier
            </button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-app)]/80 backdrop-blur-sm">
          <div className="bg-[var(--bg-surface)] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-[var(--border-soft)]">
            <div className="p-6 border-b border-[var(--border-soft)] flex items-center justify-between bg-[var(--bg-app)]/30">
              <h3 className="text-lg font-bold text-[var(--text-main)]">Edit Organization</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-[var(--bg-app)] rounded-xl transition-colors">
                <X className="w-5 h-5 text-[var(--text-muted)]" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateOrg} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase px-1">Organization Name</label>
                <input 
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl text-sm focus:border-brand-primary outline-none transition-all placeholder-[var(--text-muted)]"
                  placeholder="Company Name"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase px-1">Default Currency</label>
                <select 
                  className="w-full px-4 py-2 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl text-sm focus:border-brand-primary outline-none transition-all"
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
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase px-1">Payout Account ID (Stripe)</label>
                <input 
                  type="text"
                  value={editPayoutId}
                  onChange={(e) => setEditPayoutId(e.target.value)}
                  className="w-full px-4 py-2 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl text-sm focus:border-brand-primary outline-none transition-all placeholder-[var(--text-muted)]"
                  placeholder="acct_..."
                />
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="w-full py-3 bg-brand-primary text-brand-accent rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-brand-primary/20"
                >
                  {isSaving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Set Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-app)]/80 backdrop-blur-sm">
          <div className="bg-[var(--bg-surface)] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-[var(--border-soft)]">
            <div className="p-6 border-b border-[var(--border-soft)] flex items-center justify-between bg-[var(--bg-app)]/30">
              <div>
                <h3 className="text-lg font-bold text-[var(--text-main)]">Set User Password</h3>
                <p className="text-xs text-[var(--text-muted)]">For user: {selectedUser?.email}</p>
              </div>
              <button 
                onClick={() => {
                  setIsPasswordModalOpen(false);
                  setNewPassword('');
                }} 
                className="p-2 hover:bg-[var(--bg-app)] rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-[var(--text-muted)]" />
              </button>
            </div>
            
            <form onSubmit={handleSetPassword} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase px-1">New Password</label>
                <input 
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl text-sm focus:border-brand-primary outline-none transition-all placeholder-[var(--text-muted)]"
                  placeholder="Enter new strong password"
                  autoFocus
                />
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  disabled={isSettingPassword || !newPassword}
                  className="w-full py-3 bg-brand-primary text-brand-accent rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-brand-primary/20"
                >
                  {isSettingPassword ? 'Updating...' : <><Shield className="w-4 h-4" /> Update Password</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
