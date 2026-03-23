import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../api';

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    try {
      setIsLoading(true);
      setErrorText('');
      const res = await AuthService.login({ username: email, password });
      if (res.data && res.data.access) {
        localStorage.setItem('token', res.data.access);
        navigate('/');
      } else {
        setErrorText('Invalid credentials. Please try again.');
      }
    } catch (err) {
      setErrorText('Invalid credentials. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      <div className="flex-1 hidden lg:flex items-center justify-center bg-brand-primary p-12 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-primary to-slate-900 z-0"></div>
        <div className="z-10 max-w-lg">
          <h1 className="text-5xl font-bold text-white mb-6 leading-tight">Manage your inventory with RentFlow</h1>
          <p className="text-lg text-slate-300">The premier SaaS software for modern rental businesses.</p>
        </div>
      </div>
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm">
          <h2 className="mt-6 text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-brand-accent flex items-center justify-center text-white text-sm">R</span>
            RentFlow
          </h2>
          <h3 className="mt-8 text-2xl font-bold text-slate-900">Sign in to your account</h3>
          <p className="mt-2 text-sm text-slate-600">
            Or {' '}
            <button onClick={() => navigate('/register')} className="font-medium text-brand-primary hover:text-brand-accent transition-colors">
              start your 14-day free trial
            </button>
          </p>

          <div className="mt-8">
            {errorText && (
              <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl text-sm font-medium">
                {errorText}
              </div>
            )}
            <form className="space-y-6" onSubmit={handleLogin}>
              <div>
                <label className="block text-sm font-medium text-slate-700">Email address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1 appearance-none block w-full px-3 py-2.5 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm" placeholder="you@example.com" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="mt-1 appearance-none block w-full px-3 py-2.5 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm" placeholder="••••••••" />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 text-brand-primary focus:ring-brand-primary border-slate-300 rounded" />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-900">
                    Remember me
                  </label>
                  </div>

                  <div className="text-sm">
                    <button type="button" onClick={() => navigate('/forgot-password')} className="font-medium text-brand-primary hover:text-brand-accent transition-colors">
                      Forgot your password?
                    </button>
                  </div>
                </div>

              <div>
                <button type="submit" disabled={isLoading} className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-all active:scale-[0.98] disabled:opacity-50">
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
