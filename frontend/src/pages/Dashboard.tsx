import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  Package, 
  Users, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { StatsService } from '../api';



const StatCard = ({ title, value, change, icon: Icon, trend }: any) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <div className="p-2 bg-brand-primary/5 rounded-xl">
        <Icon className="w-6 h-6 text-brand-primary" />
      </div>
      <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
        trend === 'up' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
      }`}>
        {trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {change}
      </div>
    </div>
    <h3 className="text-slate-500 text-sm font-medium">{title}</h3>
    <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
  </div>
);

export function Dashboard() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [currencySymbol, setCurrencySymbol] = useState(localStorage.getItem('currencySymbol') || '$');
  const [isLoading, setIsLoading] = useState(true);

  const formatCurrency = (amount: number | string) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(amount));
  };

  useEffect(() => {
    fetchStats();
  }, []);

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
      <div className="flex items-center justify-center p-12 text-slate-500">
        Loading dashboard metrics...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
        <p className="text-slate-500">Welcome back, here's what's happening today.</p>
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
              title="Gross Revenue" 
              value={`${currencySymbol}${formatCurrency(stats?.monthly_revenue || 0)}`} 
              change={0} 
              icon={TrendingUp} 
              trend="up" 
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900">Revenue & Bookings</h3>
            <select className="text-sm border-slate-200 rounded-lg bg-slate-50 px-2 py-1 outline-none">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
            </select>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.chart_data || []}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    borderRadius: '12px', 
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#002B4E" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dynamic Activity / Clients Sidebar */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-6">{isAdmin ? 'SaaS Tenants Overview' : 'Recent Activity'}</h3>
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
                        <p className="font-bold text-sm text-slate-900">{org.name}</p>
                        <p className="text-xs text-slate-500">{org.total_bookings} Bookings • {org.currency_symbol || currencySymbol}{formatCurrency(org.revenue)}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-500">No organizations found.</div>
              )
            ) : (
              (stats?.recent_activity || []).length > 0 ? (
                (stats.recent_activity).map((item: any, i: number) => {
                  let Icon = CheckCircle2;
                  let colorClass = 'text-emerald-500';
                  let bgClass = 'bg-emerald-50';
                  
                  if (item.title.toLowerCase().includes('pending')) {
                    Icon = Clock;
                    colorClass = 'text-amber-500';
                    bgClass = 'bg-amber-50';
                  } else if (item.title.toLowerCase().includes('cancel')) {
                    Icon = AlertCircle;
                    colorClass = 'text-rose-500';
                    bgClass = 'bg-rose-50';
                  } else if (item.title.toLowerCase().includes('pick')) {
                    Icon = Package;
                    colorClass = 'text-brand-primary';
                    bgClass = 'bg-brand-primary/5';
                  }

                  return (
                    <div key={i} className="flex gap-4">
                      <div className={`p-2 rounded-xl h-fit ${bgClass}`}>
                        <Icon className={`w-5 h-5 ${colorClass}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{item.title}</p>
                        <p className="text-xs text-slate-500">{item.time}</p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-slate-500">No recent activity found.</div>
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
