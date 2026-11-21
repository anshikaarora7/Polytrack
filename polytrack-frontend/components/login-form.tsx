'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/lib/auth-store';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import ThemeToggle from '@/components/theme-toggle';
import Studio3DViewport from '@/components/studio-3d-viewport';
import {
  Mail,
  Lock,
  Loader2,
  Layers,
  Eye,
  EyeOff,
  ShieldCheck,
  UserCheck,
  Briefcase,
  Palette,
  CheckCircle2,
  Server,
  Sparkles,
  ArrowRight,
  Box,
  Cpu,
  Zap,
  RotateCw
} from 'lucide-react';

const LoginHeroBackground3D = dynamic(
  () => import('@/components/LoginHeroBackground3D'),
  { ssr: false }
);

const DEMO_ROLES = [
  {
    role: 'Studio Admin',
    name: 'Admin User',
    email: 'admin@polytrack.com',
    password: 'Admin@123456',
    icon: ShieldCheck,
    badge: 'Full Access',
    color: 'text-accent bg-accent-tint border-border',
  },
  {
    role: 'Project Manager',
    name: 'Sarah Connor',
    email: 'pm@polytrack.com',
    password: 'Admin@123456',
    icon: Briefcase,
    badge: 'Milestones',
    color: 'text-info bg-info/10 border-border',
  },
  {
    role: 'Lead 3D Artist',
    name: 'Alex Rivera',
    email: 'artist@polytrack.com',
    password: 'Admin@123456',
    icon: Palette,
    badge: 'Uploads & Time',
    color: 'text-warning bg-warning/10 border-border',
  },
  {
    role: 'Reviewer / QA',
    name: 'Elena Rostova',
    email: 'reviewer@polytrack.com',
    password: 'Admin@123456',
    icon: UserCheck,
    badge: 'Approvals',
    color: 'text-success bg-success/10 border-border',
  },
  {
    role: 'Client Portal',
    name: 'David Vance',
    email: 'client@polytrack.com',
    password: 'Admin@123456',
    icon: CheckCircle2,
    badge: 'Decisions',
    color: 'text-text-muted bg-surface-2 border-border',
  },
];

