'use client';

import { useEffect } from 'react';
import { ErrorWarningPage, ErrorType } from '@/components/ui/error-warning';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to studio telemetry or console
    console.error('[PolyTrack Route Error Boundary]', error);
  }, [error]);

  const msg = (error.message || '').toLowerCase();
  let errorType: ErrorType = 'server';
  let title = 'Pipeline Rendering Interrupted';
  let statusCode: number | undefined = undefined;

  if (msg.includes('network') || msg.includes('failed to fetch') || msg.includes('connection')) {
    errorType = 'network';
    title = 'Backend Connection Lost';
  } else if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('token')) {
    errorType = 'auth';
    title = 'Session Verification Failed';
    statusCode = 401;
  } else if (msg.includes('403') || msg.includes('forbidden') || msg.includes('permission')) {
    errorType = 'forbidden';
    title = 'Studio Permission Denied';
    statusCode = 403;
  } else if (msg.includes('404') || msg.includes('not found')) {
    errorType = 'not-found';
    title = 'Resource Missing in Route';
    statusCode = 404;
  }

  return (
    <ErrorWarningPage
      type={errorType}
      statusCode={statusCode}
      title={title}
      message={
        error.message ||
        'An unexpected runtime exception occurred while rendering this studio view. You can retry the operation or return to the main dashboard.'
      }
      error={error}
      reset={reset}
      showDashboardLink={true}
      showBackLink={true}
      technicalDetails={{
        name: error.name,
        message: error.message,
        digest: error.digest,
        stack: error.stack,
      }}
    />
  );
}
