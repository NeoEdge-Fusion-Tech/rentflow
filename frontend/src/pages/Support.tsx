import React, { useState } from 'react';
import { useNotification } from '../context/NotificationContext';
import { SupportService } from '../api';
import { Heart, MessageSquare, HelpCircle, Star, Send } from 'lucide-react';

export function Support() {
  const { showNotification } = useNotification();
  const [activeTab, setActiveTab] = useState<'contact' | 'feedback' | 'rate'>('contact');
  
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    rating: 0
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'rate' && formData.rating === 0) {
      showNotification('Please select a rating', 'error');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await SupportService.submitFeedback({
        type: activeTab,
        subject: formData.subject,
        message: formData.message,
        rating: activeTab === 'rate' ? formData.rating : undefined
      });
      showNotification('Thank you for your submission!', 'success');
      setFormData({ subject: '', message: '', rating: 0 });
    } catch (error) {
      showNotification('Failed to submit. Please try again later.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-brand-primary" />
          Help & Support
        </h1>
        <p className="text-[var(--text-muted)] mt-1">We're here to help and listen to your feedback.</p>
      </div>

      <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-soft)] shadow-sm overflow-hidden">
        <div className="flex border-b border-[var(--border-soft)] overflow-x-auto">
          <button
            onClick={() => setActiveTab('contact')}
            className={`flex-1 py-4 px-6 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'contact' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-app)]'
            }`}
          >
            <MessageSquare className="w-4 h-4" /> Contact Us
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            className={`flex-1 py-4 px-6 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'feedback' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-app)]'
            }`}
          >
            <Heart className="w-4 h-4" /> Product Feedback
          </button>
          <button
            onClick={() => setActiveTab('rate')}
            className={`flex-1 py-4 px-6 text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'rate' ? 'border-amber-500 text-amber-500' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-app)]'
            }`}
          >
            <Star className="w-4 h-4" /> Rate App
          </button>
        </div>

        <div className="p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
            
            {activeTab === 'contact' && (
              <>
                <div>
                  <h2 className="text-xl font-bold text-[var(--text-main)] mb-2">Get in touch</h2>
                  <p className="text-sm text-[var(--text-muted)] mb-6">Need help with something? Send us a message and our support team will get back to you shortly.</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-[var(--text-muted)] mb-1.5">Subject</label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={e => setFormData({...formData, subject: e.target.value})}
                    placeholder="e.g. Issue with billing"
                    className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl text-[var(--text-main)] outline-none focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[var(--text-muted)] mb-1.5">Message</label>
                  <textarea
                    required
                    value={formData.message}
                    onChange={e => setFormData({...formData, message: e.target.value})}
                    placeholder="Describe your issue or question in detail..."
                    rows={5}
                    className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl text-[var(--text-main)] outline-none focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary resize-y min-h-[120px]"
                  />
                </div>
              </>
            )}

            {activeTab === 'feedback' && (
              <>
                <div>
                  <h2 className="text-xl font-bold text-[var(--text-main)] mb-2">Share your thoughts</h2>
                  <p className="text-sm text-[var(--text-muted)] mb-6">Have an idea for a new feature? Or something you'd like us to improve? Let us know!</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-[var(--text-muted)] mb-1.5">Feature or Topic</label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={e => setFormData({...formData, subject: e.target.value})}
                    placeholder="e.g. New Inventory Report"
                    className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl text-[var(--text-main)] outline-none focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-[var(--text-muted)] mb-1.5">Feedback Details</label>
                  <textarea
                    required
                    value={formData.message}
                    onChange={e => setFormData({...formData, message: e.target.value})}
                    placeholder="Tell us what you'd like to see or how we can improve..."
                    rows={5}
                    className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl text-[var(--text-main)] outline-none focus:ring-2 focus:ring-brand-primary/10 focus:border-brand-primary resize-y min-h-[120px]"
                  />
                </div>
              </>
            )}

            {activeTab === 'rate' && (
              <>
                <div className="text-center py-6">
                  <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2">How are we doing?</h2>
                  <p className="text-sm text-[var(--text-muted)] mb-8">Tap a star to rate your experience with Rentflow.</p>
                  
                  <div className="flex justify-center gap-2 mb-8">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFormData({...formData, rating: star})}
                        className={`p-2 transition-transform hover:scale-110 focus:outline-none ${
                          formData.rating >= star ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'
                        }`}
                      >
                        <Star className="w-12 h-12" fill={formData.rating >= star ? "currentColor" : "none"} />
                      </button>
                    ))}
                  </div>
                </div>
                
                {formData.rating > 0 && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <label className="block text-sm font-bold text-[var(--text-muted)] mb-1.5">Anything else you'd like to share? (Optional)</label>
                    <textarea
                      value={formData.message}
                      onChange={e => setFormData({...formData, message: e.target.value})}
                      placeholder="Tell us what you love or what could be better..."
                      rows={4}
                      className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl text-[var(--text-main)] outline-none focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 resize-y min-h-[100px]"
                    />
                  </div>
                )}
              </>
            )}

            <button
              type="submit"
              disabled={isSubmitting || (activeTab === 'rate' && formData.rating === 0)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-brand-primary text-brand-accent font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-primary/20"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
