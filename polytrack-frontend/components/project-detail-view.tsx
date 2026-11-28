'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient, formatApiError } from '@/lib/api-client';
import { Milestone, ProjectDetail } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ErrorWarningPage, ErrorWarningCard } from '@/components/ui/error-warning';
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Flag,
  Layers,
  Plus,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  AlertCircle,
  FileCheck,
  Loader2,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';

interface ProjectDetailViewProps {
  projectId: string;
}

export default function ProjectDetailView({ projectId }: ProjectDetailViewProps) {
  const router = useRouter();

  // Modals
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showCreateMilestoneModal, setShowCreateMilestoneModal] = useState(false);
  const [reviewingMilestone, setReviewingMilestone] = useState<Milestone | null>(null);

  // Forms
  const [memberUserId, setMemberUserId] = useState('');
  const [memberRole, setMemberRole] = useState('Artist');
  const [milestoneName, setMilestoneName] = useState('');
  const [milestoneDescription, setMilestoneDescription] = useState('');
  const [milestoneStartDate, setMilestoneStartDate] = useState('');
  const [milestoneEndDate, setMilestoneEndDate] = useState('');
  const [reviewApproved, setReviewApproved] = useState(true);
  const [reviewNotes, setReviewNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ title?: string; message: string; details?: string[] } | null>(null);

  // SWR fetches
  const {
    data: project,
    error: projectError,
    mutate: mutateProject,
    isLoading: loadingProject,
  } = useSWR<ProjectDetail>(`project-${projectId}`, () => apiClient.getProjectById(projectId));

  const {
    data: stats,
    mutate: mutateStats,
    isLoading: loadingStats,
  } = useSWR(`project-stats-${projectId}`, () => apiClient.getProjectStats(projectId));

  const {
    data: milestones,
    mutate: mutateMilestones,
    isLoading: loadingMilestones,
  } = useSWR<Milestone[]>(`project-milestones-${projectId}`, () =>
    apiClient.getMilestones(projectId)
  );

  const { data: usersData } = useSWR('users-list', () => apiClient.getUsers());
  const allUsers = usersData?.data || [];

  const getStatusDot = (status?: string) => {
    switch ((status || '').toLowerCase()) {
      case 'active':
      case 'approved':
      case 'completed':
        return 'bg-success';
      case 'planning':
      case 'submitted':
        return 'bg-info';
      case 'draft':
      case 'review':
      case 'onhold':
        return 'bg-warning';
      case 'rejected':
      case 'cancelled':
        return 'bg-danger';
      default:
        return 'bg-text-muted';
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberUserId) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await apiClient.addProjectMember(projectId, memberUserId, memberRole);
      setShowAddMemberModal(false);
      setMemberUserId('');
      mutateProject();
      setStatusMessage('Member successfully added to project');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setActionError(formatApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this team member from the project?')) return;
    setActionError(null);
    try {
      await apiClient.removeProjectMember(projectId, userId);
      mutateProject();
      setStatusMessage('Member removed');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setActionError(formatApiError(err));
    }
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestoneName) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await apiClient.createMilestone({
        projectId,
        name: milestoneName,
        description: milestoneDescription || undefined,
        startDate: milestoneStartDate ? new Date(milestoneStartDate).toISOString() : undefined,
        endDate: milestoneEndDate ? new Date(milestoneEndDate).toISOString() : undefined,
        sortOrder: (milestones?.length || 0) + 1,
      });
      setShowCreateMilestoneModal(false);
      setMilestoneName('');
      setMilestoneDescription('');
      setMilestoneStartDate('');
      setMilestoneEndDate('');
      mutateMilestones();
      mutateStats();
      mutateProject();
      setStatusMessage('Milestone created!');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setActionError(formatApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteMilestone = async (milestoneId: string) => {
    if (
      !confirm(
        'Marking milestone as Completed will auto-complete all remaining linked tasks. Proceed?'
      )
    )
      return;
    setActionError(null);
    try {
      await apiClient.updateMilestone(milestoneId, { status: 'Completed' });
      mutateMilestones();
      mutateStats();
      mutateProject();
      setStatusMessage('Milestone and linked tasks marked Completed!');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setActionError(formatApiError(err));
    }
  };

  const handleSubmitClientReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingMilestone) return;
    setIsSubmitting(true);
    setActionError(null);
    try {
      await apiClient.reviewMilestone(reviewingMilestone.id, reviewApproved, reviewNotes);
      setReviewingMilestone(null);
      setReviewNotes('');
      mutateMilestones();
      mutateStats();
      mutateProject();
      setStatusMessage(
        `Milestone ${reviewApproved ? 'Approved' : 'Rejected'} by client successfully!`
      );
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setActionError(formatApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingProject) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-accent" strokeWidth={1.75} />
      </div>
    );
  }

  if (projectError || !project) {
    const isForbidden = projectError?.response?.status === 403;
    return (
      <div className="py-8">
        <ErrorWarningCard
          statusCode={projectError?.response?.status || 404}
          title={isForbidden ? 'Project Access Denied' : 'Project Not Found'}
          message={
            projectError
              ? formatApiError(projectError).message
              : 'The requested studio project could not be found or has been archived.'
          }
          error={projectError}
          type={isForbidden ? 'forbidden' : 'not-found'}
          backUrl="/dashboard/projects"
          backLabel="Back to Projects"
          onRetry={() => mutateProject()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {actionError && (
        <div className="p-3 bg-danger/10 border border-danger/30 rounded-[8px] text-danger text-xs flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" strokeWidth={1.75} />
            <div>
              <p className="font-semibold">{actionError.title || 'Action Failed'}</p>
              <p>{actionError.message}</p>
              {actionError.details && actionError.details.length > 0 && (
                <ul className="mt-1 list-disc list-inside space-y-0.5">
                  {actionError.details.map((detail, idx) => (
                    <li key={idx}>{detail}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-danger hover:opacity-80 p-0.5 text-sm leading-none"
            aria-label="Dismiss error"
          >
            &times;
          </button>
        </div>
      )}

      {/* Back button & Title */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/projects"
          className="p-2 rounded-[8px] bg-surface border border-border text-text-muted hover:text-text transition-colors"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-[-0.01em] text-text">{project.name}</h1>
            {project.projectCode && (
              <span className="text-xs px-2 py-0.5 rounded-[8px] bg-surface-2 border border-border text-text-muted font-mono">
                {project.projectCode}
              </span>
            )}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[8px] bg-surface-2 border border-border text-xs text-text-muted font-medium">
              <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(project.status)}`} />
              <span className="capitalize">{project.status}</span>
            </div>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            {project.description || 'No description provided.'}
          </p>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-success/10 border border-success/30 rounded-[8px] text-success text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" strokeWidth={1.75} />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-surface border border-border rounded-[12px] shadow-[var(--shadow-pop)]">
          <span className="text-xs text-text-muted block">Overall Progress</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-semibold tracking-[-0.01em] text-text tabular-nums">
              {project.completionPercent || 0}%
            </span>
            <span className="text-xs text-text-muted tabular-nums">
              {stats?.completedTasks ?? 0}/{stats?.totalTasks ?? 0} Tasks
            </span>
          </div>
          <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden mt-2 border border-border/50">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${project.completionPercent || 0}%` }}
            />
          </div>
        </Card>

        <Card className="p-4 bg-surface border border-border rounded-[12px] shadow-[var(--shadow-pop)]">
          <span className="text-xs text-text-muted block">Milestones</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-semibold tracking-[-0.01em] text-text tabular-nums">
              {stats?.completedMilestones ?? 0}/{stats?.totalMilestones ?? 0}
            </span>
            <span className="text-xs text-success font-medium">Completed</span>
          </div>
        </Card>

        <Card className="p-4 bg-surface border border-border rounded-[12px] shadow-[var(--shadow-pop)]">
          <span className="text-xs text-text-muted block">Time Logged</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-semibold tracking-[-0.01em] text-text tabular-nums">
              {stats?.totalHoursLogged ? Number(stats.totalHoursLogged).toFixed(1) : 0}h
            </span>
            <span className="text-xs text-text-muted">Total Hours</span>
          </div>
        </Card>

        <Card className="p-4 bg-surface border border-border rounded-[12px] shadow-[var(--shadow-pop)]">
          <span className="text-xs text-text-muted block">Budget</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-semibold tracking-[-0.01em] text-text tabular-nums">
              {project.budgetAmount ? `$${project.budgetAmount.toLocaleString()}` : 'N/A'}
            </span>
            <span className="text-xs text-text-muted">{project.currency || 'USD'}</span>
          </div>
        </Card>
      </div>

      {/* Main Grid: Milestones & Team Members */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Milestones & Delivery Schedule */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-accent" strokeWidth={1.75} />
              <h2 className="text-base font-semibold text-text">Milestones & Client Reviews</h2>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/dashboard/tasks`}>
                <Button variant="outline" size="sm" className="rounded-[8px] text-xs flex items-center gap-1.5 h-8">
                  <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.75} />
                  View Kanban
                </Button>
              </Link>
              <Button
                size="sm"
                onClick={() => setShowCreateMilestoneModal(true)}
                className="rounded-[8px] bg-accent hover:bg-accent-hover text-white text-xs flex items-center gap-1.5 h-8 shadow-none"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={1.75} />
                Add Milestone
              </Button>
            </div>
          </div>

          {loadingMilestones ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-accent" strokeWidth={1.75} />
            </div>
          ) : !milestones || milestones.length === 0 ? (
            <Card className="p-8 text-center border border-dashed border-border rounded-[12px] bg-surface-2/30">
              <Layers className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-50" strokeWidth={1.75} />
              <p className="text-xs text-text-muted">No milestones created yet.</p>
              <Button
                size="sm"
                onClick={() => setShowCreateMilestoneModal(true)}
                className="mt-3 text-xs rounded-[8px] bg-accent text-white"
              >
                Create Milestone
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {milestones.map((m, idx) => {
                const isCompleted = m.status === 'Completed';

                return (
                  <Card
                    key={m.id}
                    className="p-4 bg-surface border border-border rounded-[12px] hover:border-accent/40 transition-colors shadow-[var(--shadow-pop)]"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-accent-tint text-accent text-xs flex items-center justify-center font-semibold">
                            {idx + 1}
                          </span>
                          <h3 className="font-semibold text-text text-sm">{m.name}</h3>
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[8px] bg-surface-2 border border-border text-[11px] text-text-muted font-medium">
                            <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(m.status)}`} />
                            <span className="capitalize">{m.status}</span>
                          </div>
                        </div>
                        {m.description && (
                          <p className="text-xs text-text-muted">{m.description}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-text-muted pt-1">
                          {m.endDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" strokeWidth={1.75} />
                              Target: {new Date(m.endDate).toLocaleDateString()}
                            </span>
                          )}
                          <span className="tabular-nums">
                            Progress: {m.completedTasks ?? 0}/{m.totalTasks ?? 0} tasks (
                            {m.completionPercent ?? 0}%)
                          </span>
                        </div>

                        {/* Client approval notes if present */}
                        {m.clientApproved !== null && m.clientApproved !== undefined && (
                          <div className="mt-2 p-2 rounded-[8px] bg-surface-2 border border-border text-xs flex items-start gap-2">
                            {m.clientApproved ? (
                              <FileCheck className="w-4 h-4 text-success shrink-0 mt-0.5" strokeWidth={1.75} />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" strokeWidth={1.75} />
                            )}
                            <div>
                              <span className="font-semibold text-text">
                                Client Review: {m.clientApproved ? 'Approved' : 'Rejected'}
                              </span>
                              {m.clientNotes && (
                                <p className="text-text-muted mt-0.5 italic">
                                  &quot;{m.clientNotes}&quot;
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Milestone Actions */}
                      <div className="flex items-center gap-2 self-end sm:self-start">
                        {!isCompleted && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCompleteMilestone(m.id)}
                            className="text-xs rounded-[8px] h-8 flex items-center gap-1 hover:bg-success/10 hover:text-success hover:border-success/30"
                          >
                            <Check className="w-3.5 h-3.5" strokeWidth={1.75} />
                            Complete
                          </Button>
                        )}

                        <Button
                          size="sm"
                          onClick={() => {
                            setReviewingMilestone(m);
                            setReviewApproved(true);
                            setReviewNotes('');
                          }}
                          className="rounded-[8px] bg-accent-tint text-accent hover:bg-accent hover:text-white border border-accent/20 text-xs h-8 flex items-center gap-1 transition-colors"
                        >
                          <FileCheck className="w-3.5 h-3.5" strokeWidth={1.75} />
                          Client Review
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Project Details & Team Members */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-accent" strokeWidth={1.75} />
              <h2 className="text-base font-semibold text-text">Project Team</h2>
            </div>
            <Button
              size="sm"
              onClick={() => setShowAddMemberModal(true)}
              className="rounded-[8px] bg-accent hover:bg-accent-hover text-white text-xs h-8 flex items-center gap-1.5 shadow-none"
            >
              <UserPlus className="w-3.5 h-3.5" strokeWidth={1.75} />
              Add Member
            </Button>
          </div>

          <Card className="p-4 bg-surface border border-border rounded-[12px] shadow-[var(--shadow-pop)] space-y-3">
            {/* PM & Client section */}
            <div className="space-y-2 pb-3 border-b border-border text-xs">
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Project Manager:</span>
                <span className="font-semibold text-text">
                  {project.projectManager?.name || 'Unassigned'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Client:</span>
                <span className="font-semibold text-text">
                  {project.client?.companyName || project.client?.name || 'Internal'}
                </span>
              </div>
            </div>

            {/* Members List */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-text block">Assigned Members:</span>
              {!project.members || project.members.length === 0 ? (
                <p className="text-xs text-text-muted">No members assigned yet.</p>
              ) : (
                project.members.map((member) => (
                  <div
                    key={member.userId}
                    className="flex items-center justify-between p-2 rounded-[8px] bg-surface-2 border border-border text-xs"
                  >
                    <div>
                      <span className="font-medium text-text block">{member.name}</span>
                      <span className="text-text-muted">
                        {member.roleInProject || member.role}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveMember(member.userId)}
                      className="p-1 hover:bg-danger/10 text-text-muted hover:text-danger rounded-[4px] transition-colors"
                      title="Remove member"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Modal: Add Team Member */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-5 bg-surface border border-border rounded-[12px] shadow-[var(--shadow-pop)]">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-base font-semibold text-text flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-accent" strokeWidth={1.75} />
                Add Member to Project
              </h2>
              <button
                onClick={() => setShowAddMemberModal(false)}
                className="text-text-muted hover:text-text text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4 mt-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-text mb-1">
                  Select User *
                </label>
                <select
                  required
                  value={memberUserId}
                  onChange={(e) => setMemberUserId(e.target.value)}
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                >
                  <option value="">Choose team member...</option>
                  {allUsers.map((u: any) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role}) - {u.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-1">
                  Role in Project
                </label>
                <input
                  type="text"
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  placeholder="e.g. Lead 3D Artist, Texture Artist, Rigger"
                />
              </div>

              <div className="pt-3 border-t border-border flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddMemberModal(false)}
                  className="rounded-[8px]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || !memberUserId}
                  className="rounded-[8px] bg-accent hover:bg-accent-hover text-white flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.75} />}
                  Add Member
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal: Create Milestone */}
      {showCreateMilestoneModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-5 bg-surface border border-border rounded-[12px] shadow-[var(--shadow-pop)]">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-base font-semibold text-text flex items-center gap-2">
                <Layers className="w-4 h-4 text-accent" strokeWidth={1.75} />
                Add Milestone
              </h2>
              <button
                onClick={() => setShowCreateMilestoneModal(false)}
                className="text-text-muted hover:text-text text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMilestone} className="space-y-4 mt-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-text mb-1">
                  Milestone Name *
                </label>
                <input
                  required
                  type="text"
                  value={milestoneName}
                  onChange={(e) => setMilestoneName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  placeholder="e.g. Phase 1: Blockout & Grayboxing"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={milestoneDescription}
                  onChange={(e) => setMilestoneDescription(e.target.value)}
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm resize-none focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  placeholder="Scope or acceptance criteria for this milestone..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={milestoneStartDate}
                    onChange={(e) => setMilestoneStartDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text mb-1">
                    Target End Date
                  </label>
                  <input
                    type="date"
                    value={milestoneEndDate}
                    onChange={(e) => setMilestoneEndDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-border flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateMilestoneModal(false)}
                  className="rounded-[8px]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || !milestoneName}
                  className="rounded-[8px] bg-accent hover:bg-accent-hover text-white flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.75} />}
                  Create Milestone
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal: Client Review */}
      {reviewingMilestone && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-5 bg-surface border border-border rounded-[12px] shadow-[var(--shadow-pop)]">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-base font-semibold text-text flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-accent" strokeWidth={1.75} />
                Client Milestone Review
              </h2>
              <button
                onClick={() => setReviewingMilestone(null)}
                className="text-text-muted hover:text-text text-sm p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-text-muted mt-2">
              Reviewing: <span className="font-semibold text-text">{reviewingMilestone.name}</span>
            </p>

            <form onSubmit={handleSubmitClientReview} className="space-y-4 mt-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-text mb-2">Decision</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setReviewApproved(true)}
                    className={`py-2 px-3 rounded-[8px] border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      reviewApproved
                        ? 'bg-success text-white border-success'
                        : 'bg-surface border-border text-text-muted hover:text-text'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" strokeWidth={1.75} />
                    Approve Milestone
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewApproved(false)}
                    className={`py-2 px-3 rounded-[8px] border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                      !reviewApproved
                        ? 'bg-danger text-white border-danger'
                        : 'bg-surface border-border text-text-muted hover:text-text'
                    }`}
                  >
                    <X className="w-3.5 h-3.5" strokeWidth={1.75} />
                    Reject with Notes
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-1">
                  Client Feedback Notes
                </label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm resize-none focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  placeholder="Enter feedback or revision comments..."
                />
              </div>

              <div className="pt-3 border-t border-border flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setReviewingMilestone(null)}
                  className="rounded-[8px]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="rounded-[8px] bg-accent hover:bg-accent-hover text-white flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={1.75} />}
                  Submit Decision
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
