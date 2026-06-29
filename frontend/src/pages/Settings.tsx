import React, { useState, useEffect, useRef, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../utils/cropImage';
import { useNotification } from '../context/NotificationContext';
import { Building, Upload, CreditCard, Shield, Check, Plus, X, Trash2, Landmark, Edit2 } from 'lucide-react';
import { UserService, AuthService, OrganizationService, CurrencyService, BankAccountService, PaymentService } from '../api';
import { format } from 'date-fns';

export function Settings() {
  const { showNotification, showConfirm } = useNotification();
  const [activeTab, setActiveTab] = useState('Workspace');
  
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ first_name: '', last_name: '', email: '', password: '', role: 'Admin' });

  // Password Reset Modal state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState('');
  const [isSettingPassword, setIsSettingPassword] = useState(false);

  const [org, setOrg] = useState<any>(null);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const currencySymbol = localStorage.getItem('currencySymbol') || '$';
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [logoImageToCrop, setLogoImageToCrop] = useState<string | null>(null);

  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null);
  const [subscriptionPayments, setSubscriptionPayments] = useState<any[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);

  useEffect(() => {
    if (activeTab === 'Billing & Plans' && currentUser) {
      PaymentService.getOrganizationSubscription().then(res => setSubscriptionDetails(res.data)).catch(console.error);
      PaymentService.getSubscriptionPayments().then(res => setSubscriptionPayments(res.data.results || res.data)).catch(console.error);
      UserService.getSubscriptionPlans().then(res => setSubscriptionPlans((res.data.results || res.data).filter((p: any) => p.is_active))).catch(console.error);
    }
  }, [activeTab, currentUser]);

  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [editingBankAccount, setEditingBankAccount] = useState<any>(null);
  const [bankFormData, setBankFormData] = useState({
    bank_name: '', account_number: '', account_name: '', account_type: 'savings'
  });

  useEffect(() => {
    fetchWorkspaceData();
    fetchCurrencies();
    fetchCurrentUser();
    fetchBankAccounts();
  }, []);

  const fetchBankAccounts = async () => {
    try {
      const res = await BankAccountService.getAll();
      setBankAccounts(res.data.results || res.data);
    } catch (e) {
      console.error("Failed to fetch bank accounts", e);
    }
  };

  const handleLogoFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !org?.id) return;
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setLogoImageToCrop(reader.result?.toString() || null);
      setIsCropModalOpen(true);
    });
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleConfirmCrop = async () => {
    if (!logoImageToCrop || !croppedAreaPixels || !org?.id) return;
    try {
      setIsUploadingLogo(true);
      const croppedImage = await getCroppedImg(logoImageToCrop, croppedAreaPixels, 0);
      if (!croppedImage) throw new Error("Failed to crop image");
      const res = await OrganizationService.uploadLogo(org.id, croppedImage);
      setOrg(res.data);
      showNotification("Logo updated!", 'success');
      setIsCropModalOpen(false);
      setLogoImageToCrop(null);
    } catch (err) {
      console.error("Failed to crop/upload logo", err);
      showNotification("Failed to upload logo.", 'error');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const openAddBankModal = () => {
    setEditingBankAccount(null);
    setBankFormData({ bank_name: '', account_number: '', account_name: '', account_type: 'savings' });
    setIsBankModalOpen(true);
  };

  const openEditBankModal = (account: any) => {
    setEditingBankAccount(account);
    setBankFormData({
      bank_name: account.bank_name || '',
      account_number: account.account_number || '',
      account_name: account.account_name || '',
      account_type: account.account_type || 'savings'
    });
    setIsBankModalOpen(true);
  };

  const handleSaveBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBankAccount) {
        await BankAccountService.update(editingBankAccount.bank_account_id, bankFormData);
      } else {
        await BankAccountService.create(bankFormData);
      }
      setIsBankModalOpen(false);
      showNotification(editingBankAccount ? "Bank account updated!" : "Bank account added!", 'success');
      fetchBankAccounts();
    } catch (err) {
      console.error("Failed to save bank account", err);
      showNotification("Failed to save bank account.", 'error');
    }
  };

  const handleDeleteBankAccount = (id: number) => {
    showConfirm({
      title: 'Delete Bank Account',
      message: 'Are you sure you want to delete this bank account? Invoices referencing it will no longer show these payment details on download.',
      type: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await BankAccountService.delete(id);
          showNotification("Bank account deleted.", 'success');
          fetchBankAccounts();
        } catch (err) {
          console.error("Failed to delete bank account", err);
          showNotification("Failed to delete bank account.", 'error');
        }
      }
    });
  };

  const fetchCurrentUser = async () => {
    try {
      const res = await AuthService.getMe();
      setCurrentUser(res.data);
    } catch (e) {
      console.error("Failed to fetch current user", e);
    }
  };

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
          address: org.address,
          phone_number: org.phone_number,
          email: org.email,
          tax_id: org.tax_id,
          payout_account_id: org.payout_account_id,
          currency_id: org.currency?.id || org.currency_id || null,
          primary_color: org.primary_color
        };
        await OrganizationService.patch(org.id, payload);
        showNotification("Workspace updated! Settings are saved.", 'success');
        fetchWorkspaceData();
      }
    } catch (e) {
      console.error(e);
      showNotification("Failed to update workspace.", 'error');
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
      showNotification("All fields are required.", 'warning');
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
      showNotification("Team member added!", 'success');
    } catch (e) {
      console.error(e);
      showNotification("Failed to add user.", 'error');
    }
  };

  const handleRemoveUser = async (id: number) => {
    showConfirm({
      title: 'Remove Team Member',
      message: 'Are you sure you want to remove this team member? They will lose all access immediately.',
      type: 'danger',
      confirmText: 'Remove',
      onConfirm: async () => {
        try {
          await UserService.delete(id);
          fetchUsers();
          showNotification('Team member removed.', 'success');
        } catch (e) {
          console.error(e);
          showNotification('Failed to remove user.', 'error');
        }
      }
    });
  };

  const handleTriggerReset = async (id: number) => {
    showConfirm({
      title: 'Send Password Reset',
      message: 'Send a password reset email to this user?',
      onConfirm: async () => {
        try {
          await UserService.adminTriggerReset(id);
          showNotification('Reset email sent successfully.', 'success');
        } catch (e) {
          console.error(e);
          showNotification('Failed to trigger reset.', 'error');
        }
      }
    });
  };

  const handleDeactivate = async (id: number) => {
    try {
      await UserService.deactivate(id);
      fetchUsers();
    } catch (e) {
      console.error(e);
      showNotification('Failed to toggle active status.', 'error');
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;

    try {
      setIsSettingPassword(true);
      await UserService.adminChangePassword(selectedUser.id, { new_password: newPassword });
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

  const openRemoveTeamModal = (user: any) => {
    setMemberToRemove(user);
    setShowConfirmModal(true);
  };

  const [isUpgrading, setIsUpgrading] = useState(false);

  const handleUpgrade = async (plan_name: string) => {
    try {
      setIsUpgrading(true);
      const res = await PaymentService.createSubscriptionLink(plan_name);
      if (res.data.payment_url) {
        window.location.href = res.data.payment_url;
      }
    } catch (e: any) {
      showNotification(e.response?.data?.error || "Failed to initialize payment", "error");
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-main)]">Settings</h1>
        <p className="text-[var(--text-muted)]">Manage your workspace, billing, and team members.</p>
      </div>

      <div className="flex gap-8 border-b border-[var(--border-soft)]">
        {['Workspace', ...(currentUser?.role === 'admin' || currentUser?.is_superuser ? ['Billing & Plans', 'Team'] : [])].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-brand-primary text-brand-primary' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Workspace' && (
        <div className="space-y-6 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-soft)] shadow-sm p-6">
          <h2 className="text-lg font-bold text-[var(--text-main)] mb-6 flex items-center gap-2"><Building className="w-5 h-5"/> Workspace Profile</h2>
          <p className="text-xs text-[var(--text-muted)] -mt-4 mb-6">This branding appears on every invoice and receipt you generate.</p>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">Company Logo</label>
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl flex items-center justify-center border-dashed overflow-hidden">
                  {org?.company_logo ? (
                    <img src={org.company_logo.startsWith('http') ? org.company_logo : `${import.meta.env.VITE_API_URL?.replace('/api', '') || ''}${org.company_logo.startsWith('/') ? '' : '/'}${org.company_logo}`} alt="Company logo" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-xs text-center text-[var(--text-muted)] px-1">Square Logo</span>
                  )}
                </div>
                <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoFileSelected} className="hidden" />
                <button
                  type="button"
                  disabled={isUploadingLogo || !org?.id}
                  onClick={() => logoInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 border border-[var(--border-soft)] rounded-lg text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--bg-app)] text-[var(--text-main)] transition-colors disabled:opacity-50"
                >
                  <Upload className="w-4 h-4"/> {isUploadingLogo ? 'Uploading...' : 'Upload New'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Company Name</label>
              <input type="text" value={org?.name || ''} onChange={e => setOrg({...org, name: e.target.value})} className="w-full px-3 py-2 border border-[var(--border-soft)] bg-[var(--bg-app)] text-[var(--text-main)] rounded-lg focus:outline-none focus:ring-brand-primary focus:border-brand-primary" />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Company Address</label>
              <textarea value={org?.address || ''} onChange={e => setOrg({...org, address: e.target.value})} rows={2} className="w-full px-3 py-2 border border-[var(--border-soft)] bg-[var(--bg-app)] text-[var(--text-main)] rounded-lg focus:outline-none focus:ring-brand-primary focus:border-brand-primary resize-none" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Phone Number</label>
                <input type="tel" value={org?.phone_number || ''} onChange={e => setOrg({...org, phone_number: e.target.value})} className="w-full px-3 py-2 border border-[var(--border-soft)] bg-[var(--bg-app)] text-[var(--text-main)] rounded-lg focus:outline-none focus:ring-brand-primary focus:border-brand-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Contact Email</label>
                <input type="email" value={org?.email || ''} onChange={e => setOrg({...org, email: e.target.value})} className="w-full px-3 py-2 border border-[var(--border-soft)] bg-[var(--bg-app)] text-[var(--text-main)] rounded-lg focus:outline-none focus:ring-brand-primary focus:border-brand-primary" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Tax ID / VAT Number</label>
              <input type="text" value={org?.tax_id || ''} onChange={e => setOrg({...org, tax_id: e.target.value})} className="w-full px-3 py-2 border border-[var(--border-soft)] bg-[var(--bg-app)] text-[var(--text-main)] rounded-lg focus:outline-none focus:ring-brand-primary focus:border-brand-primary" />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Default Currency</label>
              <select value={org?.currency?.id || org?.currency_id || ''} onChange={e => {
                const curId = parseInt(e.target.value);
                setOrg({...org, currency_id: curId, currency: currencies.find(c => c.id === curId)});
              }} className="w-full px-3 py-2 border border-[var(--border-soft)] bg-[var(--bg-app)] text-[var(--text-main)] rounded-lg focus:outline-none focus:ring-brand-primary focus:border-brand-primary">
                <option value="" className="bg-[var(--bg-surface)]">Select a currency</option>
                {currencies.map(c => (
                  <option key={c.id} value={c.id} className="bg-[var(--bg-surface)]">{c.name} ({c.symbol})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Primary Brand Color</label>
              <div className="flex items-center gap-3">
                <input 
                  type="color" 
                  value={org?.primary_color || '#7c3aed'} 
                  onChange={e => setOrg({...org, primary_color: e.target.value})} 
                  className="w-12 h-12 p-1 border border-[var(--border-soft)] bg-[var(--bg-app)] rounded-lg cursor-pointer" 
                />
                <input 
                  type="text" 
                  value={org?.primary_color || '#7c3aed'} 
                  onChange={e => setOrg({...org, primary_color: e.target.value})} 
                  placeholder="#7c3aed"
                  className="w-32 px-3 py-2 border border-[var(--border-soft)] bg-[var(--bg-app)] text-[var(--text-main)] rounded-lg focus:outline-none focus:ring-brand-primary focus:border-brand-primary uppercase font-mono text-sm" 
                />
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1">Used for invoices and receipts to match your brand.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Payout Account (Stripe Connect ID)</label>
              <input type="text" value={org?.payout_account_id || ''} onChange={e => setOrg({...org, payout_account_id: e.target.value})} placeholder="acct_1Ou..." className="w-full px-3 py-2 border border-[var(--border-soft)] bg-[var(--bg-app)] text-[var(--text-main)] rounded-lg focus:outline-none focus:ring-brand-primary focus:border-brand-primary" />
              <p className="text-xs text-[var(--text-muted)] mt-1">This account will receive all directly routed payouts from your customer bookings.</p>
            </div>

            <button onClick={handleUpdateWorkspace} className="bg-brand-primary text-brand-accent px-6 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity">Save Changes</button>
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-soft)] shadow-sm p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center gap-2"><Landmark className="w-5 h-5"/> Bank Accounts</h2>
            <button onClick={openAddBankModal} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-brand-primary/10 text-brand-primary border border-brand-primary/20 rounded-lg hover:bg-brand-primary/20 transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Account
            </button>
          </div>
          <p className="text-xs text-[var(--text-muted)] mb-6">Pick which account to display when generating an invoice's payment details.</p>

          <div className="space-y-3">
            {bankAccounts.length === 0 && (
              <p className="text-sm text-[var(--text-muted)] italic py-4 text-center">No bank accounts added yet.</p>
            )}
            {bankAccounts.map(account => (
              <div key={account.bank_account_id} className="flex items-center justify-between p-4 border border-[var(--border-soft)] rounded-xl bg-[var(--bg-app)]">
                <div>
                  <p className="font-bold text-[var(--text-main)] text-sm">{account.bank_name} · {account.account_number}</p>
                  <p className="text-xs text-[var(--text-muted)]">{account.account_name} — {account.account_type === 'current' ? 'Current' : 'Savings'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openEditBankModal(account)} className="p-1.5 text-[var(--text-muted)] hover:text-brand-primary transition-colors" title="Edit">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteBankAccount(account.bank_account_id)} className="p-1.5 text-[var(--text-muted)] hover:text-rose-500 transition-colors" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>
      )}

      {activeTab === 'Billing & Plans' && (
        <div className="space-y-6 max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-soft)] shadow-sm p-6">
            <h2 className="text-lg font-bold text-[var(--text-main)] mb-2 flex items-center gap-2"><CreditCard className="w-5 h-5"/> Current Subscription</h2>
            <div className="bg-[var(--bg-app)] rounded-xl p-4 flex items-center justify-between border border-[var(--border-soft)]">
              <div>
                <p className="font-bold text-[var(--text-main)] capitalize">{currentUser?.subscription_plan || 'free'} Plan</p>
                {(currentUser?.subscription_plan || 'free') !== 'free' && subscriptionDetails?.current_period_end && (
                  <p className="text-sm text-[var(--text-muted)]">Renews on {format(new Date(subscriptionDetails.current_period_end), 'MMMM d, yyyy')}</p>
                )}
              </div>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase border ${
                (currentUser?.subscription_plan || 'free') === 'free' 
                  ? 'bg-gray-500/10 text-gray-500 border-gray-500/20' 
                  : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
              }`}>
                {(currentUser?.subscription_plan || 'free') === 'free' ? 'Free' : 'Active'}
              </span>
            </div>
            <div className="mt-6 flex gap-3">
              {(currentUser?.subscription_plan || 'free') !== 'free' && (
                <button className="px-4 py-2 border border-[var(--border-soft)] rounded-lg text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--bg-app)] transition-colors">Cancel Plan</button>
              )}
            </div>
          </div>


          <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-soft)] shadow-sm overflow-hidden">
            <div className="p-4 border-b border-[var(--border-soft)]">
              <h2 className="font-bold text-[var(--text-main)]">Subscription Payment History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--bg-app)] text-[var(--text-muted)] uppercase">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-soft)]">
                  {subscriptionPayments.map(payment => (
                    <tr key={payment.id} className="hover:bg-[var(--bg-app)]">
                      <td className="px-4 py-3 text-[var(--text-muted)]">
                        {payment.created_at ? format(new Date(payment.created_at), 'MMM d, yyyy') : '-'}
                      </td>
                      <td className="px-4 py-3 font-medium text-[var(--text-main)]">₦{payment.amount}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500">
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)] font-mono text-xs">{payment.reference || '-'}</td>
                    </tr>
                  ))}
                  {subscriptionPayments.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-[var(--text-muted)]">No payment history found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <h3 className="text-lg font-bold text-[var(--text-main)] mt-8 mb-4">Available Plans</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subscriptionPlans.map(plan => {
              const currentPlanName = currentUser?.subscription_plan || 'free';
              const isCurrent = currentPlanName.toLowerCase() === plan.name.toLowerCase();
              return (
                <div key={plan.id} className={`border ${isCurrent ? 'border-brand-primary bg-brand-primary/10' : 'border-[var(--border-soft)] bg-[var(--bg-surface)] hover:border-brand-primary/50'} rounded-2xl p-6 relative transition-colors`}>
                  {isCurrent && (
                    <div className="absolute top-0 right-0 bg-brand-primary text-brand-accent text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg border border-brand-primary shadow-sm shadow-brand-primary/20">CURRENT</div>
                  )}
                  <h4 className="font-bold text-[var(--text-main)]">{plan.name}</h4>
                  <p className="text-2xl font-bold mt-2 text-[var(--text-main)]">{currencySymbol}{plan.price}<span className="text-sm font-normal text-[var(--text-muted)]">/{plan.billing_cycle === 'yearly' ? 'yr' : 'mo'}</span></p>
                  
                  <ul className="mt-4 space-y-2 text-sm text-[var(--text-muted)]">
                    {plan.has_invoice && (
                      <li className="flex gap-2 items-center"><Check className="w-4 h-4 text-brand-primary"/> Invoicing ({plan.max_invoices_per_month === -1 ? 'Unlimited' : plan.max_invoices_per_month}/month)</li>
                    )}
                    {plan.has_booking && (
                      <li className="flex gap-2 items-center"><Check className="w-4 h-4 text-brand-primary"/> Inventory bookings ({plan.max_inventory_booking_per_month === -1 ? 'Unlimited' : plan.max_inventory_booking_per_month}/month)</li>
                    )}
                  </ul>
                  {!isCurrent && (
                    <button 
                      onClick={() => handleUpgrade(plan.name.toLowerCase())} 
                      disabled={isUpgrading}
                      className="w-full mt-6 bg-brand-primary text-brand-accent py-2 rounded-lg font-medium hover:opacity-90 transition-opacity shadow-md active:translate-y-px disabled:opacity-50">
                      {isUpgrading ? 'Redirecting...' : `Upgrade to ${plan.name}`}
                    </button>
                  )}
                </div>
              );
            })}
            {subscriptionPlans.length === 0 && (
              <div className="col-span-full text-center py-8 text-[var(--text-muted)]">
                No subscription plans available.
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'Team' && (
        <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-soft)] shadow-sm p-6 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-lg font-bold text-[var(--text-main)] mb-6 flex items-center gap-2"><Shield className="w-5 h-5"/> Team Management</h2>
          <div className="space-y-4">
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between p-4 border border-[var(--border-soft)] rounded-xl bg-[var(--bg-app)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-primary text-brand-accent rounded-full flex items-center justify-center font-bold">
                    {u.first_name?.[0]}{u.last_name?.[0]}
                  </div>
                  <div>
                    <p className="font-bold text-[var(--text-main)] text-sm">{u.first_name} {u.last_name} {u.is_superuser && '(Superadmin)'}</p>
                    <p className="text-xs text-[var(--text-muted)]">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium bg-[var(--bg-surface)] text-[var(--text-muted)] px-2.5 py-1 rounded-full border border-[var(--border-soft)]">
                    {u.role || 'Member'}
                  </span>
                  
                  <div className="flex gap-2 ml-4">
                    <button onClick={() => handleTriggerReset(u.id)} className="text-xs px-3 py-1.5 border border-[var(--border-soft)] rounded-lg hover:bg-[var(--bg-surface)] transition-colors shadow-sm text-[var(--text-muted)] font-medium">
                      Send Reset
                    </button>
                    <button 
                      onClick={() => {
                        setSelectedUser(u);
                        setIsPasswordModalOpen(true);
                      }}
                      className="text-xs px-3 py-1.5 bg-brand-primary/10 text-brand-primary border border-brand-primary/20 rounded-lg hover:bg-brand-primary/20 transition-colors shadow-sm font-medium"
                    >
                      Set Password
                    </button>
                    {u.id !== currentUser?.id && (
                      <button onClick={() => handleDeactivate(u.id)} className={`text-xs px-3 py-1.5 border rounded-lg transition-colors shadow-sm font-medium ${u.is_active ? 'border-amber-500/30 text-amber-500 hover:bg-amber-500/10' : 'border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10'}`}>
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                    {u.id !== currentUser?.id && (
                      <button onClick={() => handleRemoveUser(u.id)} className="text-rose-500 hover:bg-rose-500/10 p-1.5 rounded-lg transition-colors" title="Delete User">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            <button 
              onClick={() => setShowAddUserModal(true)}
              className="w-full border border-dashed border-[var(--border-soft)] bg-[var(--bg-app)] rounded-xl p-4 text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:border-brand-primary hover:text-brand-primary transition-colors flex justify-center items-center gap-2"
            >
              <Plus className="w-4 h-4"/> Invite Team Member
            </button>
          </div>
        </div>
      )}

      {/* Add Team Member Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-[var(--bg-app)]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-surface)] rounded-2xl max-w-md w-full shadow-xl border border-[var(--border-soft)]">
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-soft)]">
              <h2 className="text-xl font-bold text-[var(--text-main)]">Add Team Member</h2>
              <button onClick={() => setShowAddUserModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">First Name</label>
                  <input required type="text" value={newUser.first_name} onChange={e => setNewUser({...newUser, first_name: e.target.value})} className="w-full border border-[var(--border-soft)] rounded-xl p-2.5 outline-none focus:border-brand-primary bg-[var(--bg-app)] text-[var(--text-main)]" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Last Name</label>
                  <input required type="text" value={newUser.last_name} onChange={e => setNewUser({...newUser, last_name: e.target.value})} className="w-full border border-[var(--border-soft)] rounded-xl p-2.5 outline-none focus:border-brand-primary bg-[var(--bg-app)] text-[var(--text-main)]" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Email</label>
                <input required type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full border border-[var(--border-soft)] rounded-xl p-2.5 outline-none focus:border-brand-primary bg-[var(--bg-app)] text-[var(--text-main)]" />
              </div>
 
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Temporary Password</label>
                <input required type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full border border-[var(--border-soft)] rounded-xl p-2.5 outline-none focus:border-brand-primary bg-[var(--bg-app)] text-[var(--text-main)]" />
              </div>
 
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Role</label>
                <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="w-full border border-[var(--border-soft)] rounded-xl p-2.5 outline-none focus:border-brand-primary bg-[var(--bg-app)] text-[var(--text-main)]">
                  <option className="bg-[var(--bg-surface)]">Admin</option>
                  <option className="bg-[var(--bg-surface)]">Staff</option>
                  <option className="bg-[var(--bg-surface)]">Viewer</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowAddUserModal(false)} className="px-5 py-2.5 text-[var(--text-muted)] font-medium hover:bg-[var(--bg-app)] rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-brand-primary text-brand-accent font-medium rounded-xl hover:opacity-90 transition-opacity shadow-sm shadow-brand-primary/20">Add Member</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Set Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-[var(--bg-app)]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-surface)] rounded-2xl max-w-md w-full shadow-xl overflow-hidden border border-[var(--border-soft)]">
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-soft)] bg-[var(--bg-app)]/50">
              <div>
                <h2 className="text-xl font-bold text-[var(--text-main)]">Set Team Member Password</h2>
                <p className="text-xs text-[var(--text-muted)]">Updating password for: {selectedUser?.email}</p>
              </div>
              <button 
                onClick={() => {
                  setIsPasswordModalOpen(false);
                  setNewPassword('');
                }} 
                className="text-[var(--text-muted)] hover:text-[var(--text-main)]"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSetPassword} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">New Password</label>
                <input 
                  required 
                  type="password" 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  className="w-full border border-[var(--border-soft)] rounded-xl p-2.5 outline-none focus:border-brand-primary bg-[var(--bg-app)] text-[var(--text-main)]" 
                  placeholder="Enter new password"
                  autoFocus
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => {
                    setIsPasswordModalOpen(false);
                    setNewPassword('');
                  }} 
                  className="px-5 py-2.5 text-[var(--text-muted)] font-medium hover:bg-[var(--bg-app)] rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSettingPassword || !newPassword}
                  className="px-5 py-2.5 bg-brand-primary text-brand-accent font-medium rounded-xl hover:opacity-90 transition-opacity shadow-sm shadow-brand-primary/20 disabled:opacity-50"
                >
                  {isSettingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Bank Account Modal */}
      {isBankModalOpen && (
        <div className="fixed inset-0 bg-[var(--bg-app)]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[var(--bg-surface)] rounded-2xl max-w-md w-full shadow-xl overflow-hidden border border-[var(--border-soft)]">
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-soft)] bg-[var(--bg-app)]/50">
              <h2 className="text-xl font-bold text-[var(--text-main)]">{editingBankAccount ? 'Edit Bank Account' : 'Add Bank Account'}</h2>
              <button onClick={() => setIsBankModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSaveBankAccount} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Bank Name</label>
                <input required type="text" value={bankFormData.bank_name} onChange={e => setBankFormData({...bankFormData, bank_name: e.target.value})} className="w-full border border-[var(--border-soft)] rounded-xl p-2.5 outline-none focus:border-brand-primary bg-[var(--bg-app)] text-[var(--text-main)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Account Number</label>
                <input required type="text" value={bankFormData.account_number} onChange={e => setBankFormData({...bankFormData, account_number: e.target.value})} className="w-full border border-[var(--border-soft)] rounded-xl p-2.5 outline-none focus:border-brand-primary bg-[var(--bg-app)] text-[var(--text-main)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Account Name</label>
                <input required type="text" value={bankFormData.account_name} onChange={e => setBankFormData({...bankFormData, account_name: e.target.value})} className="w-full border border-[var(--border-soft)] rounded-xl p-2.5 outline-none focus:border-brand-primary bg-[var(--bg-app)] text-[var(--text-main)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Account Type</label>
                <select value={bankFormData.account_type} onChange={e => setBankFormData({...bankFormData, account_type: e.target.value})} className="w-full border border-[var(--border-soft)] rounded-xl p-2.5 outline-none focus:border-brand-primary bg-[var(--bg-app)] text-[var(--text-main)]">
                  <option value="savings" className="bg-[var(--bg-surface)]">Savings</option>
                  <option value="current" className="bg-[var(--bg-surface)]">Current</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsBankModalOpen(false)} className="px-5 py-2.5 text-[var(--text-muted)] font-medium hover:bg-[var(--bg-app)] rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-brand-primary text-brand-accent font-medium rounded-xl hover:opacity-90 transition-opacity shadow-sm shadow-brand-primary/20">
                  {editingBankAccount ? 'Save Changes' : 'Add Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Crop Modal */}
      {isCropModalOpen && logoImageToCrop && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[var(--bg-surface)] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-[var(--border-soft)] flex flex-col">
            <div className="p-4 border-b border-[var(--border-soft)] flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-main)]">Crop Logo</h2>
              <button onClick={() => { setIsCropModalOpen(false); setLogoImageToCrop(null); }} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative w-full h-[300px] sm:h-[400px] bg-black">
              <Cropper
                image={logoImageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            <div className="p-4 flex justify-between items-center gap-4 bg-[var(--bg-surface)]">
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full"
              />
              <button onClick={handleConfirmCrop} disabled={isUploadingLogo} className="px-5 py-2 bg-brand-primary text-brand-accent font-medium rounded-xl hover:opacity-90 transition-opacity whitespace-nowrap">
                {isUploadingLogo ? 'Saving...' : 'Save Logo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
