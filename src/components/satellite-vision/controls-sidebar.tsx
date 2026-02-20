'use client';

import * as React from 'react';
import {
  Download,
  Loader2,
  Search,
  MapPin,
  LogOut,
  User as UserIcon,
  Bot,
  PenSquare,
  ChevronLeft,
  Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useUser } from '@/firebase';
import { initiateSignOut } from '@/firebase/non-blocking-login';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export type ActiveTool = 'detection' | 'digitize';

type ControlsSidebarProps = {
  colabUrl: string;
  setColabUrl: (url: string) => void;
  onDetect: () => void;
  onDownload: () => void;
  onDownloadDigitized: () => void;
  onSearchLocation: (lat: number, lon: number) => void;
  isLoading: boolean;
  hasGeoJson: boolean;
  hasSelection: boolean;
  hasManualFeatures: boolean;
  activeTool: ActiveTool;
  setActiveTool: (tool: ActiveTool) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
};

const iconRailWidth = 'w-16';
const panelWidth = 'w-80';

export function ControlsSidebar({
  colabUrl,
  setColabUrl,
  onDetect,
  onDownload,
  onDownloadDigitized,
  onSearchLocation,
  isLoading,
  hasGeoJson,
  hasSelection,
  hasManualFeatures,
  activeTool,
  setActiveTool,
  isOpen,
  setIsOpen,
}: ControlsSidebarProps) {
  const auth = useAuth();
  const { user } = useUser();
  const { toast } = useToast();

  const handleSignOut = () => {
    initiateSignOut(auth);
    toast({
      title: 'Signed Out',
      description: 'You have been successfully signed out.',
    });
  };

  return (
    <TooltipProvider delayDuration={100}>
    <aside className="flex h-full shrink-0 shadow-lg z-10">
      {/* Icon Rail */}
      <div className={cn("flex flex-col items-center h-full border-r border-border bg-card", iconRailWidth)}>
         <div className="p-2 mt-2 mb-2">
             <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} className="h-10 w-10">
                 {isOpen ? <ChevronLeft /> : <Menu />}
             </Button>
         </div>

        <div className="flex flex-col items-center gap-2">
            <IconButton 
                icon={<Bot />} 
                label="Auto-Detection" 
                isActive={activeTool === 'detection'} 
                onClick={() => {
                    setActiveTool('detection');
                    if (!isOpen) setIsOpen(true);
                }}
            />
            <IconButton 
                icon={<PenSquare />} 
                label="Manual Parceling" 
                isActive={activeTool === 'digitize'} 
                onClick={() => {
                    setActiveTool('digitize');
                    if (!isOpen) setIsOpen(true);
                }}
            />
        </div>
        <div className="mt-auto flex flex-col items-center gap-2 mb-4">
            <IconButton icon={<UserIcon />} label={user?.email ?? "User"} />
            <IconButton icon={<LogOut />} label="Sign Out" onClick={handleSignOut} />
        </div>
      </div>
      
      {/* Tool Panel */}
      <div className={cn("flex flex-col h-full bg-card transition-all duration-300 overflow-hidden", isOpen ? panelWidth : "w-0")}>
        <div className="flex items-center p-4 border-b border-border h-14 shrink-0">
          <h2 className="text-lg font-semibold text-card-foreground">
            {activeTool === 'detection' ? 'Auto-Detection' : 'Manual Parceling'}
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {activeTool === 'detection' && (
                <DetectionPanel 
                    colabUrl={colabUrl}
                    setColabUrl={setColabUrl}
                    onDetect={onDetect}
                    onDownload={onDownload}
                    isLoading={isLoading}
                    hasGeoJson={hasGeoJson}
                    hasSelection={hasSelection}
                    onSearchLocation={onSearchLocation}
                />
            )}
            {activeTool === 'digitize' && (
                <DigitizePanel 
                    onDownloadDigitized={onDownloadDigitized}
                    isLoading={isLoading}
                    hasManualFeatures={hasManualFeatures}
                />
            )}
        </div>
      </div>
    </aside>
    </TooltipProvider>
  );
}


function IconButton({ icon, label, isActive, onClick }: { icon: React.ReactNode, label: string, isActive?: boolean, onClick?: () => void }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="icon"
                    className={cn("h-10 w-10 rounded-lg", isActive && "bg-primary/10 text-primary")}
                    onClick={onClick}
                    aria-label={label}
                >
                    {icon}
                </Button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
                <p>{label}</p>
            </TooltipContent>
        </Tooltip>
    );
}

function DetectionPanel({ colabUrl, setColabUrl, onDetect, onDownload, isLoading, hasGeoJson, hasSelection, onSearchLocation }: any) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);
  const { toast } = useToast();

  const handleDirectSearch = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
          searchQuery
        )}`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        onSearchLocation(parseFloat(lat), parseFloat(lon));
        setSearchQuery(display_name);
        toast({
          title: 'Found location',
          description: `Flying to ${display_name}`,
        });
      } else {
        toast({
          title: 'Not found',
          description: 'Could not find that location.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Search failed.',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };
    
    return (
        <>
            <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Navigate to Area</h3>
                 <div className="flex gap-2">
                    <Input
                    placeholder="Search city, area..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleDirectSearch();
                    }}
                    autoComplete="off"
                    />
                    <Button
                    size="icon"
                    variant="outline"
                    onClick={handleDirectSearch}
                    disabled={isSearching || !searchQuery.trim()}
                    className="h-10 w-10"
                    >
                    {isSearching ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Search className="h-4 w-4" />
                    )}
                    </Button>
                </div>
            </div>
            <Separator />
            <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">1. Connect Server</h3>
                <Input
                  type="url"
                  placeholder="Paste Colab/Ngrok URL"
                  value={colabUrl}
                  onChange={(e) => setColabUrl(e.target.value)}
                  disabled={isLoading}
                />
            </div>
            <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">2. Select Area & Detect</h3>
                <div className="flex flex-col gap-2 rounded-lg bg-background p-3 text-sm text-muted-foreground border border-dashed">
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>Pan, draw a rectangle, or click on rooftops to define the detection area.</span>
                  </div>
                </div>
            </div>
            <div className="space-y-2 pt-2">
                <Button
                  onClick={onDetect}
                  disabled={isLoading || !hasSelection}
                  className="w-full h-11 text-base"
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Bot className="mr-2 h-5 w-5" />
                  )}
                  Detect Buildings
                </Button>
                <Button
                  variant="secondary"
                  onClick={onDownload}
                  disabled={!hasGeoJson || isLoading}
                  className="w-full"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Detected Data (.zip)
                </Button>
            </div>
        </>
    );
}

function DigitizePanel({ onDownloadDigitized, isLoading, hasManualFeatures }: any) {
    return (
        <>
            <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Manual Digitization Tools</h3>
                <div className="flex flex-col gap-2 rounded-lg bg-background p-3 text-sm text-muted-foreground border border-dashed">
                   <div className="flex items-start gap-3">
                     <PenSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                     <span>Use the drawing tools on the map to create, edit, and measure polygons and lines.</span>
                   </div>
                </div>
              </div>
               <div className="space-y-2 pt-2">
                 <Button
                    variant="secondary"
                    onClick={onDownloadDigitized}
                    disabled={isLoading || !hasManualFeatures}
                    className='w-full'
                    title={
                      !hasManualFeatures
                        ? 'Draw one or more shapes on the map first'
                        : 'Download your manually drawn shapes'
                    }
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Digitized Layer (.geojson)
                  </Button>
               </div>
        </>
    )
}
