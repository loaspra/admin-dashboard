'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/app/components/ui/button'; // Importing Shadcn Button

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
        {isLoading ? (
          <Button variant="outline" className="text-gray-500">
            Loading...
          </Button>
        ) : (
          <div className="text-gray-500">Welcome to the Admin Dashboard!</div>
        )}
      </div>
    </div>
  );
}
