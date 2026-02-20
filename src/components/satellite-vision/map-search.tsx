'use client';

import * as React from 'react';
import { Loader2, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
        setSearchQuery(display_name); // Show the full name after searching
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
    <div className="absolute top-4 right-4 z-[1000] w-full max-w-sm">
      <div className="relative">
        <Input
          placeholder="Search for a city, area, or address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearch();
          }}
          className="h-12 text-base pl-4 pr-12 shadow-lg"
          autoComplete="off"
        />
        <Button
          size="icon"
          variant="ghost"
          onClick={handleSearch}
          disabled={isSearching || !searchQuery.trim()}
          className="absolute right-1 top-1 h-10 w-10 text-muted-foreground hover:bg-transparent"
        >
          {isSearching ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Search className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  );
}
