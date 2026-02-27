'use client';

import { LoginForm } from '@/components/auth/login-form';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

export function LoginPageClient() {
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
    <div className="w-full min-h-screen lg:grid lg:grid-cols-2">
      <div className="hidden bg-white lg:flex flex-col items-center justify-center p-12 text-center">
        <div className="max-w-md">
            <Image 
                src="/AGIS animation/AGIS (1).gif"
                alt="AGIS Logo Animation"
                width={192}
                height={192}
                className="mx-auto"
                unoptimized
            />
            <h1 className="mt-8 text-4xl font-bold tracking-tight text-foreground">
                Access Your World
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
                Log in to the premier platform for advanced satellite imagery analysis.
            </p>
        </div>
      </div>
      <div className="relative flex flex-col items-center justify-center p-6 py-12 sm:p-12 bg-background">
        <LoginForm />
        <p className="absolute bottom-6 text-center text-sm text-muted-foreground">
          Proudly developed by Adil Munawar
        </p>
      </div>
    </div>
  );
}
