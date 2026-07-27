import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Package,
  Users,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Wallet,
  Building2
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { StatsService, AuthService, EventService } from '../api';



const StatCard = ({ title, value, change, icon: Icon, trend }: any) => (
  <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-soft)] shadow-sm transition-all duration-300">
    <div className="flex items-center justify-between mb-4">
      <div className="p-2 bg-brand-primary/10 rounded-xl">
        <Icon className="w-6 h-6 text-brand-primary" />
      </div>
      <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
        trend === 'up' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
      }`}>
        {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {change}
      </div>
    </div>
    <h3 className="text-[var(--text-muted)] text-sm font-medium">{title}</h3>
    <p className="text-2xl font-bold text-[var(--text-main)] mt-1">{value}</p>
  </div>
);

export function Dashboard() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [currencySymbol, setCurrencySymbol] = useState(localStorage.getItem('currencySymbol') || '$');
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const currentYear = new Date().getFullYear();
  const [plPeriod, setPlPeriod] = useState<'today' | 'month' | 'year'>('month');
  const [plYear, setPlYear] = useState(currentYear);
  const [plStats, setPlStats] = useState<any>(null);
  const [plMonthly, setPlMonthly] = useState<any[]>([]);
  const [plLoading, setPlLoading] = useState(false);
  const showPl = !isAdmin && currentUser?.role !== 'staff';

  const formatCurrency = (amount: number | string) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(amount));
  };

  useEffect(() => {
    fetchStats();
    fetchUser();
  }, []);

  useEffect(() => {
    if (!showPl) return;
    (async () => {
      try {
        setPlLoading(true);
        const params: any = { period: plPeriod };
        if (plPeriod === 'year') params.year = plYear;
        const res = await EventService.getDashboardStats(params);
        setPlStats(res.data);
      } catch (e) {
        console.error("Failed fetching P&L stats", e);
      } finally {
        setPlLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plPeriod, plYear, showPl]);

  useEffect(() => {
    if (!showPl) return;
    EventService.getMonthlyBreakdown({ year: plYear })
      .then(res => setPlMonthly(res.data))
      .catch(e => console.error("Failed fetching monthly P&L breakdown", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plYear, showPl]);

  const fetchUser = async () => {
    try {
      const res = await AuthService.getMe();
      setCurrentUser(res.data);
    } catch(e) { console.error("Failed fetching user", e); }
  };

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      // Attempt Super-Admin Fetch
      const response = await StatsService.getSuperAdminStats();
      setIsAdmin(true);
      setStats(response.data);
      if (response.data.currency_symbol) {
        setCurrencySymbol(response.data.currency_symbol);
      }
    } catch (error: any) {
      if (error.response?.status === 403) {
        // Fallback to Tenant-Admin Fetch
        setIsAdmin(false);
        try {
          const tenantResponse = await StatsService.getTenantStats();
          setStats(tenantResponse.data);
          if (tenantResponse.data.currency_symbol) {
            setCurrencySymbol(tenantResponse.data.currency_symbol);
          }
        } catch (tenantError) {
          console.error("Failed fetching tenant stats", tenantError);
        }
      } else {
        console.error("Failed fetching super admin stats", error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-[var(--text-muted)]">
        Loading dashboard metrics...
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-main)]">Dashboard Overview</h1>
        <p className="text-[var(--text-muted)]">Welcome back, here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isAdmin ? (
          <>
            <StatCard 
              title="Total Organizations" 
              value={stats?.total_organizations || 0} 
              change={0} 
              icon={Users} 
              trend="up" 
            />
            <StatCard 
              title="Total Users" 
              value={stats?.total_users || 0} 
              change={0} 
              icon={Users} 
              trend="up" 
            />
            <StatCard 
              title="Active System Bookings" 
              value={stats?.active_bookings || 0} 
              change={0} 
              icon={Calendar} 
              trend="up" 
            />
            <StatCard 
              title="Platform Gross Revenue" 
              value={`${currencySymbol}${formatCurrency(stats?.platform_revenue || 0)}`} 
              change={0} 
              icon={TrendingUp} 
              trend="up" 
            />
          </>
        ) : (
          <>
            <StatCard 
              title="Total Products" 
              value={stats?.total_products || 0} 
              change={0} 
              icon={Package} 
              trend="up" 
            />
            <StatCard 
              title="Active Bookings" 
              value={stats?.active_bookings || 0} 
              change={0} 
              icon={Calendar} 
              trend="up" 
            />
            <StatCard 
              title="Total Clients" 
              value={stats?.total_clients || 0} 
              change={0} 
              icon={Users} 
              trend="up" 
            />
            <StatCard
              title="Total Vendors"
              value={stats?.total_vendors || 0}
              change={0}
              icon={Building2}
              trend="up"
            />
          </>
        )}
      </div>

      {/* Profit & Loss */}
      {showPl && (
        <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-soft)] shadow-sm transition-all duration-300 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="font-bold text-[var(--text-main)]">Profit & Loss</h3>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl p-1">
                {[
                  { key: 'today', label: 'Today' },
                  { key: 'month', label: 'This Month' },
                  { key: 'year', label: 'This Year' },
                ].map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setPlPeriod(opt.key as any)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                      plPeriod === opt.key ? 'bg-brand-primary text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <select
                value={plYear}
                onChange={e => setPlYear(parseInt(e.target.value))}
                className="text-xs font-bold border border-[var(--border-soft)] rounded-xl bg-[var(--bg-app)] text-[var(--text-main)] px-3 py-2 outline-none"
              >
                {Array.from({ length: 6 }, (_, i) => currentYear - i).map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-[var(--bg-app)] border border-[var(--border-soft)]">
              <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Total Revenue</p>
              <p className="text-lg font-black text-[var(--text-main)]">{plLoading ? '…' : `${currencySymbol}${formatCurrency(plStats?.total_revenue || 0)}`}</p>
            </div>
            <div className="p-4 rounded-xl bg-[var(--bg-app)] border border-[var(--border-soft)]">
              <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Total Expenses</p>
              <p className="text-lg font-black text-[var(--text-main)]">{plLoading ? '…' : `${currencySymbol}${formatCurrency(plStats?.total_expenses || 0)}`}</p>
              {!plLoading && (
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                    <span>Projects:</span>
                    <span className="font-bold">{currencySymbol}{formatCurrency(plStats?.total_project_expenses || 0)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                    <span>General:</span>
                    <span className="font-bold">{currencySymbol}{formatCurrency(plStats?.total_general_expenses || 0)}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
              <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Total Profit</p>
              <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{plLoading ? '…' : `${currencySymbol}${formatCurrency(plStats?.total_profit || 0)}`}</p>
            </div>
            <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10">
              <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-1 flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Total Loss</p>
              <p className="text-lg font-black text-rose-600 dark:text-rose-400">{plLoading ? '…' : `${currencySymbol}${formatCurrency(plStats?.total_loss || 0)}`}</p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">Monthly Revenue, Expenses & Profit/Loss — {plYear}</h4>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={plMonthly}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-surface)',
                      borderRadius: '12px',
                      border: '1px solid var(--border-soft)',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      color: 'var(--text-main)'
                    }}
                    itemStyle={{ color: 'var(--text-main)' }}
                    labelStyle={{ color: 'var(--text-muted)' }}
                    formatter={(value: any) => `${currencySymbol}${formatCurrency(value)}`}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="revenue" name="Revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" name="Profit / Loss" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bookings Chart */}
        <div className="lg:col-span-2 bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-soft)] shadow-sm transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-[var(--text-main)]">Bookings</h3>
            <select className="text-sm border border-[var(--border-soft)] rounded-lg bg-[var(--bg-app)] text-[var(--text-main)] px-2 py-1 outline-none">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
            </select>
          </div>
          <div className="h-64 sm:h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.chart_data || []}>
                <defs>
                  <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-surface)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-soft)',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    color: 'var(--text-main)'
                  }}
                  itemStyle={{ color: 'var(--text-main)' }}
                  labelStyle={{ color: 'var(--text-muted)' }}
                />
                <Area
                  type="monotone"
                  dataKey="bookings"
                  stroke="var(--color-brand-accent)"
                  strokeWidth={3}
                  fillOpacity={0.2}
                  fill="var(--color-brand-accent)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dynamic Activity / Clients Sidebar */}
        <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-soft)] shadow-sm transition-all duration-300">
          <h3 className="font-bold text-[var(--text-main)] mb-6">{isAdmin ? 'SaaS Tenants Overview' : 'Recent Activity'}</h3>
          <div className="space-y-6">
            {isAdmin ? (
              (stats?.organizations_overview || []).length > 0 ? (
                (stats.organizations_overview).map((org: any, i: number) => (
                  <div key={org.id || i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand-primary/5 text-brand-primary font-bold flex items-center justify-center rounded-xl">
                        {org.name.substring(0,2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-[var(--text-main)]">{org.name}</p>
                        <p className="text-xs text-[var(--text-muted)]">{org.total_bookings} Bookings • {org.currency_symbol || currencySymbol}{formatCurrency(org.revenue)}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-[var(--text-muted)]">No organizations found.</div>
              )
            ) : (
              (stats?.recent_activity || []).length > 0 ? (
                (stats.recent_activity).map((item: any, i: number) => {
                  let Icon = CheckCircle2;
                  let colorClass = 'text-emerald-500';
                  let bgClass = 'bg-emerald-500/10';
                  
                  if (item.title.toLowerCase().includes('pending')) {
                    Icon = Clock;
                    colorClass = 'text-amber-500';
                    bgClass = 'bg-amber-500/10';
                  } else if (item.title.toLowerCase().includes('cancel')) {
                    Icon = AlertCircle;
                    colorClass = 'text-rose-500';
                    bgClass = 'bg-rose-500/10';
                  } else if (item.title.toLowerCase().includes('pick')) {
                    Icon = Package;
                    colorClass = 'text-brand-primary';
                    bgClass = 'bg-brand-primary/10';
                  }

                  return (
                    <div key={i} className="flex gap-4 group cursor-default">
                      <div className={`p-2 rounded-xl h-fit transition-colors ${bgClass}`}>
                        <Icon className={`w-5 h-5 ${colorClass}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--text-main)] group-hover:text-brand-primary transition-colors">{item.title}</p>
                        <p className="text-xs text-[var(--text-muted)]">{item.time}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-[var(--text-muted)]">No recent activity found.</div>
              )
            )}
          </div>
          <button className="w-full mt-8 py-2 text-sm font-medium text-brand-primary hover:bg-brand-primary/5 rounded-xl transition-colors">
            {isAdmin ? 'View All Tenants' : 'View All Activity'}
          </button>
        </div>
      </div>
    </div>
  );
}
