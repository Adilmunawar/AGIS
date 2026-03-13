'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Map, Route, Layers as LayersIcon, Download, LogOut, User as UserIcon, Loader2, Server, Sparkles, Package, FolderInput, Database, Satellite, BarChart3 } from 'lucide-react';
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
  { href: '/dashboard/parcels-database', label: 'Parcels Database', icon: Database },
  { href: '/dashboard/sentinel-vision', label: 'Sentinel Vision', icon: Satellite },
  { href: '/dashboard/sentinel-analysis', label: 'Sentinel Analysis', icon: BarChart3 },
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
      <div className="flex h-screen w-screen overflow-hidden bg-background">
        <aside className="w-56 flex-shrink-0 border-r bg-background flex flex-col">
          <div className="p-4 border-b flex-shrink-0">
            <h1 className="text-xl font-bold tracking-tight text-primary">AGIS</h1>
            <p className="text-xs text-muted-foreground">Advanced Geo-Processing</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-3">
              <nav className="space-y-1">
                <h2 className="px-2 text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-2">Tools</h2>
                {sidebarNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      pathname.startsWith(item.href)
                        ? "bg-accent text-accent-foreground font-semibold"
                        : "text-muted-foreground hover:bg-accent/80 hover:text-foreground"
                    )}
                  >
                    <item.icon className="mr-3 h-4 w-4 flex-shrink-0" />
                    {item.label}
                  </Link>
                ))}
              </nav>

              <nav className="mt-4 space-y-1">
                <h2 className="px-2 text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-2">System</h2>
                 {secondaryNavItems.map((item) => (
                    <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                        "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        pathname.startsWith(item.href)
                        ? "bg-accent text-accent-foreground font-semibold"
                        : "text-muted-foreground hover:bg-accent/80 hover:text-foreground"
                    )}
                    >
                    <item.icon className="mr-3 h-4 w-4 flex-shrink-0" />
                    {item.label}
                    </Link>
                ))}
              </nav>
          </div>

          <div className="flex-shrink-0 border-t p-2">
            <div className="p-2 rounded-lg hover:bg-accent/80 cursor-pointer group">
                <div className="flex items-center">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.photoURL || ''} />
                    <AvatarFallback><UserIcon size={16}/></AvatarFallback>
                  </Avatar>
                  <div className="ml-2 overflow-hidden">
                    <p className="text-sm font-semibold text-foreground truncate group-hover:text-accent-foreground">{user?.displayName || user?.email}</p>
                    <p className="text-xs text-muted-foreground truncate group-hover:text-accent-foreground/80">AGIS User</p>
                  </div>
                </div>
            </div>
             <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground mt-1"
              onClick={() => initiateSignOut(auth)}
            >
              <LogOut className="mr-3 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </aside>
        <main className="flex-1 relative min-h-0 overflow-hidden">{children}</main>
      </div>
    </GisDataProvider>
  );
}
