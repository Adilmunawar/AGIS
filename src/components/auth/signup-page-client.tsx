'use client';

import { SignUpForm } from '@/components/auth/signup-form';
import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { WavyBackground } from '@/components/ui/wavy-background';

export function SignUpPageClient() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && user) {
      router.replace('/dashboard/digitize');
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
      <WavyBackground
        backgroundFill="white"
        colors={['#14B886', '#4DB6AC', '#7AD9B8', '#DAE0E5']}
        waveOpacity={0.2}
        blur={7}
        speed="slow"
      >
        <SignUpForm />
      </WavyBackground>
      <footer className="absolute bottom-4 w-full text-center text-sm text-muted-foreground">
        <p>
          Proudly developed by{' '}
          <span className="font-semibold text-primary">Adil Munawar</span>
        </p>
      </footer>
    </>
  );
}
