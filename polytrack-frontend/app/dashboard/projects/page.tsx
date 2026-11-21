import ProtectedRoute from '@/components/protected-route';
import DashboardLayout from '@/components/dashboard-layout';
import ProjectsList from '@/components/projects-list';

export const metadata = {
  title: 'Projects - Project Management',
  description: 'Manage your projects',
};

export default function ProjectsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout activeTab="projects">
        <ProjectsList />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
