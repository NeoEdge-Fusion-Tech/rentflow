import React, { useState, useEffect } from 'react';
import {
  Plus,
  Trash2,
  Download,
  Copy,
  Edit2,
  X,
  ChevronDown,
  ChevronRight as ChevronRightIcon,
  ArrowUp,
  ArrowDown,
  GripVertical,
  Check,
  Calendar
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/src/utils';
import { useNotification } from '../context/NotificationContext';
import { ChecklistTaskService, EventService } from '../api';

const CHECKLIST_SECTIONS: { key: 'pre_event' | 'during_event' | 'post_event'; label: string }[] = [
  { key: 'pre_event', label: 'Pre-Event' },
  { key: 'during_event', label: 'During Event' },
  { key: 'post_event', label: 'Post-Event' },
];

interface TaskChecklistPanelProps {
  eventId: number | string;
  eventName?: string;
}

function SortableTaskWrapper({ id, disabled, children }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : undefined,
    position: 'relative',
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ ...attributes, ...listeners })}
    </div>
  );
}

export function TaskChecklistPanel({ eventId, eventName }: TaskChecklistPanelProps) {
  const { showNotification, showConfirm } = useNotification();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [addingTaskFor, setAddingTaskFor] = useState<string | null>(null);
  const [newTaskForm, setNewTaskForm] = useState({ name: '', description: '', due_date: '' });
  const [addingSubtaskFor, setAddingSubtaskFor] = useState<number | null>(null);
  const [newSubtaskName, setNewSubtaskName] = useState('');
  const [expandedTasks, setExpandedTasks] = useState<Record<number, boolean>>({});
  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false);
  const [duplicateTarget, setDuplicateTarget] = useState<number | string>('');
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editTaskForm, setEditTaskForm] = useState({ name: '', description: '', due_date: '' });
  const [isSavingTaskEdit, setIsSavingTaskEdit] = useState(false);
  const [editingSubtaskId, setEditingSubtaskId] = useState<number | null>(null);
  const [editSubtaskName, setEditSubtaskName] = useState('');
  const [isSavingSubtaskEdit, setIsSavingSubtaskEdit] = useState(false);
  const [reorderingIds, setReorderingIds] = useState<Set<number>>(new Set());

  const toDatetimeLocal = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const fetchTasks = async () => {
    try {
      const res = await ChecklistTaskService.getAll({ event: eventId });
      setTasks(res.data.results || res.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      await Promise.all([
        fetchTasks(),
        EventService.getAll().then(res => setAllEvents(res.data.results || res.data)).catch(console.error),
      ]);
      setIsLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

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
    if (!newTaskForm.name.trim()) {
      showNotification("Task name is required.", 'warning');
      return;
    }
    if (isAddingTask) return;
    try {
      setIsAddingTask(true);
      await ChecklistTaskService.create({
        event: parseInt(String(eventId)),
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
    } finally {
      setIsAddingTask(false);
    }
  };

  const handleAddSubtask = async (parentTask: any) => {
    if (!newSubtaskName.trim() || isAddingSubtask) return;
    try {
      setIsAddingSubtask(true);
      await ChecklistTaskService.create({
        event: parseInt(String(eventId)),
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
    } finally {
      setIsAddingSubtask(false);
    }
  };

  const openEditTask = (task: any) => {
    setEditingTaskId(task.task_id);
    setEditTaskForm({
      name: task.name || '',
      description: task.description || '',
      due_date: toDatetimeLocal(task.due_date),
    });
  };

  const handleSaveTaskEdit = async (taskId: number) => {
    if (!editTaskForm.name.trim()) {
      showNotification("Task name is required.", 'warning');
      return;
    }
    if (isSavingTaskEdit) return;
    try {
      setIsSavingTaskEdit(true);
      await ChecklistTaskService.update(taskId, {
        name: editTaskForm.name,
        description: editTaskForm.description,
        due_date: editTaskForm.due_date || null,
      });
      setEditingTaskId(null);
      fetchTasks();
    } catch (err) {
      console.error("Failed to update task", err);
      showNotification("Failed to update task", 'error');
    } finally {
      setIsSavingTaskEdit(false);
    }
  };

  const openEditSubtask = (sub: any) => {
    setEditingSubtaskId(sub.task_id);
    setEditSubtaskName(sub.name || '');
  };

  const handleSaveSubtaskEdit = async (subtaskId: number) => {
    if (!editSubtaskName.trim() || isSavingSubtaskEdit) return;
    try {
      setIsSavingSubtaskEdit(true);
      await ChecklistTaskService.update(subtaskId, { name: editSubtaskName });
      setEditingSubtaskId(null);
      fetchTasks();
    } catch (err) {
      console.error("Failed to update subtask", err);
      showNotification("Failed to update subtask", 'error');
    } finally {
      setIsSavingSubtaskEdit(false);
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

  const reorderSiblings = async (siblings: any[], fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= siblings.length) return;

    const reordered = [...siblings];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    const movedIds = new Set([siblings[fromIndex].task_id, siblings[toIndex].task_id]);
    setReorderingIds(prev => new Set([...prev, ...movedIds]));
    try {
      await Promise.all(
        reordered.map((t, idx) =>
          t.position === idx ? Promise.resolve() : ChecklistTaskService.update(t.task_id, { position: idx })
        )
      );
      fetchTasks();
    } catch (err) {
      console.error("Failed to reorder tasks", err);
      showNotification("Failed to reorder tasks", 'error');
    } finally {
      setReorderingIds(prev => {
        const next = new Set(prev);
        movedIds.forEach(id => next.delete(id));
        return next;
      });
    }
  };

  const handleTaskDragEnd = (checklistType: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const siblings = tasksByType[checklistType];
    const oldIndex = siblings.findIndex((t: any) => t.task_id === active.id);
    const newIndex = siblings.findIndex((t: any) => t.task_id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    reorderSiblings(siblings, oldIndex, newIndex);
  };

  const handleMoveSubtask = (parentTask: any, subtask: any, direction: 'up' | 'down') => {
    const siblings = parentTask.subtasks || [];
    const index = siblings.findIndex((t: any) => t.task_id === subtask.task_id);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    reorderSiblings(siblings, index, targetIndex);
  };

  const isChecklistEmpty = tasks.length === 0;

  const handleDuplicate = async () => {
    if (!duplicateTarget || isDuplicating) return;
    try {
      setIsDuplicating(true);
      if (isChecklistEmpty) {
        // Pull an existing project's checklist into this (empty) one.
        await ChecklistTaskService.duplicate(duplicateTarget, eventId);
        showNotification("Checklist duplicated into this project!", 'success');
        fetchTasks();
      } else {
        // Push this project's checklist out to another project.
        await ChecklistTaskService.duplicate(eventId, duplicateTarget);
        showNotification("Checklist duplicated to target project!", 'success');
      }
      setIsDuplicateOpen(false);
      setDuplicateTarget('');
    } catch (err) {
      console.error("Failed to duplicate checklist", err);
      showNotification("Failed to duplicate checklist", 'error');
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleDownloadChecklist = async () => {
    try {
      const response = await ChecklistTaskService.download(eventId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `checklist_${eventName || eventId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Failed to download checklist", err);
      showNotification("Failed to download checklist", 'error');
    }
  };

  if (isLoading) {
    return <div className="bg-[var(--bg-surface)] p-12 text-center text-[var(--text-muted)] rounded-2xl border border-[var(--border-soft)]">Loading checklist...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2">
        <button onClick={() => setIsDuplicateOpen(true)} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-[var(--bg-surface)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl hover:bg-[var(--bg-app)] transition-colors">
          <Copy className="w-4 h-4" /> {isChecklistEmpty ? 'Duplicate from Project' : 'Duplicate to Another Project'}
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

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={e => handleTaskDragEnd(section.key, e)}>
            <SortableContext items={tasksByType[section.key].map((t: any) => t.task_id)} strategy={verticalListSortingStrategy}>
            {tasksByType[section.key].map((task: any) => (
              <SortableTaskWrapper key={task.task_id} id={task.task_id} disabled={editingTaskId === task.task_id}>
                {(dragHandleProps) => (
              <div className="bg-[var(--bg-app)] rounded-xl border border-[var(--border-subtle)] p-3">
                {editingTaskId === task.task_id ? (
                  <div className="space-y-2">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Task name"
                      value={editTaskForm.name}
                      onChange={e => setEditTaskForm({ ...editTaskForm, name: e.target.value })}
                      className="w-full h-8 px-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-md outline-none text-xs font-bold text-[var(--text-main)]"
                    />
                    <textarea
                      placeholder="Description (optional)"
                      rows={2}
                      value={editTaskForm.description}
                      onChange={e => setEditTaskForm({ ...editTaskForm, description: e.target.value })}
                      className="w-full px-2 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-md outline-none text-xs text-[var(--text-main)] resize-none"
                    />
                    <input
                      type="datetime-local"
                      value={editTaskForm.due_date}
                      onChange={e => setEditTaskForm({ ...editTaskForm, due_date: e.target.value })}
                      className="w-full h-8 px-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-md outline-none text-xs text-[var(--text-main)]"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => setEditingTaskId(null)} className="flex-1 py-1.5 text-xs font-bold text-[var(--text-muted)] bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-md">Cancel</button>
                      <button onClick={() => handleSaveTaskEdit(task.task_id)} disabled={isSavingTaskEdit} className="flex-1 py-1.5 text-xs font-bold text-white bg-brand-primary rounded-md disabled:opacity-50">{isSavingTaskEdit ? 'Saving...' : 'Save'}</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <button
                      {...dragHandleProps}
                      className="mt-0.5 p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-grab active:cursor-grabbing shrink-0 touch-none"
                      title="Drag to reorder"
                    >
                      <GripVertical className="w-4 h-4" />
                    </button>
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
                      <button onClick={() => openEditTask(task)} className="p-1 text-[var(--text-muted)] hover:text-brand-primary">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteTask(task.task_id)} className="p-1 text-[var(--text-muted)] hover:text-rose-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {(expandedTasks[task.task_id] || task.subtasks?.length > 0) && (
                  <div className="ml-7 mt-2 space-y-1.5 border-l border-[var(--border-subtle)] pl-3">
                    {task.subtasks?.map((sub: any, subIndex: number) => (
                      <div key={sub.task_id} className="flex items-start gap-2">
                        {editingSubtaskId === sub.task_id ? (
                          <>
                            <input
                              autoFocus
                              type="text"
                              value={editSubtaskName}
                              onChange={e => setEditSubtaskName(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleSaveSubtaskEdit(sub.task_id); if (e.key === 'Escape') setEditingSubtaskId(null); }}
                              className="flex-1 h-6 px-2 bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-md outline-none text-xs text-[var(--text-main)]"
                            />
                            <button onClick={() => handleSaveSubtaskEdit(sub.task_id)} disabled={isSavingSubtaskEdit} className="text-xs font-bold text-brand-primary disabled:opacity-50">Save</button>
                          </>
                        ) : (
                          <>
                            <div className="flex flex-col shrink-0 -my-0.5">
                              <button
                                onClick={() => handleMoveSubtask(task, sub, 'up')}
                                disabled={subIndex === 0 || reorderingIds.has(sub.task_id)}
                                className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Move up"
                              >
                                <ArrowUp className="w-2.5 h-2.5" />
                              </button>
                              <button
                                onClick={() => handleMoveSubtask(task, sub, 'down')}
                                disabled={subIndex === (task.subtasks?.length || 0) - 1 || reorderingIds.has(sub.task_id)}
                                className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Move down"
                              >
                                <ArrowDown className="w-2.5 h-2.5" />
                              </button>
                            </div>
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
                            <button onClick={() => openEditSubtask(sub)} className="p-0.5 text-[var(--text-muted)] hover:text-brand-primary">
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button onClick={() => handleDeleteTask(sub.task_id)} className="p-0.5 text-[var(--text-muted)] hover:text-rose-500">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        )}
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
                        <button onClick={() => handleAddSubtask(task)} disabled={isAddingSubtask} className="text-xs font-bold text-brand-primary disabled:opacity-50">Add</button>
                      </div>
                    ) : (
                      <button onClick={() => { setAddingSubtaskFor(task.task_id); setNewSubtaskName(''); }} className="text-[11px] font-bold text-brand-primary hover:underline pt-1">
                        + Add subtask
                      </button>
                    )}
                  </div>
                )}
              </div>
                )}
              </SortableTaskWrapper>
            ))}
            </SortableContext>
            </DndContext>

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
                  <button onClick={() => handleAddTask(section.key)} disabled={isAddingTask} className="flex-1 py-1.5 text-xs font-bold text-white bg-brand-primary rounded-md disabled:opacity-50">{isAddingTask ? 'Adding...' : 'Add Task'}</button>
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

      {/* Duplicate Checklist Modal */}
      {isDuplicateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-app)]/80 backdrop-blur-sm p-4">
          <div className="bg-[var(--bg-surface)] rounded-3xl w-full max-w-md border border-[var(--border-soft)] shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-soft)] bg-[var(--bg-app)]/50">
              <h2 className="text-lg font-bold text-[var(--text-main)]">{isChecklistEmpty ? 'Duplicate Checklist From Project' : 'Duplicate Checklist'}</h2>
              <button onClick={() => setIsDuplicateOpen(false)} className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-app)] rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-[var(--text-muted)]">
                {isChecklistEmpty
                  ? "Copy every task and subtask from another project's checklist into this one. Due dates are cleared on the copy."
                  : "Copy every task and subtask from this checklist into another project. Due dates are cleared on the copy."}
              </p>
              <div className="space-y-2">
                <label className="text-sm font-bold text-[var(--text-muted)]">{isChecklistEmpty ? 'Source Project' : 'Target Project'}</label>
                <select value={duplicateTarget} onChange={e => setDuplicateTarget(e.target.value)} className="w-full px-4 py-3 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] rounded-xl outline-none focus:border-brand-primary transition-all">
                  <option value="">Select a project...</option>
                  {allEvents.filter((e: any) => String(e.event_id) !== String(eventId)).map((e: any) => (
                    <option key={e.event_id} value={e.event_id}>{e.name}</option>
                  ))}
                </select>
              </div>
              <div className="pt-2 flex gap-3">
                <button onClick={() => setIsDuplicateOpen(false)} className="flex-1 px-6 py-3 font-bold text-[var(--text-muted)] bg-[var(--bg-app)] hover:bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-xl transition-colors">Cancel</button>
                <button onClick={handleDuplicate} disabled={!duplicateTarget || isDuplicating} className="flex-1 px-6 py-2.5 bg-brand-primary text-white font-bold rounded-xl hover:bg-brand-secondary transition-colors disabled:opacity-50">{isDuplicating ? 'Duplicating...' : 'Duplicate'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
