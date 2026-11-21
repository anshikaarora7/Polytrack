'use client';

import ProtectedRoute from '@/components/protected-route';
import DashboardLayout from '@/components/dashboard-layout';
import ClientPortal from '@/components/client-portal';

export default function ClientsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout activeTab="clients">
        <ClientPortal />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
