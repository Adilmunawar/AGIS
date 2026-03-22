'use client';

import Image from 'next/image';

// This component is only visible for a moment while the layout redirects.
export default function DashboardLoadingPage() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
      <Image
        src="/AGIS animation/AGIS (1).gif"
        alt="AGIS Loading Animation"
        width={128}
        height={128}
        unoptimized
      />
      <p className="mt-4 text-lg font-semibold text-primary">Redirecting...</p>
    </div>
  );
}
