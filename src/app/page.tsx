'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/app/components/ui/button';
import { AuroraBackground } from '@/app/components/ui/aurora-background';

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // Once auth state is determined, redirect appropriately
    if (!isLoading) {
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/login');
      }
    }
  }, [user, isLoading, router]);

  // Simple loading state while determining auth
  return (
    <AuroraBackground className="h-screen overflow-hidden">
      <div className="flex flex-col items-center justify-center h-full w-full">
        <div className="text-center px-4">
          <h1 className="text-3xl font-bold mb-4 text-white">Admin Dashboard</h1>
          {isLoading ? (
            <Button variant="outline" className="bg-white/10 backdrop-blur-sm text-white border-white/20 hover:bg-white/20 transition-colors">
              Loading...
            </Button>
          ) : (
            <div className="text-white/80">Welcome to the Admin Dashboard!</div>
          )}
        </div>
      </div>
    </AuroraBackground>
  );
}
