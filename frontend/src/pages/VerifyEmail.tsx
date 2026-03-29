import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthService } from '../api';
import { ThemeToggle } from '../components/ThemeToggle';

export function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const email = searchParams.get('email') || '';

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await AuthService.verifyEmail({ email, code });
      setSuccess('Email verified! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Verification failed. Invalid code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[var(--bg-app)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>
      <div className="max-w-md w-full space-y-8 bg-[var(--bg-surface)] p-10 rounded-2xl shadow-sm border border-[var(--border-soft)]">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-[var(--text-main)]">Verify your email</h2>
          <p className="mt-2 text-center text-sm text-[var(--text-muted)]">
            We sent a 6-digit code to <span className="font-semibold text-[var(--text-main)]">{email}</span>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="text-rose-500 text-sm text-center font-medium bg-rose-500/10 p-2 rounded">{error}</div>}
          {success && <div className="text-emerald-500 text-sm text-center font-medium bg-emerald-500/10 p-2 rounded">{success}</div>}
          
          <div className="rounded-md shadow-sm -space-y-px text-center">
            <div>
              <input 
                type="text" 
                required 
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                className="appearance-none relative block w-full px-3 py-3 border border-[var(--border-soft)] bg-[var(--bg-app)] text-[var(--text-main)] rounded-xl focus:outline-none focus:ring-brand-primary focus:border-brand-primary focus:z-10 sm:text-2xl text-center font-mono tracking-widest placeholder-[var(--text-muted)] opacity-80" 
                placeholder="000000" 
              />
            </div>
          </div>

          <div>
            <button 
              type="submit" 
              disabled={loading || code.length !== 6}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl transition-all disabled:opacity-50 shadow-lg bg-brand-primary text-brand-accent dark:bg-brand-accent dark:text-brand-primary hover:opacity-90 active:scale-[0.98]"
            >
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
