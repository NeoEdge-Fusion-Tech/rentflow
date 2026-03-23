import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Search, 
  ExternalLink, 
  MoreVertical, 
  TrendingUp, 
  Calendar,
  Users,
  ShieldCheck,
  Filter
} from 'lucide-react';
import { SuperAdminService } from '../../api';

interface OrgStats {
  id: number;
  name: string;
  total_bookings: number;
  revenue: number;
  subscription_plan: string;
  created_at: string;
}

export function Organizations() {
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState<OrgStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const currencySymbol = localStorage.getItem('currencySymbol') || '$';

  useEffect(() => {
    fetchOrgs();
  }, []);

  const fetchOrgs = async () => {
    try {
      setIsLoading(true);
      const res = await SuperAdminService.getOrganizations();
      // The API currently returns a simple list, but might need adjustment for the extra fields
      setOrgs(res.data.results || res.data);
    } catch (error) {
      console.error("Failed to fetch organizations", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const filteredOrgs = orgs.filter(org => 
    org.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Organizations</h1>
          <p className="text-slate-500">Oversee and manage all tenants on the platform.</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 rounded-xl">
              <Building2 className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Tenants</p>
              <h3 className="text-2xl font-bold text-slate-900">{orgs.length}</h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-xl">
              <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Pro Subscriptions</p>
              <h3 className="text-2xl font-bold text-slate-900">
                {orgs.filter(o => (o as any).subscription?.plan_name?.toLowerCase() === 'pro').length}
              </h3>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-50 rounded-xl">
              <ShieldCheck className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Active Status</p>
              <h3 className="text-2xl font-bold text-slate-900">{orgs.length}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Organizations Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search organizations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-brand-primary focus:bg-white transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors border border-slate-200">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Organization</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Plan</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Activity</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Revenue</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading tenants...</td>
                </tr>
              ) : filteredOrgs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">No organizations found.</td>
                </tr>
              ) : (
                filteredOrgs.map((org: any) => (
                  <tr key={org.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <p 
                            className="font-bold text-slate-900 cursor-pointer hover:text-brand-primary transition-colors"
                            onClick={() => navigate(`/superadmin/organizations/${org.id}`)}
                          >
                            {org.name}
                          </p>
                          <p className="text-xs text-slate-500">ID: {org.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        (org.subscription?.plan_name || 'Free').toLowerCase() === 'pro' 
                          ? 'bg-purple-50 text-purple-600' 
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {org.subscription?.plan_name || 'Free'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Calendar className="w-3 h-3" />
                          <span>{org.total_bookings || 0} Bookings</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-600">
                          <Users className="w-3 h-3" />
                          <span>Active Clients</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{org.currency_symbol || currencySymbol}{formatCurrency(org.revenue || 0)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-slate-600">
                        {new Date(org.created_at).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => navigate(`/superadmin/organizations/${org.id}`)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-brand-primary bg-brand-primary/5 hover:bg-brand-primary/10 rounded-lg transition-all"
                        >
                          Manage
                          <ExternalLink className="w-3 h-3" />
                        </button>
                        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
