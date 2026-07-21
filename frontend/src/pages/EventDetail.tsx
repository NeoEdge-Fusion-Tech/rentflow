import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Download,
  Copy,
  Edit2,
  X,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  Check,
  Calendar
} from 'lucide-react';
import { cn } from '@/src/utils';
import { useNotification } from '../context/NotificationContext';
import { EventService, ExpenseService, ChecklistTaskService, VendorService, InvoiceService } from '../api';

const CHECKLIST_SECTIONS: { key: 'pre_event' | 'during_event' | 'post_event'; label: string }[] = [
  { key: 'pre_event', label: 'Pre-Event' },
  { key: 'during_event', label: 'During Event' },
  { key: 'post_event', label: 'Post-Event' },
];

export function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showNotification, showConfirm } = useNotification();

  const [activeTab, setActiveTab] = useState<'pl' | 'checklist'>('pl');
  const [event, setEvent] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const defaultCurrencySymbol = localStorage.getItem('currencySymbol') || '$';

  // Edit event modal
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);

  // Expenses
  const [expenses, setExpenses] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    expense_type: 'item',
    vendor: '' as number | string,
    name: '',
    amount: 0,
    description: '',
  });

  // Checklist
  const [tasks, setTasks] = useState<any[]>([]);
  const [addingTaskFor, setAddingTaskFor] = useState<string | null>(null);
  const [newTaskForm, setNewTaskForm] = useState({ name: '', description: '', due_date: '' });
  const [addingSubtaskFor, setAddingSubtaskFor] = useState<number | null>(null);
  const [newSubtaskName, setNewSubtaskName] = useState('');
  const [expandedTasks, setExpandedTasks] = useState<Record<number, boolean>>({});
  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false);
  const [duplicateTarget, setDuplicateTarget] = useState<number | string>('');
  const [allEvents, setAllEvents] = useState<any[]>([]);

  const fetchEvent = async () => {
    if (!id) return;
    try {
      const res = await EventService.get(id);
      setEvent(res.data);
      setEditForm({
        name: res.data.name || '',
        description: res.data.description || '',
        status: res.data.status || 'planned',
        start_date: res.data.start_date || '',
        end_date: res.data.end_date || '',
        invoice: res.data.invoice || '',
      });
    } catch (e) {
      console.error("Failed to fetch event", e);
    }
  };

  const fetchExpenses = async () => {
    if (!id) return;
    try {
      const res = await ExpenseService.getAll({ event: id });
      setExpenses(res.data.results || res.data);
    } catch (e) { console.error(e); }
  };

  const fetchTasks = async () => {
    if (!id) return;
    try {
      const res = await ChecklistTaskService.getAll({ event: id });
      setTasks(res.data.results || res.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await Promise.all([
        fetchEvent(),
        fetchExpenses(),
        fetchTasks(),
        VendorService.getAll().then(res => setVendors(res.data.results || res.data)).catch(console.error),
        InvoiceService.getAll().then(res => setInvoices(res.data.results || res.data)).catch(console.error),
        EventService.getAll().then(res => setAllEvents(res.data.results || res.data)).catch(console.error),
      ]);
      setIsLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return (num || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // --- Event edit ---
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await EventService.patch(id, {
        ...editForm,
        start_date: editForm.start_date || null,
        end_date: editForm.end_date || null,
        invoice: editForm.invoice ? parseInt(String(editForm.invoice)) : null,
      });
      setIsEditOpen(false);
      showNotification("Project updated!", 'success');
      fetchEvent();
    } catch (err) {
      console.error("Failed to update project", err);
      showNotification("Failed to update project", 'error');
    }
  };

  // --- Expenses ---
  const openAddExpense = () => {
    setExpenseForm({ expense_type: 'item', vendor: '', name: '', amount: 0, description: '' });
    setIsAddExpenseOpen(true);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      await ExpenseService.create({
        event: parseInt(id),
        expense_type: expenseForm.expense_type,
        vendor: expenseForm.expense_type === 'vendor' ? parseInt(String(expenseForm.vendor)) : null,
        name: expenseForm.expense_type === 'item' ? expenseForm.name : undefined,
        amount: expenseForm.amount,
        description: expenseForm.description,
      });
      setIsAddExpenseOpen(false);
      showNotification("Expense added!", 'success');
      fetchExpenses();
      fetchEvent();
    } catch (err: any) {
      console.error("Failed to add expense", err);
      showNotification(err.response?.data?.vendor?.[0] || err.response?.data?.name?.[0] || "Failed to add expense", 'error');
    }
  };

  const handleDeleteExpense = (expenseId: number) => {
    showConfirm({
      title: 'Delete Expense',
      message: 'Remove this expense from the project?',
      type: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await ExpenseService.delete(expenseId);
          showNotification("Expense removed", 'success');
          fetchExpenses();
          fetchEvent();
        } catch (err) {
          console.error("Failed to delete expense", err);
          showNotification("Failed to delete expense", 'error');
        }
      }
    });
  };

  // --- Checklist ---
  const tasksByType: Record<string, any[]> = { pre_event: [], during_event: [], post_event: [] };
  tasks.forEach(t => {
    if (tasksByType[t.checklist_type]) tasksByType[t.checklist_type].push(t);
  });

  const handleToggleDone = async (task: any) => {
    try {
      await ChecklistTaskService.update(task.task_id, { is_done: !task.is_done });
      fetchTasks();
    } catch (err) {
      console.error("Failed to update task", err);
      showNotification("Failed to update task", 'error');
    }
  };

  const openAddTask = (checklistType: string) => {
    setNewTaskForm({ name: '', description: '', due_date: '' });
    setAddingTaskFor(checklistType);
  };

  const handleAddTask = async (checklistType: string) => {
    if (!id || !newTaskForm.name.trim()) {
      showNotification("Task name is required.", 'warning');
      return;
    }
    try {
      await ChecklistTaskService.create({
        event: parseInt(id),
        checklist_type: checklistType,
        name: newTaskForm.name,
        description: newTaskForm.description,
        due_date: newTaskForm.due_date || null,
      });
      setAddingTaskFor(null);
      fetchTasks();
    } catch (err) {
      console.error("Failed to add task", err);
      showNotification("Failed to add task", 'error');
    }
  };

  const handleAddSubtask = async (parentTask: any) => {
    if (!id || !newSubtaskName.trim()) return;
    try {
      await ChecklistTaskService.create({
        event: parseInt(id),
        checklist_type: parentTask.checklist_type,
        parent_task: parentTask.task_id,
        name: newSubtaskName,
      });
      setAddingSubtaskFor(null);
      setNewSubtaskName('');
      fetchTasks();
    } catch (err) {
      console.error("Failed to add subtask", err);
      showNotification("Failed to add subtask", 'error');
    }
  };

  const handleDeleteTask = (taskId: number) => {
    showConfirm({
      title: 'Delete Task',
      message: 'Delete this task? Any subtasks will also be removed.',
      type: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        try {
          await ChecklistTaskService.delete(taskId);
          fetchTasks();
        } catch (err) {
          console.error("Failed to delete task", err);
          showNotification("Failed to delete task", 'error');
        }
      }
    });
  };

  const handleDuplicate = async () => {
    if (!id || !duplicateTarget) return;
    try {
      await ChecklistTaskService.duplicate(id, duplicateTarget);
      showNotification("Checklist duplicated to target project!", 'success');
      setIsDuplicateOpen(false);
      setDuplicateTarget('');
    } catch (err) {
      console.error("Failed to duplicate checklist", err);
      showNotification("Failed to duplicate checklist", 'error');
    }
  };

  const handleDownloadChecklist = async () => {
    if (!id) return;
    try {
      const response = await ChecklistTaskService.download(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `checklist_${event?.name || id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Failed to download checklist", err);
      showNotification("Failed to download checklist", 'error');
    }
  };

  if (isLoading || !event) {
    return <div className="bg-[var(--bg-surface)] p-12 text-center text-[var(--text-muted)] rounded-2xl border border-[var(--border-soft)]">Loading project...</div>;
  }

  const profit = parseFloat(event.profit) || 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/events')} className="p-2.5 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-xl text-[var(--text-main)] hover:bg-[var(--bg-app)] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-main)]">{event.name}</h1>
            <p className="text-[var(--text-muted)] text-sm capitalize">{event.status}{event.invoice_number ? ` · Linked to ${event.invoice_number}` : ''}</p>
          </div>
        </div>
        <button onClick={() => setIsEditOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] font-bold rounded-xl hover:bg-[var(--bg-app)] transition-colors text-sm">
          <Edit2 className="w-4 h-4" /> Edit Project
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-soft)] shadow-sm">
          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Revenue</p>
          <p className="text-xl font-black text-[var(--text-main)]">{defaultCurrencySymbol}{formatCurrency(event.revenue)}</p>
        </div>
        <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-soft)] shadow-sm">
          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Total Expenses</p>
          <p className="text-xl font-black text-[var(--text-main)]">{defaultCurrencySymbol}{formatCurrency(event.total_expenses)}</p>
        </div>
        <div className="bg-[var(--bg-surface)] p-5 rounded-2xl border border-[var(--border-soft)] shadow-sm">
          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Profit</p>
          <p className={cn("text-xl font-black flex items-center gap-1.5", profit >= 0 ? "text-emerald-500" : "text-rose-500")}>
            {profit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {defaultCurrencySymbol}{formatCurrency(Math.abs(profit))}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[var(--border-soft)] pb-px">
        {[{ key: 'pl', label: 'Profit & Loss' }, { key: 'checklist', label: 'Task Checklist' }].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={cn(
              "px-4 py-2 text-sm font-bold transition-all relative",
              activeTab === tab.key ? "text-[var(--text-link)]" : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
            )}
          >
            {tab.label}
            {activeTab === tab.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--text-link)] rounded-full" />}
          </button>
        ))}
      </div>

      {/* Profit & Loss tab */}
      {activeTab === 'pl' && (
        <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-soft)] p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[var(--text-main)] text-sm uppercase tracking-wider">Expenses</h3>
            <button onClick={openAddExpense} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-white rounded-xl hover:opacity-90 transition-opacity shadow-sm bg-brand-primary">
              <Plus className="w-3 h-3" /> Add Expense
            </button>
          </div>

          {expenses.length === 0 ? (
            <div className="text-center py-10 text-[var(--text-muted)] bg-[var(--bg-app)] rounded-xl border border-dashed border-[var(--border-soft)]">
              No expenses logged yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-[var(--text-muted)] text-xs uppercase tracking-wider border-b border-[var(--border-soft)]">
                    <th className="py-2 pr-4 font-bold">Expense</th>
                    <th className="py-2 pr-4 font-bold">Type</th>
                    <th className="py-2 pr-4 font-bold">Description</th>
                    <th className="py-2 pr-4 font-bold text-right">Amount</th>
                    <th className="py-2 pr-0 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {expenses.map((exp: any) => (
                    <tr key={exp.expense_id}>
                      <td className="py-3 pr-4 font-bold text-[var(--text-main)]">{exp.name}</td>
                      <td className="py-3 pr-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                          exp.expense_type === 'vendor' ? "bg-blue-500/10 text-blue-500" : "bg-[var(--bg-app)] text-[var(--text-muted)]"
                        )}>
                          {exp.expense_type}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-[var(--text-muted)] max-w-xs truncate">{exp.description || '—'}</td>
                      <td className="py-3 pr-4 text-right font-bold text-[var(--text-main)]">{defaultCurrencySymbol}{formatCurrency(exp.amount)}</td>
                      <td className="py-3 pr-0 text-right">
                        <button onClick={() => handleDeleteExpense(exp.expense_id)} className="p-1.5 text-[var(--text-muted)] hover:text-rose-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Task Checklist tab */}
      {activeTab === 'checklist' && (
        <div className="space-y-6">
          <div className="flex items-center justify-end gap-2">
            <button onClick={() => setIsDuplicateOpen(true)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl hover:bg-[var(--bg-app)] transition-colors">
              <Copy className="w-4 h-4" /> Duplicate to Another Project
            </button>
            <button onClick={handleDownloadChecklist} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl hover:bg-[var(--bg-app)] transition-colors">
              <Download className="w-4 h-4" /> Download PDF
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {CHECKLIST_SECTIONS.map(section => (
              <div key={section.key} className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-soft)] p-5 space-y-3">
                <h3 className="font-bold text-[var(--text-main)] text-sm uppercase tracking-wider">{section.label}</h3>

                {tasksByType[section.key].length === 0 && addingTaskFor !== section.key && (
                  <p className="text-xs text-[var(--text-muted)]">No tasks yet.</p>
                )}

                {tasksByType[section.key].map((task: any) => (
                  <div key={task.task_id} className="bg-[var(--bg-app)] rounded-xl border border-[var(--border-subtle)] p-3">
                    <div className="flex items-start gap-2">
                      <button
                        onClick={() => handleToggleDone(task)}
                        className={cn(
                          "mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors",
                          task.is_done ? "bg-emerald-500 border-emerald-500" : "border-[var(--border-soft)]"
                        )}
                      >
                        {task.is_done && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-bold text-[var(--text-main)]", task.is_done && "line-through text-[var(--text-muted)]")}>{task.name}</p>
                        {task.description && <p className="text-xs text-[var(--text-muted)] mt-0.5">{task.description}</p>}
                        {task.due_date && (
                          <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] mt-1">
                            <Calendar className="w-3 h-3" /> {new Date(task.due_date).toLocaleString()}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {task.subtasks?.length > 0 && (
                          <button onClick={() => setExpandedTasks(prev => ({ ...prev, [task.task_id]: !prev[task.task_id] }))} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)]">
                            {expandedTasks[task.task_id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                          </button>
                        )}
                        <button onClick={() => handleDeleteTask(task.task_id)} className="p-1 text-[var(--text-muted)] hover:text-rose-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {(expandedTasks[task.task_id] || task.subtasks?.length > 0) && (
                      <div className="ml-7 mt-2 space-y-1.5 border-l border-[var(--border-subtle)] pl-3">
                        {task.subtasks?.map((sub: any) => (
                          <div key={sub.task_id} className="flex items-start gap-2">
                            <button
                              onClick={() => handleToggleDone(sub)}
                              className={cn(
                                "mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                                sub.is_done ? "bg-emerald-500 border-emerald-500" : "border-[var(--border-soft)]"
                              )}
                            >
                              {sub.is_done && <Check className="w-3 h-3 text-white" />}
                            </button>
                            <p className={cn("text-xs font-medium text-[var(--text-main)] flex-1", sub.is_done && "line-through text-[var(--text-muted)]")}>{sub.name}</p>
                            <button onClick={() => handleDeleteTask(sub.task_id)} className="p-0.5 text-[var(--text-muted)] hover:text-rose-500">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                        {addingSubtaskFor === task.task_id ? (
                          <div className="flex items-center gap-1.5 pt-1">
                            <input
                              autoFocus
                              type="text"
                              value={newSubtaskName}
                              onChange={e => setNewSubtaskName(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleAddSubtask(task); if (e.key === 'Escape') setAddingSubtaskFor(null); }}
                              placeholder="Subtask name..."
                              className="flex-1 h-7 px-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-md outline-none text-xs text-[var(--text-main)]"
                            />
                            <button onClick={() => handleAddSubtask(task)} className="text-xs font-bold text-brand-primary">Add</button>
                          </div>
                        ) : (
                          <button onClick={() => { setAddingSubtaskFor(task.task_id); setNewSubtaskName(''); }} className="text-[11px] font-bold text-brand-primary hover:underline pt-1">
                            + Add subtask
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {addingTaskFor === section.key ? (
                  <div className="bg-[var(--bg-app)] rounded-xl border border-[var(--border-subtle)] p-3 space-y-2">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Task name"
                      value={newTaskForm.name}
                      onChange={e => setNewTaskForm({ ...newTaskForm, name: e.target.value })}
                      className="w-full h-8 px-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-md outline-none text-xs font-bold text-[var(--text-main)]"
                    />
                    <textarea
                      placeholder="Description (optional)"
                      rows={2}
                      value={newTaskForm.description}
                      onChange={e => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
                      className="w-full px-2 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-md outline-none text-xs text-[var(--text-main)] resize-none"
                    />
                    <input
                      type="datetime-local"
                      value={newTaskForm.due_date}
                      onChange={e => setNewTaskForm({ ...newTaskForm, due_date: e.target.value })}
                      className="w-full h-8 px-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-md outline-none text-xs text-[var(--text-main)]"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setAddingTaskFor(null)} className="flex-1 py-1.5 text-xs font-bold text-[var(--text-muted)] bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-md">Cancel</button>
                      <button onClick={() => handleAddTask(section.key)} className="flex-1 py-1.5 text-xs font-bold text-white bg-brand-primary rounded-md">Add Task</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => openAddTask(section.key)} className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-brand-primary border border-dashed border-[var(--border-soft)] rounded-xl hover:bg-[var(--bg-app)] transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Add Task
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {isEditOpen && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-app)]/80 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-surface)] rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden border border-[var(--border-soft)] shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-soft)] bg-[var(--bg-app)]/50 shrink-0">
              <h2 className="text-lg font-bold text-[var(--text-main)]">Edit Project</h2>
              <button onClick={() => setIsEditOpen(false)} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-app)] rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div className="space-y-2">
                <label className="text-sm font-bold text-[var(--text-muted)]">Project / Event Name</label>
                <input required type="text" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:border-brand-primary transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-[var(--text-muted)]">Description</label>
                <textarea rows={2} value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:border-brand-primary transition-all resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[var(--text-muted)]">Start Date</label>
                  <input type="date" value={editForm.start_date} onChange={e => setEditForm({ ...editForm, start_date: e.target.value })} className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:border-brand-primary transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[var(--text-muted)]">End Date</label>
                  <input type="date" value={editForm.end_date} onChange={e => setEditForm({ ...editForm, end_date: e.target.value })} className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:border-brand-primary transition-all" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-[var(--text-muted)]">Status</label>
                <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })} className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:border-brand-primary transition-all">
                  <option value="planned">Planned</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-[var(--text-muted)]">Revenue Invoice</label>
                <select value={editForm.invoice} onChange={e => setEditForm({ ...editForm, invoice: e.target.value })} className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:border-brand-primary transition-all">
                  <option value="">No invoice linked</option>
                  {invoices.map((inv: any) => (
                    <option key={inv.invoice_id} value={inv.invoice_id}>{inv.invoice_number} — {inv.client_name || 'No client'}</option>
                  ))}
                </select>
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsEditOpen(false)} className="flex-1 px-6 py-3 font-bold text-[var(--text-muted)] bg-[var(--bg-app)] hover:bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-secondary transition-colors">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {isAddExpenseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-app)]/80 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-surface)] rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden border border-[var(--border-soft)] shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-soft)] bg-[var(--bg-app)]/50 shrink-0">
              <h2 className="text-lg font-bold text-[var(--text-main)]">Add Expense</h2>
              <button onClick={() => setIsAddExpenseOpen(false)} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-app)] rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddExpense} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setExpenseForm({ ...expenseForm, expense_type: 'item' })} className={cn("py-2.5 rounded-xl border font-bold text-sm transition-colors", expenseForm.expense_type === 'item' ? "bg-brand-primary text-white border-brand-primary" : "bg-[var(--bg-app)] text-[var(--text-muted)] border-[var(--border-soft)]")}>
                  Item
                </button>
                <button type="button" onClick={() => setExpenseForm({ ...expenseForm, expense_type: 'vendor' })} className={cn("py-2.5 rounded-xl border font-bold text-sm transition-colors", expenseForm.expense_type === 'vendor' ? "bg-brand-primary text-white border-brand-primary" : "bg-[var(--bg-app)] text-[var(--text-muted)] border-[var(--border-soft)]")}>
                  Vendor
                </button>
              </div>

              {expenseForm.expense_type === 'vendor' ? (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[var(--text-muted)]">Vendor <span className="text-rose-500">*</span></label>
                  <select required value={expenseForm.vendor} onChange={e => setExpenseForm({ ...expenseForm, vendor: e.target.value })} className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:border-brand-primary transition-all">
                    <option value="">Select a vendor...</option>
                    {vendors.map((v: any) => (
                      <option key={v.vendor_id} value={v.vendor_id}>{v.business_name} — {v.service}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-sm font-bold text-[var(--text-muted)]">Item Name <span className="text-rose-500">*</span></label>
                  <input required type="text" value={expenseForm.name} onChange={e => setExpenseForm({ ...expenseForm, name: e.target.value })} placeholder="e.g. Chairs & Tables Rental" className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:border-brand-primary transition-all" />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-bold text-[var(--text-muted)]">Amount <span className="text-rose-500">*</span></label>
                <input required type="number" step="0.01" value={expenseForm.amount || ''} onChange={e => setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value) || 0 })} className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:border-brand-primary transition-all" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-[var(--text-muted)]">Description</label>
                <textarea rows={2} value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:border-brand-primary transition-all resize-none" />
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsAddExpenseOpen(false)} className="flex-1 px-6 py-3 font-bold text-[var(--text-muted)] bg-[var(--bg-app)] hover:bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-6 py-2.5 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-secondary transition-colors">Add Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Duplicate Checklist Modal */}
      {isDuplicateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-app)]/80 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-surface)] rounded-3xl w-full max-w-md border border-[var(--border-soft)] shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-soft)] bg-[var(--bg-app)]/50">
              <h2 className="text-lg font-bold text-[var(--text-main)]">Duplicate Checklist</h2>
              <button onClick={() => setIsDuplicateOpen(false)} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-app)] rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-[var(--text-muted)]">Copy every task and subtask from this checklist into another project. Due dates are cleared on the copy.</p>
              <div className="space-y-2">
                <label className="text-sm font-bold text-[var(--text-muted)]">Target Project</label>
                <select value={duplicateTarget} onChange={e => setDuplicateTarget(e.target.value)} className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:border-brand-primary transition-all">
                  <option value="">Select a project...</option>
                  {allEvents.filter((e: any) => String(e.event_id) !== String(id)).map((e: any) => (
                    <option key={e.event_id} value={e.event_id}>{e.name}</option>
                  ))}
                </select>
              </div>
              <div className="pt-2 flex gap-3">
                <button onClick={() => setIsDuplicateOpen(false)} className="flex-1 px-6 py-3 font-bold text-[var(--text-muted)] bg-[var(--bg-app)] hover:bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-xl transition-colors">Cancel</button>
                <button onClick={handleDuplicate} disabled={!duplicateTarget} className="flex-1 px-6 py-2.5 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-secondary transition-colors disabled:opacity-50">Duplicate</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
