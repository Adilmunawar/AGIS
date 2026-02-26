'use client';

import { SignUpForm } from '@/components/auth/signup-form';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, Globe } from 'lucide-react';

export default function SignUpPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && user) {
      router.replace('/');
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
       <div className="animated-gradient hidden lg:flex flex-col items-center justify-center p-12 text-center text-white">
        <div className="max-w-md">
            <Globe className="mx-auto h-24 w-24" />
            <h1 className="mt-8 text-4xl font-bold tracking-tight">
                Create Your Account
            </h1>
            <p className="mt-4 text-lg text-primary-foreground/80">
                Join the platform for advanced satellite imagery analysis and building detection.
            </p>
        </div>
      </div>
      <div className="flex items-center justify-center p-6 py-12 sm:p-12 bg-background">
        <SignUpForm />
      </div>
    </div>
  );
}
