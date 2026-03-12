'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const SentinelVisionMap = dynamic(
  () => import('@/components/gis/SentinelVisionClient'),
  { 
    ssr: false, 
    loading: () => (
      <div className="h-full w-full flex flex-col items-center justify-center bg-[#1a1a1a] text-white">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p>Initializing Earth Engine Interface...</p>
      </div>
    )
  }
);

export default function SentinelVisionPage() {
  return (
    <div className="h-full w-full overflow-hidden">
      <SentinelVisionMap />
    </div>
  );
}
