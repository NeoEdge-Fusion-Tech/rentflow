import React, { useState, useEffect } from 'react';
import { CurrencyService } from '../../api';
import { Coins, Plus, CheckCircle2, XCircle, Search, X } from 'lucide-react';

export function Currencies() {
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [symbol, setSymbol] = useState('');

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const fetchCurrencies = async () => {
    try {
      setIsLoading(true);
      const res = await CurrencyService.getAll({ all: 'true' });
      setCurrencies(res.data.results || res.data);
    } catch (error) {
      console.error("Failed to fetch currencies", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCurrency = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await CurrencyService.create({ name, code, symbol, status: 'active' });
      setIsModalOpen(false);
      setName('');
      setCode('');
      setSymbol('');
      fetchCurrencies();
    } catch (error) {
      console.error("Failed to create currency", error);
      alert("Failed to create currency. Ensure the code is unique.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (currency: any) => {
    const newStatus = currency.status === 'active' ? 'inactive' : 'active';
    if (!window.confirm(`Are you sure you want to change the status to ${newStatus}?`)) return;
    
    try {
      await CurrencyService.update(currency.id, { status: newStatus });
      fetchCurrencies();
    } catch (error) {
      console.error("Failed to update currency status", error);
    }
  };

  const filteredCurrencies = currencies.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)]">Currencies</h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Manage platform currencies and their active status.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-brand-primary text-brand-accent px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-brand-primary/20"
        >
          <Plus className="w-5 h-5" /> Add Currency
        </button>
      </div>

      <div className="bg-[var(--bg-surface)] p-4 rounded-2xl border border-[var(--border-soft)] shadow-sm flex items-center gap-3">
        <Search className="w-5 h-5 text-[var(--text-muted)] shrink-0" />
        <input 
          type="text"
          placeholder="Search currencies by name or code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)]"
        />
      </div>

      <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-soft)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[var(--bg-app)]/50">
              <tr>
                <th className="px-6 py-4 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Currency Details</th>
                <th className="px-6 py-4 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Symbol</th>
                <th className="px-6 py-4 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-[var(--text-muted)]">Loading currencies...</td>
                </tr>
              ) : filteredCurrencies.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-[var(--text-muted)]">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-2xl flex items-center justify-center mb-4 text-[var(--text-muted)]">
                        <Coins className="w-6 h-6" />
                      </div>
                      <p>No currencies found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCurrencies.map((currency) => (
                  <tr key={currency.id} className="hover:bg-[var(--bg-app)]/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-bold border border-indigo-500/20">
                          {currency.code}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[var(--text-main)]">{currency.name}</p>
                          <p className="text-xs text-[var(--text-muted)]">Code: {currency.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-lg font-bold text-[var(--text-main)] bg-[var(--bg-app)] border border-[var(--border-soft)] px-3 py-1 rounded-lg">
                        {currency.symbol}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                       <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                         currency.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                       }`}>
                         {currency.status === 'active' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                         {currency.status === 'active' ? 'Active' : 'Inactive'}
                       </span>
                     </td>
                     <td className="px-6 py-4 text-right">
                       <button
                         onClick={() => handleToggleStatus(currency)}
                         className="text-xs font-bold text-brand-primary hover:text-brand-accent transition-colors bg-brand-primary/10 hover:bg-brand-primary/20 px-3 py-1.5 rounded-lg"
                       >
                         {currency.status === 'active' ? 'Deactivate' : 'Activate'}
                       </button>
                     </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-app)]/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--bg-surface)] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden scale-in zoom-in-95 duration-200 border border-[var(--border-soft)]">
            <div className="p-6 border-b border-[var(--border-soft)] flex items-center justify-between bg-[var(--bg-app)]/30">
              <h3 className="text-lg font-bold text-[var(--text-main)]">Add New Currency</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-[var(--bg-app)] rounded-xl transition-colors">
                <X className="w-5 h-5 text-[var(--text-muted)]" />
              </button>
            </div>
            
            <form onSubmit={handleCreateCurrency} className="p-6 space-y-4">
               <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-muted)] uppercase px-1">Currency Name</label>
                  <input 
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl text-sm focus:border-brand-primary placeholder-[var(--text-muted)] outline-none transition-all"
                    placeholder="e.g. US Dollar"
                  />
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase px-1">Currency Code</label>
                    <input 
                      type="text"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl text-sm focus:border-brand-primary placeholder-[var(--text-muted)] outline-none transition-all uppercase"
                      placeholder="e.g. USD"
                      maxLength={10}
                    />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[var(--text-muted)] uppercase px-1">Symbol</label>
                    <input 
                      type="text"
                      required
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value)}
                      className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl text-sm focus:border-brand-primary placeholder-[var(--text-muted)] outline-none transition-all font-bold"
                      placeholder="e.g. $"
                      maxLength={10}
                    />
                 </div>
               </div>

               <div className="pt-4 mt-2 border-t border-[var(--border-soft)]">
                 <div className="flex gap-3">
                   <button 
                     type="button"
                     onClick={() => setIsModalOpen(false)} 
                     className="flex-1 py-3 px-4 bg-[var(--bg-app)] hover:opacity-80 text-[var(--text-muted)] border border-[var(--border-soft)] rounded-xl font-bold transition-all"
                   >
                     Cancel
                   </button>
                   <button 
                     type="submit"
                     disabled={isSubmitting}
                     className="flex-1 py-3 px-4 bg-brand-primary text-brand-accent rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-brand-primary/20"
                   >
                     {isSubmitting ? 'Saving...' : 'Add Currency'}
                   </button>
                 </div>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
