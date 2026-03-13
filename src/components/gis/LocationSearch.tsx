'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search as SearchIcon, Loader2, X, MapPin, Building, Globe } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';

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


export function LocationSearch() {
  const map = useMap();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
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
  
  return (
    <div ref={containerRef} className="relative w-72 max-w-[calc(100vw-8rem)]">
        <div className="relative bg-white/80 backdrop-blur-xl shadow-lg rounded-xl border border-slate-200/50 flex items-center">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
            <Input
                type="text"
                placeholder="Search location..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                className="pl-10 pr-8 h-12 w-full bg-transparent border-none focus-visible:ring-0"
            />
            {isLoading ? (
                <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
                query && (
                <button onClick={clearSearch} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    <X className="h-5 w-5" />
                </button>
                )
            )}
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
