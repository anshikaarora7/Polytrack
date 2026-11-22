import React from 'react';
import Link from 'next/link';
import { ErrorWarningPage } from '@/components/ui/error-warning';
import { Button } from '@/components/ui/button';
import { FolderOpen, ImageIcon } from 'lucide-react';

export const metadata = {
  title: '404 - Resource Not Found | PolyTrack',
  description: 'The requested studio resource or route could not be found.',
};

export default function NotFound() {
  return (
    <ErrorWarningPage
      type="not-found"
      statusCode={404}
      title="Pipeline Resource Not Found"
      message="The requested route, 3D asset, project ticket, or version does not exist or may have been deleted or moved. Check the URL for typos or navigate back to your active studio pipeline."
      showDashboardLink={true}
      showBackLink={true}
      customActions={
        <>
          <Link href="/dashboard/projects">
            <Button variant="secondary" size="sm" className="gap-1.5 font-medium cursor-pointer">
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Projects</span>
            </Button>
          </Link>
          <Link href="/dashboard/assets">
            <Button variant="secondary" size="sm" className="gap-1.5 font-medium cursor-pointer">
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Assets</span>
            </Button>
          </Link>
        </>
      }
    />
  );
}
