import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PublicFeedbackService } from '../api';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { ProjectFeedback, FeedbackQuestion } from '../types';

export function PublicFeedback() {
  const { uuid } = useParams<{ uuid: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [projectFeedback, setProjectFeedback] = useState<ProjectFeedback | null>(null);
  
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  
  // Mapping of question ID to answer
  const [answers, setAnswers] = useState<Record<number, any>>({});

  useEffect(() => {
    if (uuid) {
      fetchForm(uuid);
    }
  }, [uuid]);

  const fetchForm = async (id: string) => {
    try {
      setLoading(true);
      const res = await PublicFeedbackService.getForm(id);
      setProjectFeedback(res.data);
      
      // Initialize answers
      const initialAnswers: Record<number, any> = {};
      res.data.form.questions?.forEach((q: FeedbackQuestion) => {
        if (q.id) {
          if (q.question_type === 'TEXT' || q.question_type === 'RADIO') initialAnswers[q.id] = '';
          else if (q.question_type === 'RATING') initialAnswers[q.id] = 0;
          else if (q.question_type === 'BOOLEAN') initialAnswers[q.id] = null;
          else if (q.question_type === 'CHECKBOX') initialAnswers[q.id] = [];
        }
      });
      setAnswers(initialAnswers);
    } catch (e) {
      setError('Form not found or is no longer active.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: number, value: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectFeedback) return;
    
    setError('');
    
    // Validate required questions
    for (const q of projectFeedback.form.questions || []) {
      if (q.is_required !== false && q.id) {
        const val = answers[q.id];
        if (
          (q.question_type === 'TEXT' && !val) ||
          (q.question_type === 'RADIO' && !val) ||
          (q.question_type === 'RATING' && (!val || val === 0)) ||
          (q.question_type === 'BOOLEAN' && val === null) ||
          (q.question_type === 'CHECKBOX' && (!val || val.length === 0))
        ) {
          setError('Please answer all required questions before submitting.');
          return;
        }
      }
    }

    // Format answers array
    const formattedAnswers = Object.entries(answers).map(([qId, val]) => {
      const q = projectFeedback.form.questions?.find(question => question.id === parseInt(qId));
      if (!q) return null;
      
      return {
        question: parseInt(qId),
        answer_text: (q.question_type === 'TEXT' || q.question_type === 'RADIO') ? val : null,
        answer_rating: q.question_type === 'RATING' ? val : null,
        answer_boolean: q.question_type === 'BOOLEAN' ? val : null,
        answer_choices: q.question_type === 'CHECKBOX' ? val : null,
      };
    }).filter(Boolean);

    try {
      setSubmitting(true);
      await PublicFeedbackService.submitResponse({
        project_feedback: projectFeedback.id,
        client_name: clientName,
        client_email: clientEmail,
        answers: formattedAnswers
      });
      setSuccess(true);
    } catch (e) {
      setError('An error occurred while submitting your feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-app)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  if (error || !projectFeedback) {
    return (
      <div className="min-h-screen bg-[var(--bg-app)] flex items-center justify-center p-4">
        <div className="bg-[var(--bg-surface)] p-8 rounded-2xl max-w-md w-full text-center border border-[var(--border-soft)] shadow-xl">
          <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-rose-500" />
          </div>
          <h1 className="text-xl font-bold text-[var(--text-main)] mb-2">Oops!</h1>
          <p className="text-[var(--text-muted)]">{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[var(--bg-app)] flex items-center justify-center p-4">
        <div className="bg-[var(--bg-surface)] p-8 rounded-2xl max-w-md w-full text-center border border-[var(--border-soft)] shadow-xl">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-main)] mb-2">Thank You!</h1>
          <p className="text-[var(--text-muted)]">Your feedback has been successfully submitted and helps us improve our services.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-app)] flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-2xl">
        <div className="bg-[var(--bg-surface)] p-8 rounded-t-3xl border-b-[8px] border-brand-primary shadow-sm mb-6 text-center">
          <div className="flex flex-col items-center justify-center mb-6">
            {projectFeedback.event_details?.organization_logo && (
              <img src={projectFeedback.event_details.organization_logo} alt={projectFeedback.event_details.organization_name} className="h-16 mb-3 object-contain" />
            )}
            <div className="text-xl font-black text-[var(--text-main)] opacity-90">{projectFeedback.event_details?.organization_name}</div>
          </div>
          
          <h1 className="text-3xl font-bold text-[var(--text-main)] mb-2">{projectFeedback.form.title}</h1>
          
          {projectFeedback.event_details && (
            <div className="text-sm font-medium text-[var(--text-muted)] mb-4 bg-[var(--bg-app)] inline-block px-4 py-2 rounded-xl">
              <span className="font-bold text-[var(--text-main)]">{projectFeedback.event_details.name}</span>
              {(projectFeedback.event_details.event_date) && (
                <span className="ml-2 border-l border-[var(--border-soft)] pl-2">
                  <span className="text-[var(--text-muted)] mr-1">Event / Job Date:</span>
                  {new Date(projectFeedback.event_details.event_date).toLocaleDateString()}
                </span>
              )}
            </div>
          )}

          {projectFeedback.form.description && (
            <p className="text-[var(--text-muted)] mt-2">{projectFeedback.form.description}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-[var(--bg-surface)] p-6 md:p-8 rounded-2xl shadow-sm border border-[var(--border-soft)]">
            <h2 className="text-lg font-bold mb-4">Your Information (Optional)</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Name</label>
                <input 
                  type="text" 
                  value={clientName} 
                  onChange={e => setClientName(e.target.value)}
                  className="w-full border border-[var(--border-soft)] rounded-xl p-3 outline-none focus:border-brand-primary bg-[var(--bg-app)]"
                  placeholder="Your Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Email</label>
                <input 
                  type="email" 
                  value={clientEmail} 
                  onChange={e => setClientEmail(e.target.value)}
                  className="w-full border border-[var(--border-soft)] rounded-xl p-3 outline-none focus:border-brand-primary bg-[var(--bg-app)]"
                  placeholder="your.email@example.com"
                />
              </div>
            </div>
          </div>

          {projectFeedback.form.questions?.map((q, idx) => (
            <div key={q.id} className="bg-[var(--bg-surface)] p-6 md:p-8 rounded-2xl shadow-sm border border-[var(--border-soft)]">
              <label className="block font-medium text-[var(--text-main)] mb-4 text-lg">
                <span className="text-brand-primary font-bold mr-2">{idx + 1}.</span> 
                {q.question_text}
                {q.is_required !== false && <span className="text-rose-500 ml-1">*</span>}
              </label>
              
              {q.question_type === 'TEXT' && (
                <textarea 
                  value={answers[q.id!] || ''}
                  onChange={e => handleAnswerChange(q.id!, e.target.value)}
                  required={q.is_required !== false}
                  className="w-full border border-[var(--border-soft)] rounded-xl p-3 outline-none focus:border-brand-primary bg-[var(--bg-app)] min-h-[120px]"
                  placeholder="Type your answer here..."
                />
              )}

              {q.question_type === 'RATING' && (
                <div className="flex gap-2 text-2xl">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => handleAnswerChange(q.id!, star)}
                      className={`transition-colors ${answers[q.id!] >= star ? 'text-amber-400' : 'text-[var(--border-soft)] hover:text-amber-400/50'}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              )}

              {q.question_type === 'BOOLEAN' && (
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => handleAnswerChange(q.id!, true)}
                    className={`flex-1 py-3 px-4 rounded-xl border font-medium transition-colors ${answers[q.id!] === true ? 'border-brand-primary bg-brand-primary/10 text-brand-primary' : 'border-[var(--border-soft)] text-[var(--text-muted)] hover:bg-[var(--bg-app)]'}`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAnswerChange(q.id!, false)}
                    className={`flex-1 py-3 px-4 rounded-xl border font-medium transition-colors ${answers[q.id!] === false ? 'border-rose-500 bg-rose-500/10 text-rose-500' : 'border-[var(--border-soft)] text-[var(--text-muted)] hover:bg-[var(--bg-app)]'}`}
                  >
                    No
                  </button>
                </div>
              )}

              {q.question_type === 'RADIO' && q.options && (
                <div className="space-y-3 mt-2">
                  {q.options.map((opt, optIdx) => (
                    <label key={optIdx} className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${answers[q.id!] === opt ? 'border-brand-primary' : 'border-[var(--border-soft)] group-hover:border-[var(--text-muted)]'}`}>
                        {answers[q.id!] === opt && <div className="w-2.5 h-2.5 rounded-full bg-brand-primary" />}
                      </div>
                      <span className="text-[var(--text-main)]">{opt}</span>
                      <input 
                        type="radio" 
                        className="hidden" 
                        checked={answers[q.id!] === opt}
                        onChange={() => handleAnswerChange(q.id!, opt)}
                      />
                    </label>
                  ))}
                </div>
              )}

              {q.question_type === 'CHECKBOX' && q.options && (
                <div className="space-y-3 mt-2">
                  {q.options.map((opt, optIdx) => {
                    const isChecked = (answers[q.id!] || []).includes(opt);
                    return (
                      <label key={optIdx} className="flex items-center gap-3 cursor-pointer group">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isChecked ? 'bg-brand-primary border-brand-primary text-white' : 'border-[var(--border-soft)] group-hover:border-[var(--text-muted)]'}`}>
                          {isChecked && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                        <span className="text-[var(--text-main)]">{opt}</span>
                        <input 
                          type="checkbox" 
                          className="hidden" 
                          checked={isChecked}
                          onChange={(e) => {
                            const currentAnswers = answers[q.id!] || [];
                            if (e.target.checked) {
                              handleAnswerChange(q.id!, [...currentAnswers, opt]);
                            } else {
                              handleAnswerChange(q.id!, currentAnswers.filter((a: string) => a !== opt));
                            }
                          }}
                        />
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          <button 
            type="submit" 
            disabled={submitting}
            className="w-full py-4 bg-brand-primary text-white font-bold rounded-2xl hover:opacity-90 shadow-xl shadow-brand-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Feedback'}
          </button>
        </form>
      </div>
    </div>
  );
}
