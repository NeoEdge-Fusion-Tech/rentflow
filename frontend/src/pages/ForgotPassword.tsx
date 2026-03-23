import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../api';

export function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await AuthService.triggerPasswordReset({ email });
      setSuccess('Reset code sent! Redirecting...');
      setTimeout(() => navigate(`/reset-password?email=${encodeURIComponent(email)}`), 1500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send reset code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">Reset your password</h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Enter your email and we'll send you a reset code.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="text-red-500 text-sm font-medium text-center bg-red-50 py-2 rounded">{error}</div>}
          {success && <div className="text-emerald-500 text-sm font-medium text-center bg-emerald-50 py-2 rounded">{success}</div>}
          
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">Email address</label>
              <input 
                id="email-address" 
                name="email" 
                type="email" 
                autoComplete="email" 
                required 
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="appearance-none block w-full px-3 py-2.5 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm" 
                placeholder="Email address" 
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <button type="button" onClick={() => navigate('/login')} className="font-medium text-brand-primary hover:text-brand-accent transition-colors">
                Back to sign in
              </button>
            </div>
          </div>

          <div>
            <button 
              type="submit" 
              disabled={loading}
              className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-brand-primary hover:bg-slate-800 transition-all disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send reset code'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
