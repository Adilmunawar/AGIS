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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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

// A smart button that renders differently based on the sidebar's state (open/closed).
function SidebarButton({
  icon,
  label,
  isActive,
  isOpen,
  ...props
}: {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  isOpen: boolean;
  [key: string]: any;
}) {
  if (!isOpen) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isActive ? 'secondary' : 'ghost'}
            size="icon"
            className="h-10 w-10 shrink-0"
            aria-label={label}
            {...props}
          >
            {icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={5}>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button
      variant={isActive ? 'secondary' : 'ghost'}
      className="h-10 w-full justify-start gap-3 px-3"
      {...props}
    >
      {icon}
      <span className="truncate">{label}</span>
    </Button>
  );
}

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
      <aside
        className={cn(
          'flex h-full shrink-0 flex-col border-r border-border bg-card shadow-lg z-10 transition-all duration-300',
          isOpen ? 'w-80' : 'w-16'
        )}
      >
        {/* Header with Toggle */}
        <div className="flex h-14 shrink-0 items-center justify-center border-b border-border p-2">
          <SidebarButton
            icon={isOpen ? <ChevronLeft /> : <Menu />}
            label={isOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
            isOpen={isOpen}
            onClick={() => setIsOpen(!isOpen)}
          />
        </div>

        {/* Tool Switcher */}
        <nav className="flex flex-col items-center gap-2 p-2">
          <SidebarButton
            icon={<Bot />}
            label="Auto-Detection"
            isActive={activeTool === 'detection'}
            isOpen={isOpen}
            onClick={() => setActiveTool('detection')}
          />
          <SidebarButton
            icon={<PenSquare />}
            label="Manual Parceling"
            isActive={activeTool === 'digitize'}
            isOpen={isOpen}
            onClick={() => setActiveTool('digitize')}
          />
        </nav>

        {/* --- EXPANDED CONTENT --- */}
        <div
          className={cn(
            'flex flex-1 flex-col overflow-y-auto border-t border-border',
            isOpen ? 'flex' : 'hidden'
          )}
        >
          {/* Panel Header */}
          <div className="p-4">
            <h2 className="text-lg font-semibold text-card-foreground">
              {activeTool === 'detection'
                ? 'Auto-Detection'
                : 'Manual Parceling'}
            </h2>
          </div>

          {/* Panel Body */}
          <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-4">
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

        {/* Spacer to push footer to bottom in collapsed mode */}
        <div className={cn('mt-auto', isOpen ? 'hidden' : 'block')}></div>

        {/* Footer */}
        <div className="border-t border-border p-2">
          <div className="flex flex-col items-center gap-2">
            <SidebarButton
              icon={<UserIcon />}
              label={user?.email ?? 'User'}
              isOpen={isOpen}
            />
            <SidebarButton
              icon={<LogOut />}
              label="Sign Out"
              isOpen={isOpen}
              onClick={handleSignOut}
            />
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}

// These are the control panels for each tool.

function DetectionPanel({
  colabUrl,
  setColabUrl,
  onDetect,
  onDownload,
  isLoading,
  hasGeoJson,
  hasSelection,
  onSearchLocation,
}: any) {
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
        <h3 className="text-sm font-medium text-muted-foreground">
          Navigate to Area
        </h3>
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
            className="h-10 w-10 shrink-0"
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
        <h3 className="text-sm font-medium text-muted-foreground">
          1. Connect Server
        </h3>
        <Input
          type="url"
          placeholder="Paste Colab/Ngrok URL"
          value={colabUrl}
          onChange={(e) => setColabUrl(e.target.value)}
          disabled={isLoading}
        />
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          2. Select Area & Detect
        </h3>
        <div className="flex flex-col gap-2 rounded-lg bg-background p-3 text-sm text-muted-foreground border border-dashed">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              Pan, draw a rectangle, or click on rooftops to define the
              detection area.
            </span>
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

function DigitizePanel({
  onDownloadDigitized,
  isLoading,
  hasManualFeatures,
}: any) {
  return (
    <>
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Manual Digitization Tools
        </h3>
        <div className="flex flex-col gap-2 rounded-lg bg-background p-3 text-sm text-muted-foreground border border-dashed">
          <div className="flex items-start gap-3">
            <PenSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              Use the drawing tools on the map to create, edit, and measure
              polygons and lines.
            </span>
          </div>
        </div>
      </div>
      <div className="space-y-2 pt-2">
        <Button
          variant="secondary"
          onClick={onDownloadDigitized}
          disabled={isLoading || !hasManualFeatures}
          className="w-full"
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
  );
}
