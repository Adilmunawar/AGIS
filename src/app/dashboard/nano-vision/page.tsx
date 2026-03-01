'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const NanoVisionPage = dynamic(() => import('@/components/gis/NanoVisionClient'), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full rounded-none" />,
});

export default NanoVisionPage;
