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
            ? 'bg-brand-primary text-brand-accent border-brand-primary hover:opacity-90' 
            : 'bg-[var(--bg-surface)] border-[var(--border-soft)] text-[var(--text-main)] hover:border-brand-primary hover:bg-[var(--bg-app)]'
        }`}
      >
        <div className={`p-1 rounded-lg ${selectedId ? 'bg-brand-accent/10' : 'bg-[var(--bg-app)] group-hover:bg-brand-primary/10 transition-colors'}`}>
          <Building2 className={`w-3.5 h-3.5 ${selectedId ? 'text-brand-accent' : 'text-[var(--text-muted)] group-hover:text-brand-primary'}`} />
        </div>
        <span className="max-w-[140px] truncate">
          {selectedOrg ? selectedOrg.name : 'Platform Wide'}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} ${selectedId ? 'text-brand-accent/60' : 'text-[var(--text-muted)]'}`} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-[var(--bg-app)]/40 backdrop-blur-sm" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 mt-3 w-72 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300 ring-1 ring-black/5">
            <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-app)]/50">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Switch Organization</span>
                {selectedId && (
                  <button 
                    onClick={() => handleSelect(null)}
                    className="text-[10px] bg-rose-500/10 text-rose-500 px-2.5 py-1 rounded-full hover:bg-rose-500/20 transition-all font-bold group flex items-center gap-1"
                  >
                    <Globe className="w-2.5 h-2.5" />
                    Reset
                  </button>
                )}
              </div>
              
              <div className="relative group/search">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] group-focus-within/search:text-brand-primary transition-colors" />
                <input 
                  autoFocus
                  type="text"
                  placeholder="Search by name or ID..."
                  className="w-full pl-9 pr-4 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-xl text-xs outline-none focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 text-[var(--text-main)] transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="max-h-[320px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-[var(--border-soft)]">
              <button
                onClick={() => handleSelect(null)}
                className={`w-full text-left px-3 py-3 rounded-xl text-xs transition-all flex items-center justify-between mb-1 group ${
                  !selectedId 
                    ? 'bg-brand-primary text-brand-accent font-bold shadow-md shadow-brand-primary/20' 
                    : 'hover:bg-[var(--bg-app)] text-[var(--text-main)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${!selectedId ? 'bg-brand-accent/20' : 'bg-[var(--bg-app)] group-hover:bg-[var(--bg-surface)]'}`}>
                    <Globe className={`w-3.5 h-3.5 ${!selectedId ? 'text-brand-accent' : 'text-[var(--text-muted)]'}`} />
                  </div>
                  <div>
                    <p className="font-bold">View Platform-Wide</p>
                    <p className={`text-[10px] ${!selectedId ? 'text-brand-accent/70' : 'text-[var(--text-muted)]'}`}>See data from all organizations</p>
                  </div>
                </div>
                {!selectedId && <Check className="w-3.5 h-3.5 text-brand-accent" />}
              </button>

              <div className="my-2 px-3 flex items-center gap-2">
                <div className="h-[1px] flex-1 bg-[var(--border-subtle)]"></div>
                <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-tighter">Organizations</span>
                <div className="h-[1px] flex-1 bg-[var(--border-subtle)]"></div>
              </div>

              {filteredOrgs.length === 0 ? (
                <div className="py-8 text-center bg-[var(--bg-app)]/50 rounded-2xl mx-1">
                  <p className="text-xs text-[var(--text-muted)] italic">No organizations found</p>
                </div>
              ) : (
                filteredOrgs.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => handleSelect(org.id.toString())}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all flex items-center justify-between mb-0.5 group ${
                      selectedId === org.id.toString() 
                        ? 'bg-brand-primary/10 text-brand-primary font-bold' 
                        : 'hover:bg-[var(--bg-app)] text-[var(--text-main)] hover:translate-x-1'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-black ${
                        selectedId === org.id.toString() ? 'bg-brand-primary/20 text-brand-primary' : 'bg-[var(--bg-app)] text-[var(--text-muted)] group-hover:bg-brand-primary/10 group-hover:text-brand-primary transition-colors'
                      }`}>
                        {org.name[0]}
                      </div>
                      <div className="truncate">
                        <p className="truncate font-semibold">{org.name}</p>
                        <p className={`text-[10px] ${selectedId === org.id.toString() ? 'text-brand-primary/70' : 'text-[var(--text-muted)]'}`}>ID: {org.id}</p>
                      </div>
                    </div>
                    {selectedId === org.id.toString() && <Check className="w-3.5 h-3.5 text-brand-primary" />}
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
