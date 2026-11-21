'use client';

import useSWR from 'swr';
import { apiClient } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Users, TrendingUp, Loader2 } from 'lucide-react';

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
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Team Workload</h1>
        <p className="text-muted-foreground mt-1">Monitor team capacity and utilization</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 border-border/50 bg-card/50">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Team Members</p>
              <p className="text-3xl font-bold text-foreground">{teamMembers.length}</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg">
              <Users className="w-6 h-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-border/50 bg-card/50">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Tasks Assigned</p>
              <p className="text-3xl font-bold text-foreground">
                {teamMembers.reduce((sum: number, m: any) => sum + m.assignedTasks, 0)}
              </p>
            </div>
            <div className="p-3 bg-accent/10 rounded-lg">
              <TrendingUp className="w-6 h-6 text-accent" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border-border/50 bg-card/50">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Members at Capacity</p>
            <p className="text-3xl font-bold text-foreground">{overloadedMembers.length}</p>
            {overloadedMembers.length > 0 && (
              <p className="text-xs text-destructive mt-2">Overloaded members</p>
            )}
          </div>
        </Card>
      </div>

      {/* Workload Chart */}
      <Card className="p-6 border-border/50 bg-card/50">
        <h3 className="text-lg font-semibold text-foreground mb-4">Team Capacity</h3>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
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
              <Legend />
              <Bar dataKey="utilized" fill="oklch(0.62 0.28 264.4)" name="Hours Utilized" />
              <Bar dataKey="quota" fill="oklch(0.35 0 0)" name="Hour Quota" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            No workload data available
          </div>
        )}
      </Card>

      {/* Team Members Table */}
      <Card className="p-6 border-border/50 bg-card/50">
        <h3 className="text-lg font-semibold text-foreground mb-4">Team Members Details</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left py-3 px-4 font-medium text-foreground">Member</th>
                <th className="text-left py-3 px-4 font-medium text-foreground">Tasks</th>
                <th className="text-left py-3 px-4 font-medium text-foreground">Quota (hrs)</th>
                <th className="text-left py-3 px-4 font-medium text-foreground">Utilized (hrs)</th>
                <th className="text-left py-3 px-4 font-medium text-foreground">Utilization</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : teamMembers.length > 0 ? (
                teamMembers.map((member: any) => (
                  <tr key={member.userId} className="border-b border-border/30 hover:bg-accent/50 transition-all">
                    <td className="py-3 px-4 text-foreground">{member.name}</td>
                    <td className="py-3 px-4 text-foreground">{member.assignedTasks}</td>
                    <td className="py-3 px-4 text-foreground">{member.quotaHoursPerDay ? member.quotaHoursPerDay * 5 : 0}</td>
                    <td className="py-3 px-4 text-foreground">{member.hoursThisWeek}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-border rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              member.quotaCompletionPercent > 100
                                ? 'bg-destructive'
                                : member.quotaCompletionPercent > 80
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(member.quotaCompletionPercent, 100)}%` }}
                          />
                        </div>
                        <span
                          className={`text-xs font-medium ${
                            member.quotaCompletionPercent > 100
                              ? 'text-destructive'
                              : member.quotaCompletionPercent > 80
                                ? 'text-yellow-500'
                                : 'text-green-500'
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
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
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
