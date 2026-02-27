'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const AiVisionClient = dynamic(() => import('@/components/gis/AiVisionClient'), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full rounded-none" />,
});

export default function AiVisionPage() {
  return (
    <div className="w-full h-full relative">
      <AiVisionClient />
    </div>
  );
}
