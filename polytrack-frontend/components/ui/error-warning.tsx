'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ShieldAlert,
  ShieldX,
  FileQuestion,
  WifiOff,
  ServerCrash,
  AlertCircle,
  RotateCw,
  LayoutDashboard,
  LogIn,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Terminal,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import ThemeToggle from '@/components/theme-toggle';

export type ErrorType =
  | 'auth'          // 401 Unauthorized
  | 'forbidden'     // 403 Forbidden / Access Denied
  | 'not-found'     // 404 Not Found
  | 'network'       // Network offline / CORS / Timeout
  | 'server'        // 500 / 502 / 503 Internal Server Error
  | 'validation'    // 400 / 422 Validation Error
  | 'generic';      // General runtime / client crash

export interface ErrorWarningProps {
  type?: ErrorType;
  title?: string;
  message?: string;
  statusCode?: number | string;
  error?: Error | any;
  reset?: () => void;
  onRetry?: () => void;
  showDashboardLink?: boolean;
  showSignInLink?: boolean;
  showBackLink?: boolean;
  backUrl?: string;
  backLabel?: string;
  compact?: boolean;
  className?: string;
  customActions?: React.ReactNode;
  technicalDetails?: string | Record<string, any>;
}

const ERROR_CONFIGS: Record<
  ErrorType,
  {
    icon: React.ElementType;
    badgeLabel: string;
    dotColor: string;
    iconColor: string;
    iconBg: string;
    defaultTitle: string;
    defaultMessage: string;
  }
> = {
  auth: {
    icon: ShieldAlert,
    badgeLabel: 'Auth Error • 401',
    dotColor: 'bg-warning',
    iconColor: 'text-warning',
    iconBg: 'bg-warning/10 border-warning/20',
    defaultTitle: 'Authentication Required',
    defaultMessage: 'Your studio session is invalid or has expired. Please sign in to verify your identity and resume work.',
  },
  forbidden: {
    icon: ShieldX,
    badgeLabel: 'Access Restricted • 403',
    dotColor: 'bg-destructive',
    iconColor: 'text-destructive',
    iconBg: 'bg-destructive/10 border-destructive/20',
    defaultTitle: 'Studio Permission Denied',
    defaultMessage: 'You do not have the required role or project membership to access this pipeline area. Contact your project manager or studio admin.',
  },
  'not-found': {
    icon: FileQuestion,
    badgeLabel: 'Not Found • 404',
    dotColor: 'bg-info',
    iconColor: 'text-info',
    iconBg: 'bg-info/10 border-info/20',
    defaultTitle: 'Pipeline Resource Not Found',
    defaultMessage: 'The requested asset, project, version, or studio page could not be located. It may have been archived, renamed, or moved.',
  },
  network: {
    icon: WifiOff,
    badgeLabel: 'Network Error',
    dotColor: 'bg-warning',
    iconColor: 'text-warning',
    iconBg: 'bg-warning/10 border-warning/20',
    defaultTitle: 'Backend Service Unreachable',
    defaultMessage: 'Unable to communicate with the PolyTrack API service. Check your network connection or verify that the local backend daemon is active.',
  },
  server: {
    icon: ServerCrash,
    badgeLabel: 'Server Error • 500',
    dotColor: 'bg-destructive',
    iconColor: 'text-destructive',
    iconBg: 'bg-destructive/10 border-destructive/20',
    defaultTitle: 'Studio Engine Exception',
    defaultMessage: 'The backend database or storage engine encountered an unhandled error while processing this request.',
  },
  validation: {
    icon: AlertCircle,
    badgeLabel: 'Validation Failed • 400',
    dotColor: 'bg-warning',
    iconColor: 'text-warning',
    iconBg: 'bg-warning/10 border-warning/20',
    defaultTitle: 'Invalid Pipeline Input',
    defaultMessage: 'One or more fields do not meet the required format, polycount limits, or asset naming standards.',
  },
  generic: {
    icon: AlertTriangle,
    badgeLabel: 'System Error',
    dotColor: 'bg-destructive',
    iconColor: 'text-destructive',
    iconBg: 'bg-destructive/10 border-destructive/20',
    defaultTitle: 'Something Went Wrong',
    defaultMessage: 'An unexpected application error interrupted the current operation.',
  },
};

