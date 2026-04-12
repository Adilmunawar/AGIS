'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Map, Route, Layers as LayersIcon, LogOut, User as UserIcon, Server, Sparkles, Package, FolderInput, Database, Satellite, BarChart3, ChevronsLeft, ChevronsRight, ArrowRightLeft, Image as ImageIcon, Shield, FileText, Combine, AreaChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, useUser } from '@/firebase';
import { initiateSignOut } from '@/firebase/non-blocking-login';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { GisDataProvider } from '@/context/GisDataContext';
import Image from 'next/image';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

const sidebarNavItems = [
  { href: '/dashboard/digitize', label: 'Digitize Area', icon: Map },
  { href: '/dashboard/extract-roads', label: 'Extract Roads', icon: Route },
  { href: '/dashboard/merge-jsons', label: 'Data Merger', icon: Combine },
  { href: '/dashboard/export-shapefile', label: 'Data Converter', icon: ArrowRightLeft },
  { href: '/dashboard/nano-vision', label: 'Nano Vision', icon: Sparkles },
  { href: '/dashboard/import-parcels', label: 'Import Parcels', icon: FolderInput },
  { href: '/dashboard/parcels-database', label: 'Parcels Database', icon: Database },
  { href: '/dashboard/sentinel-vision', label: 'Sentinel Vision', icon: Satellite },
  { href: '/dashboard/custom-raster', label: 'Custom Raster', icon: ImageIcon },
  { href: '/dashboard/sentinel-analysis', label: 'Sentinel Analysis', icon: BarChart3 },
  { href: '/dashboard/greenery-analytics', label: 'Greenery Analytics', icon: AreaChart },
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

  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
    // Leaflet maps listen for the window's resize event. By dispatching it manually
    // after the sidebar transition, we force all maps on the page to re-evaluate
    // their container size and redraw correctly.
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 310); // A little longer than the 300ms transition duration
  };

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
        <div className="relative h-screen w-screen overflow-hidden bg-background">
          <aside className={cn(
            "absolute top-0 left-0 h-full bg-background/95 backdrop-blur-sm flex flex-col border-r transition-all duration-300 z-20 rounded-tr-2xl rounded-br-2xl",
            isCollapsed ? "w-20" : "w-64"
          )}>
            <div className={cn("p-4 border-b flex items-center gap-3", isCollapsed && "justify-center")}>
                <Image
                    src="/AGIS animation/AGIS (1).gif"
                    alt="AGIS Logo"
                    width={40}
                    height={40}
                    unoptimized
                    className="rounded-md"
                />
                {!isCollapsed && (
                    <div className="flex flex-col">
                        <h1 className="text-lg font-bold tracking-tight text-primary leading-tight">AGIS</h1>
                        <p className="text-xs text-muted-foreground">Advanced Geo-Processing</p>
                    </div>
                )}
            </div>
            
            <ScrollArea className="flex-1 p-3">
                <nav className="space-y-1">
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
                          <item.icon className={cn("h-5 w-5 flex-shrink-0", !isCollapsed && "mr-3")} />
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
                            <item.icon className={cn("h-5 w-5 flex-shrink-0", !isCollapsed && "mr-3")} />
                            <span className={cn(isCollapsed && "sr-only")}>
                              {item.label}
                            </span>
                          </Link>
                        </TooltipTrigger>
                        {isCollapsed && <TooltipContent side="right"><p>{item.label}</p></TooltipContent>}
                      </Tooltip>
                  ))}
                </nav>
            </ScrollArea>

            <div className="flex-shrink-0 border-t p-2 space-y-1">
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

              <Separator className="my-1" />

              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/privacy-policy"
                    className={cn(
                      "flex items-center rounded-md text-sm font-medium transition-colors text-muted-foreground hover:bg-accent/80 hover:text-foreground",
                      isCollapsed ? "h-10 w-full justify-center" : "px-3 py-1.5"
                    )}
                  >
                    <Shield className={cn("h-4 w-4 flex-shrink-0", !isCollapsed && "mr-3")} />
                    <span className={cn(isCollapsed && "sr-only")}>Privacy Policy</span>
                  </Link>
                </TooltipTrigger>
                {isCollapsed && <TooltipContent side="right"><p>Privacy Policy</p></TooltipContent>}
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/terms-of-service"
                    className={cn(
                      "flex items-center rounded-md text-sm font-medium transition-colors text-muted-foreground hover:bg-accent/80 hover:text-foreground",
                      isCollapsed ? "h-10 w-full justify-center" : "px-3 py-1.5"
                    )}
                  >
                    <FileText className={cn("h-4 w-4 flex-shrink-0", !isCollapsed && "mr-3")} />
                    <span className={cn(isCollapsed && "sr-only")}>Terms of Service</span>
                  </Link>
                </TooltipTrigger>
                {isCollapsed && <TooltipContent side="right"><p>Terms of Service</p></TooltipContent>}
              </Tooltip>
              
              <Tooltip>
                  <TooltipTrigger asChild>
                      <Button
                      variant="ghost"
                      size="sm"
                      className={cn("w-full justify-start text-muted-foreground", isCollapsed && "justify-center")}
                      onClick={() => initiateSignOut(auth)}
                      >
                      <LogOut className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
                      <span className={cn(isCollapsed && "sr-only")}>Sign Out</span>
                      </Button>
                  </TooltipTrigger>
                  {isCollapsed && <TooltipContent side="right"><p>Sign Out</p></TooltipContent>}
              </Tooltip>
            </div>
          </aside>

          <main className={cn(
            "h-full w-full overflow-hidden transition-all duration-300",
            isCollapsed ? "pl-20" : "pl-64"
          )}>
            <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleToggleCollapse}
                    variant="outline"
                    size="icon"
                    className="absolute top-1/2 z-30 h-7 w-7 rounded-full -translate-y-1/2 -translate-x-1/2 bg-background/90 backdrop-blur-xl shadow-lg border-border/50 transition-all duration-300 hover:scale-110 hover:border-primary/50"
                    style={{ left: isCollapsed ? '5rem' : '16rem' }}
                  >
                    {isCollapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10}>
                  <p>{isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}</p>
                </TooltipContent>
              </Tooltip>
            {children}
          </main>

        </div>
      </TooltipProvider>
    </GisDataProvider>
  );
}
