'use client';

import * as React from 'react';
import { Download, Loader2, Satellite, Search, MapPin } from 'lucide-react';

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
  onSearchLocation: (lat: number, lon: number) => void; // Callback to fly map
  isLoading: boolean;
  hasGeoJson: boolean;
};

export function ControlsSidebar({
  colabUrl,
  setColabUrl,
  onDetect,
  onDownload,
  onSearchLocation,
  isLoading,
  hasGeoJson,
}: ControlsSidebarProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    try {
      // Use OpenStreetMap Nominatim API (Free)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        onSearchLocation(parseFloat(lat), parseFloat(lon));
        toast({ title: 'Found location', description: `Flying to ${data[0].display_name}` });
      } else {
        toast({ title: 'Not found', description: 'Could not find that location.', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Search failed.', variant: 'destructive' });
    } finally {
      setIsSearching(false);
    }
  };

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

        {/* 2. Navigation (New!) */}
        <SidebarGroup>
          <SidebarGroupLabel>2. Navigate</SidebarGroupLabel>
          <div className="flex gap-2">
            <Input
              placeholder="Search (e.g. Lahore, DHA Phase 6)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button size="icon" variant="outline" onClick={handleSearch} disabled={isSearching}>
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin"/> : <Search className="h-4 w-4" />}
            </Button>
          </div>
        </SidebarGroup>

        {/* 3. Instructions */}
        <SidebarGroup>
          <SidebarGroupLabel>3. Area Selection</SidebarGroupLabel>
          <div className="flex items-start gap-2 rounded-md bg-secondary/20 p-2 text-sm text-muted-foreground border">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              <strong>Two ways to detect:</strong><br/>
              1. Pan map to view & click Detect.<br/>
              2. Use the <strong>Square Tool</strong> (top-left of map) to draw an exact box.
            </span>
          </div>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <Separator />
        <div className="flex flex-col gap-2 p-4">
          <Button onClick={onDetect} disabled={isLoading} className="w-full">
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
            Download Shapefile
          </Button>
        </div>
      </SidebarFooter>
    </>
  );
}
