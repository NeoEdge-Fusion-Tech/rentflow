/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { Clients } from './pages/Clients';
import { Bookings } from './pages/Bookings';
import { Payments } from './pages/Payments';
import { Scanner } from './pages/Scanner';
import { Settings } from './pages/Settings';
import { Organizations } from './pages/SuperAdmin/Organizations';
import { OrganizationDetail } from './pages/SuperAdmin/OrganizationDetail';
import { Users as SuperAdminUsers } from './pages/SuperAdmin/Users';
import { Currencies } from './pages/SuperAdmin/Currencies';
import { OrganizationSelector } from './components/OrganizationSelector';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Onboarding } from './pages/Onboarding';
import { VerifyEmail } from './pages/VerifyEmail';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Menu, Bell, User, LogOut, Settings as SettingsIcon, X, AlertCircle } from 'lucide-react';
import { ThemeToggle } from './components/ThemeToggle';
import { UserHint } from './components/UserHint';
import { NotificationService, AuthService } from './api';
import { useTheme } from './context/ThemeContext';
import { useNotification } from './context/NotificationContext';

function AppLayout() {
  const { theme, toggleTheme } = useTheme();
  const { showNotification } = useNotification();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState({ first_name: '', last_name: '', email: '' });
  
  const location = useLocation();
  const navigate = useNavigate();

  const isAuthRoute = ['/login', '/register', '/onboarding', '/verify-email', '/forgot-password', '/reset-password'].includes(location.pathname);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token && !isAuthRoute) {
      navigate('/login');
    } else if (token && isAuthRoute) {
      navigate('/');
    }

    if (token) {
      fetchNotifications();
      fetchMe();
    }
  }, [location.pathname, navigate, isAuthRoute]);

  const fetchNotifications = async () => {
    try {
      const res = await NotificationService.getAll();
      setNotifications(res.data.results || res.data);
    } catch(e) { console.error(e); }
  };

  const fetchMe = async () => {
    try {
      const res = await AuthService.getMe();
      setCurrentUser(res.data);
      setProfileData({
        first_name: res.data.first_name || '',
        last_name: res.data.last_name || '',
        email: res.data.email || ''
      });
      localStorage.setItem('currencySymbol', res.data.currency_symbol || '$');
    } catch(e) { console.error(e); }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await AuthService.updateMe({
        first_name: profileData.first_name,
        last_name: profileData.last_name
      });
      setShowProfileModal(false);
      fetchMe();
      showNotification('Profile updated successfully!', 'success');
    } catch(e) {
      console.error(e);
      showNotification('Failed to update profile.', 'error');
    }
  };

  const handleDeleteAccount = async () => {
    showConfirm({
      title: 'Delete Account',
      message: 'Are you absolutely sure you want to delete your account? This action cannot be undone.',
      type: 'danger',
      confirmText: 'Delete My Account',
      onConfirm: async () => {
        try {
          await AuthService.deleteMe();
          localStorage.removeItem('token');
          navigate('/login');
        } catch(e) {
          console.error(e);
          showNotification('Failed to delete account.', 'error');
        }
      }
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (isAuthRoute) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/onboarding" element={<Onboarding />} />
      </Routes>
    );
  }

  return (
    <div className="flex h-screen bg-[var(--bg-app)] text-[var(--text-main)] overflow-hidden transition-colors duration-300">
      <Sidebar 
        isOpen={isSidebarOpen} 
        toggle={() => setIsSidebarOpen(!isSidebarOpen)} 
        isSuperuser={currentUser?.is_superuser}
        currentUser={currentUser}
      />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Header */}
          <header className="h-16 bg-[var(--bg-surface)] border-b border-[var(--border-soft)] flex items-center px-4 lg:px-8 shrink-0 transition-colors duration-300">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-[var(--text-muted)] hover:bg-[var(--border-subtle)] rounded-lg lg:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="ml-4 lg:ml-0 flex-1 flex items-center gap-4">
              <div className="relative max-w-md hidden md:block">
                {/* Global search could go here */}
              </div>
              {currentUser?.is_superuser && <OrganizationSelector />}
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <ThemeToggle className="bg-transparent border-0 shadow-none p-2 rounded-full hover:bg-[var(--border-subtle)]" />
              
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-[var(--text-muted)] hover:bg-[var(--bg-app)] rounded-full transition-colors"
                >
                  <Bell className="w-5 h-5 text-[var(--text-main)]" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-brand-primary rounded-full ring-2 ring-[var(--bg-surface)]"></span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-[var(--bg-surface)] rounded-xl shadow-xl border border-[var(--border-soft)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b border-[var(--border-soft)] flex justify-between items-center bg-[var(--bg-app)]/50">
                      <h3 className="font-bold text-[var(--text-main)] text-sm">Notifications</h3>
                      {unreadCount > 0 && (
                        <button 
                          onClick={async () => {
                            await NotificationService.markAllRead();
                            fetchNotifications();
                          }} 
                          className="text-xs text-brand-primary font-medium hover:text-brand-accent transition-colors"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-sm text-[var(--text-muted)]">No notifications yet.</div>
                      ) : (
                        notifications.map((notif: any) => (
                          <div 
                            key={notif.id} 
                            onClick={async () => {
                              if (!notif.is_read) {
                                await NotificationService.markRead(notif.id);
                                fetchNotifications();
                              }
                            }}
                            className={`p-4 border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-app)] transition-colors cursor-pointer ${notif.is_read ? 'opacity-70' : 'bg-brand-primary/5'}`}
                          >
                            <p className={`text-sm ${notif.is_read ? 'text-[var(--text-muted)]' : 'text-[var(--text-main)] font-medium'}`}>{notif.title || 'Notification'}</p>
                            <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{notif.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-right hidden sm:block border-l border-[var(--border-soft)] pl-4 ml-2">
                <p className="text-sm font-bold text-[var(--text-main)]">{currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : 'NeoEvent User'}</p>
                <p className="text-xs text-[var(--text-muted)] capitalize">{currentUser?.role || 'Operator'}</p>
              </div>
              
              <div className="relative">
                <button 
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="w-10 h-10 rounded-2xl bg-brand-primary flex items-center justify-center text-brand-accent font-bold shadow-lg shadow-brand-primary/10 hover:opacity-90 transition-opacity"
                >
                  {currentUser?.first_name?.[0] || 'U'}
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-[var(--bg-surface)] rounded-xl shadow-xl border border-[var(--border-soft)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b border-[var(--border-soft)] bg-[var(--bg-app)]/50">
                      <p className="font-bold text-[var(--text-main)] text-sm truncate">{currentUser?.email}</p>
                    </div>
                    <div className="p-2 space-y-1">
                      <button 
                        onClick={() => {
                          setShowProfileMenu(false);
                          setShowProfileModal(true);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-[var(--text-main)] hover:bg-[var(--bg-app)] flex items-center gap-2 rounded-lg transition-colors"
                      >
                        <User className="w-4 h-4 text-[var(--text-muted)]" /> Manage Profile
                      </button>
                      <button 
                        onClick={() => {
                          setShowProfileMenu(false);
                          navigate('/settings');
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-[var(--text-main)] hover:bg-[var(--bg-app)] flex items-center gap-2 rounded-lg transition-colors"
                      >
                        <SettingsIcon className="w-4 h-4 text-[var(--text-muted)]" /> Workspace Settings
                      </button>
                      <div className="border-t border-[var(--border-subtle)] my-1"></div>
                      <button 
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-2 text-sm text-rose-500 hover:bg-rose-500/10 flex items-center gap-2 rounded-lg transition-colors font-medium"
                      >
                        <LogOut className="w-4 h-4 text-rose-500" /> Log out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-8">
            <div className="max-w-7xl mx-auto">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/bookings" element={<Bookings />} />
                <Route path="/payments" element={<Payments />} />
                <Route path="/scanner" element={<Scanner />} />
                <Route path="/settings" element={<Settings />} />

                {/* Super Admin Routes */}
                <Route path="/superadmin/organizations" element={<Organizations />} />
                <Route path="/superadmin/organizations/:id" element={<OrganizationDetail />} />
                <Route path="/superadmin/users" element={<SuperAdminUsers />} />
                <Route path="/superadmin/currencies" element={<Currencies />} />
              </Routes>
            </div>
          </main>
        </div>
        
        <UserHint />

        {/* Profile Management Modal */}
        {showProfileModal && (
          <div className="fixed inset-0 bg-[var(--bg-app)]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-[var(--bg-surface)] rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200 border border-[var(--border-soft)]">
              <div className="flex items-center justify-between p-6 border-b border-[var(--border-soft)]">
                <h2 className="text-xl font-bold text-[var(--text-main)]">My Profile</h2>
                <button onClick={() => setShowProfileModal(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors p-1 rounded-lg hover:bg-[var(--bg-app)]">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6">
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">First Name</label>
                      <input type="text" value={profileData.first_name} onChange={e => setProfileData({...profileData, first_name: e.target.value})} className="w-full border border-[var(--border-soft)] rounded-xl p-2.5 outline-none focus:border-brand-primary bg-[var(--bg-app)] text-[var(--text-main)] transition-colors" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Last Name</label>
                      <input type="text" value={profileData.last_name} onChange={e => setProfileData({...profileData, last_name: e.target.value})} className="w-full border border-[var(--border-soft)] rounded-xl p-2.5 outline-none focus:border-brand-primary bg-[var(--bg-app)] text-[var(--text-main)] transition-colors" />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Email <span className="text-[var(--text-muted)] opacity-60 font-normal">(Cannot be changed directly)</span></label>
                    <input type="email" value={profileData.email} disabled className="w-full border border-[var(--border-soft)] rounded-xl p-2.5 outline-none bg-[var(--bg-app)] opacity-60 text-[var(--text-main)]" />
                  </div>
                  
                  <div className="pt-4 flex justify-end gap-3 border-b border-[var(--border-soft)] pb-6">
                    <button type="button" onClick={() => setShowProfileModal(false)} className="px-5 py-2.5 text-[var(--text-muted)] font-medium hover:bg-[var(--bg-app)] rounded-xl transition-colors">Cancel</button>
                    <button type="submit" className="px-5 py-2.5 bg-brand-primary text-white font-medium rounded-xl hover:opacity-90 transition-opacity shadow-sm">Save Changes</button>
                  </div>
                </form>

                <div className="mt-6 pt-2">
                  <h3 className="text-sm font-bold text-rose-500 mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4"/> Danger Zone</h3>
                  <p className="text-xs text-[var(--text-muted)] mb-4">Once you delete your account, there is no going back. Please be certain.</p>
                  <button onClick={handleDeleteAccount} className="w-full py-2.5 bg-rose-500/10 text-rose-500 font-bold rounded-xl border border-rose-500/20 hover:bg-rose-500/20 transition-colors">
                    Delete My Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}

