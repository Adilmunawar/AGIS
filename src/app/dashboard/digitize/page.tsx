'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const DigitizeMapClient = dynamic(() => import('@/components/gis/DigitizeMapClient'), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full rounded-none" />,
});

export default function DigitizePage() {
  return (
    <div className="w-full h-full relative">
      <DigitizeMapClient />
    </div>
  );
}
