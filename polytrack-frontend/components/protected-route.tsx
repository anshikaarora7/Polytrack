'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { apiClient } from '@/lib/api-client';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const { token, isAuthenticated, hydrate } = useAuthStore();
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    // 1. Check if token already exists in memory
    let activeToken = token;

    // 2. Synchronously check client storage to prevent premature bounce
    if (!activeToken && typeof window !== 'undefined') {
      try {
        const storedToken = localStorage.getItem('accessToken');
        if (storedToken) {
          activeToken = storedToken;
          apiClient.setAuthToken(storedToken);
          hydrate();
        } else {
          const authStorage = localStorage.getItem('auth-storage');
          if (authStorage) {
            const parsed = JSON.parse(authStorage);
            const parsedToken = parsed?.state?.token;
            if (typeof parsedToken === 'string' && parsedToken) {
              activeToken = parsedToken;
              apiClient.setAuthToken(parsedToken);
              hydrate();
            }
          }
        }
      } catch (e) {
        // ignore parse errors
      }
    }

    if (!activeToken && !isAuthenticated) {
      router.replace('/login');
    } else {
      setIsVerifying(false);
    }
  }, [token, isAuthenticated, hydrate, router]);

  // While verifying session state, render quiet precision loader
  if (isVerifying && !token && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-text-muted font-mono">Verifying studio session...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
