'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const SentinelAnalysisClient = dynamic(
  () => import('@/components/gis/SentinelAnalysisClient'),
  { 
    ssr: false, 
    loading: () => (
      <div className="h-full w-full flex flex-col items-center justify-center bg-[#1a1a1a] text-white">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p>Initializing Analysis Engine...</p>
      </div>
    )
  }
);

export default function SentinelAnalysisPage() {
  return <SentinelAnalysisClient />;
}
