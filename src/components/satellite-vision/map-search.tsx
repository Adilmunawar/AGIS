'use client';

import * as React from 'react';
import { Loader2, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

type MapSearchProps = {
  onSearchLocation: (lat: number, lon: number) => void;
};

export function MapSearch({ onSearchLocation }: MapSearchProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
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
        toast({
          title: 'Location Found',
          description: `Moving map to ${display_name}`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Location Not Found',
          description: "We couldn't find a location matching your search.",
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Search Failed',
        description: 'An error occurred while searching for the location.',
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="relative rounded-lg border border-black/10 bg-background/50 shadow-lg backdrop-blur-md">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
      <Input
        placeholder="Search for a location..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSearch();
        }}
        className="h-11 w-full border-none bg-transparent pl-10 pr-4 text-base shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
        autoComplete="off"
      />
      {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />}
    </div>
  );
}
