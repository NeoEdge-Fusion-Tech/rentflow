import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService, CurrencyService } from '../api';
import { ThemeToggle } from '../components/ThemeToggle';

export function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ company_name: '', full_name: '', email: '', password: '', currency_id: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currencies, setCurrencies] = useState<any[]>([]);

  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const res = await CurrencyService.getAll();
        setCurrencies(res.data.results || res.data);
      } catch (err) {
        console.error("Failed to fetch currencies", err);
      }
    };
    fetchCurrencies();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await AuthService.register(formData);
      navigate(`/verify-email?email=${encodeURIComponent(formData.email)}`);
    } catch (err: any) {
      setError(err.response?.data?.email?.[0] || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[var(--bg-app)] relative">
      <div className="absolute top-6 left-6 z-50">
        <ThemeToggle />
      </div>

      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm">
          <h2 className="mt-6 text-3xl font-extrabold text-[var(--text-main)]">Create an account</h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Already have an account? {' '}
            <button onClick={() => navigate('/login')} className="font-medium text-[var(--text-link)] hover:text-[var(--text-link-hover)] transition-colors">
              Sign in
            </button>
          </p>

          <div className="mt-8">
            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 px-4 py-3 rounded-xl text-sm font-medium">{error}</div>}
              
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)]">Company Name</label>
                <input type="text" value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} required className="mt-1 appearance-none block w-full px-3 py-2.5 border border-[var(--border-soft)] bg-[var(--bg-surface)] text-[var(--text-main)] rounded-xl shadow-sm placeholder-[var(--text-muted)] focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm" placeholder="Acme Rentals" />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)]">Full Name</label>
                <input type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} required className="mt-1 appearance-none block w-full px-3 py-2.5 border border-[var(--border-soft)] bg-[var(--bg-surface)] text-[var(--text-main)] rounded-xl shadow-sm placeholder-[var(--text-muted)] focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm" placeholder="John Doe" />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)]">Email address</label>
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required className="mt-1 appearance-none block w-full px-3 py-2.5 border border-[var(--border-soft)] bg-[var(--bg-surface)] text-[var(--text-main)] rounded-xl shadow-sm placeholder-[var(--text-muted)] focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm" placeholder="you@example.com" />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)]">Currency</label>
                <select value={formData.currency_id} onChange={e => setFormData({...formData, currency_id: e.target.value})} className="mt-1 appearance-none block w-full px-3 py-2.5 border border-[var(--border-soft)] rounded-xl shadow-sm bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm">
                  <option value="" className="bg-[var(--bg-surface)] text-[var(--text-main)]">Select a currency</option>
                  {currencies.map(c => (
                    <option key={c.id} value={c.id} className="bg-[var(--bg-surface)] text-[var(--text-main)]">{c.name} ({c.symbol})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)]">Password</label>
                <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} required className="mt-1 appearance-none block w-full px-3 py-2.5 border border-[var(--border-soft)] bg-[var(--bg-surface)] text-[var(--text-main)] rounded-xl shadow-sm placeholder-[var(--text-muted)] focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm" placeholder="••••••••" />
              </div>

              <div>
                <button 
                  type="submit" 
                  disabled={loading} 
                  className="w-full flex justify-center py-2.5 px-4 rounded-xl shadow-lg text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50 bg-brand-primary text-brand-accent dark:bg-brand-accent dark:text-brand-primary hover:opacity-90 border border-transparent"
                >
                  {loading ? 'Processing...' : 'Continue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="flex-1 hidden lg:flex items-center justify-center bg-brand-primary p-12 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary via-brand-primary to-brand-primary/90 z-0"></div>
        <div className="z-10 max-w-lg text-right ml-auto">
          <h1 className="text-5xl font-bold text-brand-accent mb-6 leading-tight">Join thousands of rental businesses</h1>
          <p className="text-lg text-brand-accent/80">Start scaling your operations today.</p>
        </div>
      </div>
    </div>
  );
}
