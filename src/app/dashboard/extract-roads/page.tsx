'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const ExtractRoadsPage = dynamic(() => import('@/components/gis/ExtractRoadsClient'), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full rounded-none" />,
});

export default ExtractRoadsPage;
