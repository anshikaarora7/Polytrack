import ProtectedRoute from '@/components/protected-route';
import DashboardLayout from '@/components/dashboard-layout';
import DashboardOverview from '@/components/dashboard-overview';

export const metadata = {
  title: 'Dashboard - Project Management',
  description: 'Project management dashboard',
};

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout activeTab="dashboard">
        <DashboardOverview />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
