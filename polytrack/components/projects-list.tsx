'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Search, Filter, FolderOpen, Calendar, Users, Loader2 } from 'lucide-react';

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

  const statusColors: Record<string, string> = {
    active: 'bg-emerald-500/20 text-emerald-400',
    planning: 'bg-blue-500/20 text-blue-400',
    draft: 'bg-yellow-500/20 text-yellow-400',
    completed: 'bg-blue-500/20 text-blue-400',
    onhold: 'bg-amber-500/20 text-amber-400',
    cancelled: 'bg-red-500/20 text-red-400',
  };

  const priorityColors: Record<string, string> = {
    critical: 'text-destructive',
    high: 'text-destructive',
    normal: 'text-foreground',
    medium: 'text-yellow-500',
    low: 'text-emerald-500',
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
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground mt-1">Manage and track all production projects & milestones</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Project
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search projects by name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
          />
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="p-6 border-border/50 bg-card/50 animate-pulse">
                <div className="space-y-3">
                  <div className="h-6 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-full" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </div>
              </Card>
            ))}
          </>
        ) : filteredProjects.length > 0 ? (
          filteredProjects.map((project: any) => {
            const sKey = (project.status || '').toLowerCase();
            const pKey = (project.priority || '').toLowerCase();

            return (
              <Link key={project.id} href={`/dashboard/projects/${project.id}`} className="block">
                <Card className="p-6 border-border/50 bg-card/50 hover:border-primary/50 transition-all cursor-pointer group h-full flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                            {project.name}
                          </h3>
                        </div>
                        {project.projectCode && (
                          <span className="text-xs font-mono text-muted-foreground">
                            {project.projectCode}
                          </span>
                        )}
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {project.description || (project.clientName ? `Client: ${project.clientName}` : 'Production Project')}
                        </p>
                      </div>
                      <div
                        className={`px-2 py-1 rounded text-xs font-medium shrink-0 ${
                          statusColors[sKey] || 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {project.status}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">Progress</span>
                        <span className="text-xs font-medium text-foreground">
                          {project.completionPercent || 0}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${project.completionPercent || 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Meta Info */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/30">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>
                          {project.endDate
                            ? new Date(project.endDate).toLocaleDateString()
                            : 'No deadline'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        <span>{project.taskCount || 0} tasks</span>
                      </div>
                      <div className={`${priorityColors[pKey] || 'text-muted-foreground'} font-medium`}>
                        {project.priority}
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })
        ) : (
          <div className="col-span-full text-center py-12">
            <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No projects found</p>
          </div>
        )}
      </div>

      {/* Modal: Create Project */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-lg p-6 bg-card border-border shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-primary" />
                Create New Project
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-muted-foreground hover:text-foreground text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4 mt-4 text-sm">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Project Name *
                  </label>
                  <input
                    required
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                    placeholder="e.g. Cyberpunk Alley Scene"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Code
                  </label>
                  <input
                    type="text"
                    value={form.projectCode}
                    onChange={(e) => setForm({ ...form, projectCode: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                    placeholder="e.g. CAS"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm resize-none"
                  placeholder="Project scope and goals..."
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Type
                  </label>
                  <select
                    value={form.projectType}
                    onChange={(e) => setForm({ ...form, projectType: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                  >
                    <option value="Environment">Environment</option>
                    <option value="Character">Character</option>
                    <option value="Prop">Prop</option>
                    <option value="Animation">Animation</option>
                    <option value="Vfx">VFX</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Priority
                  </label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm({ ...form, priority: e.target.value })}
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
                    Budget ($)
                  </label>
                  <input
                    type="number"
                    value={form.budgetAmount}
                    onChange={(e) => setForm({ ...form, budgetAmount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-input border border-border rounded-lg text-foreground text-sm"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-border flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
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
