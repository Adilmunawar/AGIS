'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const SentinelVisionPage = dynamic(
  () => import('@/components/gis/SentinelVisionClient'),
  {
    ssr: false,
    loading: () => (
        <div className="flex h-full w-full">
            <div className="w-80 h-full p-4">
                <Skeleton className="w-full h-full" />
            </div>
            <div className="flex-1 h-full p-4 pl-0">
                <Skeleton className="w-full h-full" />
            </div>
        </div>
    ),
  }
);

export default SentinelVisionPage;
