'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const NanoVisionClient = dynamic(() => import('@/components/gis/NanoVisionClient'), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full rounded-none" />,
});

export default function NanoVisionPage() {
  return (
    <div className="w-full h-full relative">
      <NanoVisionClient />
    </div>
  );
}
