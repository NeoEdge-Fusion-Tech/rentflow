import React, { useState, useEffect } from 'react';
import { Building, Upload, CreditCard, Shield, Check, Plus, X, Trash2 } from 'lucide-react';
import { UserService, AuthService, OrganizationService, CurrencyService } from '../api';

export function Settings() {
  const [activeTab, setActiveTab] = useState('Workspace');
  
  const [users, setUsers] = useState<any[]>([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ first_name: '', last_name: '', email: '', password: '', role: 'Admin' });

  const [org, setOrg] = useState<any>(null);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const currencySymbol = localStorage.getItem('currencySymbol') || '$';

  useEffect(() => {
    fetchWorkspaceData();
    fetchCurrencies();
  }, []);

  useEffect(() => {
    if (activeTab === 'Team') {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchCurrencies = async () => {
    try {
      const res = await CurrencyService.getAll();
      setCurrencies(res.data.results || res.data);
    } catch (e) {
      console.error("Failed to fetch currencies", e);
    }
  };

  const fetchWorkspaceData = async () => {
    try {
      const meRes = await AuthService.getMe();
      const orgId = meRes.data.organization_id;
      if (orgId) {
        const orgRes = await OrganizationService.get(orgId);
        setOrg(orgRes.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateWorkspace = async () => {
    try {
      if (org && org.id) {
        const payload = { 
          name: org.name, 
          payout_account_id: org.payout_account_id,
          currency_id: org.currency?.id || org.currency_id || null
        };
        await OrganizationService.patch(org.id, payload);
        alert("Workspace updated! Settings are saved.");
        fetchWorkspaceData();
      }
    } catch (e) {
      console.error(e);
      alert("Failed to update workspace.");
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await UserService.getAll();
      setUsers(res.data.results || res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.first_name || !newUser.last_name || !newUser.email || !newUser.password) {
      alert("All fields are required.");
      return;
    }
    try {
      await UserService.create({
        username: newUser.email, // using email as username
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role,
      });
      setShowAddUserModal(false);
      setNewUser({ first_name: '', last_name: '', email: '', password: '', role: 'Admin' });
      fetchUsers();
      alert("Team member added!");
    } catch (e) {
      console.error(e);
      alert("Failed to add user.");
    }
  };

  const handleDeleteUser = async (id: number) => {
    if (!window.confirm('Are you sure you want to remove this team member?')) return;
    try {
      await UserService.delete(id);
      fetchUsers();
    } catch (e) {
      console.error(e);
      alert('Failed to remove user.');
    }
  };

  const handleTriggerReset = async (id: number) => {
    if (!window.confirm('Send a password reset email to this user?')) return;
    try {
      await UserService.adminTriggerReset(id);
      alert('Reset email sent successfully.');
    } catch (e) {
      console.error(e);
      alert('Failed to trigger reset.');
    }
  };

  const handleDeactivate = async (id: number) => {
    try {
      await UserService.deactivate(id);
      fetchUsers();
    } catch (e) {
      console.error(e);
      alert('Failed to toggle active status.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500">Manage your workspace, billing, and team members.</p>
      </div>

      <div className="flex gap-8 border-b border-slate-200">
        {['Workspace', 'Billing & Plans', 'Team'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Workspace' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2"><Building className="w-5 h-5"/> Workspace Profile</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Company Logo</label>
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center border-dashed">
                  <span className="text-xs text-slate-400">150x150</span>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
                  <Upload className="w-4 h-4"/> Upload New
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Company Name</label>
              <input type="text" value={org?.name || ''} onChange={e => setOrg({...org, name: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-brand-primary focus:border-brand-primary" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Default Currency</label>
              <select value={org?.currency?.id || org?.currency_id || ''} onChange={e => {
                const curId = parseInt(e.target.value);
                setOrg({...org, currency_id: curId, currency: currencies.find(c => c.id === curId)});
              }} className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-brand-primary focus:border-brand-primary">
                <option value="">Select a currency</option>
                {currencies.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.symbol})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Payout Account (Stripe Connect ID)</label>
              <input type="text" value={org?.payout_account_id || ''} onChange={e => setOrg({...org, payout_account_id: e.target.value})} placeholder="acct_1Ou..." className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-brand-primary focus:border-brand-primary" />
              <p className="text-xs text-slate-500 mt-1">This account will receive all directly routed payouts from your customer bookings.</p>
            </div>

            <button onClick={handleUpdateWorkspace} className="bg-brand-primary text-white px-6 py-2 rounded-lg font-medium hover:bg-slate-800">Save Changes</button>
          </div>
        </div>
      )}

      {activeTab === 'Billing & Plans' && (
        <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2"><CreditCard className="w-5 h-5"/> Current Subscription</h2>
            <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between border border-slate-100">
              <div>
                <p className="font-bold text-slate-900">Professional Plan</p>
                <p className="text-sm text-slate-500">Renews on April 24, 2026</p>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full uppercase">Active</span>
            </div>
            <div className="mt-6 flex gap-3">
              <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel Plan</button>
              <button className="px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-slate-800">View Invoices</button>
            </div>
          </div>

          <h3 className="text-lg font-bold text-slate-900 mt-8 mb-4">Available Plans</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border-2 border-brand-primary bg-brand-primary/5 rounded-2xl p-6 relative">
              <div className="absolute top-0 right-0 bg-brand-primary text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg border border-brand-primary shadow-sm shadow-brand-primary/20">CURRENT</div>
              <h4 className="font-bold text-slate-900">Professional</h4>
              <p className="text-2xl font-bold mt-2 text-brand-primary">{currencySymbol}49<span className="text-sm font-normal text-slate-500">/mo</span></p>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li className="flex gap-2 items-center"><Check className="w-4 h-4 text-brand-primary"/> Unlimited products</li>
                <li className="flex gap-2 items-center"><Check className="w-4 h-4 text-brand-primary"/> 3 Users</li>
                <li className="flex gap-2 items-center"><Check className="w-4 h-4 text-brand-primary"/> Basic Payout Routing</li>
              </ul>
            </div>
            <div className="border border-slate-200 rounded-2xl p-6 hover:border-brand-primary/50 transition-colors cursor-pointer bg-white">
              <h4 className="font-bold text-slate-900">Premium</h4>
              <p className="text-2xl font-bold mt-2 text-slate-800">{currencySymbol}99<span className="text-sm font-normal text-slate-500">/mo</span></p>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li className="flex gap-2 items-center"><Check className="w-4 h-4 text-brand-primary"/> Everything in Pro</li>
                <li className="flex gap-2 items-center"><Check className="w-4 h-4 text-brand-primary"/> Custom domain</li>
                <li className="flex gap-2 items-center"><Check className="w-4 h-4 text-brand-primary"/> Automated Webhooks</li>
              </ul>
              <button className="w-full mt-6 bg-brand-primary text-white py-2 rounded-lg font-medium hover:bg-slate-800 transition-colors shadow-md active:translate-y-px">Upgrade to Premium</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Team' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2"><Shield className="w-5 h-5"/> Team Management</h2>
          <div className="space-y-4">
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-primary text-white rounded-full flex items-center justify-center font-bold">
                    {u.first_name?.[0]}{u.last_name?.[0]}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{u.first_name} {u.last_name} {u.is_superuser && '(Superadmin)'}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium bg-slate-200 text-slate-700 px-2.5 py-1 rounded-full border border-slate-300">
                    {u.role || 'Member'}
                  </span>
                  
                  <div className="flex gap-2 ml-4">
                    <button onClick={() => handleTriggerReset(u.id)} className="text-xs px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors shadow-sm text-slate-600 font-medium">
                      Send Reset
                    </button>
                    <button onClick={() => handleDeactivate(u.id)} className={`text-xs px-3 py-1.5 border rounded-lg transition-colors shadow-sm font-medium ${u.is_active ? 'border-amber-200 text-amber-700 hover:bg-amber-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`}>
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => handleDeleteUser(u.id)} className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition-colors" title="Delete User">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            <button 
              onClick={() => setShowAddUserModal(true)}
              className="w-full border border-dashed border-slate-300 rounded-xl p-4 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:border-brand-primary hover:text-brand-primary transition-colors flex justify-center items-center gap-2"
            >
              <Plus className="w-4 h-4"/> Invite Team Member
            </button>
          </div>
        </div>
      )}

      {/* Add Team Member Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">Add Team Member</h2>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                  <input required type="text" value={newUser.first_name} onChange={e => setNewUser({...newUser, first_name: e.target.value})} className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-brand-primary bg-white" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                  <input required type="text" value={newUser.last_name} onChange={e => setNewUser({...newUser, last_name: e.target.value})} className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-brand-primary bg-white" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input required type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-brand-primary bg-white" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Temporary Password</label>
                <input required type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-brand-primary bg-white" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-brand-primary bg-white">
                  <option>Admin</option>
                  <option>Staff</option>
                  <option>Viewer</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddUserModal(false)} className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-50 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-brand-primary text-white font-medium rounded-xl hover:bg-brand-primary-hover transition-colors shadow-sm shadow-brand-primary/20">Add Member</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
