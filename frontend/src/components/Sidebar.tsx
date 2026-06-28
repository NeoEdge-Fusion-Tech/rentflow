import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Users,
  Calendar,
  CreditCard,
  QrCode,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Coins,
  FileText
} from 'lucide-react';
import { Logo } from './Logo';
import { cn } from '@/src/utils';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

interface SidebarProps {
  isOpen: boolean;
  toggle: () => void;
  isSuperuser?: boolean;
  currentUser?: any;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Package, label: 'Inventory', path: '/inventory' },
  { icon: Users, label: 'Clients', path: '/clients' },
  { icon: Calendar, label: 'Bookings', path: '/bookings' },
  { icon: FileText, label: 'Invoices', path: '/invoices' },
  { icon: CreditCard, label: 'Payments', path: '/payments' },
  { icon: QrCode, label: 'Scanner', path: '/scanner' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

const superAdminItems = [
  { icon: LayoutDashboard, label: 'Global Dashboard', path: '/superadmin' },
  { icon: Users, label: 'Organizations', path: '/superadmin/organizations' },
  { icon: Users, label: 'Internal Users', path: '/superadmin/users' },
  { icon: Calendar, label: 'Global Bookings', path: '/superadmin/bookings' },
  { icon: FileText, label: 'Global Invoices', path: '/superadmin/invoices' },
  { icon: Coins, label: 'Currencies', path: '/superadmin/currencies' },
  { icon: CreditCard, label: 'Subscriptions', path: '/superadmin/subscriptions' },
  { icon: CreditCard, label: 'Subscription Plans', path: '/superadmin/subscription-plans' },
  { icon: Coins, label: 'Revenue & Payments', path: '/superadmin/revenue' },
];

export function Sidebar({ isOpen, toggle, isSuperuser, currentUser }: SidebarProps) {
  const { theme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-[var(--bg-app)]/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={toggle}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-[var(--bg-surface)] border-r border-[var(--border-soft)] transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="h-16 flex items-center px-6 border-b border-[var(--border-subtle)]">
            <Logo className="h-9" dark={theme === 'dark'} />
            <button onClick={toggle} className="ml-auto lg:hidden p-2 text-[var(--text-muted)] hover:bg-[var(--bg-app)] rounded-xl border border-[var(--border-soft)]">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navItems.filter(item => {
              if (item.label === 'Inventory' && currentUser?.has_booking === false) {
                return false;
              }
              if (item.label === 'Bookings' && currentUser?.has_booking === false) {
                return false;
              }
              if (item.label === 'Scanner' && currentUser?.has_booking === false) {
                return false;
              }
              if (item.label === 'Invoices' && currentUser?.has_invoice === false) {
                return false;
              }
              return true;
            }).map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-brand-primary text-brand-accent shadow-lg shadow-brand-primary/20" 
                    : "text-[var(--text-muted)] hover:bg-[var(--bg-app)] hover:text-brand-primary"
                )}
              >
                {({ isActive }) => (
                  <>
                    <item.icon className="w-5 h-5" />
                    {item.label}
                    {isActive && <ChevronRight className="ml-auto w-4 h-4" />}
                  </>
                )}
              </NavLink>
            ))}

            {isSuperuser && (
              <>
                <div className="pt-6 pb-2 px-3">
                  <p className="text-[10px] font-bold text-[var(--text-muted)] tracking-wider uppercase opacity-80">Platform Management</p>
                </div>
                {superAdminItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                      isActive 
                        ? "bg-brand-primary text-brand-accent shadow-lg shadow-brand-primary/20" 
                        : "text-[var(--text-muted)] hover:bg-[var(--bg-app)] hover:text-brand-primary"
                    )}
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon className="w-5 h-5" />
                        {item.label}
                        {isActive && <ChevronRight className="ml-auto w-4 h-4" />}
                      </>
                    )}
                  </NavLink>
                ))}
              </>
            )}
          </nav>

          {/* Usage Tracker */}
          {currentUser && currentUser.subscription_usage && !isSuperuser && (
            <div className="px-4 py-2 space-y-4">
              {currentUser.has_invoice && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-[var(--text-muted)]">Invoices</span>
                    <span className="text-[var(--text-main)]">
                      {currentUser.subscription_usage.invoices_used} / {currentUser.subscription_usage.invoices_limit === -1 ? '∞' : currentUser.subscription_usage.invoices_limit}
                    </span>
                  </div>
                  {currentUser.subscription_usage.invoices_limit !== -1 && (
                    <div className="h-1.5 w-full bg-[var(--bg-app)] rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${currentUser.subscription_usage.invoices_used >= currentUser.subscription_usage.invoices_limit ? 'bg-rose-500' : 'bg-brand-primary'}`} 
                        style={{width: `${Math.min((currentUser.subscription_usage.invoices_used / currentUser.subscription_usage.invoices_limit) * 100, 100)}%`}}
                      ></div>
                    </div>
                  )}
                  {currentUser.subscription_usage.invoices_limit !== -1 && currentUser.subscription_usage.invoices_used >= currentUser.subscription_usage.invoices_limit && (
                    <p className="text-[10px] text-rose-500 font-medium">Limit reached</p>
                  )}
                </div>
              )}

              {currentUser.has_booking && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-[var(--text-muted)]">Bookings</span>
                    <span className="text-[var(--text-main)]">
                      {currentUser.subscription_usage.bookings_used} / {currentUser.subscription_usage.bookings_limit === -1 ? '∞' : currentUser.subscription_usage.bookings_limit}
                    </span>
                  </div>
                  {currentUser.subscription_usage.bookings_limit !== -1 && (
                    <div className="h-1.5 w-full bg-[var(--bg-app)] rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${currentUser.subscription_usage.bookings_used >= currentUser.subscription_usage.bookings_limit ? 'bg-rose-500' : 'bg-brand-primary'}`} 
                        style={{width: `${Math.min((currentUser.subscription_usage.bookings_used / currentUser.subscription_usage.bookings_limit) * 100, 100)}%`}}
                      ></div>
                    </div>
                  )}
                  {currentUser.subscription_usage.bookings_limit !== -1 && currentUser.subscription_usage.bookings_used >= currentUser.subscription_usage.bookings_limit && (
                    <p className="text-[10px] text-rose-500 font-medium">Limit reached</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="p-4 border-t border-[var(--border-soft)] mt-auto bg-[var(--bg-app)]/50">
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-xs font-bold text-brand-accent uppercase shadow-sm">
                {currentUser?.first_name?.[0] || currentUser?.email?.[0] || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-main)] truncate">
                  {currentUser?.first_name ? `${currentUser.first_name} ${currentUser.last_name}` : currentUser?.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-xs text-[var(--text-muted)] truncate capitalize">
                  {currentUser?.role || (isSuperuser ? 'Super Admin' : 'Member')}
                </p>
              </div>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-[var(--text-muted)] hover:bg-rose-500/10 hover:text-rose-500 rounded-xl transition-all duration-200">
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
