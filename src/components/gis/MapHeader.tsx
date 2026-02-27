'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Search as SearchIcon, Loader2, X, MapPin, Building, Globe, LayersIcon } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';

// --- TYPES ---

interface Suggestion {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  boundingbox: [string, string, string, string];
  lat: string;
  lon: string;
  display_name: string;
  class: string;
  type: string;
  importance: number;
  icon?: string;
}

export interface BaseLayer {
    name: string;
    url: string;
    attribution: string;
    previewUrl: string;
    subdomains?: string[];
}

interface MapHeaderProps {
    layers: BaseLayer[];
    activeLayer: BaseLayer;
    onLayerSelect: (layer: BaseLayer) => void;
}

// --- HELPER FUNCTIONS ---

const getSuggestionIcon = (suggestion: Suggestion) => {
    switch (suggestion.class) {
      case 'place':
        return <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
      case 'building':
      case 'amenity':
        return <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
      case 'boundary':
      case 'highway':
         return <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
      default:
        return <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
    }
};

// --- MAIN COMPONENT ---

export function MapHeader({ layers, activeLayer, onLayerSelect }: MapHeaderProps) {
  const map = useMap();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLayerDialogOpen, setIsLayerDialogOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const debouncedQuery = useDebounce(query, 300);

  const clearSearch = useCallback(() => {
    setQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
  }, []);
  
  const handleClickOutside = useCallback((event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }, []);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  useEffect(() => {
    if (debouncedQuery.length < 3) {
      setSuggestions([]);
      return;
    }
    const fetchSuggestions = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(debouncedQuery)}&limit=5`);
        if (!response.ok) throw new Error('Failed to fetch suggestions');
        const data: Suggestion[] = await response.json();
        setSuggestions(data);
      } catch (error) {
        console.error("Geocoding error:", error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSuggestions();
  }, [debouncedQuery]);

  const handleSuggestionClick = (suggestion: Suggestion) => {
    const { lat, lon } = suggestion;
    map.flyTo([parseFloat(lat), parseFloat(lon)], 13);
    setQuery(suggestion.display_name);
    setShowSuggestions(false);
  };

  const handleLayerSelectAndClose = (layer: BaseLayer) => {
    onLayerSelect(layer);
    setIsLayerDialogOpen(false);
  };

  return (
    <div ref={containerRef} className="absolute top-4 right-4 z-[1000] w-auto">
      <div className="flex items-center gap-1 bg-white/80 backdrop-blur-xl shadow-lg rounded-xl p-1.5 border border-slate-200/50">
        <Dialog open={isLayerDialogOpen} onOpenChange={setIsLayerDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" className="h-10 w-10 p-0 flex-shrink-0 rounded-lg hover:bg-black/5">
              <LayersIcon className="h-5 w-5 text-foreground" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl bg-white/90 backdrop-blur-xl">
            <DialogHeader>
              <DialogTitle>Select a Base Map</DialogTitle>
              <DialogDescription>
                Choose a map style that best suits your analysis.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              {layers.map((layer) => (
                <Card 
                    key={layer.name} 
                    onClick={() => handleLayerSelectAndClose(layer)}
                    className={cn(
                        "cursor-pointer transition-all overflow-hidden",
                        activeLayer.name === layer.name ? "border-primary ring-2 ring-primary" : "hover:border-primary/50 hover:shadow-lg"
                    )}
                >
                    <CardContent className="p-0">
                        <div className="relative aspect-[4/3]">
                            <Image src={layer.previewUrl} alt={layer.name} layout="fill" objectFit="cover" />
                        </div>
                    </CardContent>
                    <CardHeader className="p-3">
                        <CardTitle className="text-sm font-medium">{layer.name}</CardTitle>
                    </CardHeader>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>
        
        <div className="relative w-72 max-w-[calc(100vw-8rem)]">
          <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search location..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            className="pl-9 pr-8 h-10 w-full bg-transparent border-none focus-visible:ring-0"
          />
          {isLoading ? (
            <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            query && (
              <button onClick={clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            )
          )}
        </div>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <Card className="absolute mt-2 w-full bg-white/90 backdrop-blur-md shadow-xl border-0 rounded-xl overflow-hidden">
          <CardContent className="p-0">
            <ul>
              {suggestions.map((suggestion) => (
                <li
                  key={suggestion.place_id}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-primary/10 transition-colors text-sm"
                >
                  {getSuggestionIcon(suggestion)}
                  <span className="truncate">{suggestion.display_name}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
