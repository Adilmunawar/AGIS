'use client';

import { SignUpForm } from '@/components/auth/signup-form';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export function SignUpPageClient() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && user) {
      router.replace('/dashboard');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <main className="flex flex-grow items-center justify-center p-4">
        <SignUpForm />
      </main>
      <footer className="w-full flex-shrink-0 py-4 text-center text-sm text-muted-foreground">
        <p>
          Proudly developed by{' '}
          <span className="font-semibold text-primary">Adil Munawar</span>
        </p>
      </footer>
    </div>
  );
}
