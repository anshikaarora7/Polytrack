'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Milestone, ProjectDetail } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberUserId) return;
    setIsSubmitting(true);
    try {
      await apiClient.addProjectMember(projectId, memberUserId, memberRole);
      setShowAddMemberModal(false);
      setMemberUserId('');
      mutateProject();
      setStatusMessage('Member successfully added to project');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this team member from the project?')) return;
    try {
      await apiClient.removeProjectMember(projectId, userId);
      mutateProject();
      setStatusMessage('Member removed');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const handleCreateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestoneName) return;
    setIsSubmitting(true);
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
      alert(err.response?.data?.message || 'Failed to create milestone');
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
    try {
      await apiClient.updateMilestone(milestoneId, { status: 'Completed' });
      mutateMilestones();
      mutateStats();
      mutateProject();
      setStatusMessage('Milestone and linked tasks marked Completed!');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to complete milestone');
    }
  };

  const handleSubmitClientReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingMilestone) return;
    setIsSubmitting(true);
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
      alert(err.response?.data?.message || 'Failed to submit client review');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingProject) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
        <h2 className="text-xl font-bold text-foreground">Project Not Found</h2>
        <p className="text-muted-foreground">The requested project could not be found or loaded.</p>
        <Link href="/dashboard/projects">
          <Button variant="outline">Back to Projects</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Back button & Title */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/projects"
          className="p-2 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
            {project.projectCode && (
              <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                {project.projectCode}
              </span>
            )}
            <span className="text-xs px-2 py-0.5 rounded bg-primary/20 text-primary font-medium">
              {project.status}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {project.description || 'No description provided.'}
          </p>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-card/60 border-border/60">
          <span className="text-xs text-muted-foreground block">Overall Progress</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-foreground">
              {project.completionPercent || 0}%
            </span>
            <span className="text-xs text-muted-foreground">
              {stats?.completedTasks ?? 0}/{stats?.totalTasks ?? 0} Tasks
            </span>
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${project.completionPercent || 0}%` }}
            />
          </div>
        </Card>

        <Card className="p-4 bg-card/60 border-border/60">
          <span className="text-xs text-muted-foreground block">Milestones</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-foreground">
              {stats?.completedMilestones ?? 0}/{stats?.totalMilestones ?? 0}
            </span>
            <span className="text-xs text-emerald-400">Completed</span>
          </div>
        </Card>

        <Card className="p-4 bg-card/60 border-border/60">
          <span className="text-xs text-muted-foreground block">Time Logged</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-foreground">
              {stats?.totalHoursLogged ? Number(stats.totalHoursLogged).toFixed(1) : 0}h
            </span>
            <span className="text-xs text-muted-foreground">Total Hours</span>
          </div>
        </Card>

        <Card className="p-4 bg-card/60 border-border/60">
          <span className="text-xs text-muted-foreground block">Budget</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-bold text-foreground">
              {project.budgetAmount ? `$${project.budgetAmount.toLocaleString()}` : 'N/A'}
            </span>
            <span className="text-xs text-muted-foreground">{project.currency || 'USD'}</span>
          </div>
        </Card>
      </div>

      {/* Main Grid: Milestones & Team Members */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Milestones & Delivery Schedule */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Milestones & Client Reviews</h2>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/dashboard/tasks`}>
                <Button variant="outline" size="sm" className="text-xs flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Kanban
                </Button>
              </Link>
              <Button
                size="sm"
                onClick={() => setShowCreateMilestoneModal(true)}
                className="bg-primary text-primary-foreground text-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Milestone
              </Button>
            </div>
          </div>

          {loadingMilestones ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : !milestones || milestones.length === 0 ? (
            <Card className="p-8 text-center border-border/50 bg-card/40">
              <Layers className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No milestones created yet.</p>
              <Button
                size="sm"
                onClick={() => setShowCreateMilestoneModal(true)}
                className="mt-3 text-xs bg-primary text-primary-foreground"
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
                    className="p-4 bg-card/60 border-border/60 hover:border-border transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold">
                            {idx + 1}
                          </span>
                          <h3 className="font-semibold text-foreground text-sm">{m.name}</h3>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                              isCompleted
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : m.status === 'Rejected'
                                ? 'bg-destructive/20 text-destructive'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {m.status}
                          </span>
                        </div>
                        {m.description && (
                          <p className="text-xs text-muted-foreground">{m.description}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-1">
                          {m.endDate && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Target: {new Date(m.endDate).toLocaleDateString()}
                            </span>
                          )}
                          <span>
                            Progress: {m.completedTasks ?? 0}/{m.totalTasks ?? 0} tasks (
                            {m.completionPercent ?? 0}%)
                          </span>
                        </div>

                        {/* Client approval notes if present */}
                        {m.clientApproved !== null && m.clientApproved !== undefined && (
                          <div className="mt-2 p-2 rounded bg-muted/40 border border-border/30 text-xs flex items-start gap-2">
                            {m.clientApproved ? (
                              <FileCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                            )}
                            <div>
                              <span className="font-semibold text-foreground">
                                Client Review: {m.clientApproved ? 'Approved' : 'Rejected'}
                              </span>
                              {m.clientNotes && (
                                <p className="text-muted-foreground mt-0.5 italic">
                                  "{m.clientNotes}"
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
                            className="text-xs flex items-center gap-1 hover:bg-emerald-500/10 hover:text-emerald-400"
                          >
                            <Check className="w-3.5 h-3.5" />
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
                          className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 text-xs flex items-center gap-1"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
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
              <Users className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Project Team</h2>
            </div>
            <Button
              size="sm"
              onClick={() => setShowAddMemberModal(true)}
              className="bg-primary text-primary-foreground text-xs flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add Member
            </Button>
          </div>

          <Card className="p-4 bg-card/60 border-border/60 space-y-3">
            {/* PM & Client section */}
            <div className="space-y-2 pb-3 border-b border-border/40 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Project Manager:</span>
                <span className="font-semibold text-foreground">
                  {project.projectManager?.name || 'Unassigned'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Client:</span>
                <span className="font-semibold text-foreground">
                  {project.client?.companyName || project.client?.name || 'Internal'}
                </span>
              </div>
            </div>

            {/* Members List */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-foreground block">Assigned Members:</span>
              {!project.members || project.members.length === 0 ? (
                <p className="text-xs text-muted-foreground">No members assigned yet.</p>
              ) : (
                project.members.map((member) => (
                  <div
                    key={member.userId}
                    className="flex items-center justify-between p-2 rounded-lg bg-card/80 border border-border/40 text-xs"
                  >
                    <div>
                      <span className="font-medium text-foreground block">{member.name}</span>
                      <span className="text-muted-foreground">
                        {member.roleInProject || member.role}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveMember(member.userId)}
                      className="p-1 hover:bg-destructive/20 text-muted-foreground hover:text-destructive rounded transition-colors"
                      title="Remove member"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 bg-card border-border shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-primary" />
                Add Member to Project
              </h2>
              <button
                onClick={() => setShowAddMemberModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4 mt-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Select User *
                </label>
                <select
                  required
                  value={memberUserId}
                  onChange={(e) => setMemberUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
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
                <label className="block text-xs font-medium text-foreground mb-1">
                  Role in Project
                </label>
                <input
                  type="text"
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                  placeholder="e.g. Lead 3D Artist, Texture Artist, Rigger"
                />
              </div>

              <div className="pt-3 border-t border-border flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddMemberModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || !memberUserId}
                  className="bg-primary text-primary-foreground flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Add Member
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal: Create Milestone */}
      {showCreateMilestoneModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 bg-card border-border shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                Add Milestone
              </h2>
              <button
                onClick={() => setShowCreateMilestoneModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateMilestone} className="space-y-4 mt-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Milestone Name *
                </label>
                <input
                  required
                  type="text"
                  value={milestoneName}
                  onChange={(e) => setMilestoneName(e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                  placeholder="e.g. Phase 1: Blockout & Grayboxing"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={milestoneDescription}
                  onChange={(e) => setMilestoneDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm resize-none"
                  placeholder="Scope or acceptance criteria for this milestone..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={milestoneStartDate}
                    onChange={(e) => setMilestoneStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Target End Date
                  </label>
                  <input
                    type="date"
                    value={milestoneEndDate}
                    onChange={(e) => setMilestoneEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-border flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateMilestoneModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting || !milestoneName}
                  className="bg-primary text-primary-foreground flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Milestone
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal: Client Review */}
      {reviewingMilestone && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 bg-card border-border shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-primary" />
                Client Milestone Review
              </h2>
              <button
                onClick={() => setReviewingMilestone(null)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              Reviewing: <span className="font-semibold text-foreground">{reviewingMilestone.name}</span>
            </p>

            <form onSubmit={handleSubmitClientReview} className="space-y-4 mt-4 text-sm">
              <div>
                <label className="block text-xs font-medium text-foreground mb-2">Decision</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setReviewApproved(true)}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      reviewApproved
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-card border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    Approve Milestone
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewApproved(false)}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      !reviewApproved
                        ? 'bg-destructive text-white border-destructive'
                        : 'bg-card border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <X className="w-4 h-4" />
                    Reject with Notes
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Client Feedback Notes
                </label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm resize-none"
                  placeholder="Enter feedback or revision comments..."
                />
              </div>

              <div className="pt-3 border-t border-border flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setReviewingMilestone(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmitting}
                  className="bg-primary text-primary-foreground flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
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
