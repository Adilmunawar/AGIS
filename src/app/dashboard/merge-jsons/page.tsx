'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const MergeJsonsClient = dynamic(() => import('@/components/gis/MergeJsonsClient'), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full rounded-none" />,
});

export default function MergeJsonsPage() {
  return <MergeJsonsClient />;
}
