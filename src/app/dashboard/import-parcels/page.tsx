'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

// Directly export the dynamically imported component to simplify the component tree
// and avoid potential HMR/rendering issues with nested client components.
const ImportParcelsPage = dynamic(() => import('@/components/gis/ImportParcelsClient'), {
  ssr: false,
  loading: () => <Skeleton className="w-full h-full rounded-none" />,
});

export default ImportParcelsPage;
