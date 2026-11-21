import ProtectedRoute from '@/components/protected-route';
import DashboardLayout from '@/components/dashboard-layout';
import AssetsManager from '@/components/assets-manager';

export const metadata = {
  title: 'Assets - Project Management',
  description: 'Manage your project assets',
};

export default function AssetsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout activeTab="assets">
        <AssetsManager />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
