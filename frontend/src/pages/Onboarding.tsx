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
    <div className="min-h-screen bg-slate-50 flex flex-col py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl w-full mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold text-slate-900">Welcome to RentFlow</h2>
          <p className="mt-2 text-slate-600">Let's get your workspace configured.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
          {/* Progress Bar */}
          <div className="bg-slate-50 border-b border-slate-100 px-8 py-4 flex items-center justify-between">
            <div className={`text-sm font-medium ${step >= 1 ? 'text-brand-primary' : 'text-slate-400'}`}>1. Pick a plan</div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
            <div className={`text-sm font-medium ${step >= 2 ? 'text-brand-primary' : 'text-slate-400'}`}>2. Invite Team</div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
            <div className={`text-sm font-medium ${step >= 3 ? 'text-brand-primary' : 'text-slate-400'}`}>3. Setup complete</div>
          </div>

          <div className="p-8">
            {step === 1 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <h3 className="text-2xl font-bold mb-6 text-slate-900">Select your Subscription</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {plans.map((p) => (
                    <div 
                      key={p.id} 
                      onClick={() => setSelectedPlan(p.id)}
                      className={`cursor-pointer rounded-xl border-2 p-6 transition-all ${selectedPlan === p.id ? 'border-brand-primary bg-brand-primary/5 shadow-md' : 'border-slate-200 hover:border-brand-primary/50 hover:shadow-lg hover:-translate-y-1'}`}
                    >
                      <h4 className="font-bold text-lg text-slate-900">{p.name}</h4>
                      <p className="text-2xl font-extrabold text-brand-primary my-2">{p.price}<span className="text-sm font-normal text-slate-500">/mo</span></p>
                      <ul className="mt-4 space-y-2">
                        {p.features.map(f => (
                          <li key={f} className="flex items-center text-sm text-slate-600">
                            <Check className="w-4 h-4 text-brand-accent mr-2" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <div className="mt-8 flex justify-end">
                  <button onClick={() => setStep(2)} className="bg-brand-primary text-white px-6 py-2.5 rounded-lg hover:bg-slate-800 transition-colors">Continue</button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <h3 className="text-2xl font-bold mb-2 text-slate-900">Invite your team</h3>
                <p className="text-slate-600 mb-6">You can add staff members now or do it later from settings.</p>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <input type="email" placeholder="staff@example.com" className="flex-1 px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary" />
                    <select className="px-3 py-2 border border-slate-300 rounded-lg shadow-sm bg-white focus:outline-none focus:ring-brand-primary focus:border-brand-primary">
                      <option>Admin</option>
                      <option>Operator</option>
                    </select>
                    <button className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Add</button>
                  </div>
                </div>
                <div className="mt-8 flex justify-between">
                  <button onClick={() => setStep(1)} className="text-slate-500 hover:text-slate-700 font-medium">Back</button>
                  <div className="space-x-4">
                    <button onClick={() => setStep(3)} className="text-slate-500 hover:text-slate-700 font-medium">Skip</button>
                    <button onClick={() => setStep(3)} className="bg-brand-primary text-white px-6 py-2.5 rounded-lg hover:bg-slate-800 transition-colors">Continue</button>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="animate-in zoom-in-95 duration-500 text-center py-12">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold mb-2 text-slate-900">You're all set!</h3>
                <p className="text-slate-600 mb-8 max-w-md mx-auto">Your workspace is configured and ready. You can now start adding products and taking bookings.</p>
                <button onClick={() => navigate('/')} className="bg-brand-primary text-white px-8 py-3 rounded-lg font-medium hover:bg-slate-800 transition-colors shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0">
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
