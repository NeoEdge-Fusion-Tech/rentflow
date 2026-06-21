import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Package, Users } from 'lucide-react';

export function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState('free');

  const plans = [
    { id: 'free', name: 'Starter', price: '$0', features: ['Up to 50 products', 'Basic bookings', '1 User'] },
    { id: 'basic', name: 'Professional', price: '$49', features: ['Unlimited products', 'Advanced Inventory', '3 Users'] },
    { id: 'pro', name: 'Premium', price: '$99', features: ['Everything in Pro', 'Custom domain', 'Unlimited Users'] },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-app)] flex flex-col py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl w-full mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-[var(--text-main)]">Welcome to NeoInventory</h2>
          <p className="mt-2 text-[var(--text-muted)]">Let's get your workspace configured.</p>
        </div>

        <div className="bg-[var(--bg-surface)] rounded-2xl shadow-xl overflow-hidden border border-[var(--border-soft)]">
          {/* Progress Bar */}
          <div className="bg-[var(--bg-app)] border-b border-[var(--border-soft)] px-8 py-4 flex items-center justify-between">
            <div className={`text-sm font-medium ${step >= 1 ? 'text-brand-primary' : 'text-[var(--text-muted)]'}`}>1. Pick a plan</div>
            <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
            <div className={`text-sm font-medium ${step >= 2 ? 'text-brand-primary' : 'text-[var(--text-muted)]'}`}>2. Invite Team</div>
            <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
            <div className={`text-sm font-medium ${step >= 3 ? 'text-brand-primary' : 'text-[var(--text-muted)]'}`}>3. Setup complete</div>
          </div>

          <div className="p-8">
            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <h3 className="text-2xl font-bold mb-6 text-[var(--text-main)]">Select your Subscription</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {plans.map((p) => (
                    <div 
                      key={p.id} 
                      onClick={() => setSelectedPlan(p.id)}
                      className={`cursor-pointer rounded-xl border-2 p-6 transition-all ${selectedPlan === p.id ? 'border-brand-primary bg-brand-primary/10 shadow-md' : 'border-[var(--border-soft)] bg-[var(--bg-app)] hover:border-brand-primary/50 hover:shadow-lg hover:-translate-y-1'}`}
                    >
                      <h4 className="font-bold text-lg text-[var(--text-main)]">{p.name}</h4>
                      <p className="text-2xl font-extrabold text-brand-primary my-2">{p.price}<span className="text-sm font-normal text-[var(--text-muted)]">/mo</span></p>
                      <ul className="mt-4 space-y-2">
                        {p.features.map(f => (
                          <li key={f} className="flex items-center text-sm text-[var(--text-muted)]">
                            <Check className="w-4 h-4 text-brand-accent mr-2" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <div className="mt-8 flex justify-end">
                  <button onClick={() => setStep(2)} className="bg-brand-primary text-brand-accent px-6 py-2.5 rounded-lg hover:bg-brand-primary/90 transition-colors">Continue</button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <h3 className="text-2xl font-bold mb-2 text-[var(--text-main)]">Invite your team</h3>
                <p className="text-[var(--text-muted)] mb-6">You can add staff members now or do it later from settings.</p>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <input type="email" placeholder="staff@example.com" className="flex-1 px-3 py-2 border border-[var(--border-soft)] bg-[var(--bg-app)] text-[var(--text-main)] rounded-lg shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary" />
                    <select className="px-3 py-2 border border-[var(--border-soft)] bg-[var(--bg-app)] text-[var(--text-main)] rounded-lg shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary">
                      <option className="bg-[var(--bg-surface)]">Admin</option>
                      <option className="bg-[var(--bg-surface)]">Operator</option>
                    </select>
                    <button className="px-4 py-2 border border-[var(--border-soft)] bg-[var(--bg-app)] rounded-lg text-sm font-medium text-[var(--text-main)] hover:bg-[var(--bg-surface)]">Add</button>
                  </div>
                </div>
                <div className="mt-8 flex justify-between">
                  <button onClick={() => setStep(1)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] font-medium">Back</button>
                  <div className="space-x-4">
                    <button onClick={() => setStep(3)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] font-medium">Skip</button>
                    <button onClick={() => setStep(3)} className="bg-brand-primary text-brand-accent px-6 py-2.5 rounded-lg hover:bg-brand-primary/90 transition-colors">Continue</button>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="animate-in zoom-in-95 duration-500 text-center py-12">
                <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check className="w-10 h-10 text-emerald-500" />
                </div>
                <h3 className="text-2xl font-bold mb-2 text-[var(--text-main)]">You're all set!</h3>
                <p className="text-[var(--text-muted)] mb-8 max-w-md mx-auto">Your workspace is configured and ready. You can now start adding products and taking bookings.</p>
                <button onClick={() => navigate('/dashboard')} className="bg-brand-primary text-brand-accent px-8 py-3 rounded-lg font-medium hover:opacity-90 transition-colors shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0">
                  Go to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
