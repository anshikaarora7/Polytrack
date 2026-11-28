'use client';

import React, { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { apiClient, formatApiError } from '@/lib/api-client';
import { ErrorWarningCard } from '@/components/ui/error-warning';
import AssetTurntableModal from '@/components/asset-turntable-modal';
import PipelineFlow from '@/components/PipelineFlow';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  FolderOpen,
  CheckSquare,
  Image as ImageIcon,
  Clock,
  Calendar,
  ArrowRight,
  Box,
  Rotate3d,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import type { DashboardStats, Activity, ProjectProgress, Deadline } from '@/lib/types';

// Subtle Wireframe Mesh in Dashboard Header
function HeaderMeshCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let angle = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'currentColor';
      ctx.lineWidth = 0.75;

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const size = 36;
      angle += 0.008;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);

      // Draw subtle rotating wireframe isometric cube
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const rad = (i * Math.PI) / 3;
        const x = Math.cos(rad) * size;
        const y = Math.sin(rad) * size;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();

      // Inner connecting lines
      ctx.beginPath();
      for (let i = 0; i < 6; i += 2) {
        const rad = (i * Math.PI) / 3;
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(rad) * size, Math.sin(rad) * size);
      }
      ctx.stroke();

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={90}
      height={90}
      className="w-[70px] h-[70px] text-accent opacity-25 pointer-events-none shrink-0"
    />
  );
}

// Fast Linear-style Count Up (200ms easeOut)
function CountUpNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState<number>(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 200; // Fast 200ms
    const startVal = 0;
    const endVal = value;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 2);
      setDisplayValue(Math.round(startVal + (endVal - startVal) * eased));
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }, [value]);

  return <span className="tabular-nums font-semibold">{displayValue.toLocaleString()}{suffix}</span>;
}

// Status dot configuration per theme direction
const STATUS_DOTS: Record<string, { dotClass: string; label: string }> = {
  draft: { dotClass: 'bg-text-muted', label: 'Draft' },
  submitted: { dotClass: 'bg-info', label: 'Submitted' },
  review: { dotClass: 'bg-warning', label: 'In Review' },
  approved: { dotClass: 'bg-success', label: 'Approved' },
  rejected: { dotClass: 'bg-danger', label: 'Rejected' },
};

