'use client';

import * as React from 'react';
import {
  Download,
  Loader2,
  Globe,
  Search,
  MapPin,
  FileJson,
  LogOut,
  User as UserIcon,
} from 'lucide-react';

import {
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';
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
};

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
}: ControlsSidebarProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const searchContainerRef = React.useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const auth = useAuth();
  const { user } = useUser();

  React.useEffect(() => {
    if (searchQuery.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const fetchSuggestions = async () => {
      setIsSearching(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(
            searchQuery
          )}`
        );
        const data = await response.json();
        setSuggestions(data || []);
        setShowSuggestions(true);
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Search suggestion fetch failed.',
          variant: 'destructive',
        });
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, toast]);

  const handleDirectSearch = async () => {
    if (!searchQuery) return;
    setShowSuggestions(false);
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
        setSearchQuery(display_name); // Update input with full name
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

  const handleSuggestionClick = (suggestion: any) => {
    const { lat, lon, display_name } = suggestion;
    onSearchLocation(parseFloat(lat), parseFloat(lon));
    setSearchQuery(display_name);
    setShowSuggestions(false);
    toast({
      title: 'Found location',
      description: `Flying to ${display_name}`,
    });
  };

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [searchContainerRef]);

  const handleSignOut = () => {
    initiateSignOut(auth);
    toast({
      title: 'Signed Out',
      description: 'You have been successfully signed out.',
    });
  };

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2">
          <Globe className="text-primary" />
          <h1 className="text-xl font-semibold">AGIS</h1>
        </div>
        <Separator />
      </SidebarHeader>

      <SidebarContent className="p-0">
        <div className="flex flex-col gap-4 p-4">
          {/* 1. Connection */}
          <SidebarGroup className="p-0">
            <SidebarGroupLabel>1. Connect Server</SidebarGroupLabel>
            <Input
              type="url"
              placeholder="Ngrok URL (e.g., https://...)"
              value={colabUrl}
              onChange={(e) => setColabUrl(e.target.value)}
              disabled={isLoading}
            />
          </SidebarGroup>

          {/* 2. Navigation */}
          <SidebarGroup className="p-0">
            <SidebarGroupLabel>2. Navigate</SidebarGroupLabel>
            <div className="relative" ref={searchContainerRef}>
              <div className="flex gap-2">
                <Input
                  placeholder="Search (e.g. Lahore, DHA Phase 6)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleDirectSearch();
                    if (e.key === 'Escape') setShowSuggestions(false);
                  }}
                  onFocus={() =>
                    searchQuery.length >= 3 &&
                    suggestions.length > 0 &&
                    setShowSuggestions(true)
                  }
                  autoComplete="off"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleDirectSearch}
                  disabled={isSearching || !searchQuery.trim()}
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full mt-1 w-full rounded-md border bg-background shadow-lg z-50">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion.place_id}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-md"
                    >
                      {suggestion.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </SidebarGroup>

          {/* 3. Instructions */}
          <SidebarGroup className="p-0">
            <SidebarGroupLabel>3. Select Area & Detect</SidebarGroupLabel>
            <div className="flex items-start gap-3 rounded-md bg-secondary/20 p-3 text-sm text-muted-foreground border">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                Use the map tools to select an area for AI detection or to
                manually digitize features.
              </span>
            </div>
          </SidebarGroup>

          {/* 4. Digitize & Export */}
          <SidebarGroup className="p-0">
            <SidebarGroupLabel>4. Digitize & Export</SidebarGroupLabel>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={onDownloadDigitized}
                disabled={isLoading || !hasManualFeatures}
                title={
                  !hasManualFeatures
                    ? 'Draw one or more shapes on the map first'
                    : 'Download your manually drawn shapes'
                }
              >
                <FileJson className="mr-2 h-4 w-4" />
                Download Digitized Layer (.geojson)
              </Button>
            </div>
          </SidebarGroup>
        </div>
      </SidebarContent>

      <SidebarFooter>
        <Separator />
        <div className="flex flex-col gap-2 p-4">
          <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2 overflow-hidden">
              <UserIcon className="h-4 w-4 shrink-0" />
              <span className="truncate" title={user?.email ?? ''}>
                {user?.email ?? 'Not signed in'}
              </span>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleSignOut}
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Sign Out</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Separator />
          <Button
            onClick={onDetect}
            disabled={isLoading || !hasSelection}
            className="w-full"
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Globe className="mr-2 h-4 w-4" />
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
            Download Detected GeoJSON
          </Button>
        </div>
      </SidebarFooter>
    </>
  );
}
