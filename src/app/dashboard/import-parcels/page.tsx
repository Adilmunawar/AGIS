'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

const ImportParcelsClient = dynamic(
  () => import('@/components/gis/ImportParcelsClient'),
  {
    ssr: false,
    loading: () => <Skeleton className="w-full h-full rounded-none" />,
  }
);

export default function ImportParcelsPage() {
  return <ImportParcelsClient />;
}
