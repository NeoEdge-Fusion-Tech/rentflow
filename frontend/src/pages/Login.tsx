import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../api';
import { Logo } from '../components/Logo';
import { ThemeToggle } from '../components/ThemeToggle';

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
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
        if (rememberMe) {
          localStorage.setItem('token', res.data.access);
        } else {
          sessionStorage.setItem('token', res.data.access);
        }
        
        try {
          const userRes = await AuthService.getMe();
          if (userRes.data.is_superuser) {
            navigate('/superadmin');
          } else {
            navigate('/dashboard');
          }
        } catch (e) {
          navigate('/dashboard');
        }
      } else {
        setErrorText('Invalid credentials. Please try again.');
      }
    } catch (err: any) {
      if (err.response?.data?.email?.[0] === "Please verify your email address before logging in.") {
        navigate(`/verify-email?email=${encodeURIComponent(email)}`);
      } else {
        setErrorText('Invalid credentials. Please try again.');
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[var(--bg-app)] relative">
      <div className="absolute top-6 right-6 z-50">
        <ThemeToggle />
      </div>

      <div className="flex-1 hidden lg:flex items-center justify-center bg-brand-primary p-12 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-primary to-brand-primary/80 z-0"></div>
        <div className="z-10 max-w-lg">
          <Logo className="h-16 mb-8" dark={true} />
          <h1 className="text-5xl font-bold text-brand-accent mb-6 leading-tight">Manage your inventory with NeoInventory</h1>
          <p className="text-lg text-brand-accent/80">The premier rentals management suite for modern event businesses.</p>
        </div>
      </div>
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm">
          <h2 className="mt-6 text-3xl font-extrabold text-[var(--text-main)] flex items-center gap-3">
            <Logo className="h-10" />
          </h2>
          <h3 className="mt-8 text-2xl font-bold text-[var(--text-main)]">Sign in to your account</h3>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Or {' '}
            <button onClick={() => navigate('/register')} className="font-medium text-[var(--text-link)] hover:text-[var(--text-link-hover)] transition-colors">
              start your free trial
            </button>
          </p>

          <div className="mt-8">
            {errorText && (
              <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 px-4 py-3 rounded-xl text-sm font-medium">
                {errorText}
              </div>
            )}
            <form className="space-y-6" onSubmit={handleLogin}>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)]">Email address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1 appearance-none block w-full px-3 py-2.5 border border-[var(--border-soft)] bg-[var(--bg-surface)] text-[var(--text-main)] rounded-xl shadow-sm placeholder-[var(--text-muted)] focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm" placeholder="you@example.com" />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)]">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="mt-1 appearance-none block w-full px-3 py-2.5 border border-[var(--border-soft)] bg-[var(--bg-surface)] text-[var(--text-main)] rounded-xl shadow-sm placeholder-[var(--text-muted)] focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm" placeholder="••••••••" />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input id="remember-me" name="remember-me" type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="h-4 w-4 text-brand-primary focus:ring-brand-primary border-[var(--border-soft)] rounded accent-brand-primary" />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-[var(--text-main)]">
                    Remember me
                  </label>
                  </div>

                  <div className="text-sm">
                    <button type="button" onClick={() => navigate('/forgot-password')} className="font-medium text-[var(--text-link)] hover:text-[var(--text-link-hover)] transition-colors">
                      Forgot your password?
                    </button>
                  </div>
                </div>

              <div>
                <button 
                  type="submit" 
                  disabled={isLoading} 
                  className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50 bg-brand-primary text-brand-accent hover:opacity-90"
                >
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
