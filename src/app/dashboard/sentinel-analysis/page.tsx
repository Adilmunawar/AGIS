'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const SentinelAnalysisClient = dynamic(
  () => import('@/components/gis/SentinelAnalysisClient'),
  { 
    ssr: false, 
    loading: () => (
      <div className="h-full w-full bg-[#1a1a1a]" />
    )
  }
);

export default function SentinelAnalysisPage() {
  return <SentinelAnalysisClient />;
}
