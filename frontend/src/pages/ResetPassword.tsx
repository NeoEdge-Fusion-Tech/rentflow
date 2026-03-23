import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthService } from '../api';

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
    <div className="min-h-screen flex bg-slate-50 items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">Choose a new password</h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            Enter the 6-digit code sent to <span className="font-semibold text-slate-900">{email}</span>
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <div className="text-red-500 text-sm font-medium text-center bg-red-50 py-2 rounded">{error}</div>}
          {success && <div className="text-emerald-500 text-sm font-medium text-center bg-emerald-50 py-2 rounded">{success}</div>}
          
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Verification Code</label>
              <input 
                type="text" 
                required 
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                className="appearance-none block w-full px-3 py-2.5 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-lg text-center font-mono tracking-widest" 
                placeholder="000000" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
              <input 
                type="password" 
                required 
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="appearance-none block w-full px-3 py-2.5 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm" 
                placeholder="••••••••" 
              />
            </div>
          </div>

          <div>
            <button 
              type="submit" 
              disabled={loading || code.length !== 6 || newPassword.length < 4}
              className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-brand-primary hover:bg-slate-800 transition-all disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Set new password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
