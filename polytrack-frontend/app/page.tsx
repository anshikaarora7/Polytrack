'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';

export default function Page() {
  const router = useRouter();
  const { isAuthenticated, token } = useAuthStore();

  useEffect(() => {
    const hasToken = token || (typeof window !== 'undefined' && localStorage.getItem('accessToken'));
    if (isAuthenticated || hasToken) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [isAuthenticated, token, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0B0C0E]">
      <div className="text-center space-y-3">
        <div className="w-6 h-6 border-2 border-white/10 border-t-[#5E6AD2] rounded-full animate-spin mx-auto" />
        <p className="text-xs text-[#8A8F98] font-mono">Routing to studio workspace...</p>
      </div>
    </div>
  );
}
