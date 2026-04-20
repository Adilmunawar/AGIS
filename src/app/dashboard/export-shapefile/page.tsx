'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

// Dynamically import the client component with SSR disabled
const DataConverterClient = dynamic(
  () => import('@/components/gis/DataConverterClient'),
  {
    ssr: false,
    loading: () => <Skeleton className="w-full h-full rounded-none" />,
  }
);

export default function DataConverterPage() {
  return <DataConverterClient />;
}
