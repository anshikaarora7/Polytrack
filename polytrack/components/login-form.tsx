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
import Studio3DViewport from '@/components/studio-3d-viewport';

const LoginHeroBackground3D = dynamic(
  () => import('@/components/LoginHeroBackground3D'),
  { ssr: false }
);
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

const DEMO_ROLES = [
  {
    role: 'Studio Admin',
    name: 'Admin User',
    email: 'admin@polytrack.com',
    password: 'Admin@123456',
    icon: ShieldCheck,
    badge: 'Full Studio Access',
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  },
  {
    role: 'Project Manager',
    name: 'Sarah Connor',
    email: 'pm@polytrack.com',
    password: 'Admin@123456',
    icon: Briefcase,
    badge: 'Milestones & Inquiries',
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  },
  {
    role: 'Lead 3D Artist',
    name: 'Alex Rivera',
    email: 'artist@polytrack.com',
    password: 'Admin@123456',
    icon: Palette,
    badge: 'Kanban, Uploads & Time',
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  },
  {
    role: 'Reviewer / QA',
    name: 'Elena Rostova',
    email: 'reviewer@polytrack.com',
    password: 'Admin@123456',
    icon: UserCheck,
    badge: 'Approvals & Reviews',
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  },
  {
    role: 'Client Portal',
    name: 'David Vance',
    email: 'client@polytrack.com',
    password: 'Admin@123456',
    icon: CheckCircle2,
    badge: 'Milestone Decisions',
    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
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
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col justify-center px-4 py-8 lg:px-8">
      {/* 3D Full-Height Animated Canvas Background */}
      <LoginHeroBackground3D />

      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
        {/* Left Column: 3D Studio Stage & Hero Presentation */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="lg:col-span-6 xl:col-span-7 flex flex-col space-y-6"
        >
          {/* Header Title */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-semibold backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-primary animate-pulse" />
              <span>Next-Gen 3D Production Tracking</span>
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="font-mono text-[11px] opacity-80">WebGL 2.0</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-foreground tracking-tight leading-[1.1]">
              Engineered for <br />
              <span className="bg-gradient-to-r from-primary via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                3D Studios & Artists
              </span>
            </h1>

            <p className="text-muted-foreground text-sm sm:text-base max-w-xl leading-relaxed">
              Track 3D assets, run version-controlled approval pipelines, manage Kanban milestones, and sync directly with Blender via REST API.
            </p>
          </div>

          {/* Interactive 3D Studio Stage */}
          <div className="rounded-2xl border border-border/60 bg-card/40 backdrop-blur-md overflow-hidden shadow-2xl relative">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 bg-card/60 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
                <span className="ml-2 font-mono text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Box className="w-3.5 h-3.5 text-primary" />
                  Studio_Stage_Core.obj
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
                <span className="hidden sm:inline flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" /> ACES Filmic
                </span>
                <span className="text-primary font-semibold">60 FPS</span>
              </div>
            </div>

            {/* 3D Viewport Component */}
            <div className="h-[340px] sm:h-[400px] w-full relative">
              <Studio3DViewport className="w-full h-full" showControls={true} />
            </div>

            {/* Feature Pills */}
            <div className="grid grid-cols-3 divide-x divide-border/30 border-t border-border/40 bg-card/50 text-center py-2.5 text-xs text-muted-foreground font-medium">
              <div className="flex items-center justify-center gap-1.5 px-2">
                <RotateCw className="w-3.5 h-3.5 text-primary" />
                <span>Drag to Orbit</span>
              </div>
              <div className="flex items-center justify-center gap-1.5 px-2">
                <Cpu className="w-3.5 h-3.5 text-purple-400" />
                <span>PBR Shaders</span>
              </div>
              <div className="flex items-center justify-center gap-1.5 px-2">
                <Box className="w-3.5 h-3.5 text-cyan-400" />
                <span>Blender Sync</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Column: Quick Demo Login & Sign-In Card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
          className="lg:col-span-6 xl:col-span-5 space-y-4"
        >
          {/* Quick Demo Login Panel */}
          <Card className="border-border/60 bg-card/70 backdrop-blur-xl p-5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Quick Demo Login (5 Seeded Roles)
                </h2>
              </div>
              <span className="text-[11px] text-muted-foreground font-mono bg-muted/50 px-2 py-0.5 rounded border border-border/40">
                Admin@123456
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DEMO_ROLES.map((roleInfo) => {
                const IconComp = roleInfo.icon;
                const isLoggingIn = signingInRole === roleInfo.role;

                return (
                  <div
                    key={roleInfo.role}
                    className="p-3 rounded-xl border border-border/50 bg-card/40 hover:bg-card/90 hover:border-primary/40 transition-all flex flex-col justify-between space-y-2 text-left group"
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`p-1.5 rounded-lg shrink-0 ${roleInfo.color}`}>
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground text-xs truncate group-hover:text-primary transition-colors">
                            {roleInfo.role}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">{roleInfo.name}</p>
                        </div>
                      </div>
                    </div>

                    <p className="text-[10px] text-muted-foreground font-mono truncate">{roleInfo.email}</p>

                    <div className="flex items-center gap-1.5 pt-1 border-t border-border/30">
                      <Button
                        type="button"
                        size="sm"
                        disabled={isLoading || isLoggingIn}
                        onClick={() => handleQuickLogin(roleInfo.email, roleInfo.password, roleInfo.role)}
                        className="flex-1 h-7 text-[11px] bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm transition-all"
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
                        className="px-2 h-7 text-[10px] text-muted-foreground hover:text-foreground rounded-lg border border-border/40 hover:bg-muted/50 transition-colors"
                        title="Auto-fill form inputs"
                      >
                        Fill
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Manual Sign-In Form */}
          <Card className="border-border/60 bg-card/70 backdrop-blur-xl p-5 sm:p-6 shadow-2xl space-y-4">
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@polytrack.com"
                    className="w-full pl-9 pr-4 py-2 bg-input/80 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold text-foreground uppercase tracking-wider"
                  >
                    Password
                  </label>
                  <span className="text-[11px] text-muted-foreground font-mono">Admin@123456</span>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Admin@123456"
                    className="w-full pl-9 pr-9 py-2 bg-input/80 border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm font-mono transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {(error || localError) && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-left">
                  <p className="text-xs text-destructive font-medium leading-relaxed">
                    {error || localError}
                  </p>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading || !!signingInRole}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 rounded-lg text-sm shadow-md flex items-center justify-center gap-2 transition-all"
              >
                {isLoading && !signingInRole ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  'Sign In to Dashboard'
                )}
              </Button>
            </form>
          </Card>

          {/* Public Client Inquiry Banner */}
          <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-between gap-3 text-xs backdrop-blur-sm">
            <div className="space-y-0.5">
              <p className="font-semibold text-foreground">Need 3D assets or looking for a quote?</p>
              <p className="text-muted-foreground text-[11px]">Submit a project inquiry without signing in.</p>
            </div>
            <Link
              href="/inquiry"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors shrink-0 shadow-sm"
            >
              Submit Inquiry
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Footer Info */}
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1 font-mono">
            <span className="flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-primary" /> API: {apiClient.getServerUrl()}
            </span>
            <span>PostgreSQL • ASP.NET Core</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
