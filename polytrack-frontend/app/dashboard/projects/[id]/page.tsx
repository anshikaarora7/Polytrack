'use client';

import { useParams } from 'next/navigation';
import ProtectedRoute from '@/components/protected-route';
import DashboardLayout from '@/components/dashboard-layout';
import ProjectDetailView from '@/components/project-detail-view';

export default function ProjectPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

  return (
    <ProtectedRoute>
      <DashboardLayout activeTab="projects">
        {id ? <ProjectDetailView projectId={id} /> : null}
      </DashboardLayout>
    </ProtectedRoute>
  );
}
