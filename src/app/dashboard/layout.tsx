'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Map, Route, Layers as LayersIcon, Download, LogOut, User as UserIcon, Server, Sparkles, Package, FolderInput, Database, Satellite, BarChart3, PanelLeftClose, PanelRightClose } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, useUser } from '@/firebase';
import { initiateSignOut } from '@/firebase/non-blocking-login';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { GisDataProvider } from '@/context/GisDataContext';
import Image from 'next/image';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"


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
  const [isCollapsed, setIsCollapsed] = useState(false);

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
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <Image
          src="/AGIS animation/AGIS (1).gif"
          alt="AGIS Loading Animation"
          width={128}
          height={128}
          unoptimized
        />
        <p className="mt-4 text-lg font-semibold text-primary">Initializing AGIS Interface...</p>
      </div>
    );
  }

  return (
    <GisDataProvider>
      <TooltipProvider delayDuration={0}>
        <div className="flex h-screen w-screen overflow-hidden bg-background">
          <aside className={cn(
            "flex-shrink-0 bg-background flex flex-col border-r transition-all duration-300",
            isCollapsed ? "w-20" : "w-56"
          )}>
            <div className={cn(
                "p-4 border-b flex-shrink-0 flex items-center justify-between",
                isCollapsed && "p-2 justify-center"
            )}>
                {!isCollapsed && (
                    <div className="flex-1">
                        <h1 className="text-xl font-bold tracking-tight text-primary">AGIS</h1>
                        <p className="text-xs text-muted-foreground">Advanced Geo-Processing</p>
                    </div>
                )}
                <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(!isCollapsed)} className="flex-shrink-0">
                    {isCollapsed ? <PanelRightClose /> : <PanelLeftClose />}
                </Button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-3">
                <nav className="space-y-1">
                  <h2 className={cn(
                    "px-2 text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-2",
                    isCollapsed && "text-center"
                  )}>
                    {isCollapsed ? "T" : "Tools"}
                  </h2>
                  {sidebarNavItems.map((item) => (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center rounded-md text-sm font-medium transition-colors",
                            isCollapsed ? "h-12 w-full justify-center" : "px-3 py-2",
                            pathname.startsWith(item.href)
                              ? "bg-accent text-accent-foreground font-semibold"
                              : "text-muted-foreground hover:bg-accent/80 hover:text-foreground"
                          )}
                        >
                          <item.icon className={cn("flex-shrink-0", isCollapsed ? "h-6 w-6" : "mr-3 h-4 w-4")} />
                          <span className={cn(isCollapsed && "sr-only")}>
                            {item.label}
                          </span>
                        </Link>
                      </TooltipTrigger>
                      {isCollapsed && <TooltipContent side="right"><p>{item.label}</p></TooltipContent>}
                    </Tooltip>
                  ))}
                </nav>

                <nav className="mt-4 space-y-1">
                  <h2 className={cn(
                    "px-2 text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-2",
                    isCollapsed && "text-center"
                  )}>
                    {isCollapsed ? "S" : "System"}
                  </h2>
                   {secondaryNavItems.map((item) => (
                      <Tooltip key={item.href}>
                        <TooltipTrigger asChild>
                          <Link
                            href={item.href}
                            className={cn(
                              "flex items-center rounded-md text-sm font-medium transition-colors",
                              isCollapsed ? "h-12 w-full justify-center" : "px-3 py-2",
                              pathname.startsWith(item.href)
                                ? "bg-accent text-accent-foreground font-semibold"
                                : "text-muted-foreground hover:bg-accent/80 hover:text-foreground"
                            )}
                          >
                            <item.icon className={cn("flex-shrink-0", isCollapsed ? "h-6 w-6" : "mr-3 h-4 w-4")} />
                            <span className={cn(isCollapsed && "sr-only")}>
                              {item.label}
                            </span>
                          </Link>
                        </TooltipTrigger>
                        {isCollapsed && <TooltipContent side="right"><p>{item.label}</p></TooltipContent>}
                      </Tooltip>
                  ))}
                </nav>
            </div>

            <div className="flex-shrink-0 border-t p-2">
              <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-2 rounded-lg hover:bg-accent/80 cursor-pointer group">
                        <div className={cn("flex items-center", isCollapsed && "justify-center")}>
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user?.photoURL || ''} />
                            <AvatarFallback><UserIcon size={16}/></AvatarFallback>
                          </Avatar>
                          <div className={cn("ml-2 overflow-hidden", isCollapsed && "hidden")}>
                            <p className="text-sm font-semibold text-foreground truncate group-hover:text-accent-foreground">{user?.displayName || user?.email}</p>
                            <p className="text-xs text-muted-foreground truncate group-hover:text-accent-foreground/80">AGIS User</p>
                          </div>
                        </div>
                    </div>
                  </TooltipTrigger>
                  {isCollapsed && <TooltipContent side="right"><p>{user?.displayName || user?.email}</p></TooltipContent>}
              </Tooltip>
               <Button
                variant="ghost"
                size="sm"
                className={cn("w-full justify-start text-muted-foreground mt-1", isCollapsed && "justify-center")}
                onClick={() => initiateSignOut(auth)}
              >
                <LogOut className={cn("h-4 w-4", !isCollapsed && "mr-3")} />
                <span className={cn(isCollapsed && "sr-only")}>Sign Out</span>
              </Button>
            </div>
          </aside>
          <main className="flex-1 relative min-h-0 overflow-hidden">{children}</main>
        </div>
      </TooltipProvider>
    </GisDataProvider>
  );
}
