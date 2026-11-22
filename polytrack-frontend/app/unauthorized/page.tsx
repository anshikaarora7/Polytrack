import React from 'react';
import Link from 'next/link';
import { ErrorWarningPage } from '@/components/ui/error-warning';
import { Button } from '@/components/ui/button';
import { ShieldCheck, LogIn } from 'lucide-react';

export const metadata = {
  title: '403 - Access Restricted | PolyTrack',
  description: 'You do not have permission to access this studio pipeline area.',
};

export default function UnauthorizedPage() {
  return (
    <ErrorWarningPage
      type="forbidden"
      statusCode={403}
      title="Studio Permission Restricted"
      message="Your active session does not possess the required RBAC role permissions or project membership to perform this action or view this studio resource. For sensitive operations like financial milestone edits, team allocation, or client configuration, please sign in with an Admin or Project Manager account."
      showDashboardLink={true}
      showBackLink={true}
      showSignInLink={false}
      customActions={
        <Link href="/login">
          <Button variant="default" size="sm" className="gap-1.5 font-medium cursor-pointer">
            <LogIn className="w-3.5 h-3.5" />
            <span>Switch Role / Sign In</span>
          </Button>
        </Link>
      }
    />
  );
}
