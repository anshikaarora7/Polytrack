import { Suspense } from 'react';
import LoginForm from '@/components/login-form';

export const metadata = {
  title: 'Login - PolyTrack Studio Production Tracking',
  description: 'Sign in to your PolyTrack project and asset tracking dashboard',
};

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-bg flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-border border-t-accent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

