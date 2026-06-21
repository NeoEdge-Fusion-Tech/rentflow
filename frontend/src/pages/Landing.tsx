import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { Footer } from '../components/Footer';
import { ThemeToggle } from '../components/ThemeToggle';
import { Package, Calendar, FileText, ChevronRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export function Landing() {
  const navigate = useNavigate();
  const { theme } = useTheme();

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-main)] flex flex-col font-sans transition-colors duration-300">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 max-w-7xl w-full mx-auto">
        <Logo className="h-8" dark={theme === 'dark'} />
        <div className="flex items-center gap-4">
          <ThemeToggle className="bg-transparent border-0 shadow-none p-2 rounded-full hover:bg-[var(--border-subtle)]" />
          <button 
            onClick={() => navigate('/login')} 
            className="px-4 py-2 text-sm font-bold text-[var(--text-main)] hover:bg-[var(--bg-surface)] rounded-xl transition-colors"
          >
            Sign In
          </button>
          <button 
            onClick={() => navigate('/register')} 
            className="px-4 py-2 text-sm font-bold bg-brand-primary text-brand-accent rounded-xl hover:opacity-90 transition-colors shadow-sm shadow-brand-primary/20"
          >
            Get Started
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto space-y-8">
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-[var(--text-main)] leading-tight">
            Streamline your <br />
            <span className="text-brand-accent relative">
              rental business
              <svg className="absolute -bottom-2 left-0 w-full h-3 text-brand-primary/30" viewBox="0 0 100 10" preserveAspectRatio="none">
                <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="4" fill="transparent" />
              </svg>
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-[var(--text-muted)] max-w-2xl mx-auto leading-relaxed">
            Manage your entire inventory, track bookings, invoice clients, and oversee operations all in one clean, powerful platform.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button 
              onClick={() => navigate('/register')} 
              className="w-full sm:w-auto px-8 py-4 bg-brand-primary text-brand-accent rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-brand-primary/20 flex items-center justify-center gap-2 group"
            >
              Start for free
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => navigate('/login')} 
              className="w-full sm:w-auto px-8 py-4 bg-[var(--bg-surface)] text-[var(--text-main)] rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-[var(--border-subtle)] transition-all border border-[var(--border-soft)]"
            >
              Sign In
            </button>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full mx-auto mt-24">
          <div className="p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-soft)] shadow-sm text-left group hover:border-brand-primary/30 transition-colors">
            <div className="w-12 h-12 bg-brand-primary/10 text-brand-primary rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-[var(--text-main)] mb-3">Inventory Tracking</h3>
            <p className="text-[var(--text-muted)] leading-relaxed">
              Real-time stock visibility. Track serialized and bulk items, monitor conditions, and automate availability.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-soft)] shadow-sm text-left group hover:border-brand-primary/30 transition-colors">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-[var(--text-main)] mb-3">Booking Management</h3>
            <p className="text-[var(--text-muted)] leading-relaxed">
              Schedule rentals flawlessly. Prevent double bookings, manage pickups, and handle delivery logistics.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-soft)] shadow-sm text-left group hover:border-brand-primary/30 transition-colors">
            <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-[var(--text-main)] mb-3">Invoicing & Payments</h3>
            <p className="text-[var(--text-muted)] leading-relaxed">
              Generate branded invoices instantly. Track payments, deposits, and outstanding balances effortlessly.
            </p>
          </div>
        </div>
      </main>

      {/* Footer Component */}
      <div className="border-t border-[var(--border-soft)] mt-auto bg-[var(--bg-surface)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo className="h-6" showText={false} dark={theme === 'dark'} />
          <Footer className="!py-0 !w-auto" />
        </div>
      </div>
    </div>
  );
}
