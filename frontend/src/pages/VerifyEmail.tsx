import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthService } from '../api';

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
    <div className="min-h-screen flex bg-slate-50 items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">Verify your email</h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            We sent a 6-digit code to <span className="font-semibold text-slate-900">{email}</span>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="text-red-500 text-sm text-center font-medium bg-red-50 p-2 rounded">{error}</div>}
          {success && <div className="text-emerald-600 text-sm text-center font-medium bg-emerald-50 p-2 rounded">{success}</div>}
          
          <div className="rounded-md shadow-sm -space-y-px text-center">
            <div>
              <input 
                type="text" 
                required 
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                className="appearance-none relative block w-full px-3 py-3 border border-slate-300 text-slate-900 rounded-xl focus:outline-none focus:ring-brand-primary focus:border-brand-primary focus:z-10 sm:text-2xl text-center font-mono tracking-widest" 
                placeholder="000000" 
              />
            </div>
          </div>

          <div>
            <button 
              type="submit" 
              disabled={loading || code.length !== 6}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-brand-primary hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-all disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
