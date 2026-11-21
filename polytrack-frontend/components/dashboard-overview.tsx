'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { apiClient } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AssetTurntableModal from '@/components/asset-turntable-modal';
import PipelineFlow from '@/components/PipelineFlow';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  FolderOpen,
  CheckSquare,
  Image as ImageIcon,
  TrendingUp,
  AlertCircle,
  Loader2,
  Box,
  Clock,
  Calendar,
  Layers,
  ArrowRight,
  Activity as ActivityIcon,
  Eye,
  Sparkles,
  Rotate3d
} from 'lucide-react';
import type { DashboardStats, Activity, ProjectProgress, Deadline } from '@/lib/types';

// Animated Count-Up Number using requestAnimationFrame and easeOut
function CountUpNumber({ value, suffix = '', duration = 1.2 }: { value: number; suffix?: string; duration?: number }) {
  const [displayValue, setDisplayValue] = useState<number>(0);

  useEffect(() => {
    let startTime: number | null = null;
    const startVal = 0;
    const endVal = value;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      setDisplayValue(Math.round(startVal + (endVal - startVal) * eased));
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }, [value, duration]);

  return <span>{displayValue.toLocaleString()}{suffix}</span>;
}

// Animated SVG Progress Ring with Framer Motion strokeDashoffset
function AnimatedProgressRing({
  percentage,
  size = 54,
  strokeWidth = 4.5,
  color = '#6366f1'
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(percentage, 0), 100);
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-muted/20"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.15 }}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-[11px] font-mono font-bold text-foreground">
        {Math.round(clamped)}%
      </span>
    </div>
  );
}