export default function DashboardOverview() {
  const [turntableAsset, setTurntableAsset] = useState<any | null>(null);

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    mutate: mutateStats,
  } = useSWR<DashboardStats>('dashboard-stats', () => apiClient.getDashboardStats());
  const { data: activity } = useSWR<Activity[]>('dashboard-activity', () => apiClient.getDashboardActivity());
  const { data: projectsProgress } = useSWR<ProjectProgress[]>(
    'dashboard-projects-progress',
    () => apiClient.getProjectsProgress()
  );
  const { data: deadlines } = useSWR<Deadline[]>('dashboard-upcoming-deadlines', () =>
    apiClient.getUpcomingDeadlines()
  );
  const { data: recentAssets } = useSWR('dashboard-recent-assets', () => apiClient.getRecentAssets(6));
  const { data: timesheetsData } = useSWR('dashboard-timesheets', () => apiClient.getTimesheets());

  const progressItems: ProjectProgress[] = Array.isArray(projectsProgress) ? projectsProgress : [];
  const deadlineItems: Deadline[] = Array.isArray(deadlines) ? deadlines : [];
  const assetItems: any[] = Array.isArray(recentAssets) ? recentAssets : [];
  const timesheetTasks: any[] = timesheetsData?.tasks || [];

  const chartData = progressItems.slice(0, 5).map((p: ProjectProgress) => ({
    name: p.name,
    completion: p.completionPercent ?? 0,
  }));

  const parsedError = statsError ? formatApiError(statsError) : null;

  return (
    <div className="space-y-6">
      {/* 3D Turntable Modal */}
      {turntableAsset && (
        <AssetTurntableModal
          asset={turntableAsset}
          onClose={() => setTurntableAsset(null)}
        />
      )}

      {/* Backend / API Warning Alert if stats request failed */}
      {parsedError && (
        <ErrorWarningCard
          type={parsedError.type}
          statusCode={parsedError.statusCode}
          title={parsedError.title}
          message={parsedError.message}
          error={statsError}
          onRetry={() => mutateStats()}
          showDashboardLink={false}
          showBackLink={false}
        />
      )}

      {/* Hero Summary Card with Quiet Wireframe Accent & 3D Tilt */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="rounded-[12px] border border-border bg-surface p-5 shadow-[var(--shadow-pop)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden"
      >
        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <h1 className="text-[24px] font-semibold text-text tracking-[-0.01em]">
              Production Overview
            </h1>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-[6px] bg-accent-tint text-accent border border-border">
              Studio Live
            </span>
          </div>
          <p className="text-[14px] text-text-secondary leading-relaxed">
            Active milestones, 3D asset revisions, and weekly workloads across your studio pipelines.
          </p>
        </div>

        <div className="flex items-center gap-3 relative z-10 shrink-0">
          <Link
            href="/dashboard/tasks"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 h-8 rounded-[8px] bg-accent hover:bg-accent-hover text-white text-[13px] font-medium transition-colors shadow-sm"
          >
            <CheckSquare className="w-4 h-4" strokeWidth={1.75} />
            <span>Open Kanban</span>
          </Link>
          <HeaderMeshCanvas />
        </div>
      </motion.div>

      {/* 1. Stat Cards Grid (12px rounded cards, 1px hairlines) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Projects */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut', delay: 0.02 }}
          className="rounded-[12px] border border-border bg-surface p-4 shadow-[var(--shadow-pop)] flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <span className="text-[12px] font-medium text-text-muted">Total Projects</span>
            <FolderOpen className="w-4 h-4 text-accent" strokeWidth={1.75} />
          </div>
          <div className="mt-3">
            {statsLoading ? (
              <Loader2 className="w-5 h-5 text-text-muted animate-spin" />
            ) : (
              <div className="text-[24px] font-semibold text-text tabular-nums leading-none">
                <CountUpNumber value={stats?.totalProjects || 0} />
              </div>
            )}
            <p className="text-[12px] text-text-muted mt-2">Active production records</p>
          </div>
        </motion.div>

        {/* Total Tasks */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut', delay: 0.05 }}
          className="rounded-[12px] border border-border bg-surface p-4 shadow-[var(--shadow-pop)] flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <span className="text-[12px] font-medium text-text-muted">Total Tasks</span>
            <CheckSquare className="w-4 h-4 text-info" strokeWidth={1.75} />
          </div>
          <div className="mt-3">
            {statsLoading ? (
              <Loader2 className="w-5 h-5 text-text-muted animate-spin" />
            ) : (
              <div className="text-[24px] font-semibold text-text tabular-nums leading-none">
                <CountUpNumber value={stats?.totalTasks || 0} />
              </div>
            )}
            <div className="flex items-center gap-1.5 mt-2 text-[12px] text-text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              <span>{stats?.completedTasks || 0} completed</span>
            </div>
          </div>
        </motion.div>

        {/* Total 3D Assets */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut', delay: 0.08 }}
          className="rounded-[12px] border border-border bg-surface p-4 shadow-[var(--shadow-pop)] flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <span className="text-[12px] font-medium text-text-muted">3D Asset Library</span>
            <ImageIcon className="w-4 h-4 text-accent" strokeWidth={1.75} />
          </div>
          <div className="mt-3">
            {statsLoading ? (
              <Loader2 className="w-5 h-5 text-text-muted animate-spin" />
            ) : (
              <div className="text-[24px] font-semibold text-text tabular-nums leading-none">
                <CountUpNumber value={stats?.totalAssets || 0} />
              </div>
            )}
            <div className="flex items-center gap-1.5 mt-2 text-[12px] text-text-muted">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              <span>{stats?.approvedAssets || 0} approved for engine</span>
            </div>
          </div>
        </motion.div>

        {/* Logged Hours */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut', delay: 0.11 }}
          className="rounded-[12px] border border-border bg-surface p-4 shadow-[var(--shadow-pop)] flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <span className="text-[12px] font-medium text-text-muted">Weekly Logged Time</span>
            <Clock className="w-4 h-4 text-warning" strokeWidth={1.75} />
          </div>
          <div className="mt-3">
            {statsLoading ? (
              <Loader2 className="w-5 h-5 text-text-muted animate-spin" />
            ) : (
              <div className="text-[24px] font-semibold text-text tabular-nums leading-none">
                <CountUpNumber value={Math.round(stats?.totalHoursThisWeek || 0)} suffix="h" />
              </div>
            )}
            <p className="text-[12px] text-text-muted mt-2">
              Month: <span className="text-text font-medium">{stats?.totalHoursThisMonth || 0}h</span>
            </p>
          </div>
        </motion.div>
      </div>

      {/* 2. Pipeline Flow Visualization */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut', delay: 0.14 }}
      >
        <PipelineFlow currentStage="Review" compact={true} />
      </motion.div>

      {/* 3. Charts & Upcoming Deadlines Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Project Progress Chart */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut', delay: 0.16 }}
          className="lg:col-span-2 rounded-[12px] border border-border bg-surface p-5 shadow-[var(--shadow-pop)]"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[16px] font-semibold text-text">Project Progress</h2>
              <p className="text-[12px] text-text-muted">Active completion percentages</p>
            </div>
            <Link
              href="/dashboard/projects"
              className="text-[12px] font-medium text-accent hover:text-accent-hover flex items-center gap-1"
            >
              View all <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.75} />
            </Link>
          </div>

          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.6} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip
                  cursor={{ fill: 'var(--surface-2)', opacity: 0.5 }}
                  contentStyle={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border)',
                    borderRadius: '8px',
                    boxShadow: 'var(--shadow-pop)',
                    fontSize: '12px',
                    color: 'var(--text)',
                  }}
                  formatter={(val: any) => [`${val}%`, 'Progress']}
                />
                <Bar dataKey="completion" fill="var(--accent)" radius={[4, 4, 0, 0]} barSize={28} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-56 flex items-center justify-center text-xs text-text-muted">
              No project records available
            </div>
          )}
        </motion.div>

        {/* Upcoming Deadlines */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut', delay: 0.18 }}
          className="rounded-[12px] border border-border bg-surface p-5 shadow-[var(--shadow-pop)] flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-semibold text-text">Upcoming Deadlines</h2>
              <span className="text-[11px] font-mono text-text-muted">7 Days</span>
            </div>

            <div className="space-y-3">
              {deadlineItems.slice(0, 5).map((deadline: Deadline) => (
                <div
                  key={deadline.id}
                  className="flex items-start justify-between gap-2.5 pb-2.5 border-b border-border last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-text truncate">{deadline.title}</p>
                    <p className="text-[11px] text-text-muted truncate">{deadline.projectName}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`text-[11px] font-mono font-medium ${
                        deadline.daysRemaining <= 1 ? 'text-danger font-semibold' : 'text-text-muted'
                      }`}
                    >
                      {deadline.daysRemaining === 0 ? 'Due today' : `${deadline.daysRemaining}d left`}
                    </span>
                  </div>
                </div>
              ))}

              {!deadlineItems.length && (
                <p className="text-xs text-text-muted text-center py-10">No deadlines in the next 7 days</p>
              )}
            </div>
          </div>

          <Link
            href="/dashboard/tasks"
            className="pt-3 text-[12px] text-text-muted hover:text-text flex items-center justify-center gap-1 border-t border-border mt-2"
          >
            <span>View Kanban timeline</span>
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
          </Link>
        </motion.div>
      </div>

      {/* 4. Recent 3D Assets (Clean Table & Dot Statuses) */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut', delay: 0.2 }}
        className="rounded-[12px] border border-border bg-surface p-5 shadow-[var(--shadow-pop)]"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[16px] font-semibold text-text">Recent 3D Assets</h2>
            <p className="text-[12px] text-text-muted">
              Models, rigs, and props updated across production
            </p>
          </div>
          <Link
            href="/dashboard/assets"
            className="text-[12px] font-medium text-accent hover:text-accent-hover flex items-center gap-1"
          >
            All assets <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.75} />
          </Link>
        </div>

        {assetItems.length > 0 ? (
          <div className="border border-border rounded-[8px] overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-surface-2 border-b border-border text-text-muted">
                <tr>
                  <th className="p-2.5 font-medium">Asset Name</th>
                  <th className="p-2.5 font-medium">Project</th>
                  <th className="p-2.5 font-medium">Category</th>
                  <th className="p-2.5 font-medium">Status</th>
                  <th className="p-2.5 font-medium">Updated</th>
                  <th className="p-2.5 text-right font-medium">Inspection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {assetItems.map((asset: any) => {
                  const sKey = (asset.status || 'draft').toLowerCase();
                  const dotInfo = STATUS_DOTS[sKey] || STATUS_DOTS['draft'];

                  return (
                    <tr key={asset.id} className="hover:bg-surface-2/60 transition-colors">
                      <td className="p-2.5 font-medium text-text flex items-center gap-2">
                        <Box className="w-3.5 h-3.5 text-text-muted shrink-0" strokeWidth={1.75} />
                        <span className="truncate">{asset.name}</span>
                      </td>
                      <td className="p-2.5 text-text-secondary truncate">{asset.projectName}</td>
                      <td className="p-2.5 text-text-muted font-mono text-[11px]">{asset.category}</td>
                      <td className="p-2.5">
                        <div className="inline-flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${dotInfo.dotClass}`} />
                          <span className="text-[12px] text-text capitalize">{dotInfo.label}</span>
                        </div>
                      </td>
                      <td className="p-2.5 text-text-muted font-mono text-[11px]">
                        {new Date(asset.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="p-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => setTurntableAsset(asset)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-[6px] border border-border bg-surface hover:bg-surface-2 text-[11px] font-medium text-text transition-colors"
                        >
                          <Rotate3d className="w-3 h-3 text-accent" strokeWidth={1.75} />
                          <span>Inspect 3D</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-xs text-text-muted border border-dashed border-border rounded-[8px]">
            No 3D assets recorded yet
          </div>
        )}
      </motion.div>

      {/* 5. Weekly Timesheet Summary */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut', delay: 0.22 }}
        className="rounded-[12px] border border-border bg-surface p-5 shadow-[var(--shadow-pop)] space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[16px] font-semibold text-text">Weekly Timesheet & Workload</h2>
            <p className="text-[12px] text-text-muted">
              Logged artist hours across production tasks this week (Total: <span className="font-semibold text-text tabular-nums">{timesheetsData?.totalHours || 0}h</span>)
            </p>
          </div>
          <Link
            href="/dashboard/tasks"
            className="text-[12px] font-medium text-accent hover:text-accent-hover flex items-center gap-1"
          >
            Log in Kanban <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.75} />
          </Link>
        </div>

        {timesheetTasks.length > 0 ? (
          <div className="border border-border rounded-[8px] overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-surface-2 border-b border-border text-text-muted">
                <tr>
                  <th className="p-2.5 font-medium">Task</th>
                  <th className="p-2.5 font-medium">Project</th>
                  <th className="p-2.5 text-center font-medium">Sun</th>
                  <th className="p-2.5 text-center font-medium">Mon</th>
                  <th className="p-2.5 text-center font-medium">Tue</th>
                  <th className="p-2.5 text-center font-medium">Wed</th>
                  <th className="p-2.5 text-center font-medium">Thu</th>
                  <th className="p-2.5 text-center font-medium">Fri</th>
                  <th className="p-2.5 text-center font-medium">Sat</th>
                  <th className="p-2.5 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {timesheetTasks.map((t: any) => (
                  <tr key={t.taskId} className="hover:bg-surface-2/60 transition-colors">
                    <td className="p-2.5 font-medium text-text">{t.taskTitle}</td>
                    <td className="p-2.5 text-text-secondary">{t.projectName}</td>
                    <td className="p-2.5 text-center text-text-muted tabular-nums">{t.days?.Sun || 0}</td>
                    <td className="p-2.5 text-center text-text-muted tabular-nums">{t.days?.Mon || 0}</td>
                    <td className="p-2.5 text-center text-text-muted tabular-nums">{t.days?.Tue || 0}</td>
                    <td className="p-2.5 text-center text-text-muted tabular-nums">{t.days?.Wed || 0}</td>
                    <td className="p-2.5 text-center text-text-muted tabular-nums">{t.days?.Thu || 0}</td>
                    <td className="p-2.5 text-center text-text-muted tabular-nums">{t.days?.Fri || 0}</td>
                    <td className="p-2.5 text-center text-text-muted tabular-nums">{t.days?.Sat || 0}</td>
                    <td className="p-2.5 font-semibold text-right text-accent tabular-nums">{t.totalHours}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 border border-dashed border-border rounded-[8px] text-xs text-text-muted">
            No logged artist time recorded for this week
          </div>
        )}
      </motion.div>
    </div>
  );
}
