import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lightbulb, X, ChevronRight } from 'lucide-react';

export function UserHint() {
  const [isVisible, setIsVisible] = useState(false);
  const [step, setStep] = useState(0);

  const hints = [
    {
      title: "Welcome to NeoEvent!",
      content: "This platform helps you manage your rentals and bookings efficiently. Let's take a quick tour."
    },
    {
      title: "Inventory Management",
      content: "Navigate to the Inventory tab to add your products, set pricing, and manage stock levels."
    },
    {
      title: "Track Bookings",
      content: "Use the Bookings section to see upcoming rentals, approve requests, and monitor returns."
    },
    {
      title: "Get Started",
      content: "You're all set! Start by adding your first item to the inventory."
    }
  ];

  useEffect(() => {
    // Check if the user has seen the hint before
    const hasSeenHint = localStorage.getItem('neoevent_has_seen_hint');
    if (!hasSeenHint) {
      // Add a slight delay before showing the hint
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleNext = () => {
    if (step < hints.length - 1) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('neoevent_has_seen_hint', 'true');
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ type: "spring", bounce: 0.4 }}
          className="fixed bottom-6 right-6 z-[100] max-w-sm w-full bg-[var(--bg-surface)] border border-brand-primary/20 shadow-2xl rounded-2xl overflow-hidden"
        >
          <div className="bg-brand-primary/10 p-4 border-b border-brand-primary/10 flex items-center justify-between">
            <div className="flex items-center gap-2 text-brand-primary font-bold">
              <Lightbulb className="w-5 h-5" />
              <span>Quick Tip {step + 1}/{hints.length}</span>
            </div>
            <button 
              onClick={handleClose}
              className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors p-1 rounded-lg hover:bg-[var(--bg-app)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="p-6">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="min-h-[80px]"
            >
              <h3 className="text-lg font-bold text-[var(--text-main)] mb-2">{hints[step].title}</h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                {hints[step].content}
              </p>
            </motion.div>
            
            <div className="mt-6 flex items-center justify-between">
              <div className="flex gap-1">
                {hints.map((_, idx) => (
                  <div 
                    key={idx} 
                    className={`h-1.5 rounded-full transition-all duration-300 ${idx === step ? 'w-4 bg-brand-primary' : 'w-1.5 bg-[var(--border-soft)]'}`}
                  />
                ))}
              </div>
              
              <button 
                onClick={handleNext}
                className="flex items-center gap-1 px-4 py-2 bg-brand-primary text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity"
              >
                {step === hints.length - 1 ? 'Got it!' : 'Next'}
                {step < hints.length - 1 && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
