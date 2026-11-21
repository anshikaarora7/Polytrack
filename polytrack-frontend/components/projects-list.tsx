'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Search,
  FolderOpen,
  Calendar,
  Users,
  Loader2,
  AlertCircle,
  Clock,
  ArrowUpRight,
} from 'lucide-react';

export default function ProjectsList() {
  const { data: projectsData, mutate, isLoading } = useSWR('projects', () => apiClient.getProjects());
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    projectCode: '',
    projectType: 'Environment',
    priority: 'Normal',
    budgetAmount: 15000,
    startDate: '',
    endDate: '',
  });

  const projects = projectsData?.data || [];
  const filteredProjects = projects.filter((p: any) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.projectCode && p.projectCode.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStatusDot = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-success';
      case 'planning':
      case 'completed':
        return 'bg-info';
      case 'draft':
      case 'onhold':
        return 'bg-warning';
      case 'cancelled':
        return 'bg-danger';
      default:
        return 'bg-text-muted';
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;
    setIsSubmitting(true);
    try {
      await apiClient.createProject({
        name: form.name,
        description: form.description || undefined,
        projectCode: form.projectCode || undefined,
        projectType: form.projectType,
        priority: form.priority,
        budgetAmount: Number(form.budgetAmount),
        startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
      });
      setShowCreateModal(false);
      setForm({
        name: '',
        description: '',
        projectCode: '',
        projectType: 'Environment',
        priority: 'Normal',
        budgetAmount: 15000,
        startDate: '',
        endDate: '',
      });
      mutate();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.01em] text-text">Projects</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Manage production milestones, budgets, and track team progress
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="rounded-[8px] bg-accent hover:bg-accent-hover text-white flex items-center gap-1.5 text-sm h-9 px-3.5 shadow-none"
        >
          <Plus className="w-4 h-4" strokeWidth={1.75} />
          <span>New Project</span>
        </Button>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Search projects by name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-surface border border-border rounded-[8px] text-text placeholder:text-text-muted text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="p-5 border border-border bg-surface rounded-[12px] animate-pulse">
                <div className="space-y-3">
                  <div className="h-5 bg-surface-2 rounded-[8px] w-3/4" />
                  <div className="h-3.5 bg-surface-2 rounded-[8px] w-full" />
                  <div className="h-3.5 bg-surface-2 rounded-[8px] w-2/3" />
                </div>
              </Card>
            ))}
          </>
        ) : filteredProjects.length > 0 ? (
          filteredProjects.map((project: any) => {
            const sKey = (project.status || '').toLowerCase();

            return (
              <Link key={project.id} href={`/dashboard/projects/${project.id}`} className="block group">
                <Card className="p-5 border border-border bg-surface hover:border-accent/40 rounded-[12px] transition-all cursor-pointer shadow-[var(--shadow-pop)] h-full flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-text group-hover:text-accent transition-colors truncate">
                            {project.name}
                          </h3>
                          <ArrowUpRight className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" strokeWidth={1.75} />
                        </div>
                        {project.projectCode && (
                          <span className="text-xs font-mono text-text-muted">
                            {project.projectCode}
                          </span>
                        )}
                        <p className="text-xs text-text-muted mt-1 line-clamp-2">
                          {project.description || (project.clientName ? `Client: ${project.clientName}` : 'Production Project')}
                        </p>
                      </div>

                      {/* Linear Status Dot */}
                      <div className="flex items-center gap-1.5 shrink-0 px-2 py-0.5 rounded-[8px] bg-surface-2 border border-border text-xs text-text-muted font-medium">
                        <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(sKey)}`} />
                        <span className="capitalize">{project.status || 'Active'}</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5 text-xs">
                        <span className="text-text-muted">Progress</span>
                        <span className="font-medium text-text tabular-nums">
                          {project.completionPercent || 0}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden border border-border/50">
                        <div
                          className="h-full bg-accent transition-all duration-300"
                          style={{ width: `${project.completionPercent || 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Meta Info */}
                    <div className="flex items-center justify-between text-xs text-text-muted pt-3 border-t border-border">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" strokeWidth={1.75} />
                        <span>
                          {project.endDate
                            ? new Date(project.endDate).toLocaleDateString()
                            : 'No deadline'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" strokeWidth={1.75} />
                        <span className="tabular-nums">{project.taskCount || 0} tasks</span>
                      </div>
                      <div className="font-medium text-text-muted capitalize">
                        {project.priority || 'Normal'}
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })
        ) : (
          <div className="col-span-full text-center py-12 border border-dashed border-border rounded-[12px] bg-surface-2/30">
            <FolderOpen className="w-10 h-10 text-text-muted mx-auto mb-2 opacity-50" strokeWidth={1.75} />
            <p className="text-sm font-medium text-text">No projects found</p>
            <p className="text-xs text-text-muted mt-1">Create a new project to start tracking production milestones.</p>
          </div>
        )}
      </div>

      {/* Modal: Create Project */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-5 bg-surface border border-border rounded-[12px] shadow-[var(--shadow-pop)]">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-base font-semibold text-text flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-accent" strokeWidth={1.75} />
                Create New Project
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-text-muted hover:text-text text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4 mt-4 text-sm">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-text mb-1">
                    Project Name *
                  </label>
                  <input
                    required
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                    placeholder="e.g. Cyberpunk Alley Scene"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text mb-1">
                    Code
                  </label>
                  <input
                    type="text"
                    value={form.projectCode}
                    onChange={(e) => setForm({ ...form, projectCode: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                    placeholder="e.g. CAS"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm resize-none focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  placeholder="Project scope and goals..."
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text mb-1">
                    Type
                  </label>
                  <select
                    value={form.projectType}
                    onChange={(e) => setForm({ ...form, projectType: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  >
                    <option value="Environment">Environment</option>
                    <option value="Character">Character</option>
                    <option value="Prop">Prop</option>
                    <option value="Animation">Animation</option>
                    <option value="Vfx">VFX</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text mb-1">
                    Priority
                  </label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
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
                    Budget ($)
                  </label>
                  <input
                    type="number"
                    value={form.budgetAmount}
                    onChange={(e) => setForm({ ...form, budgetAmount: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-3 py-1.5 bg-surface border border-border rounded-[8px] text-text text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-border flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-[8px] border-border text-text hover:bg-surface-2"
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
                  Create Project
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
