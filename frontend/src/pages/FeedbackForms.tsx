import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Eye, GripVertical } from 'lucide-react';
import { FeedbackService } from '../api';
import { FeedbackForm, FeedbackQuestion } from '../types';
import { useNotification } from '../context/NotificationContext';

export function FeedbackForms() {
  const { showNotification, showConfirm } = useNotification();
  const [forms, setForms] = useState<FeedbackForm[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Editor state
  const [isEditing, setIsEditing] = useState(false);
  const [currentForm, setCurrentForm] = useState<Partial<FeedbackForm>>({ title: '', description: '', questions: [] });
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  
  useEffect(() => {
    fetchForms();
  }, []);

  const fetchForms = async () => {
    try {
      setLoading(true);
      const res = await FeedbackService.getForms();
      setForms(res.data.results || res.data);
    } catch (e) {
      showNotification('Failed to load feedback forms', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveForm = async () => {
    if (!currentForm.title) {
      showNotification('Title is required', 'error');
      return;
    }
    
    // Ensure all questions have text
    if (currentForm.questions?.some(q => !q.question_text)) {
      showNotification('All questions must have text', 'error');
      return;
    }

    try {
      if (currentForm.id) {
        await FeedbackService.updateForm(currentForm.id, currentForm);
        showNotification('Form updated successfully', 'success');
      } else {
        await FeedbackService.createForm(currentForm);
        showNotification('Form created successfully', 'success');
      }
      setIsEditing(false);
      fetchForms();
    } catch (e) {
      showNotification('Failed to save form', 'error');
    }
  };

  const handleDeleteForm = (id: number) => {
    showConfirm({
      title: 'Delete Feedback Form',
      message: 'Are you sure you want to delete this form? This action cannot be undone.',
      type: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await FeedbackService.deleteForm(id);
          showNotification('Form deleted', 'success');
          fetchForms();
        } catch (e) {
          showNotification('Failed to delete form', 'error');
        }
      }
    });
  };

  const addQuestion = () => {
    const newQuestions = [...(currentForm.questions || [])];
    newQuestions.push({
      question_text: '',
      question_type: 'TEXT',
      is_required: true,
      position: newQuestions.length
    });
    setCurrentForm({ ...currentForm, questions: newQuestions });
  };

  const updateQuestion = (index: number, updates: Partial<FeedbackQuestion>) => {
    const newQuestions = [...(currentForm.questions || [])];
    newQuestions[index] = { ...newQuestions[index], ...updates };
    setCurrentForm({ ...currentForm, questions: newQuestions });
  };

  const removeQuestion = (index: number) => {
    const newQuestions = [...(currentForm.questions || [])];
    newQuestions.splice(index, 1);
    // update positions
    newQuestions.forEach((q, i) => q.position = i);
    setCurrentForm({ ...currentForm, questions: newQuestions });
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newQuestions = [...(currentForm.questions || [])];
    const draggedItem = newQuestions[draggedIndex];
    
    newQuestions.splice(draggedIndex, 1);
    newQuestions.splice(index, 0, draggedItem);
    
    newQuestions.forEach((q, i) => q.position = i);
    
    setCurrentForm({ ...currentForm, questions: newQuestions });
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  if (loading && forms.length === 0) return <div className="p-8 text-center text-[var(--text-muted)]">Loading...</div>;

  if (isEditing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{currentForm.id ? 'Edit Feedback Form' : 'New Feedback Form'}</h1>
          <div className="flex gap-2">
            <button onClick={() => setIsEditing(false)} className="px-4 py-2 border border-[var(--border-soft)] rounded-xl hover:bg-[var(--bg-app)] flex items-center gap-2">
              <X className="w-4 h-4" /> Cancel
            </button>
            <button onClick={handleSaveForm} className="px-4 py-2 bg-brand-primary text-white rounded-xl hover:opacity-90 flex items-center gap-2 shadow-lg shadow-brand-primary/20">
              <Save className="w-4 h-4" /> Save Form
            </button>
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-soft)] space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Form Title</label>
            <input 
              type="text" 
              value={currentForm.title || ''} 
              onChange={e => setCurrentForm({...currentForm, title: e.target.value})}
              className="w-full border border-[var(--border-soft)] rounded-xl p-3 outline-none focus:border-brand-primary bg-[var(--bg-app)]"
              placeholder="e.g. Post-Event Client Feedback"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Description (Optional)</label>
            <textarea 
              value={currentForm.description || ''} 
              onChange={e => setCurrentForm({...currentForm, description: e.target.value})}
              className="w-full border border-[var(--border-soft)] rounded-xl p-3 outline-none focus:border-brand-primary bg-[var(--bg-app)] min-h-[100px]"
              placeholder="Please let us know how we did..."
            />
          </div>
        </div>

        <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-soft)] space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-4 mb-4">
            <h2 className="text-lg font-bold">Questions</h2>
            <button onClick={addQuestion} className="text-sm font-medium text-brand-primary hover:bg-brand-primary/10 px-3 py-1.5 rounded-lg flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Question
            </button>
          </div>

          {(currentForm.questions || []).length === 0 ? (
            <div className="text-center py-8 text-[var(--text-muted)] border-2 border-dashed border-[var(--border-soft)] rounded-xl">
              No questions added yet. Click "Add Question" to begin.
            </div>
          ) : (
            <div className="space-y-4">
              {currentForm.questions?.map((q, idx) => (
                <div 
                  key={idx} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`flex gap-4 items-start p-4 bg-[var(--bg-app)] rounded-xl border relative group transition-all ${draggedIndex === idx ? 'opacity-50 border-brand-primary' : 'border-[var(--border-subtle)] hover:border-[var(--border-soft)]'}`}
                >
                  <div className="mt-2 cursor-grab active:cursor-grabbing text-[var(--border-soft)] group-hover:text-[var(--text-muted)]">
                    <GripVertical className="w-5 h-5" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <input 
                      type="text" 
                      value={q.question_text} 
                      onChange={e => updateQuestion(idx, { question_text: e.target.value })}
                      className="w-full bg-transparent border-b border-[var(--border-soft)] pb-2 outline-none focus:border-brand-primary font-medium text-[var(--text-main)]"
                      placeholder={`Question ${idx + 1}`}
                    />
                      <select 
                        value={q.question_type}
                        onChange={e => updateQuestion(idx, { question_type: e.target.value as any, options: (e.target.value === 'RADIO' || e.target.value === 'CHECKBOX') ? ['Option 1'] : undefined })}
                        className="text-sm border border-[var(--border-soft)] rounded-lg p-2 bg-[var(--bg-surface)] outline-none"
                      >
                        <option value="TEXT">Text Answer</option>
                        <option value="RATING">5-Star Rating</option>
                        <option value="BOOLEAN">Yes / No</option>
                        <option value="RADIO">Single Choice (Radio)</option>
                        <option value="CHECKBOX">Multiple Choice (Checkbox)</option>
                      </select>
                      <label className="flex items-center gap-2 text-sm text-[var(--text-muted)] cursor-pointer select-none">
                        <input 
                          type="checkbox" 
                          checked={q.is_required !== false} 
                          onChange={(e) => updateQuestion(idx, { is_required: e.target.checked })} 
                          className="rounded border-[var(--border-soft)] text-brand-primary focus:ring-brand-primary"
                        />
                        Required
                      </label>
                      {(q.question_type === 'RADIO' || q.question_type === 'CHECKBOX') && (
                        <div className="mt-4 space-y-2 pl-2 border-l-2 border-[var(--border-soft)]">
                          <label className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Options</label>
                          {(q.options || []).map((opt, optIdx) => (
                            <div key={optIdx} className="flex gap-2 items-center">
                              <input 
                                type="text"
                                value={opt}
                                onChange={e => {
                                  const newOpts = [...(q.options || [])];
                                  newOpts[optIdx] = e.target.value;
                                  updateQuestion(idx, { options: newOpts });
                                }}
                                className="flex-1 text-sm bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-lg p-2 outline-none focus:border-brand-primary"
                                placeholder={`Option ${optIdx + 1}`}
                              />
                              <button
                                onClick={() => {
                                  const newOpts = [...(q.options || [])];
                                  newOpts.splice(optIdx, 1);
                                  updateQuestion(idx, { options: newOpts });
                                }}
                                className="p-1.5 text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => {
                              const newOpts = [...(q.options || [])];
                              newOpts.push(`Option ${newOpts.length + 1}`);
                              updateQuestion(idx, { options: newOpts });
                            }}
                            className="text-xs font-medium text-brand-primary hover:underline mt-1"
                          >
                            + Add Option
                          </button>
                        </div>
                      )}
                  </div>
                  <button 
                    onClick={() => removeQuestion(idx)}
                    className="p-2 text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors mt-1 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-main)]">Feedback Forms</h1>
          <p className="text-[var(--text-muted)] text-sm">Create and manage feedback templates for your events.</p>
        </div>
        <button 
          onClick={() => {
            setCurrentForm({ title: '', description: '', questions: [] });
            setIsEditing(true);
          }} 
          className="px-4 py-2 bg-brand-primary text-white rounded-xl hover:opacity-90 flex items-center gap-2 shadow-lg shadow-brand-primary/20"
        >
          <Plus className="w-5 h-5" /> New Form
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {forms.map(form => (
          <div key={form.id} className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-soft)] hover:border-brand-primary/50 transition-colors shadow-sm group">
            <h3 className="font-bold text-lg mb-2 text-[var(--text-main)] truncate">{form.title}</h3>
            <p className="text-[var(--text-muted)] text-sm line-clamp-2 mb-4 h-10">
              {form.description || 'No description provided.'}
            </p>
            <div className="flex items-center justify-between pt-4 border-t border-[var(--border-soft)]">
              <span className="text-xs font-medium bg-[var(--bg-app)] px-2 py-1 rounded-md text-[var(--text-muted)]">
                {form.questions?.length || 0} questions
              </span>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    setCurrentForm(form);
                    setIsEditing(true);
                  }}
                  className="p-1.5 text-[var(--text-muted)] hover:text-brand-primary hover:bg-brand-primary/10 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDeleteForm(form.id)}
                  className="p-1.5 text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {forms.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-[var(--border-soft)] rounded-2xl">
            <h3 className="text-lg font-bold text-[var(--text-main)] mb-2">No Feedback Forms</h3>
            <p className="text-[var(--text-muted)] text-sm mb-4">Create your first form template to start collecting client feedback.</p>
            <button 
              onClick={() => {
                setCurrentForm({ title: '', description: '', questions: [] });
                setIsEditing(true);
              }} 
              className="px-4 py-2 bg-brand-primary text-white rounded-xl hover:opacity-90 inline-flex items-center gap-2 text-sm font-medium shadow-lg shadow-brand-primary/20"
            >
              <Plus className="w-4 h-4" /> Create Template
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
