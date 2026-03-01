'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Map, Route, Layers as LayersIcon, Download, LogOut, User as UserIcon, Loader2, Server, Sparkles, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, useUser } from '@/firebase';
import { initiateSignOut } from '@/firebase/non-blocking-login';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { GisDataProvider } from '@/context/GisDataContext';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

const sidebarNavItems = [
  { href: '/dashboard/digitize', label: 'Digitize Area', icon: Map },
  { href: '/dashboard/extract-roads', label: 'Extract Roads', icon: Route },
  { href: '/dashboard/merge-jsons', label: 'Merge JSONs', icon: LayersIcon },
  { href: '/dashboard/export-shapefile', label: 'Export Shapefile', icon: Download },
  { href: '/dashboard/nano-vision', label: 'Nano Vision', icon: Sparkles },
  { href: '/dashboard/import-parcels', label: 'Import Parcels', icon: Package },
];

const secondaryNavItems = [
    { href: '/dashboard/server-config', label: 'Server Config', icon: Server },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <GisDataProvider>
      <div className="flex h-screen w-full bg-background">
        <aside className="w-64 flex-shrink-0 border-r bg-gray-50 flex flex-col">
          <div className="p-4 border-b">
            <h1 className="text-xl font-bold tracking-tight text-primary">AGIS</h1>
            <p className="text-xs text-muted-foreground">Advanced Geo-Processing</p>
          </div>
          <nav className="flex-1 space-y-1 p-2">
            {sidebarNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  pathname.startsWith(item.href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-black/5"
                )}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="p-2 border-t">
            <nav className="space-y-1">
               {secondaryNavItems.map((item) => (
                  <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                      "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      pathname.startsWith(item.href)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-black/5"
                  )}
                  >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.label}
                  </Link>
              ))}
            </nav>
          </div>
          <div className="mt-auto border-t p-2">
            <div className="p-2 rounded-lg hover:bg-black/5">
                <div className="flex items-center">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user?.photoURL || ''} />
                    <AvatarFallback><UserIcon size={20}/></AvatarFallback>
                  </Avatar>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-foreground truncate">{user?.displayName || user?.email}</p>
                    <p className="text-xs text-muted-foreground truncate">AGIS User</p>
                  </div>
                </div>
            </div>
             <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground mt-1"
              onClick={() => initiateSignOut(auth)}
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sign Out
            </Button>
          </div>
        </aside>
        <main className="flex-1 relative">{children}</main>
      </div>
    </GisDataProvider>
  );
}