export default function LoginForm() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('admin@polytrack.com');
  const [password, setPassword] = useState('Admin@123456');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [signingInRole, setSigningInRole] = useState<string | null>(null);

  const handleQuickLogin = async (roleEmail: string, rolePwd: string, roleName: string) => {
    setEmail(roleEmail);
    setPassword(rolePwd);
    setLocalError('');
    clearError();
    setSigningInRole(roleName);

    try {
      await login(roleEmail, rolePwd);
      router.push('/dashboard');
    } catch (err: any) {
      if (!err.response) {
        setLocalError(
          `Cannot connect to backend API at ${apiClient.getServerUrl()}. Please check network connectivity or ensure the backend service is running.`
        );
      } else if (err.response?.status === 401) {
        setLocalError('Authentication failed. Default password is: Admin@123456');
      } else {
        setLocalError(err.response?.data?.message || 'Login failed. Please try again.');
      }
    } finally {
      setSigningInRole(null);
    }
  };

  const handleAutoFill = (roleEmail: string, rolePwd: string) => {
    setEmail(roleEmail);
    setPassword(rolePwd);
    setLocalError('');
    clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    if (!email || !password) {
      setLocalError('Please fill in both email and password.');
      return;
    }

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      if (!err.response) {
        setLocalError(
          `Cannot connect to backend at ${apiClient.getServerUrl()}. Please check network connectivity or ensure the backend service is running.`
        );
      } else if (err.response?.status === 401) {
        setLocalError(
          'Invalid email or password. Please use one of the demo credentials below (e.g. admin@polytrack.com / Admin@123456).'
        );
      } else {
        setLocalError(err.response?.data?.message || 'Login failed. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-bg relative overflow-hidden flex flex-col justify-center px-4 py-8 lg:px-8 text-text">
      {/* 3D Full-Height Animated Canvas Background */}
      <LoginHeroBackground3D />

      {/* Top Bar with Brand & Theme Toggle */}
      <div className="absolute top-4 left-4 right-4 max-w-7xl mx-auto flex items-center justify-between z-20">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-[4px] bg-accent text-white flex items-center justify-center font-bold text-xs">
            P
          </div>
          <span className="font-semibold text-sm tracking-tight text-text">PolyTrack</span>
        </div>
        <ThemeToggle showLabel={true} />
      </div>

      <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10 pt-10">
        {/* Left Column: Clean Linear Hero & 3D Stage */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="lg:col-span-6 xl:col-span-7 flex flex-col space-y-5"
        >
          {/* Header Title */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[6px] border border-border bg-surface text-accent text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              <span>3D Studio Production Tracking</span>
              <span className="text-text-muted font-mono text-[10px]">v2.0</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-text tracking-[-0.01em] leading-tight">
              A precision system for high-velocity 3D pipelines.
            </h1>

            <p className="text-text-secondary text-sm max-w-lg leading-relaxed">
              Track 3D assets, run multi-stage review workflows, manage Kanban milestones, and sync directly with Blender via REST API.
            </p>
          </div>

          {/* Interactive 3D Studio Stage */}
          <div className="rounded-[12px] border border-border bg-surface overflow-hidden shadow-[var(--shadow-pop)] relative">
            <div className="flex items-center justify-between px-3.5 py-2 border-b border-border bg-surface-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-text-muted flex items-center gap-1.5">
                  <Box className="w-3.5 h-3.5 text-accent" strokeWidth={1.75} />
                  viewport_preview.blend
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px] text-text-muted">
                <span>ACES Filmic</span>
                <span className="text-accent font-medium">60 FPS</span>
              </div>
            </div>

            {/* 3D Viewport Component */}
            <div className="h-[300px] sm:h-[340px] w-full relative">
              <Studio3DViewport className="w-full h-full" showControls={true} />
            </div>

            {/* Feature Pills */}
            <div className="grid grid-cols-3 divide-x divide-border border-t border-border bg-surface-2 text-center py-2 text-xs text-text-secondary font-medium">
              <div className="flex items-center justify-center gap-1.5 px-2">
                <RotateCw className="w-3.5 h-3.5 text-accent" strokeWidth={1.75} />
                <span>Orbit Controls</span>
              </div>
              <div className="flex items-center justify-center gap-1.5 px-2">
                <Cpu className="w-3.5 h-3.5 text-accent" strokeWidth={1.75} />
                <span>PBR Shaders</span>
              </div>
              <div className="flex items-center justify-center gap-1.5 px-2">
                <Box className="w-3.5 h-3.5 text-accent" strokeWidth={1.75} />
                <span>Blender Sync</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Column: Linear Quick Demo Login & Sign-In Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut', delay: 0.05 }}
          className="lg:col-span-6 xl:col-span-5 space-y-3.5"
        >
          {/* Quick Demo Login Panel */}
          <div className="rounded-[12px] border border-border bg-surface p-4 shadow-[var(--shadow-pop)] space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-accent" strokeWidth={1.75} />
                <h2 className="text-xs font-semibold text-text uppercase tracking-wider">
                  Quick Demo Login (5 Roles)
                </h2>
              </div>
              <span className="text-[11px] text-text-muted font-mono bg-surface-2 px-1.5 py-0.5 rounded border border-border">
                Admin@123456
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEMO_ROLES.map((roleInfo) => {
                const IconComp = roleInfo.icon;
                const isLoggingIn = signingInRole === roleInfo.role;

                return (
                  <div
                    key={roleInfo.role}
                    className="p-2.5 rounded-[8px] border border-border bg-surface hover:bg-surface-2 transition-colors flex flex-col justify-between space-y-2 text-left"
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`p-1.5 rounded-[6px] shrink-0 border ${roleInfo.color}`}>
                          <IconComp className="w-3.5 h-3.5" strokeWidth={1.75} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-text text-xs truncate">
                            {roleInfo.role}
                          </p>
                          <p className="text-[11px] text-text-muted truncate">{roleInfo.name}</p>
                        </div>
                      </div>
                    </div>

                    <p className="text-[10px] text-text-muted font-mono truncate">{roleInfo.email}</p>

                    <div className="flex items-center gap-1.5 pt-1 border-t border-border">
                      <Button
                        type="button"
                        size="sm"
                        disabled={isLoading || isLoggingIn}
                        onClick={() => handleQuickLogin(roleInfo.email, roleInfo.password, roleInfo.role)}
                        className="flex-1 h-7 text-[11px] bg-accent hover:bg-accent-hover text-white font-medium rounded-[6px] transition-colors"
                      >
                        {isLoggingIn ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            Signing In...
                          </>
                        ) : (
                          '1-Click Sign In'
                        )}
                      </Button>
                      <button
                        type="button"
                        onClick={() => handleAutoFill(roleInfo.email, roleInfo.password)}
                        className="px-2 h-7 text-[11px] text-text-muted hover:text-text rounded-[6px] border border-border bg-surface hover:bg-surface-2 transition-colors"
                        title="Auto-fill form inputs"
                      >
                        Fill
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Manual Sign-In Form */}
          <div className="rounded-[12px] border border-border bg-surface p-5 shadow-[var(--shadow-pop)] space-y-3.5">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-text mb-1"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" strokeWidth={1.75} />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@polytrack.com"
                    className="w-full pl-9 pr-3 py-1.5 bg-surface border border-border rounded-[8px] text-text placeholder:text-text-muted focus:outline-none focus:border-accent text-xs transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold text-text"
                  >
                    Password
                  </label>
                  <span className="text-[11px] text-text-muted font-mono">Admin@123456</span>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-text-muted" strokeWidth={1.75} />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Admin@123456"
                    className="w-full pl-9 pr-8 py-1.5 bg-surface border border-border rounded-[8px] text-text placeholder:text-text-muted focus:outline-none focus:border-accent text-xs font-mono transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-2.5 text-text-muted hover:text-text"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" strokeWidth={1.75} /> : <Eye className="w-3.5 h-3.5" strokeWidth={1.75} />}
                  </button>
                </div>
              </div>

              {(error || localError) && (
                <div className="p-2.5 bg-danger/10 border border-danger/20 rounded-[8px] text-left">
                  <p className="text-xs text-danger font-medium leading-relaxed">
                    {error || localError}
                  </p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading || !!signingInRole}
                className="w-full h-8 bg-accent hover:bg-accent-hover text-white font-medium rounded-[8px] text-xs shadow-sm flex items-center justify-center gap-2 transition-colors"
              >
                {isLoading && !signingInRole ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  'Sign In to Dashboard'
                )}
              </Button>
            </form>
          </div>

          {/* Public Client Inquiry Banner */}
          <div className="p-3 rounded-[12px] border border-border bg-surface-2 flex items-center justify-between gap-3 text-xs">
            <div className="space-y-0.5">
              <p className="font-semibold text-text">Client project inquiries</p>
              <p className="text-text-muted text-[11px]">Submit 3D assets or scope requests without logging in.</p>
            </div>
            <Link
              href="/inquiry"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-surface hover:bg-surface-2 border border-border text-text font-medium text-xs transition-colors shrink-0 shadow-sm"
            >
              Submit Inquiry
              <ArrowRight className="w-3.5 h-3.5 text-accent" strokeWidth={1.75} />
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
