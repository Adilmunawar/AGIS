'use client';

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Dynamically import the map client with SSR disabled to prevent window-related errors.
const CustomRasterMap = dynamic(
  () => import('@/components/gis/CustomRasterClient'),
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

export default function CustomRasterPage() {
  return (
    // This relative container is the anchor for the absolutely positioned map.
    <div className="relative h-full w-full overflow-hidden">
      <CustomRasterMap />
    </div>
  );
}
