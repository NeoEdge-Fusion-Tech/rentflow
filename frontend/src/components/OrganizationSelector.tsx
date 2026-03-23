import React, { useEffect, useState } from 'react';
import { Building2, X, ChevronDown, Search, Globe, Check } from 'lucide-react';
import { SuperAdminService } from '../api';

export function OrganizationSelector() {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(localStorage.getItem('selectedOrganizationId'));
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchOrgs();
  }, []);

  const fetchOrgs = async () => {
    try {
      const res = await SuperAdminService.getOrganizations({ is_active: true, all: 'true' });
      setOrganizations(res.data.results || res.data);
    } catch (error) {
      console.error("Failed to fetch organizations for selector", error);
    }
  };

  const handleSelect = (id: string | null) => {
    if (id) {
      localStorage.setItem('selectedOrganizationId', id);
    } else {
      localStorage.removeItem('selectedOrganizationId');
    }
    setSelectedId(id);
    setIsOpen(false);
    window.location.reload(); 
  };

  const selectedOrg = organizations.find(org => org.id.toString() === selectedId);

  const filteredOrgs = organizations.filter(org => 
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.id.toString().includes(searchQuery)
  );

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`group flex items-center gap-2.5 px-4 py-2 rounded-2xl border transition-all duration-200 text-sm font-semibold shadow-sm overflow-hidden ${
          selectedId 
            ? 'bg-brand-primary text-white border-brand-primary hover:bg-slate-800' 
            : 'bg-white border-slate-200 text-slate-700 hover:border-brand-primary hover:bg-slate-50'
        }`}
      >
        <div className={`p-1 rounded-lg ${selectedId ? 'bg-white/20' : 'bg-slate-100 group-hover:bg-brand-primary/10 transition-colors'}`}>
          <Building2 className={`w-3.5 h-3.5 ${selectedId ? 'text-white' : 'text-slate-500 group-hover:text-brand-primary'}`} />
        </div>
        <span className="max-w-[140px] truncate">
          {selectedOrg ? selectedOrg.name : 'Platform Wide'}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} ${selectedId ? 'text-white/60' : 'text-slate-400'}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-slate-900/5 backdrop-blur-[1px]" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 mt-3 w-72 bg-white border border-slate-200 rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 ring-1 ring-black/5">
            <div className="p-4 border-b border-slate-50 bg-slate-50/50">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Switch Organization</span>
                {selectedId && (
                  <button 
                    onClick={() => handleSelect(null)}
                    className="text-[10px] bg-rose-50 text-rose-600 px-2.5 py-1 rounded-full hover:bg-rose-100 transition-all font-bold group flex items-center gap-1"
                  >
                    <Globe className="w-2.5 h-2.5" />
                    Reset
                  </button>
                )}
              </div>
              
              <div className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-brand-primary transition-colors" />
                <input 
                  autoFocus
                  type="text"
                  placeholder="Search by name or ID..."
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/5 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="max-h-[320px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-slate-200">
              <button
                onClick={() => handleSelect(null)}
                className={`w-full text-left px-3 py-3 rounded-xl text-xs transition-all flex items-center justify-between mb-1 group ${
                  !selectedId 
                    ? 'bg-brand-primary text-white font-bold shadow-md shadow-brand-primary/20' 
                    : 'hover:bg-slate-50 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${!selectedId ? 'bg-white/20' : 'bg-slate-100 group-hover:bg-white'}`}>
                    <Globe className={`w-3.5 h-3.5 ${!selectedId ? 'text-white' : 'text-slate-500'}`} />
                  </div>
                  <div>
                    <p className="font-bold">View Platform-Wide</p>
                    <p className={`text-[10px] ${!selectedId ? 'text-white/70' : 'text-slate-400'}`}>See data from all organizations</p>
                  </div>
                </div>
                {!selectedId && <Check className="w-3.5 h-3.5 text-white" />}
              </button>

              <div className="my-2 px-3 flex items-center gap-2">
                <div className="h-[1px] flex-1 bg-slate-100"></div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Organizations</span>
                <div className="h-[1px] flex-1 bg-slate-100"></div>
              </div>

              {filteredOrgs.length === 0 ? (
                <div className="py-8 text-center bg-slate-50/50 rounded-2xl mx-1">
                  <p className="text-xs text-slate-500 italic">No organizations found</p>
                </div>
              ) : (
                filteredOrgs.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => handleSelect(org.id.toString())}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all flex items-center justify-between mb-0.5 group ${
                      selectedId === org.id.toString() 
                        ? 'bg-indigo-50 text-indigo-700 font-bold' 
                        : 'hover:bg-slate-50 text-slate-600 hover:translate-x-1'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-black ${
                        selectedId === org.id.toString() ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-50 text-slate-400 group-hover:bg-brand-primary/5 group-hover:text-brand-primary transition-colors'
                      }`}>
                        {org.name[0]}
                      </div>
                      <div className="truncate">
                        <p className="truncate font-semibold">{org.name}</p>
                        <p className={`text-[10px] ${selectedId === org.id.toString() ? 'text-indigo-500' : 'text-slate-400'}`}>ID: {org.id}</p>
                      </div>
                    </div>
                    {selectedId === org.id.toString() && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
