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
  Coins
} from 'lucide-react';
import { cn } from '@/src/utils';
import { useNavigate } from 'react-router-dom';

interface SidebarProps {
  isOpen: boolean;
  toggle: () => void;
  isSuperuser?: boolean;
  currentUser?: any;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Package, label: 'Inventory', path: '/inventory' },
  { icon: Users, label: 'Clients', path: '/clients' },
  { icon: Calendar, label: 'Bookings', path: '/bookings' },
  { icon: CreditCard, label: 'Payments', path: '/payments' },
  { icon: QrCode, label: 'Scanner', path: '/scanner' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

const superAdminItems = [
  { icon: Users, label: 'Organizations', path: '/superadmin/organizations' },
  { icon: Users, label: 'Internal Users', path: '/superadmin/users' },
  { icon: Coins, label: 'Currencies', path: '/superadmin/currencies' },
];

export function Sidebar({ isOpen, toggle, isSuperuser, currentUser }: SidebarProps) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={toggle}
        />
      )}

      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-bottom border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center">
                <Package className="text-brand-accent w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-brand-primary tracking-tight">RentFlow</span>
            </div>
            <button onClick={toggle} className="ml-auto lg:hidden p-2 text-slate-500 hover:bg-slate-50 rounded-md">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-brand-primary text-brand-accent" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-brand-primary"
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
                  <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Platform Management</p>
                </div>
                {superAdminItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                      isActive 
                        ? "bg-brand-primary text-brand-accent" 
                        : "text-slate-600 hover:bg-slate-50 hover:text-brand-primary"
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

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 mt-auto">
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 uppercase">
                {currentUser?.first_name?.[0] || currentUser?.email?.[0] || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {currentUser?.first_name ? `${currentUser.first_name} ${currentUser.last_name}` : currentUser?.email?.split('@')[0] || 'User'}
                </p>
                <p className="text-xs text-slate-500 truncate capitalize">
                  {currentUser?.role || (isSuperuser ? 'Super Admin' : 'Member')}
                </p>
              </div>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-red-600 rounded-xl transition-colors">
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
