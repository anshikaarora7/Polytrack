'use client';

import { useState, useEffect, useMemo } from 'react';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient, formatApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ErrorWarningCard } from '@/components/ui/error-warning';
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
  AlertTriangle,
  Minus,
  LayoutGrid,
  ListFilter,
  SlidersHorizontal,
  Search,
  Eye,
  Layers,
  Film,
} from 'lucide-react';

export default function KanbanBoard() {
  const { user } = useAuthStore();
  const userRole = (user?.role || '').toLowerCase();
  const isArtist = userRole === 'artist';
  const isStudioLeadOrAdmin = ['studiolead', 'studio_lead', 'admin', 'projectmanager', 'project_manager'].includes(userRole);

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  // View & Pipeline Toggles
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [pipelineMode, setPipelineMode] = useState<'studio' | 'status'>('studio');

  // List View Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');

  // Optimistic Tasks State
  const [localTasks, setLocalTasks] = useState<any[]>([]);

  // Modals
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [boardError, setBoardError] = useState<{ title?: string; message: string; details?: string[] } | null>(null);
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
    error: kanbanError,
  } = useSWR(selectedProjectId ? `kanban-${selectedProjectId}` : null, () =>
    selectedProjectId ? apiClient.getKanbanTasks(selectedProjectId) : null
  );

  // Sync kanbanData into localTasks for Optimistic UI
  useEffect(() => {
    if (kanbanData) {
      const merged = [
        ...(kanbanData.new || []).map((t: any) => ({ ...t, status: t.status || 'New' })),
        ...(kanbanData.inProgress || []).map((t: any) => ({ ...t, status: t.status || 'InProgress' })),
        ...(kanbanData.review || []).map((t: any) => ({ ...t, status: t.status || 'Review' })),
        ...(kanbanData.done || []).map((t: any) => ({ ...t, status: t.status || 'Done' })),
      ];
      setLocalTasks(merged);
    }
  }, [kanbanData]);

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

  // Helper to map 3D studio stages: Concept -> Modeling -> Rigging -> Texturing -> Lighting -> Final Render
  const classifyStudioStage = (task: any): string => {
    if (task.customStage) return task.customStage;
    const text = ((task.title || '') + ' ' + (task.description || '') + ' ' + (task.milestoneName || '')).toLowerCase();
    const status = (task.status || '').toLowerCase();

    if (status === 'done' || status === 'approved') return 'Final Render';
    if (text.includes('rig') || text.includes('skeleton') || text.includes('bone') || text.includes('armature') || text.includes('weight')) return 'Rigging';
    if (text.includes('texture') || text.includes('substance') || text.includes('material') || text.includes('uv') || text.includes('shader') || text.includes('pbr')) return 'Texturing';
    if (text.includes('light') || text.includes('lookdev') || text.includes('camera') || text.includes('turntable') || text.includes('shadow')) return 'Lighting';
    if (text.includes('concept') || text.includes('art') || text.includes('sketch') || text.includes('storyboard') || text.includes('mood')) return 'Concept';
    if (text.includes('model') || text.includes('mesh') || text.includes('sculpt') || text.includes('topo') || text.includes('prop') || text.includes('asset') || text.includes('character')) return 'Modeling';

    if (status === 'new' || status === 'assigned') return 'Concept';
    if (status === 'inprogress') return 'Modeling';
    if (status === 'review' || status === 'submitted') return 'Lighting';
    return 'Concept';
  };

  // Studio 6-stage columns vs Standard status columns
  const studioColumns = [
    { id: 'Concept', title: '1. Concept', color: 'bg-warning', tasks: localTasks.filter(t => classifyStudioStage(t) === 'Concept') },
    { id: 'Modeling', title: '2. Modeling', color: 'bg-info', tasks: localTasks.filter(t => classifyStudioStage(t) === 'Modeling') },
    { id: 'Rigging', title: '3. Rigging', color: 'bg-purple-500', tasks: localTasks.filter(t => classifyStudioStage(t) === 'Rigging') },
    { id: 'Texturing', title: '4. Texturing', color: 'bg-accent', tasks: localTasks.filter(t => classifyStudioStage(t) === 'Texturing') },
    { id: 'Lighting', title: '5. Lighting', color: 'bg-amber-500', tasks: localTasks.filter(t => classifyStudioStage(t) === 'Lighting') },
    { id: 'Final Render', title: '6. Final Render', color: 'bg-success', tasks: localTasks.filter(t => classifyStudioStage(t) === 'Final Render') },
  ];

  const statusColumns = [
    { id: 'New', title: 'New & Backlog', color: 'bg-text-muted', tasks: localTasks.filter(t => (t.status || 'New') === 'New' || t.status === 'Assigned') },
    { id: 'InProgress', title: 'In Progress', color: 'bg-warning', tasks: localTasks.filter(t => t.status === 'InProgress') },
    { id: 'Review', title: 'Review & QA', color: 'bg-info', tasks: localTasks.filter(t => t.status === 'Review' || t.status === 'Submitted') },
    { id: 'Done', title: 'Done & Approved', color: 'bg-success', tasks: localTasks.filter(t => t.status === 'Done' || t.status === 'Approved') },
  ];

  const columns = pipelineMode === 'studio' ? studioColumns : statusColumns;

  // Filtered tasks for List View
  const filteredListTasks = useMemo(() => {
    return localTasks.filter((task) => {
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = task.title?.toLowerCase().includes(query);
        const matchesDesc = task.description?.toLowerCase().includes(query);
        const matchesMilestone = task.milestoneName?.toLowerCase().includes(query);
        const matchesAssignee = task.assignedTo?.name?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesMilestone && !matchesAssignee) return false;
      }
      // Priority
      if (priorityFilter !== 'all' && (task.priority || '').toLowerCase() !== priorityFilter.toLowerCase()) {
        return false;
      }
      // Stage / Status
      if (stageFilter !== 'all') {
        const currentStage = classifyStudioStage(task);
        if (currentStage.toLowerCase() !== stageFilter.toLowerCase() && (task.status || '').toLowerCase() !== stageFilter.toLowerCase()) {
          return false;
        }
      }
      // Assignee
      if (assigneeFilter !== 'all' && task.assignedTo?.id !== assigneeFilter) {
        return false;
      }
      return true;
    });
  }, [localTasks, searchQuery, priorityFilter, stageFilter, assigneeFilter]);

  const getPriorityDot = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'critical':
      case 'high':
        return 'bg-danger';
      case 'normal':
        return 'bg-info';
      case 'low':
        return 'bg-success';
      default:
        return 'bg-text-muted';
    }
  };

  // Optimistic task movement across columns
  const handleMoveTask = async (taskId: string, targetStageOrStatus: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    let newStatus = targetStageOrStatus;
    if (targetStageOrStatus === 'Concept') newStatus = 'New';
    else if (['Modeling', 'Rigging', 'Texturing'].includes(targetStageOrStatus)) newStatus = 'InProgress';
    else if (targetStageOrStatus === 'Lighting') newStatus = 'Review';
    else if (targetStageOrStatus === 'Final Render') newStatus = 'Done';

    // Optimistically update local state immediately
    const prevTasks = [...localTasks];
    setLocalTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: newStatus, customStage: targetStageOrStatus }
          : t
      )
    );

    try {
      await apiClient.moveTask(taskId, newStatus);
      mutateKanban();
      if (selectedTask?.id === taskId) {
        mutateTaskDetails();
      }
    } catch (err: any) {
      // Rollback on failure
      setLocalTasks(prevTasks);
      setBoardError(formatApiError(err));
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title || !selectedProjectId) return;
    setIsSubmitting(true);
    setBoardError(null);
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
      setBoardError(formatApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedTask) return;
    setIsSubmitting(true);
    setBoardError(null);
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
      setBoardError(formatApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadAttachment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !selectedTask) return;
    setIsSubmitting(true);
    setBoardError(null);
    try {
      await apiClient.uploadTaskAttachment(selectedTask.id, uploadFile);
      setUploadFile(null);
      mutateTaskAttachments();
      mutateTaskDetails();
      setStatusMessage('Attachment uploaded to studio storage!');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setBoardError(formatApiError(err));
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
      setBoardError(formatApiError(err));
    }
  };

  const handleLogTime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !timeHours) return;
    setIsSubmitting(true);
    setBoardError(null);
    try {
      await apiClient.logTime(selectedTask.id, timeDate, Number(timeHours), timeNotes || undefined);
      setTimeHours(2);
      setTimeNotes('');
      mutateTaskDetails();
      setStatusMessage('Time entry logged!');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setBoardError(formatApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-[-0.01em] text-text">3D Pipeline & Tasks</h1>
            <span className="text-xs px-2 py-0.5 rounded-[8px] bg-accent-tint text-accent font-medium border border-border">
              {pipelineMode === 'studio' ? 'Studio 6-Stage' : 'Standard'}
            </span>
          </div>
          <p className="text-sm text-text-muted mt-0.5">
            Concept → Modeling → Rigging → Texturing → Lighting → Final Render
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isArtist ? (
            <div className="px-3 py-1.5 rounded-[8px] bg-accent/10 border border-accent/20 text-accent text-xs flex items-center gap-2">
              <User className="w-3.5 h-3.5" strokeWidth={2} />
              <span className="font-medium">Artist View: Your Assigned Studio Tasks</span>
            </div>
          ) : (
            <Button
              onClick={() => setShowCreateTaskModal(true)}
              disabled={!selectedProjectId}
              className="rounded-[8px] bg-accent hover:bg-accent-hover text-white flex items-center gap-1.5 text-sm h-9 px-3.5 shadow-none"
            >
              <Plus className="w-4 h-4" strokeWidth={1.75} />
              <span>New Task</span>
            </Button>
          )}
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-success/10 border border-success/30 rounded-[8px] text-success text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" strokeWidth={1.75} />
          <span>{statusMessage}</span>
        </div>
      )}

      {boardError && (
        <div className="p-3 bg-danger/10 border border-danger/30 rounded-[8px] text-danger text-xs flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.75} />
            <div>
              <p className="font-semibold">{boardError.title || 'Action Failed'}</p>
              <p>{boardError.message}</p>
              {boardError.details && boardError.details.length > 0 && (
                <ul className="mt-1 list-disc list-inside space-y-0.5">
                  {boardError.details.map((detail, idx) => (
                    <li key={idx}>{detail}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <button
            onClick={() => setBoardError(null)}
            className="text-danger hover:opacity-80 p-0.5 text-sm leading-none"
            aria-label="Dismiss error"
          >
            &times;
          </button>
        </div>
      )}

      {kanbanError && (
        <ErrorWarningCard
          error={kanbanError}
          type="server"
          title="Failed to Load Kanban Board"
          message="Could not load tasks for the selected project. Please check backend connectivity."
          onRetry={() => mutateKanban()}
        />
      )}

      {/* Project Selector & Mode Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface p-2.5 rounded-[8px] border border-border shadow-[var(--shadow-pop)]">
        {/* Project Dropdown */}
        <div className="flex items-center gap-2">
          <label htmlFor="project" className="text-xs font-medium text-text-muted hidden sm:inline">
            Project:
          </label>
          <select
            id="project"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-2.5 py-1.5 bg-surface-2 border border-border rounded-[8px] text-text text-xs font-medium focus:outline-none focus:border-accent max-w-[180px] sm:max-w-xs"
          >
            {projects.length === 0 && <option value="">No projects available</option>}
            {projects.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name} {p.projectCode ? `(${p.projectCode})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* View Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Pipeline Mode Toggle (Kanban Only) */}
          {viewMode === 'kanban' && (
            <div className="flex items-center bg-surface-2 border border-border rounded-[8px] p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setPipelineMode('studio')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] font-medium transition-colors ${
                  pipelineMode === 'studio'
                    ? 'bg-surface text-accent shadow-xs'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                <Film className="w-3 h-3 text-accent" />
                <span>3D Pipeline</span>
              </button>
              <button
                type="button"
                onClick={() => setPipelineMode('status')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] font-medium transition-colors ${
                  pipelineMode === 'status'
                    ? 'bg-surface text-accent shadow-xs'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                <Layers className="w-3 h-3 text-text-muted" />
                <span>Status Board</span>
              </button>
            </div>
          )}

          {/* Kanban vs Filterable List Toggle */}
          <div className="flex items-center bg-surface-2 border border-border rounded-[8px] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-[6px] font-medium transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-surface text-accent shadow-xs'
                  : 'text-text-muted hover:text-text'
              }`}
              title="Kanban Board View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Board</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-[6px] font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-surface text-accent shadow-xs'
                  : 'text-text-muted hover:text-text'
              }`}
              title="Filterable List View"
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Kanban Board or Filterable List */}
      {!selectedProjectId ? (
        <div className="flex items-center justify-center py-16 text-text-muted text-sm">
          <p>Please select a project to load tasks.</p>
        </div>
      ) : loadingKanban ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-accent" strokeWidth={1.75} />
        </div>
      ) : viewMode === 'kanban' ? (
        /* Kanban Board View */
        <div
          className={`grid gap-3.5 ${
            pipelineMode === 'studio'
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'
              : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
          }`}
        >
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
              className={`space-y-3 bg-surface border rounded-[12px] p-3 min-h-[500px] flex flex-col justify-between transition-colors shadow-[var(--shadow-pop)] ${
                dragOverColumnId === column.id
                  ? 'border-accent ring-1 ring-accent/30 bg-accent-tint/30'
                  : 'border-border'
              }`}
            >
              <div>
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-border mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${column.color}`} />
                    <h3 className="font-semibold text-text text-xs sm:text-sm truncate">{column.title}</h3>
                  </div>
                  <span className="px-1.5 py-0.2 bg-surface-2 rounded-full text-[11px] font-medium text-text-muted tabular-nums">
                    {column.tasks?.length || 0}
                  </span>
                </div>

                {/* Tasks List */}
                <div className="space-y-2 min-h-[100px]">
                  {column.tasks?.length === 0 ? (
                    <div className="py-8 text-center text-xs text-text-muted border border-dashed border-border rounded-[8px]">
                      Drop here
                    </div>
                  ) : (
                    <AnimatePresence mode="popLayout">
                      {column.tasks.map((task: any) => {
                        const pKey = (task.priority || 'Normal').toLowerCase();

                        return (
                          <motion.div
                            layout
                            layoutId={task.id}
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{
                              layout: { duration: 0.2, ease: 'easeOut' },
                              opacity: { duration: 0.15 },
                            }}
                            key={task.id}
                            draggable={true}
                            onDragStart={(e) => {
                              const dragEvent = e as unknown as React.DragEvent<HTMLDivElement>;
                              if (dragEvent.dataTransfer) {
                                dragEvent.dataTransfer.setData('text/plain', task.id);
                                dragEvent.dataTransfer.effectAllowed = 'move';
                              }
                            }}
                            onClick={() => setSelectedTask(task)}
                            className="p-3 bg-surface hover:bg-surface-2 border border-border rounded-[8px] cursor-grab active:cursor-grabbing transition-colors shadow-xs"
                          >
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <h4 className="font-medium text-text text-xs leading-snug line-clamp-2">
                                {task.title}
                              </h4>
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1 ${getPriorityDot(pKey)}`}
                                title={`Priority: ${task.priority}`}
                              />
                            </div>

                            {task.milestoneName && (
                              <span className="inline-block text-[10px] px-1.5 py-0.2 rounded bg-surface-2 border border-border text-text-muted mb-2 truncate max-w-full">
                                {task.milestoneName}
                              </span>
                            )}

                            <div className="flex items-center justify-between text-xs text-text-muted pt-2 border-t border-border">
                              <div className="flex items-center gap-1.5">
                                {task.assignedTo ? (
                                  <div
                                    className="w-4 h-4 rounded-full bg-accent-tint text-accent flex items-center justify-center text-[10px] font-semibold shrink-0"
                                    title={task.assignedTo.name}
                                  >
                                    {task.assignedTo.name.charAt(0).toUpperCase()}
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-text-muted">Unassigned</span>
                                )}
                                <span className="truncate max-w-[70px] text-[11px]">
                                  {task.assignedTo?.name || ''}
                                </span>
                              </div>

                              {task.dueDate && (
                                <span
                                  className={`flex items-center gap-1 text-[11px] ${
                                    task.isOverdue ? 'text-danger font-medium' : ''
                                  }`}
                                >
                                  <Calendar className="w-3 h-3" strokeWidth={1.75} />
                                  {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                                </span>
                              )}
                            </div>

                            {/* Quick lane transition buttons */}
                            <div className="flex items-center justify-end gap-1 mt-2 pt-2 border-t border-border/50">
                              {column.id !== 'Review' && column.id !== 'Final Render' && column.id !== 'Done' && (
                                <button
                                  onClick={(e) => handleMoveTask(task.id, pipelineMode === 'studio' ? 'Lighting' : 'Review', e)}
                                  title="Submit for Review"
                                  className="px-2 py-0.5 text-[10px] rounded-[4px] bg-surface-2 hover:bg-accent-tint hover:text-accent text-text-muted transition-colors"
                                >
                                  → Review
                                </button>
                              )}
                              {(column.id === 'Review' || column.id === 'Lighting') && (
                                <button
                                  onClick={(e) => handleMoveTask(task.id, pipelineMode === 'studio' ? 'Final Render' : 'Done', e)}
                                  title="Mark as Done"
                                  className="px-2 py-0.5 text-[10px] rounded-[4px] bg-success/10 text-success hover:bg-success/20 transition-colors"
                                >
                                  ✓ Approved
                                </button>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  )}
                </div>
              </div>

              {/* Add Task Lane Footer (Leads & Admins only) */}
              {!isArtist && (
                <button
                  onClick={() => setShowCreateTaskModal(true)}
                  className="w-full mt-3 p-1.5 border border-dashed border-border rounded-[8px] text-text-muted hover:text-text hover:border-accent/40 transition-colors flex items-center justify-center gap-1 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
                  <span>Add Task</span>
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* Filterable, Horizontally Scrollable List View */
        <div className="space-y-3">
          {/* List Filter Toolbar */}
          <div className="flex flex-wrap items-center gap-2 p-3 bg-surface border border-border rounded-[8px] shadow-[var(--shadow-pop)] text-xs">
            {/* Search Input */}
            <div className="flex-1 min-w-[180px] relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Filter tasks by name, artist, milestone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-surface-2 border border-border rounded-[8px] text-text text-xs focus:outline-none focus:border-accent"
              />
            </div>

            {/* Stage Filter */}
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-surface-2 border border-border rounded-[8px] text-text text-xs focus:outline-none focus:border-accent"
            >
              <option value="all">All Stages</option>
              <option value="Concept">1. Concept</option>
              <option value="Modeling">2. Modeling</option>
              <option value="Rigging">3. Rigging</option>
              <option value="Texturing">4. Texturing</option>
              <option value="Lighting">5. Lighting</option>
              <option value="Final Render">6. Final Render</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-surface-2 border border-border rounded-[8px] text-text text-xs focus:outline-none focus:border-accent"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>

            {/* Assignee Filter */}
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-surface-2 border border-border rounded-[8px] text-text text-xs focus:outline-none focus:border-accent"
            >
              <option value="all">All Artists</option>
              {allUsers.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Desktop Table View (horizontally scrollable overflow-x-auto) */}
          <div className="hidden md:block overflow-x-auto border border-border rounded-[10px] bg-surface shadow-[var(--shadow-pop)]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-text-muted font-medium">
                  <th className="p-3">Task Name</th>
                  <th className="p-3">3D Stage</th>
                  <th className="p-3">Priority</th>
                  <th className="p-3">Assigned Artist</th>
                  <th className="p-3">Milestone</th>
                  <th className="p-3">Due Date</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredListTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-text-muted">
                      No studio tasks match your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredListTasks.map((task) => {
                    const stage = classifyStudioStage(task);
                    const pKey = (task.priority || 'Normal').toLowerCase();

                    return (
                      <tr
                        key={task.id}
                        onClick={() => setSelectedTask(task)}
                        className="hover:bg-surface-2/60 cursor-pointer transition-colors"
                      >
                        <td className="p-3 font-medium text-text max-w-xs truncate">
                          {task.title}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-[6px] bg-surface-2 border border-border text-[11px] font-medium text-text">
                            {stage}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${getPriorityDot(pKey)}`} />
                            <span className="capitalize">{task.priority || 'Normal'}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            {task.assignedTo ? (
                              <>
                                <div className="w-4 h-4 rounded-full bg-accent-tint text-accent flex items-center justify-center text-[10px] font-semibold">
                                  {task.assignedTo.name.charAt(0).toUpperCase()}
                                </div>
                                <span>{task.assignedTo.name}</span>
                              </>
                            ) : (
                              <span className="text-text-muted italic">Unassigned</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-text-muted">
                          {task.milestoneName || '—'}
                        </td>
                        <td className="p-3">
                          {task.dueDate ? (
                            <span className={task.isOverdue ? 'text-danger font-medium' : 'text-text-muted'}>
                              {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTask(task);
                            }}
                            className="px-2.5 py-1 rounded-[6px] bg-surface-2 hover:bg-accent-tint hover:text-accent border border-border text-xs font-medium transition-colors"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Card View (<768px) */}
          <div className="md:hidden space-y-2.5">
            {filteredListTasks.length === 0 ? (
              <div className="p-8 text-center text-xs text-text-muted border border-dashed border-border rounded-[8px]">
                No studio tasks match your filter criteria.
              </div>
            ) : (
              filteredListTasks.map((task) => {
                const stage = classifyStudioStage(task);
                const pKey = (task.priority || 'Normal').toLowerCase();

                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task)}
                    className="p-3 bg-surface border border-border rounded-[8px] shadow-xs active:bg-surface-2 transition-colors space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-text text-xs leading-snug">{task.title}</h4>
                      <span className={`w-2 h-2 rounded-full shrink-0 mt-0.5 ${getPriorityDot(pKey)}`} />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap text-[11px]">
                      <span className="px-2 py-0.5 rounded-[6px] bg-surface-2 border border-border font-medium text-text">
                        {stage}
                      </span>
                      {task.milestoneName && (
                        <span className="text-text-muted truncate max-w-[120px]">
                          {task.milestoneName}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-text-muted pt-2 border-t border-border">
                      <span>{task.assignedTo?.name || 'Unassigned'}</span>
                      {task.dueDate && (
                        <span className={task.isOverdue ? 'text-danger font-medium' : ''}>
                          {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Modal: Task Detail Drawer */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 bg-surface border border-border rounded-[12px] shadow-[var(--shadow-pop)] flex flex-col justify-between">
            <div>
              {/* Header */}
              <div className="flex items-start justify-between pb-3 border-b border-border">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] px-2 py-0.5 rounded-[8px] bg-surface-2 border border-border text-text font-medium">
                      {taskDetails?.status || selectedTask.status}
                    </span>
                    <div className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-[8px] bg-surface-2 border border-border text-text-muted font-medium">
                      <span className={`w-1.5 h-1.5 rounded-full ${getPriorityDot(taskDetails?.priority || selectedTask.priority || 'normal')}`} />
                      <span>{taskDetails?.priority || selectedTask.priority}</span>
                    </div>
                  </div>
                  <h2 className="text-lg font-semibold text-text">
                    {taskDetails?.title || selectedTask.title}
                  </h2>
                  <p className="text-xs text-text-muted">
                    Project: {taskDetails?.projectName || 'Active Project'}
                    {taskDetails?.milestoneName && ` • Milestone: ${taskDetails.milestoneName}`}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="text-text-muted hover:text-text text-sm p-1"
                >
                  ✕
                </button>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 border-b border-border py-2 text-xs font-medium">
                <button
                  onClick={() => setActiveTaskTab('details')}
                  className={`px-3 py-1.5 rounded-[8px] transition-colors ${
                    activeTaskTab === 'details'
                      ? 'bg-surface-2 text-text border border-border'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  Details
                </button>
                <button
                  onClick={() => setActiveTaskTab('comments')}
                  className={`px-3 py-1.5 rounded-[8px] transition-colors flex items-center gap-1.5 ${
                    activeTaskTab === 'comments'
                      ? 'bg-surface-2 text-text border border-border'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.75} />
                  Comments ({taskComments?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTaskTab('attachments')}
                  className={`px-3 py-1.5 rounded-[8px] transition-colors flex items-center gap-1.5 ${
                    activeTaskTab === 'attachments'
                      ? 'bg-surface-2 text-text border border-border'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  <Paperclip className="w-3.5 h-3.5" strokeWidth={1.75} />
                  Attachments ({taskAttachments?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTaskTab('time')}
                  className={`px-3 py-1.5 rounded-[8px] transition-colors flex items-center gap-1.5 ${
                    activeTaskTab === 'time'
                      ? 'bg-surface-2 text-text border border-border'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" strokeWidth={1.75} />
                  Time & Hours ({taskDetails?.loggedHours ?? 0}h logged)
                </button>
              </div>

              {/* Tab 1: Details */}
              {activeTaskTab === 'details' && (
                <div className="space-y-4 py-4 text-sm">
                  <div>
                    <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">
                      Description
                    </h4>
                    <p className="p-3 bg-surface-2 rounded-[8px] border border-border text-text text-xs whitespace-pre-wrap">
                      {taskDetails?.description || 'No description provided.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-surface-2 p-3 rounded-[8px] border border-border">
                    <div>
                      <span className="text-text-muted block">Assigned Artist:</span>
                      <span className="font-medium text-text">
                        {taskDetails?.assignedTo?.name || 'Unassigned'}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted block">Due Date:</span>
                      <span className="font-medium text-text">
                        {taskDetails?.dueDate
                          ? new Date(taskDetails.dueDate).toLocaleDateString()
                          : 'None'}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted block">Story Points:</span>
                      <span className="font-medium text-text tabular-nums">
                        {taskDetails?.storyPoints ?? 0} pts
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted block">Est. Hours:</span>
                      <span className="font-medium text-text tabular-nums">
                        {taskDetails?.estimatedHours ?? 0} hrs
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted block">Logged Hours:</span>
                      <span className="font-medium text-success tabular-nums">
                        {taskDetails?.loggedHours ?? 0} hrs
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted block">Created:</span>
                      <span className="font-medium text-text">
                        {taskDetails?.createdAt
                          ? new Date(taskDetails.createdAt).toLocaleDateString()
                          : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Move status */}
                  <div className="pt-2">
                    <label className="block text-xs font-medium text-text mb-1">
                      Change Lane / Status
                    </label>
                    <div className="flex items-center gap-1.5">
                      {['New', 'InProgress', 'Review', 'Done'].map((st) => (
                        <button
                          key={st}
                          onClick={() => handleMoveTask(selectedTask.id, st)}
                          className={`px-2.5 py-1 rounded-[8px] text-xs font-medium border transition-colors ${
                            (taskDetails?.status || selectedTask.status) === st
                              ? 'bg-accent text-white border-accent'
                              : 'bg-surface border-border text-text-muted hover:text-text'
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
                  <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {!taskComments || taskComments.length === 0 ? (
                      <p className="text-xs text-text-muted py-4 text-center">
                        No comments yet. Start the discussion!
                      </p>
                    ) : (
                      taskComments.map((c: any) => (
                        <div
                          key={c.id}
                          className="p-3 bg-surface-2 rounded-[8px] border border-border text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-text">
                              {c.author?.name || 'User'}
                            </span>
                            <span className="text-[10px] text-text-muted">
                              {new Date(c.createdAt).toLocaleString()}
                            </span>
                          </div>
                          {c.statusChangeTo && (
                            <span className="inline-block text-[10px] px-1.5 py-0.2 rounded bg-accent-tint text-accent font-medium">
                              Status changed to: {c.statusChangeTo}
                            </span>
                          )}
                          <p className="text-text whitespace-pre-wrap">{c.body}</p>
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
                      className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-xs resize-none focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                    />

                    <div className="flex items-center justify-between gap-2">
                      <select
                        value={commentStatusChange}
                        onChange={(e) => setCommentStatusChange(e.target.value)}
                        className="px-2 py-1 bg-surface border border-border rounded-[8px] text-[11px] text-text focus:outline-none"
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
                        className="rounded-[8px] bg-accent hover:bg-accent-hover text-white text-xs flex items-center gap-1.5 h-8"
                      >
                        <Send className="w-3.5 h-3.5" strokeWidth={1.75} />
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
                    className="p-3 bg-surface-2 rounded-[8px] border border-dashed border-border flex flex-col sm:flex-row items-center gap-3"
                  >
                    <input
                      type="file"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      className="text-xs text-text file:mr-2 file:py-1 file:px-2.5 file:rounded-[6px] file:border-0 file:text-xs file:bg-surface file:border file:border-border file:text-text hover:file:bg-surface-2 cursor-pointer"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isSubmitting || !uploadFile}
                      className="rounded-[8px] bg-accent hover:bg-accent-hover text-white text-xs flex items-center gap-1.5 shrink-0 h-8"
                    >
                      <Upload className="w-3.5 h-3.5" strokeWidth={1.75} />
                      Upload to Storage
                    </Button>
                  </form>

                  {/* List of Attachments */}
                  <div className="space-y-2">
                    {!taskAttachments || taskAttachments.length === 0 ? (
                      <p className="text-xs text-text-muted py-4 text-center">
                        No attachments uploaded for this task yet.
                      </p>
                    ) : (
                      taskAttachments.map((att: any) => (
                        <div
                          key={att.id}
                          className="flex items-center justify-between p-2.5 rounded-[8px] bg-surface-2 border border-border text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <FileText className="w-4 h-4 text-accent shrink-0" strokeWidth={1.75} />
                            <div className="truncate">
                              <span className="font-medium text-text block truncate">
                                {att.fileName}
                              </span>
                              <span className="text-[10px] text-text-muted">
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
                              className="p-1.5 hover:bg-surface text-text-muted hover:text-text rounded-[4px] transition-colors"
                              title="Download attachment"
                            >
                              <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
                            </a>
                            <button
                              onClick={() => handleDeleteAttachment(att.id)}
                              className="p-1.5 hover:bg-danger/10 text-text-muted hover:text-danger rounded-[4px] transition-colors"
                              title="Delete attachment"
                            >
                              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
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
                  <form onSubmit={handleLogTime} className="space-y-3 bg-surface-2 p-3.5 rounded-[8px] border border-border">
                    <h4 className="text-xs font-semibold text-text uppercase tracking-wider">
                      Log Working Hours
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-text-muted mb-1">Date</label>
                        <input
                          type="date"
                          required
                          value={timeDate}
                          onChange={(e) => setTimeDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-[8px] text-text text-xs focus:outline-none focus:border-accent"
                        />
                      </div>
                      <div>
                        <label className="block text-text-muted mb-1">Hours Logged</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0.5"
                          max="24"
                          required
                          value={timeHours}
                          onChange={(e) => setTimeHours(Number(e.target.value))}
                          className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-[8px] text-text text-xs focus:outline-none focus:border-accent"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-text-muted mb-1">Notes</label>
                      <input
                        type="text"
                        value={timeNotes}
                        onChange={(e) => setTimeNotes(e.target.value)}
                        placeholder="e.g. Sculpted high-poly face details in Blender"
                        className="w-full px-2.5 py-1.5 bg-surface border border-border rounded-[8px] text-text text-xs focus:outline-none focus:border-accent"
                      />
                    </div>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isSubmitting}
                      className="rounded-[8px] bg-accent hover:bg-accent-hover text-white text-xs flex items-center gap-1.5 h-8"
                    >
                      <Clock className="w-3.5 h-3.5" strokeWidth={1.75} />
                      Save Hours
                    </Button>
                  </form>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-border flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setSelectedTask(null)} className="rounded-[8px]">
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Modal: Create Task */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-5 bg-surface border border-border rounded-[12px] shadow-[var(--shadow-pop)]">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-base font-semibold text-text flex items-center gap-2">
                <Plus className="w-4 h-4 text-accent" strokeWidth={1.75} />
                Create New Production Task
              </h2>
              <button
                onClick={() => setShowCreateTaskModal(false)}
                className="text-text-muted hover:text-text text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4 mt-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-text mb-1">
                  Task Title *
                </label>
                <input
                  required
                  type="text"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  placeholder="e.g. Model Neon Sign Props"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm resize-none focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  placeholder="Task specifications, poly targets, references..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text mb-1">
                    Milestone
                  </label>
                  <select
                    value={taskForm.milestoneId}
                    onChange={(e) => setTaskForm({ ...taskForm, milestoneId: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
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
                  <label className="block text-xs font-medium text-text mb-1">
                    Assign Artist
                  </label>
                  <select
                    value={taskForm.assignedTo}
                    onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
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
                  <label className="block text-xs font-medium text-text mb-1">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  >
                    <option value="Low">Low</option>
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text mb-1">
                    Story Points
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={taskForm.storyPoints}
                    onChange={(e) => setTaskForm({ ...taskForm, storyPoints: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text mb-1">
                    Est. Hours
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={taskForm.estimatedHours}
                    onChange={(e) => setTaskForm({ ...taskForm, estimatedHours: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-1">Due Date</label>
                <input
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="pt-3 border-t border-border flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateTaskModal(false)}
                  className="rounded-[8px]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || !taskForm.title}
                  className="rounded-[8px] bg-accent hover:bg-accent-hover text-white flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.75} />}
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
