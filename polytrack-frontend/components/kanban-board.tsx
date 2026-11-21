'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Loader2,
  Calendar,
  Clock,
  User,
  Paperclip,
  MessageSquare,
  ArrowRight,
  Upload,
  Trash2,
  CheckCircle,
  AlertCircle,
  FileText,
  Send,
  Download,
} from 'lucide-react';

export default function KanbanBoard() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  // Modals
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  // Forms
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    milestoneId: '',
    assignedTo: '',
    priority: 'Normal',
    storyPoints: 3,
    estimatedHours: 8,
    dueDate: '',
  });

  // Task Detail Modal State
  const [activeTaskTab, setActiveTaskTab] = useState<'details' | 'comments' | 'attachments' | 'time'>('details');
  const [commentText, setCommentText] = useState('');
  const [commentStatusChange, setCommentStatusChange] = useState('');
  const [timeDate, setTimeDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeHours, setTimeHours] = useState(2);
  const [timeNotes, setTimeNotes] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Projects fetch
  const { data: projectsData } = useSWR('kanban-projects', () => apiClient.getProjects());
  const projects = projectsData?.data || [];

  // Default select first project if not chosen
  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  // Kanban fetch
  const {
    data: kanbanData,
    mutate: mutateKanban,
    isLoading: loadingKanban,
  } = useSWR(selectedProjectId ? `kanban-${selectedProjectId}` : null, () =>
    selectedProjectId ? apiClient.getKanbanTasks(selectedProjectId) : null
  );

  // Users & Milestones for current project
  const { data: usersData } = useSWR('users-list', () => apiClient.getUsers());
  const allUsers = usersData?.data || [];

  const { data: milestones } = useSWR(
    selectedProjectId ? `milestones-${selectedProjectId}` : null,
    () => (selectedProjectId ? apiClient.getMilestones(selectedProjectId) : [])
  );

  // Task Details SWR (when a task is opened)
  const {
    data: taskDetails,
    mutate: mutateTaskDetails,
    isLoading: loadingTaskDetails,
  } = useSWR(selectedTask?.id ? `task-${selectedTask.id}` : null, () =>
    selectedTask?.id ? apiClient.getTaskById(selectedTask.id) : null
  );

  const { data: taskComments, mutate: mutateTaskComments } = useSWR(
    selectedTask?.id ? `task-comments-${selectedTask.id}` : null,
    () => (selectedTask?.id ? apiClient.getTaskComments(selectedTask.id) : [])
  );

  const { data: taskAttachments, mutate: mutateTaskAttachments } = useSWR(
    selectedTask?.id ? `task-attachments-${selectedTask.id}` : null,
    () => (selectedTask?.id ? apiClient.getTaskAttachments(selectedTask.id) : [])
  );

  const columns = [
    { id: 'New', title: 'New & Backlog', tasks: kanbanData?.new || [] },
    { id: 'InProgress', title: 'In Progress', tasks: kanbanData?.inProgress || [] },
    { id: 'Review', title: 'Review & QA', tasks: kanbanData?.review || [] },
    { id: 'Done', title: 'Done', tasks: kanbanData?.done || [] },
  ];

  const priorityColors: Record<string, string> = {
    critical: 'border-l-4 border-destructive',
    high: 'border-l-4 border-red-500',
    normal: 'border-l-4 border-blue-500',
    low: 'border-l-4 border-emerald-500',
  };

  const handleMoveTask = async (taskId: string, newStatus: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await apiClient.moveTask(taskId, newStatus);
      mutateKanban();
      if (selectedTask?.id === taskId) {
        mutateTaskDetails();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to move task');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title || !selectedProjectId) return;
    setIsSubmitting(true);
    try {
      await apiClient.createTask({
        title: taskForm.title,
        description: taskForm.description || undefined,
        projectId: selectedProjectId,
        milestoneId: taskForm.milestoneId || undefined,
        assignedTo: taskForm.assignedTo || undefined,
        priority: taskForm.priority,
        storyPoints: Number(taskForm.storyPoints),
        estimatedHours: Number(taskForm.estimatedHours),
        dueDate: taskForm.dueDate ? new Date(taskForm.dueDate).toISOString() : undefined,
      });
      setShowCreateTaskModal(false);
      setTaskForm({
        title: '',
        description: '',
        milestoneId: '',
        assignedTo: '',
        priority: 'Normal',
        storyPoints: 3,
        estimatedHours: 8,
        dueDate: '',
      });
      mutateKanban();
      setStatusMessage('Task created successfully!');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedTask) return;
    setIsSubmitting(true);
    try {
      await apiClient.addTaskComment(
        selectedTask.id,
        commentText,
        commentStatusChange || undefined
      );
      setCommentText('');
      setCommentStatusChange('');
      mutateTaskComments();
      mutateTaskDetails();
      mutateKanban();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadAttachment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !selectedTask) return;
    setIsSubmitting(true);
    try {
      await apiClient.uploadTaskAttachment(selectedTask.id, uploadFile);
      setUploadFile(null);
      mutateTaskAttachments();
      mutateTaskDetails();
      setStatusMessage('Attachment uploaded to studio storage!');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to upload attachment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!confirm('Delete this attachment?')) return;
    try {
      await apiClient.deleteTaskAttachment(selectedTask.id, attachmentId);
      mutateTaskAttachments();
      mutateTaskDetails();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete attachment');
    }
  };

  const handleLogTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !timeHours) return;
    setIsSubmitting(true);
    try {
      await apiClient.logTime(selectedTask.id, timeDate, Number(timeHours), timeNotes || undefined);
      setTimeHours(2);
      setTimeNotes('');
      mutateTaskDetails();
      setStatusMessage('Time entry logged!');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to log time');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-foreground">Kanban & Production Tasks</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/20 text-primary font-semibold border border-primary/30">
              Phase 2
            </span>
          </div>
          <p className="text-muted-foreground mt-1">
            Track asset creation, assign artist tasks, manage attachments, and log hours
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowCreateTaskModal(true)}
            disabled={!selectedProjectId}
            className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Task
          </Button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Project Selector Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-card/60 p-3 rounded-lg border border-border">
        <label htmlFor="project" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Active Project:
        </label>
        <select
          id="project"
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="px-3 py-1.5 bg-input border border-border rounded-lg text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 max-w-sm"
        >
          {projects.length === 0 && <option value="">No projects available</option>}
          {projects.map((p: any) => (
            <option key={p.id} value={p.id}>
              {p.name} {p.projectCode ? `(${p.projectCode})` : ''} - {p.status}
            </option>
          ))}
        </select>
      </div>

      {/* Kanban Columns */}
      {!selectedProjectId ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <p>Please select a project to load tasks.</p>
        </div>
      ) : loadingKanban ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map((column) => (
            <div
              key={column.id}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setDragOverColumnId(column.id);
              }}
              onDragLeave={() => setDragOverColumnId(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverColumnId(null);
                const taskId = e.dataTransfer.getData('text/plain');
                if (taskId) handleMoveTask(taskId, column.id);
              }}
              className={`space-y-3 bg-card/40 border rounded-xl p-4 min-h-[550px] flex flex-col justify-between transition-colors ${
                dragOverColumnId === column.id
                  ? 'border-primary ring-2 ring-primary/30 bg-primary/5'
                  : 'border-border/50'
              }`}
            >
              <div>
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-border/40 mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        column.id === 'New'
                          ? 'bg-blue-400'
                          : column.id === 'InProgress'
                          ? 'bg-amber-400'
                          : column.id === 'Review'
                          ? 'bg-purple-400'
                          : 'bg-emerald-400'
                      }`}
                    />
                    <h3 className="font-semibold text-foreground text-sm">{column.title}</h3>
                  </div>
                  <span className="px-2 py-0.5 bg-muted rounded-full text-xs font-semibold text-muted-foreground">
                    {column.tasks?.length || 0}
                  </span>
                </div>

                {/* Tasks List */}
                <div className="space-y-2.5">
                  {column.tasks?.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground/60 border border-dashed border-border/40 rounded-lg">
                      Drop tasks here or click below to add
                    </div>
                  ) : (
                    column.tasks.map((task: any) => {
                      const pKey = (task.priority || '').toLowerCase();

                      return (
                        <div
                          key={task.id}
                          draggable={true}
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', task.id);
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onClick={() => setSelectedTask(task)}
                          className={`p-3.5 bg-card hover:bg-card/90 border border-border/60 hover:border-border rounded-lg cursor-grab active:cursor-grabbing transition-all shadow-sm ${
                            priorityColors[pKey] || ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <h4 className="font-medium text-foreground text-sm line-clamp-2">
                              {task.title}
                            </h4>
                          </div>

                          {task.milestoneName && (
                            <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground mb-2 truncate max-w-full">
                              {task.milestoneName}
                            </span>
                          )}

                          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/30">
                            <div className="flex items-center gap-1.5">
                              {task.assignedTo ? (
                                <div
                                  className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold"
                                  title={task.assignedTo.name}
                                >
                                  {task.assignedTo.name.charAt(0).toUpperCase()}
                                </div>
                              ) : (
                                <span className="text-[10px] text-muted-foreground/60">Unassigned</span>
                              )}
                              <span className="truncate max-w-[80px]">
                                {task.assignedTo?.name || ''}
                              </span>
                            </div>

                            {task.dueDate && (
                              <span
                                className={`flex items-center gap-1 text-[11px] ${
                                  task.isOverdue ? 'text-destructive font-medium' : ''
                                }`}
                              >
                                <Calendar className="w-3 h-3" />
                                {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>

                          {/* Quick lane transition buttons */}
                          <div className="flex items-center justify-end gap-1 mt-2.5 pt-2 border-t border-border/20">
                            {column.id !== 'InProgress' && column.id !== 'Done' && (
                              <button
                                onClick={(e) => handleMoveTask(task.id, 'InProgress', e)}
                                title="Move to In Progress"
                                className="px-2 py-0.5 text-[10px] rounded bg-muted hover:bg-accent text-foreground transition-colors"
                              >
                                → In Progress
                              </button>
                            )}
                            {column.id === 'InProgress' && (
                              <button
                                onClick={(e) => handleMoveTask(task.id, 'Review', e)}
                                title="Move to Review"
                                className="px-2 py-0.5 text-[10px] rounded bg-muted hover:bg-accent text-foreground transition-colors"
                              >
                                → Review
                              </button>
                            )}
                            {column.id === 'Review' && (
                              <button
                                onClick={(e) => handleMoveTask(task.id, 'Done', e)}
                                title="Mark as Done"
                                className="px-2 py-0.5 text-[10px] rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                              >
                                ✓ Done
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Add Task Lane Footer */}
              <button
                onClick={() => {
                  setShowCreateTaskModal(true);
                }}
                className="w-full mt-3 p-2 border border-dashed border-border/60 rounded-lg text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all flex items-center justify-center gap-1.5 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add to {column.title}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Task Detail Drawer */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 bg-card border-border shadow-2xl flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-start justify-between pb-3 border-b border-border">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] px-2 py-0.5 rounded bg-muted text-foreground font-semibold">
                      {taskDetails?.status || selectedTask.status}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-primary/20 text-primary font-medium">
                      {taskDetails?.priority || selectedTask.priority}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-foreground">
                    {taskDetails?.title || selectedTask.title}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Project: {taskDetails?.projectName || 'Active Project'}
                    {taskDetails?.milestoneName && ` • Milestone: ${taskDetails.milestoneName}`}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="text-muted-foreground hover:text-foreground text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-2 border-b border-border/60 py-2 text-xs font-medium">
                <button
                  onClick={() => setActiveTaskTab('details')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    activeTaskTab === 'details'
                      ? 'bg-accent text-accent-foreground font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Details
                </button>
                <button
                  onClick={() => setActiveTaskTab('comments')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    activeTaskTab === 'comments'
                      ? 'bg-accent text-accent-foreground font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Comments ({taskComments?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTaskTab('attachments')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    activeTaskTab === 'attachments'
                      ? 'bg-accent text-accent-foreground font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  Attachments ({taskAttachments?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTaskTab('time')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    activeTaskTab === 'time'
                      ? 'bg-accent text-accent-foreground font-semibold'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  Time & Hours ({taskDetails?.loggedHours ?? 0}h logged)
                </button>
              </div>

              {/* Tab 1: Details */}
              {activeTaskTab === 'details' && (
                <div className="space-y-4 py-4 text-sm">
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      Description
                    </h4>
                    <p className="p-3 bg-muted/40 rounded-lg text-foreground text-xs whitespace-pre-wrap">
                      {taskDetails?.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-card/60 p-3 rounded-lg border border-border/40">
                    <div>
                      <span className="text-muted-foreground block">Assigned Artist:</span>
                      <span className="font-semibold text-foreground">
                        {taskDetails?.assignedTo?.name || 'Unassigned'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Due Date:</span>
                      <span className="font-semibold text-foreground">
                        {taskDetails?.dueDate
                          ? new Date(taskDetails.dueDate).toLocaleDateString()
                          : 'None'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Story Points:</span>
                      <span className="font-semibold text-foreground">
                        {taskDetails?.storyPoints ?? 0} pts
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Est. Hours:</span>
                      <span className="font-semibold text-foreground">
                        {taskDetails?.estimatedHours ?? 0} hrs
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Logged Hours:</span>
                      <span className="font-semibold text-emerald-400">
                        {taskDetails?.loggedHours ?? 0} hrs
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Created:</span>
                      <span className="font-semibold text-foreground">
                        {taskDetails?.createdAt
                          ? new Date(taskDetails.createdAt).toLocaleDateString()
                          : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Move status */}
                  <div className="pt-2">
                    <label className="block text-xs font-medium text-foreground mb-1">
                      Change Lane / Status
                    </label>
                    <div className="flex items-center gap-2">
                      {['New', 'InProgress', 'Review', 'Done'].map((st) => (
                        <button
                          key={st}
                          onClick={() => handleMoveTask(selectedTask.id, st)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            (taskDetails?.status || selectedTask.status) === st
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-card border-border text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Comments & Discussion */}
              {activeTaskTab === 'comments' && (
                <div className="space-y-4 py-4 text-sm">
                  {/* Comments Feed */}
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {!taskComments || taskComments.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">
                        No comments yet. Start the discussion!
                      </p>
                    ) : (
                      taskComments.map((c: any) => (
                        <div
                          key={c.id}
                          className="p-3 bg-muted/40 rounded-lg border border-border/40 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground">
                              {c.author?.name || 'User'}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(c.createdAt).toLocaleString()}
                            </span>
                          </div>
                          {c.statusChangeTo && (
                            <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-medium">
                              Status changed to: {c.statusChangeTo}
                            </span>
                          )}
                          <p className="text-foreground/90 whitespace-pre-wrap">{c.body}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* New Comment Input */}
                  <form onSubmit={handleAddComment} className="space-y-2 pt-2 border-t border-border">
                    <textarea
                      required
                      rows={2}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Add a feedback note or review comment..."
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-xs resize-none"
                    />

                    <div className="flex items-center justify-between gap-2">
                      <select
                        value={commentStatusChange}
                        onChange={(e) => setCommentStatusChange(e.target.value)}
                        className="px-2 py-1 bg-input border border-border rounded text-[11px] text-foreground"
                      >
                        <option value="">No status change</option>
                        <option value="InProgress">Change to: InProgress</option>
                        <option value="Review">Change to: Review</option>
                        <option value="Done">Change to: Done</option>
                      </select>

                      <Button
                        type="submit"
                        size="sm"
                        disabled={isSubmitting || !commentText.trim()}
                        className="bg-primary text-primary-foreground text-xs flex items-center gap-1.5"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Post Comment
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Tab 3: Task Attachments */}
              {activeTaskTab === 'attachments' && (
                <div className="space-y-4 py-4 text-sm">
                  {/* Upload Form */}
                  <form
                    onSubmit={handleUploadAttachment}
                    className="p-3 bg-muted/40 rounded-lg border border-dashed border-border flex flex-col sm:flex-row items-center gap-3"
                  >
                    <input
                      type="file"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="text-xs text-foreground file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isSubmitting || !uploadFile}
                      className="bg-primary text-primary-foreground text-xs flex items-center gap-1.5 shrink-0"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Upload to Storage
                    </Button>
                  </form>

                  {/* List of Attachments */}
                  <div className="space-y-2">
                    {!taskAttachments || taskAttachments.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-4 text-center">
                        No attachments uploaded for this task yet.
                      </p>
                    ) : (
                      taskAttachments.map((att: any) => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-card/80 border border-border/40 text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="w-4 h-4 text-primary shrink-0" />
                            <div className="truncate">
                              <span className="font-medium text-foreground block truncate">
                                {att.fileName}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {att.fileSizeBytes
                                  ? `${(att.fileSizeBytes / 1024).toFixed(1)} KB`
                                  : 'File'}{' '}
                                • {new Date(att.uploadedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <a
                              href={apiClient.getAttachmentDownloadUrl(selectedTask.id, att.id)}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 hover:bg-accent text-muted-foreground hover:text-foreground rounded transition-colors"
                              title="Download attachment"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                            <button
                              onClick={() => handleDeleteAttachment(att.id)}
                              className="p-1.5 hover:bg-destructive/20 text-muted-foreground hover:text-destructive rounded transition-colors"
                              title="Delete attachment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Tab 4: Time Tracking */}
              {activeTaskTab === 'time' && (
                <div className="space-y-4 py-4 text-sm">
                  <form onSubmit={handleLogTime} className="space-y-3 bg-muted/30 p-4 rounded-lg border border-border/40">
                    <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                      Log Working Hours
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-muted-foreground mb-1">Date</label>
                        <input
                          type="date"
                          required
                          value={timeDate}
                          onChange={(e) => setTimeDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-input border border-border rounded text-foreground text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-muted-foreground mb-1">Hours Logged</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          max="24"
                          required
                          value={timeHours}
                          onChange={(e) => setTimeHours(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-input border border-border rounded text-foreground text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Notes</label>
                      <input
                        type="text"
                        value={timeNotes}
                        onChange={(e) => setTimeNotes(e.target.value)}
                        placeholder="e.g. Sculpted high-poly face details in Blender"
                        className="w-full px-2.5 py-1.5 bg-input border border-border rounded text-foreground text-xs"
                      />
                    </div>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isSubmitting}
                      className="bg-primary text-primary-foreground text-xs flex items-center gap-1.5"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      Save Hours
                    </Button>
                  </form>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-border flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setSelectedTask(null)}>
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal: Create Task */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6 bg-card border-border shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                Create New Production Task
              </h2>
              <button
                onClick={() => setShowCreateTaskModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4 mt-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Task Title *
                </label>
                <input
                  required
                  type="text"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                  placeholder="e.g. Model Neon Sign Props"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm resize-none"
                  placeholder="Task specifications, poly targets, references..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Milestone
                  </label>
                  <select
                    value={taskForm.milestoneId}
                    onChange={(e) => setTaskForm({ ...taskForm, milestoneId: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                  >
                    <option value="">None / Backlog</option>
                    {milestones?.map((m: any) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Assign Artist
                  </label>
                  <select
                    value={taskForm.assignedTo}
                    onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                  >
                    <option value="">Unassigned</option>
                    {allUsers.map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                  >
                    <option value="Low">Low</option>
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Story Points
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={taskForm.storyPoints}
                    onChange={(e) => setTaskForm({ ...taskForm, storyPoints: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Est. Hours
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={taskForm.estimatedHours}
                    onChange={(e) => setTaskForm({ ...taskForm, estimatedHours: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Due Date</label>
                <input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                />
              </div>

              <div className="pt-3 border-t border-border flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateTaskModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || !taskForm.title}
                  className="bg-primary text-primary-foreground flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Task
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
