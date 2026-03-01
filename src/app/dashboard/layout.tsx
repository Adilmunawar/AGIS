'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Map, Route, Layers as LayersIcon, Download, LogOut, User as UserIcon, Loader2, Server, Sparkles, Package, FolderInput } from 'lucide-react';
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
  { href: '/dashboard/import-parcels', label: 'Import Parcels', icon: FolderInput },
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
    if (isUserLoading) return; // Wait until the user state is resolved.

    if (!user) {
      // If no user, redirect to login.
      router.replace('/login');
    } else if (pathname === '/dashboard') {
      // If the user is logged in and at the base dashboard, redirect to the first tool.
      router.replace('/dashboard/digitize');
    }
  }, [user, isUserLoading, pathname, router]);

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
        <aside className="w-72 flex-shrink-0 border-r bg-gray-50 flex flex-col">
          <div className="p-5 border-b">
            <h1 className="text-2xl font-bold tracking-tight text-primary">AGIS</h1>
            <p className="text-sm text-muted-foreground">Advanced Geo-Processing</p>
          </div>
          <nav className="flex-1 space-y-2 p-4">
            <h2 className="px-3 text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-2">Tools</h2>
            {sidebarNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  pathname.startsWith(item.href)
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-black/5 hover:text-foreground"
                )}
              >
                <item.icon className="mr-4 h-5 w-5 flex-shrink-0" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="p-4 border-t">
            <h2 className="px-3 text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-2">System</h2>
            <nav className="space-y-2">
               {secondaryNavItems.map((item) => (
                  <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                      "flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      pathname.startsWith(item.href)
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-black/5 hover:text-foreground"
                  )}
                  >
                  <item.icon className="mr-4 h-5 w-5 flex-shrink-0" />
                  {item.label}
                  </Link>
              ))}
            </nav>
          </div>
          <div className="mt-auto border-t p-3">
            <div className="p-2 rounded-lg hover:bg-black/5">
                <div className="flex items-center">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user?.photoURL || ''} />
                    <AvatarFallback><UserIcon size={20}/></AvatarFallback>
                  </Avatar>
                  <div className="ml-3">
                    <p className="text-sm font-semibold text-foreground truncate">{user?.displayName || user?.email}</p>
                    <p className="text-xs text-muted-foreground truncate">AGIS User</p>
                  </div>
                </div>
            </div>
             <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground mt-2"
              onClick={() => initiateSignOut(auth)}
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sign Out
            </Button>
          </div>
        </aside>
        <main className="flex-1 relative min-h-0">{children}</main>
      </div>
    </GisDataProvider>
  );
}
