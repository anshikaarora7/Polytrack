import ProtectedRoute from '@/components/protected-route';
import DashboardLayout from '@/components/dashboard-layout';
import KanbanBoard from '@/components/kanban-board';

export const metadata = {
  title: 'Tasks - Project Management',
  description: 'Manage your tasks and workflow',
};

export default function TasksPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout activeTab="tasks">
        <KanbanBoard />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
