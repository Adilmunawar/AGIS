'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const DigitizeMap = dynamic(() => import('@/components/gis/DigitizeMap'), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full" />,
});

export default function DigitizePage() {
  return <DigitizeMap />;
}