export default function DashboardOverview() {
  const [turntableAsset, setTurntableAsset] = useState<any | null>(null);

  const { data: stats, isLoading: statsLoading } = useSWR<DashboardStats>(
    'dashboard-stats',
    () => apiClient.getDashboardStats()
  );
  const { data: activity } = useSWR<Activity[]>(
    'dashboard-activity',
    () => apiClient.getDashboardActivity()
  );
  const { data: projectsProgress } = useSWR<ProjectProgress[]>(
    'dashboard-projects-progress',
    () => apiClient.getProjectsProgress()
  );
  const { data: deadlines } = useSWR<Deadline[]>(
    'dashboard-upcoming-deadlines',
    () => apiClient.getUpcomingDeadlines()
  );
  const { data: recentAssets } = useSWR(
    'dashboard-recent-assets',
    () => apiClient.getRecentAssets(6)
  );
  const { data: timesheetsData } = useSWR(
    'dashboard-timesheets',
    () => apiClient.getTimesheets()
  );

  const progressItems: ProjectProgress[] = Array.isArray(projectsProgress) ? projectsProgress : [];
  const deadlineItems: Deadline[] = Array.isArray(deadlines) ? deadlines : [];
  const activityItems: Activity[] = Array.isArray(activity) ? activity : [];
  const assetItems: any[] = Array.isArray(recentAssets) ? recentAssets : [];
  const timesheetTasks: any[] = timesheetsData?.tasks || [];

  const chartData = progressItems.slice(0, 5).map((p: ProjectProgress) => ({
    name: p.name,
    completion: p.completionPercent ?? 0,
  }));

  // Calculations for progress rings
  const taskCompletionRate = stats?.totalTasks && stats.totalTasks > 0
    ? ((stats.completedTasks || 0) / stats.totalTasks) * 100
    : 0;

  const assetApprovalRate = stats?.totalAssets && stats.totalAssets > 0
    ? ((stats.approvedAssets || 0) / stats.totalAssets) * 100
    : 0;

  const hoursTargetRate = Math.min(((stats?.totalHoursThisWeek || 0) / 40) * 100, 100);

  const statusColors: Record<string, { bg: string; dot: string; glow: string }> = {
    draft: {
      bg: 'bg-zinc-500/10 text-zinc-300 border-zinc-500/30',
      dot: 'bg-zinc-400',
      glow: '',
    },
    submitted: {
      bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      dot: 'bg-blue-400 animate-pulse',
      glow: 'shadow-[0_0_8px_rgba(59,130,246,0.3)]',
    },
    review: {
      bg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      dot: 'bg-purple-400 animate-pulse',
      glow: 'shadow-[0_0_8px_rgba(168,85,247,0.3)]',
    },
    approved: {
      bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      dot: 'bg-emerald-400',
      glow: 'shadow-[0_0_8px_rgba(16,185,129,0.3)]',
    },
    rejected: {
      bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      dot: 'bg-rose-400',
      glow: 'shadow-[0_0_8px_rgba(244,63,94,0.3)]',
    },
  };

  return (
    <div className="p-6 md:p-8 space-y-8">
      {/* 3D Turntable Modal */}
      {turntableAsset && (
        <AssetTurntableModal
          asset={turntableAsset}
          onClose={() => setTurntableAsset(null)}
        />
      )}

      {/* 1. Animated Stats Grid with Count-Ups and Progress Rings */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Total Projects Card */}
        <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/40 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Projects</p>
              {statsLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <p className="text-3xl font-bold text-foreground">
                  <CountUpNumber value={stats?.totalProjects || 0} />
                </p>
              )}
            </div>
            <div className="p-3 bg-primary/10 rounded-xl">
              <FolderOpen className="w-6 h-6 text-primary" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">Active projects in studio system</p>
        </Card>

        {/* Total Tasks Card with Animated Ring */}
        <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm hover:border-accent/40 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Tasks</p>
              {statsLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <p className="text-3xl font-bold text-foreground">
                  <CountUpNumber value={stats?.totalTasks || 0} />
                </p>
              )}
            </div>
            <AnimatedProgressRing percentage={taskCompletionRate} color="#38bdf8" />
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Completed: <span className="font-semibold text-foreground">{stats?.completedTasks || 0}</span> tasks
          </p>
        </Card>

        {/* Total Assets Card with Animated Ring */}
        <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm hover:border-chart-2/40 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total 3D Assets</p>
              {statsLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <p className="text-3xl font-bold text-foreground">
                  <CountUpNumber value={stats?.totalAssets || 0} />
                </p>
              )}
            </div>
            <AnimatedProgressRing percentage={assetApprovalRate} color="#10b981" />
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Approved: <span className="font-semibold text-foreground">{stats?.approvedAssets || 0}</span> assets
          </p>
        </Card>

        {/* Hours Logged Card with Target Ring */}
        <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm hover:border-green-500/40 transition-all flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Weekly Hours</p>
              {statsLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <p className="text-3xl font-bold text-foreground">
                  <CountUpNumber value={Math.round(stats?.totalHoursThisWeek || 0)} suffix="h" />
                </p>
              )}
            </div>
            <AnimatedProgressRing percentage={hoursTargetRate} color="#a855f7" />
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            This Month: <span className="font-semibold text-foreground">{stats?.totalHoursThisMonth || 0}h</span> logged
          </p>
        </Card>
      </motion.div>

      {/* 2. Interactive Pipeline Flow Stage */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
      >
        <PipelineFlow currentStage="Review" />
      </motion.div>

      {/* 3. Charts & Deadlines Grid */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* Project Progress Chart */}
        <Card className="lg:col-span-2 p-6 border-border/50 bg-card/50 backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-foreground mb-4">Project Progress</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 10%)" />
                <XAxis dataKey="name" stroke="oklch(0.556 0 0)" style={{ fontSize: '12px' }} />
                <YAxis stroke="oklch(0.556 0 0)" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'oklch(0.17 0 0)',
                    border: '1px solid oklch(1 0 0 / 10%)',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: 'oklch(0.95 0.01 0)' }}
                />
                <Bar dataKey="completion" fill="oklch(0.62 0.28 264.4)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
              No project data available
            </div>
          )}
        </Card>

        {/* Upcoming Deadlines */}
        <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Upcoming Deadlines</h3>
            <span className="text-xs text-muted-foreground">Next 7 Days</span>
          </div>
          <div className="space-y-3">
            {deadlineItems.slice(0, 5).map((deadline: Deadline) => (
              <div key={deadline.id} className="flex items-start gap-3 pb-3 border-b border-border/30 last:border-0">
                <div className="mt-1">
                  {deadline.daysRemaining <= 1 ? (
                    <AlertCircle className="w-4 h-4 text-destructive" />
                  ) : (
                    <CheckSquare className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{deadline.title}</p>
                  <p className="text-xs text-muted-foreground">{deadline.projectName}</p>
                  <div className="flex items-center justify-between mt-1 text-[11px] text-muted-foreground">
                    <span>{new Date(deadline.dueDate).toLocaleDateString()}</span>
                    <span className={deadline.daysRemaining <= 1 ? 'text-destructive font-bold' : ''}>
                      {deadline.daysRemaining === 0
                        ? 'Due today'
                        : `${deadline.daysRemaining}d left`}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {!deadlineItems.length && (
              <p className="text-sm text-muted-foreground text-center py-8">No upcoming deadlines</p>
            )}
          </div>
        </Card>
      </motion.div>

      {/* 4. Recent 3D Assets Gallery with Turntable Previews */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <Box className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Recent 3D Assets</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Latest models, props, and textures updated across production projects
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/assets"
              className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
            >
              View All Assets <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {assetItems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {assetItems.map((asset: any) => {
                const sKey = (asset.status || 'draft').toLowerCase();
                const style = statusColors[sKey] || statusColors['draft'];

                return (
                  <div
                    key={asset.id}
                    className="p-3 bg-card/80 border border-border/60 hover:border-primary/50 rounded-xl transition-all flex flex-col justify-between space-y-2 group relative overflow-hidden"
                  >
                    {/* Visual 3D Preview Box with Hover Turntable Action */}
                    <div className="h-24 rounded-lg bg-gradient-to-br from-primary/10 via-card to-accent/10 border border-border/40 flex items-center justify-center relative overflow-hidden">
                      <Box className="w-9 h-9 text-primary/40 group-hover:scale-110 transition-transform duration-300" />

                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setTurntableAsset(asset)}
                        className="absolute inset-0 bg-black/60 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-[11px] font-semibold text-white rounded-lg border-0"
                      >
                        <Rotate3d className="w-4 h-4 text-primary animate-spin-slow" />
                        <span>Inspect 3D</span>
                      </Button>
                    </div>

                    <div>
                      <p className="font-semibold text-foreground text-xs truncate group-hover:text-primary transition-colors">
                        {asset.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">{asset.projectName}</p>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[10px] border-t border-border/30">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] font-semibold capitalize ${style.bg} ${style.glow}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                        {asset.status}
                      </span>
                      <span className="text-muted-foreground font-mono">
                        {new Date(asset.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 border border-dashed border-border/40 rounded-xl">
              <Box className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No recent assets recorded yet</p>
            </div>
          )}
        </Card>
      </motion.div>

      {/* 5. Weekly Timesheet Summary Grid */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
      >
        <Card className="p-6 border-border/50 bg-card/50 backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Weekly Timesheet & Workload</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Logged artist hours across production tasks this week (Total: {timesheetsData?.totalHours || 0}h)
              </p>
            </div>
            <Link
              href="/dashboard/tasks"
              className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
            >
              Log Hours in Kanban <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {timesheetTasks.length > 0 ? (
            <div className="border border-border/40 rounded-xl overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 border-b border-border/40 text-muted-foreground">
                  <tr>
                    <th className="p-2.5 font-semibold">Task</th>
                    <th className="p-2.5 font-semibold">Project</th>
                    <th className="p-2.5 text-center">Sun</th>
                    <th className="p-2.5 text-center">Mon</th>
                    <th className="p-2.5 text-center">Tue</th>
                    <th className="p-2.5 text-center">Wed</th>
                    <th className="p-2.5 text-center">Thu</th>
                    <th className="p-2.5 text-center">Fri</th>
                    <th className="p-2.5 text-center">Sat</th>
                    <th className="p-2.5 font-semibold text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {timesheetTasks.map((t: any) => (
                    <tr key={t.taskId} className="hover:bg-muted/20">
                      <td className="p-2.5 font-medium text-foreground">{t.taskTitle}</td>
                      <td className="p-2.5 text-muted-foreground">{t.projectName}</td>
                      <td className="p-2.5 text-center text-muted-foreground">{t.days?.Sun || 0}</td>
                      <td className="p-2.5 text-center text-muted-foreground">{t.days?.Mon || 0}</td>
                      <td className="p-2.5 text-center text-muted-foreground">{t.days?.Tue || 0}</td>
                      <td className="p-2.5 text-center text-muted-foreground">{t.days?.Wed || 0}</td>
                      <td className="p-2.5 text-center text-muted-foreground">{t.days?.Thu || 0}</td>
                      <td className="p-2.5 text-center text-muted-foreground">{t.days?.Fri || 0}</td>
                      <td className="p-2.5 text-center text-muted-foreground">{t.days?.Sat || 0}</td>
                      <td className="p-2.5 font-semibold text-right text-primary">{t.totalHours}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 border border-dashed border-border/40 rounded-xl">
              <Clock className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No time entries recorded this week</p>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
