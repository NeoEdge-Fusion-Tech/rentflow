import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  CreditCard, 
  CalendarCheck, 
  TrendingUp, 
  Activity,
  ArrowUpRight,
  MapPin,
  Clock
} from 'lucide-react';
import { SuperAdminService } from '../../api';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useTheme } from '../../context/ThemeContext';

export function Dashboard() {
  const { theme } = useTheme();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await SuperAdminService.getStats();
      setStats(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    { title: 'Total Organizations', value: stats.total_organizations, icon: Building2, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'Total Users', value: stats.total_users, icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
    { title: 'Platform Revenue', value: `$${stats.platform_revenue.toLocaleString()}`, icon: CreditCard, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { title: 'Active Bookings', value: stats.active_bookings, icon: CalendarCheck, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)]">Global Dashboard</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Platform-wide overview and metrics</p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => (
          <div key={idx} className="bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-2xl p-6 flex flex-col justify-between hover:border-brand-primary/50 transition-colors group">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${card.bg} ${card.color} group-hover:scale-110 transition-transform`}>
                <card.icon className="w-6 h-6" />
              </div>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-muted)]">{card.title}</p>
              <h3 className="text-2xl font-bold text-[var(--text-main)] mt-1">{card.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-[var(--text-main)]">Platform Revenue</h3>
              <p className="text-sm text-[var(--text-muted)]">Last 6 months aggregation</p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.chart_data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-soft)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: 'var(--text-muted)', fontSize: 12}} tickFormatter={(val) => `$${val}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-soft)', borderRadius: '0.75rem', color: 'var(--text-main)' }}
                  itemStyle={{ color: '#10b981' }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Organizations */}
        <div className="bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-[var(--text-main)]">Top Organizations</h3>
              <p className="text-sm text-[var(--text-muted)]">By total booking volume</p>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-4">
            {stats.organizations_overview.map((org: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-xl hover:bg-[var(--bg-app)] transition-colors border border-transparent hover:border-[var(--border-soft)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center font-bold text-brand-primary">
                    {org.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-[var(--text-main)]">{org.name}</h4>
                    <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                      <CalendarCheck className="w-3 h-3" /> {org.total_bookings} Bookings
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-emerald-500 block">
                    {org.currency_symbol}{(org.revenue || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Recent Global Activity */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-[var(--text-main)]">Recent Global Activity</h3>
            <p className="text-sm text-[var(--text-muted)]">Latest bookings across all organizations</p>
          </div>
          <Activity className="w-5 h-5 text-[var(--text-muted)]" />
        </div>
        
        <div className="space-y-4">
          {stats.recent_activity.map((act: any, idx: number) => (
            <div key={idx} className="flex items-start gap-4 p-4 rounded-xl border border-[var(--border-soft)] hover:border-brand-primary/30 transition-colors bg-[var(--bg-app)]/30">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <ArrowUpRight className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-main)] line-clamp-1">{act.title}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-muted)]">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {act.time}</span>
                  <span className="uppercase tracking-wider font-bold opacity-70">{act.type}</span>
                </div>
              </div>
            </div>
          ))}
          {stats.recent_activity.length === 0 && (
            <div className="text-center py-8 text-[var(--text-muted)]">No recent activity across the platform.</div>
          )}
        </div>
      </div>
    </div>
  );
}
