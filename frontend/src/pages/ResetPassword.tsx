import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthService } from '../api';
import { ThemeToggle } from '../components/ThemeToggle';

export function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const email = searchParams.get('email') || '';

  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await AuthService.setPasswordReset({ email, code, new_password: newPassword });
      setSuccess('Password updated successfully! Redirecting...');
      setTimeout(() => navigate('/login'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password. Check your code.');
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
          <h2 className="mt-6 text-center text-3xl font-extrabold text-[var(--text-main)]">Choose a new password</h2>
          <p className="mt-2 text-center text-sm text-[var(--text-muted)]">
            Enter the 6-digit code sent to <span className="font-semibold text-[var(--text-main)]">{email}</span>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="text-rose-500 text-sm font-medium text-center bg-rose-500/10 py-2 rounded">{error}</div>}
          {success && <div className="text-emerald-500 text-sm font-medium text-center bg-emerald-500/10 py-2 rounded">{success}</div>}
          
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Verification Code</label>
              <input 
                type="text" 
                required 
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                className="appearance-none block w-full px-3 py-2.5 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl shadow-sm placeholder-[var(--text-muted)] opacity-80 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-lg text-center font-mono tracking-widest" 
                placeholder="000000" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">New Password</label>
              <input 
                type="password" 
                required 
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="appearance-none block w-full px-3 py-2.5 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl shadow-sm placeholder-[var(--text-muted)] opacity-80 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm" 
                placeholder="••••••••" 
              />
            </div>
          </div>

          <div>
            <button 
              type="submit" 
              disabled={loading || code.length !== 6 || newPassword.length < 4}
              className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-bold rounded-xl transition-all disabled:opacity-50 shadow-lg bg-brand-primary text-brand-accent dark:bg-brand-accent dark:text-brand-primary hover:opacity-90 active:scale-[0.98]"
            >
              {loading ? 'Updating...' : 'Set new password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
