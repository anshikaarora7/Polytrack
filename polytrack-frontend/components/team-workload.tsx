'use client';

import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Users, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';

const fetcher = () => apiClient.getTeamWorkload?.() || Promise.resolve({ data: [] });

export default function TeamWorkload() {
  const { data: workloadData, isLoading } = useSWR('team-workload', fetcher);

  const teamMembers = Array.isArray(workloadData) ? workloadData : workloadData?.data || [];
  const chartData = teamMembers.map((member: any) => ({
    name: member.name,
    assigned: member.assignedTasks,
    quota: member.quotaHoursPerDay ? member.quotaHoursPerDay * 5 : 0,
    utilized: member.hoursThisWeek,
  }));

  const overloadedMembers = teamMembers.filter(
    (m: any) => m.quotaCompletionPercent > 100
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.01em] text-text">Team Workload</h1>
        <p className="text-sm text-text-muted mt-0.5">Monitor artist allocation, quota capacity, and weekly hours</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 border border-border bg-surface rounded-[12px] shadow-[var(--shadow-pop)]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-text-muted mb-1">Total Team Members</p>
              <p className="text-2xl font-semibold tracking-[-0.01em] text-text tabular-nums">{teamMembers.length}</p>
            </div>
            <div className="p-2 bg-surface-2 border border-border rounded-[8px]">
              <Users className="w-4 h-4 text-text-muted" strokeWidth={1.75} />
            </div>
          </div>
        </Card>

        <Card className="p-5 border border-border bg-surface rounded-[12px] shadow-[var(--shadow-pop)]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-text-muted mb-1">Total Tasks Assigned</p>
              <p className="text-2xl font-semibold tracking-[-0.01em] text-text tabular-nums">
                {teamMembers.reduce((sum: number, m: any) => sum + (m.assignedTasks || 0), 0)}
              </p>
            </div>
            <div className="p-2 bg-surface-2 border border-border rounded-[8px]">
              <TrendingUp className="w-4 h-4 text-text-muted" strokeWidth={1.75} />
            </div>
          </div>
        </Card>

        <Card className="p-5 border border-border bg-surface rounded-[12px] shadow-[var(--shadow-pop)]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-text-muted mb-1">Members at Capacity</p>
              <p className="text-2xl font-semibold tracking-[-0.01em] text-text tabular-nums">{overloadedMembers.length}</p>
              {overloadedMembers.length > 0 && (
                <div className="flex items-center gap-1 text-xs text-danger mt-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-danger shrink-0" />
                  <span>Overloaded capacity</span>
                </div>
              )}
            </div>
            <div className="p-2 bg-surface-2 border border-border rounded-[8px]">
              <AlertCircle className="w-4 h-4 text-text-muted" strokeWidth={1.75} />
            </div>
          </div>
        </Card>
      </div>

      {/* Workload Chart */}
      <Card className="p-5 border border-border bg-surface rounded-[12px] shadow-[var(--shadow-pop)]">
        <h3 className="text-base font-semibold text-text mb-4">Weekly Capacity & Utilization</h3>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.6} />
              <XAxis dataKey="name" stroke="var(--text-muted)" tickLine={false} axisLine={false} style={{ fontSize: '12px' }} />
              <YAxis stroke="var(--text-muted)" tickLine={false} axisLine={false} style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  boxShadow: 'var(--shadow-pop)',
                  fontSize: '12px',
                  color: 'var(--text)',
                }}
                labelStyle={{ color: 'var(--text)', fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey="utilized" fill="#5e6ad2" radius={[4, 4, 0, 0]} name="Hours Utilized" />
              <Bar dataKey="quota" fill="var(--border)" radius={[4, 4, 0, 0]} name="Hour Quota" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-64 flex items-center justify-center text-text-muted text-xs">
            No workload data available
          </div>
        )}
      </Card>

      {/* Team Members Table */}
      <Card className="p-5 border border-border bg-surface rounded-[12px] shadow-[var(--shadow-pop)]">
        <h3 className="text-base font-semibold text-text mb-4">Team Member Utilization</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-text-muted">
                <th className="text-left pb-2.5 font-medium">Member</th>
                <th className="text-left pb-2.5 font-medium">Tasks</th>
                <th className="text-left pb-2.5 font-medium">Quota (hrs)</th>
                <th className="text-left pb-2.5 font-medium">Utilized (hrs)</th>
                <th className="text-left pb-2.5 font-medium">Utilization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-text-muted">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto text-accent" strokeWidth={1.75} />
                  </td>
                </tr>
              ) : teamMembers.length > 0 ? (
                teamMembers.map((member: any) => (
                  <tr key={member.userId} className="hover:bg-surface-2 transition-colors">
                    <td className="py-3 font-medium text-text">{member.name}</td>
                    <td className="py-3 text-text-muted tabular-nums">{member.assignedTasks}</td>
                    <td className="py-3 text-text-muted tabular-nums">{member.quotaHoursPerDay ? member.quotaHoursPerDay * 5 : 0}</td>
                    <td className="py-3 text-text-muted tabular-nums">{member.hoursThisWeek}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2 max-w-[160px]">
                        <div className="flex-1 h-1.5 bg-surface-2 rounded-full overflow-hidden border border-border/50">
                          <div
                            className={`h-full transition-all ${
                              member.quotaCompletionPercent > 100
                                ? 'bg-danger'
                                : member.quotaCompletionPercent > 80
                                  ? 'bg-warning'
                                  : 'bg-success'
                            }`}
                            style={{ width: `${Math.min(member.quotaCompletionPercent, 100)}%` }}
                          />
                        </div>
                        <span
                          className={`text-xs font-medium tabular-nums ${
                            member.quotaCompletionPercent > 100
                              ? 'text-danger'
                              : member.quotaCompletionPercent > 80
                                ? 'text-warning'
                                : 'text-success'
                          }`}
                        >
                          {member.quotaCompletionPercent}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-text-muted text-xs">
                    No team members found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
