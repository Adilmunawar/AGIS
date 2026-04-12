'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const GreeneryAnalyticsClient = dynamic(
  () => import('@/components/gis/GreeneryAnalyticsClient'),
  {
    ssr: false,
    loading: () => <Skeleton className="w-full h-full rounded-none" />,
  }
);

export default function GreeneryAnalyticsPage() {
  return <GreeneryAnalyticsClient />;
}
