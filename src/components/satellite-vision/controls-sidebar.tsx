'use client';

import * as React from 'react';
import {
  Download,
  Loader2,
  Satellite,
  Search,
  MapPin,
  FileJson,
  ImageDown,
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

type ControlsSidebarProps = {
  colabUrl: string;
  setColabUrl: (url: string) => void;
  onDetect: () => void;
  onDownload: () => void;
  onDownloadDigitized: () => void;
  onDownloadImage: () => void;
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
  onDownloadImage,
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

  // Effect to handle clicks outside of the search container to close suggestions
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

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2">
          <Satellite className="text-primary" />
          <h1 className="text-xl font-semibold">Satellite Vision</h1>
        </div>
        <Separator />
      </SidebarHeader>

      <SidebarContent>
        {/* 1. Connection */}
        <SidebarGroup>
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
        <SidebarGroup>
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
        <SidebarGroup>
          <SidebarGroupLabel>3. Select Area & Detect</SidebarGroupLabel>
          <div className="flex items-start gap-2 rounded-md bg-secondary/20 p-2 text-sm text-muted-foreground border">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              <strong>Area Selection &amp; Tools:</strong>
              <br />- For detection, use the <strong>Rectangle</strong> or{' '}
              <strong>Polygon</strong> tool.
              <br />- To measure distance, use the <strong>Polyline</strong>{' '}
              (line) tool.
              <br />- Click any drawn shape to see its measurements.
            </span>
          </div>
        </SidebarGroup>

        {/* 4. Digitize & Export */}
        <SidebarGroup>
          <SidebarGroupLabel>4. Digitize & Export</SidebarGroupLabel>
          <div className="flex flex-col gap-2">
            <p className="text-sm text-muted-foreground">
              Draw on the map to select an area or digitize features, then export your work.
            </p>
            <Button
              variant="outline"
              onClick={onDownloadImage}
              disabled={isLoading || !hasSelection}
              title={!hasSelection ? "Draw a rectangle or polygon on the map first" : "Download GeoTIFF image of the selected area"}
            >
              <ImageDown className="mr-2 h-4 w-4" />
              Download Area Image (.tif)
            </Button>
            <Button
              variant="outline"
              onClick={onDownloadDigitized}
              disabled={isLoading || !hasManualFeatures}
              title={!hasManualFeatures ? "Draw one or more shapes on the map first" : "Download your manually drawn shapes"}
            >
              <FileJson className="mr-2 h-4 w-4" />
              Download Digitized Layer (.geojson)
            </Button>
          </div>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <Separator />
        <div className="flex flex-col gap-2 p-4">
          <Button onClick={onDetect} disabled={isLoading || !hasSelection} className="w-full">
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Satellite className="mr-2 h-4 w-4" />
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
            Download Detected Shapefile
          </Button>
        </div>
      </SidebarFooter>
    </>
  );
}
