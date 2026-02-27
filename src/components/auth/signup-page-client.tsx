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
    <>
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background p-6">
        <SignUpForm />
      </div>
      <p className="fixed bottom-6 w-full text-center text-sm text-muted-foreground">
        Proudly developed by{' '}
        <span className="font-semibold text-primary">Adil Munawar</span>
      </p>
    </>
  );
}
