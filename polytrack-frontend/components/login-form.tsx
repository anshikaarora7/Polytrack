'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { apiClient, formatApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import {
  Mail,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldAlert,
  ArrowLeft,
  CheckCircle2,
  Box,
} from 'lucide-react';

const DEMO_ACCOUNTS = [
  { role: 'Studio Lead', email: 'lead@polytrack.com', password: 'Lead@123456', tag: 'Lead' },
  { role: 'Artist', email: 'artist@polytrack.com', password: 'Artist@123456', tag: 'Artist' },
  { role: 'Admin', email: 'admin@polytrack.com', password: 'Admin@123456', tag: 'Admin' },
  { role: 'Project Manager', email: 'pm@polytrack.com', password: 'Pm@123456', tag: 'PM' },
  { role: 'Reviewer', email: 'reviewer@polytrack.com', password: 'Reviewer@123456', tag: 'Review' },
];

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading, clearError } = useAuthStore();

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isValidatingEmail, setIsValidatingEmail] = useState(false);
  const [identifiedUser, setIdentifiedUser] = useState<{ name?: string; role?: string } | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [quickSigningIn, setQuickSigningIn] = useState<string | null>(null);

  const fromRoute = searchParams.get('from') || '/dashboard';
  const reasonParam = searchParams.get('reason');

  const getReasonMessage = () => {
    switch (reasonParam) {
      case 'session_expired':
        return 'Your studio session expired. Please sign in again.';
      case 'unauthorized':
      case 'forbidden':
        return 'Authentication required to access that studio resource.';
      case 'deactivated':
        return 'This studio account has been deactivated.';
      default:
        return null;
    }
  };

  const reasonMessage = getReasonMessage();

  // Step 1: Validate Email against backend
  const handleContinueWithEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setLocalError('Please enter a valid studio email address.');
      return;
    }

    setIsValidatingEmail(true);
    try {
      const res = await apiClient.checkEmail(cleanEmail);
      if (res && res.exists) {
        setIdentifiedUser({ name: res.name, role: res.role });
      } else {
        // If not in database, still allow continuing (could be new user or custom login)
        setIdentifiedUser(null);
      }
      setStep(2);
    } catch {
      // In case check endpoint is offline or fails, allow continuing to password step
      setStep(2);
    } finally {
      setIsValidatingEmail(false);
    }
  };

  // Step 2: Submit Password and complete login
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!password) {
      setLocalError('Please enter your studio password.');
      return;
    }

    try {
      await login(email.trim(), password);
      router.push(fromRoute);
    } catch (err: any) {
      const parsed = formatApiError(err);
      if (parsed.type === 'network') {
        setLocalError(`Cannot connect to studio backend. Verify the API service is active.`);
      } else if (err.response?.status === 401) {
        setLocalError('Incorrect password. For demo accounts use: Admin@123456 or Lead@123456');
      } else if (err.response?.status === 403) {
        setLocalError('This studio account has been restricted.');
      } else {
        setLocalError(parsed.message || 'Login failed. Please verify credentials.');
      }
    }
  };

  // 1-Click Quick Demo Login
  const handleQuickDemo = async (demoEmail: string, demoPwd: string, demoRole: string) => {
    setEmail(demoEmail);
    setPassword(demoPwd);
    setLocalError(null);
    clearError();
    setQuickSigningIn(demoRole);

    try {
      await login(demoEmail, demoPwd);
      router.push(fromRoute);
    } catch (err: any) {
      const parsed = formatApiError(err);
      setLocalError(parsed.message || 'Demo login failed.');
      setQuickSigningIn(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0C0E] text-[#EDEDEF] flex flex-col justify-between p-4 sm:p-6 font-sans antialiased selection:bg-[#5E6AD2]/30 selection:text-white">
      {/* Top Header */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-[5px] bg-[#5E6AD2] flex items-center justify-center text-white font-bold text-xs shadow-sm">
            P
          </div>
          <span className="font-semibold text-sm tracking-tight text-[#EDEDEF]">PolyTrack</span>
          <span className="text-[10px] font-mono text-[#8A8F98] px-1.5 py-0.5 rounded bg-[#14161A] border border-white/[0.08]">
            Studio
          </span>
        </div>
      </header>

      {/* Main Centered Sign-In Card */}
      <main className="w-full max-w-[400px] mx-auto my-auto py-8">
        <div className="bg-[#14161A] border border-white/[0.08] rounded-[12px] p-6 sm:p-7 shadow-2xl space-y-6">
          {/* Brand Mark & Step Headers */}
          <div className="space-y-1.5 text-left">
            <div className="w-9 h-9 rounded-[8px] bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-[#5E6AD2] mb-3">
              <Box className="w-5 h-5" strokeWidth={1.75} />
            </div>

            {step === 1 ? (
              <>
                <h1 className="text-xl font-semibold tracking-tight text-[#EDEDEF]">
                  Sign in to PolyTrack
                </h1>
                <p className="text-xs text-[#8A8F98] leading-relaxed">
                  Enter your studio email to access your projects and pipelines.
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h1 className="text-xl font-semibold tracking-tight text-[#EDEDEF]">
                    {identifiedUser?.name ? `Welcome back, ${identifiedUser.name}` : 'Enter your password'}
                  </h1>
                </div>
                <div className="flex items-center gap-2 pt-0.5 text-xs text-[#8A8F98]">
                  <span className="font-mono text-white/90 truncate max-w-[240px]">{email}</span>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1);
                      setPassword('');
                      setLocalError(null);
                    }}
                    className="text-[#5E6AD2] hover:text-[#6E7BE2] text-xs font-medium underline-offset-2 hover:underline"
                  >
                    Change
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Reason Alert (Session Expired / Unauthorized) */}
          {reasonMessage && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-[8px] flex items-start gap-2.5 text-xs text-amber-300">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{reasonMessage}</span>
            </div>
          )}

          {/* Error Banner */}
          {localError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-[8px] text-xs text-red-300 leading-relaxed">
              {localError}
            </div>
          )}

          {/* Step 1: Email Form */}
          {step === 1 && (
            <form onSubmit={handleContinueWithEmail} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-xs font-medium text-[#8A8F98]">
                  Studio Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8F98]" />
                  <input
                    id="email"
                    type="email"
                    autoFocus
                    required
                    placeholder="name@studio.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#0B0C0E] border border-white/[0.08] rounded-[8px] text-sm text-[#EDEDEF] placeholder:text-[#5B5E66] focus:outline-none focus:border-[#5E6AD2] focus:ring-1 focus:ring-[#5E6AD2] transition-colors"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isValidatingEmail || !email.trim()}
                className="w-full h-9 bg-[#5E6AD2] hover:bg-[#4F5BC4] text-white text-xs font-medium rounded-[8px] flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
              >
                {isValidatingEmail ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Continue with Email</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </Button>
            </form>
          )}

          {/* Step 2: Password Form */}
          {step === 2 && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="password" className="font-medium text-[#8A8F98]">
                    Password
                  </label>
                  <span className="text-[11px] text-[#5B5E66] font-mono">
                    Demo: Admin@123456
                  </span>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8A8F98]" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoFocus
                    required
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-9 py-2 bg-[#0B0C0E] border border-white/[0.08] rounded-[8px] text-sm text-[#EDEDEF] placeholder:text-[#5B5E66] focus:outline-none focus:border-[#5E6AD2] focus:ring-1 focus:ring-[#5E6AD2] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A8F98] hover:text-[#EDEDEF]"
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setStep(1);
                    setPassword('');
                    setLocalError(null);
                  }}
                  className="h-9 px-3 rounded-[8px] border-white/[0.08] bg-[#0B0C0E] hover:bg-[#191B21] text-xs text-[#8A8F98]"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !password}
                  className="flex-1 h-9 bg-[#5E6AD2] hover:bg-[#4F5BC4] text-white text-xs font-medium rounded-[8px] flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <span>Sign In to Workspace</span>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Quick Demo Profiles (1-Click Login Pills) */}
          <div className="pt-4 border-t border-white/[0.08] space-y-2">
            <div className="flex items-center justify-between text-[11px] text-[#8A8F98]">
              <span className="font-medium uppercase tracking-wider text-[10px]">Quick Demo Access</span>
              <span className="font-mono text-[10px] text-[#5B5E66]">1-Click Sign In</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {DEMO_ACCOUNTS.map((demo) => {
                const isLoggingIn = quickSigningIn === demo.role;
                return (
                  <button
                    key={demo.role}
                    type="button"
                    disabled={Boolean(quickSigningIn) || isLoading}
                    onClick={() => handleQuickDemo(demo.email, demo.password, demo.role)}
                    className="px-2.5 py-1.5 rounded-[6px] border border-white/[0.08] bg-[#0B0C0E] hover:bg-[#191B21] hover:border-[#5E6AD2]/50 text-left transition-colors flex items-center justify-between group text-xs cursor-pointer"
                  >
                    <div className="truncate">
                      <p className="font-medium text-[#EDEDEF] text-[11px] truncate">{demo.role}</p>
                      <p className="text-[10px] text-[#5B5E66] font-mono truncate">{demo.tag}</p>
                    </div>
                    {isLoggingIn ? (
                      <Loader2 className="w-3 h-3 animate-spin text-[#5E6AD2] shrink-0 ml-1" />
                    ) : (
                      <ArrowRight className="w-3 h-3 text-[#5B5E66] group-hover:text-[#5E6AD2] transition-colors shrink-0 ml-1 opacity-0 group-hover:opacity-100" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Studio Security Note */}
        <p className="text-center text-[11px] text-[#5B5E66] font-mono mt-4">
          PolyTrack Studio Monolith • Protected via HS256 JWT
        </p>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto py-2 text-center text-xs text-[#5B5E66]">
        <span>PolyTrack Studio Production Tracking</span>
      </footer>
    </div>
  );
}
