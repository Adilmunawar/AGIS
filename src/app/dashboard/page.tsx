'use client';

import { Loader2 } from 'lucide-react';

// This component is only visible for a moment while the layout redirects.
export default function DashboardLoadingPage() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background">
      <Loader2 className="h-16 w-16 animate-spin text-primary" />
    </div>
  );
}
