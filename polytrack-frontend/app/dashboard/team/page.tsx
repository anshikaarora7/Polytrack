import ProtectedRoute from '@/components/protected-route';
import DashboardLayout from '@/components/dashboard-layout';
import TeamWorkload from '@/components/team-workload';

export const metadata = {
  title: 'Team - Project Management',
  description: 'Manage team workload and capacity',
};

export default function TeamPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout activeTab="team">
        <TeamWorkload />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