export function ErrorWarningCard({
  type = 'generic',
  title,
  message,
  statusCode,
  error,
  reset,
  onRetry,
  showDashboardLink = true,
  showSignInLink,
  showBackLink = false,
  backUrl,
  backLabel,
  compact = false,
  className,
  customActions,
  technicalDetails,
}: ErrorWarningProps) {
  const router = useRouter();
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const config = ERROR_CONFIGS[type] || ERROR_CONFIGS.generic;
  const IconComponent = config.icon;

  const displayTitle = title || config.defaultTitle;
  const displayMessage = message || config.defaultMessage;
  const displayBadge = statusCode ? `${config.badgeLabel.split('•')[0].trim()} • ${statusCode}` : config.badgeLabel;

  // Compile technical details string for diagnostics
  const techInfo = technicalDetails
    ? typeof technicalDetails === 'string'
      ? technicalDetails
      : JSON.stringify(technicalDetails, null, 2)
    : error
    ? error.stack || error.message || String(error)
    : null;

  const handleCopyDiagnostics = () => {
    const payload = [
      `[PolyTrack Studio Diagnostics]`,
      `Type: ${type}`,
      `Title: ${displayTitle}`,
      `Status: ${statusCode || 'N/A'}`,
      `Timestamp: ${new Date().toISOString()}`,
      `URL: ${typeof window !== 'undefined' ? window.location.href : 'N/A'}`,
      techInfo ? `\nDetails:\n${techInfo}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    navigator.clipboard.writeText(payload).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleRetry = () => {
    if (reset) {
      reset();
    } else if (onRetry) {
      onRetry();
    } else if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const shouldShowSignIn = showSignInLink ?? (type === 'auth' || type === 'forbidden');

  return (
    <div
      className={cn(
        'rounded-[12px] border border-border bg-surface text-text shadow-[var(--shadow-pop)] transition-all',
        compact ? 'p-4' : 'p-6 sm:p-8',
        className
      )}
    >
      <div className="flex flex-col sm:flex-row items-start gap-4">
        {/* Status Icon */}
        <div
          className={cn(
            'w-10 h-10 sm:w-11 sm:h-11 rounded-[10px] border flex items-center justify-center shrink-0',
            config.iconBg,
            config.iconColor
          )}
        >
          <IconComponent className="w-5 h-5" />
        </div>

        {/* Content Body */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[5px] text-[11px] font-mono font-medium border border-border bg-surface-subtle text-text-secondary">
              <span className={cn('w-1.5 h-1.5 rounded-full', config.dotColor)} />
              <span>{displayBadge}</span>
            </span>

            {error?.digest && (
              <span className="text-[11px] font-mono text-text-muted">
                Digest: {error.digest.slice(0, 8)}
              </span>
            )}
          </div>

          <h3 className={cn('font-semibold text-text tracking-[-0.01em]', compact ? 'text-base' : 'text-lg sm:text-xl')}>
            {displayTitle}
          </h3>

          <p className="mt-1 text-sm text-text-secondary leading-relaxed max-w-2xl">
            {displayMessage}
          </p>

          {/* Collapsible Technical Details */}
          {techInfo && (
            <div className="mt-4 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="inline-flex items-center gap-1.5 text-xs font-mono text-text-muted hover:text-text transition-colors select-none"
              >
                <Terminal className="w-3.5 h-3.5 text-text-muted" />
                <span>{showDetails ? 'Hide technical diagnostics' : 'Show technical diagnostics'}</span>
                {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {showDetails && (
                <div className="mt-2.5 rounded-[8px] border border-border bg-surface-subtle p-3 text-xs font-mono relative">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-border text-[11px] text-text-muted">
                    <span>Engine Output &amp; Trace</span>
                    <button
                      type="button"
                      onClick={handleCopyDiagnostics}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border hover:bg-surface text-text transition-colors"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 text-success" />
                          <span className="text-success">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Trace</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="overflow-x-auto whitespace-pre-wrap max-h-48 text-[11px] text-text-secondary leading-normal">
                    {techInfo}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            {(reset || onRetry) && (
              <Button
                variant="default"
                size="sm"
                onClick={handleRetry}
                className="gap-1.5 font-medium shadow-sm"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </Button>
            )}

            {shouldShowSignIn && (
              <Link href="/login">
                <Button
                  variant={reset || onRetry ? 'secondary' : 'default'}
                  size="sm"
                  className="gap-1.5 font-medium cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </Button>
              </Link>
            )}

            {showDashboardLink && (
              <Link href="/dashboard">
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-1.5 font-medium cursor-pointer"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Dashboard</span>
                </Button>
              </Link>
            )}

            {(showBackLink || backUrl) && (
              backUrl ? (
                <Link href={backUrl}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-text-secondary hover:text-text cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>{backLabel || 'Go Back'}</span>
                  </Button>
                </Link>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.back()}
                  className="gap-1.5 text-text-secondary hover:text-text cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{backLabel || 'Go Back'}</span>
                </Button>
              )
            )}

            {customActions}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ErrorWarningPage(props: ErrorWarningProps) {
  return (
    <div className="min-h-screen bg-bg text-text flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative selection:bg-accent/15 selection:text-accent">
      {/* Top Header */}
      <header className="max-w-4xl w-full mx-auto flex items-center justify-between pb-6 border-b border-border">
        <Link href="/" className="inline-flex items-center gap-2 text-text font-semibold tracking-tight hover:opacity-90">
          <div className="w-5 h-5 rounded-[4px] bg-accent text-white flex items-center justify-center font-bold text-xs">
            P
          </div>
          <span className="text-sm">PolyTrack Studio</span>
        </Link>
        <ThemeToggle showLabel={true} />
      </header>

      {/* Centered Error Stage */}
      <main className="max-w-2xl w-full mx-auto my-auto py-12">
        <ErrorWarningCard {...props} />
      </main>

      {/* Footer Navigation */}
      <footer className="max-w-4xl w-full mx-auto pt-6 border-t border-border flex flex-wrap items-center justify-between gap-3 text-xs text-text-muted font-mono">
        <div>PolyTrack 3D Production Engine</div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="hover:text-text transition-colors">
            Dashboard
          </Link>
          <Link href="/dashboard/projects" className="hover:text-text transition-colors">
            Projects
          </Link>
          <Link href="/dashboard/assets" className="hover:text-text transition-colors">
            Assets
          </Link>
          <a
            href="https://github.com/anshikaarora7/Polytrack"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-text transition-colors inline-flex items-center gap-1"
          >
            <span>GitHub</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </footer>
    </div>
  );
}

export default ErrorWarningCard;
