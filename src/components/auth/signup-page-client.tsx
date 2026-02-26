'use client';

import { SignUpForm } from '@/components/auth/signup-form';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

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
                Begin Your Analysis
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
                Create an account to unlock powerful geospatial intelligence tools.
            </p>
        </div>
      </div>
      <div className="flex items-center justify-center p-6 py-12 sm:p-12 bg-background">
        <SignUpForm />
      </div>
    </div>
  );
}
