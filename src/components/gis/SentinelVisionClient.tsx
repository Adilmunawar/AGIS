'use client';

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, Layers, Map as MapIcon, Activity, Droplets, FlaskConical, Flame, Wheat } from 'lucide-react';
import { LocationSearch } from './LocationSearch';
import { MapLegends } from './MapLegends';
import { Skeleton } from '@/components/ui/skeleton';

const AVAILABLE_LAYERS = [
  { id: 'classification', name: 'AI Crop Classification', icon: Wheat },
  { id: 's2_true_color', name: 'Live Sentinel-2 Photo', icon: MapIcon },
  { id: 'ndvi', name: 'Greenness / Health (NDVI)', icon: Activity },
  { id: 'ndmi', name: 'Leaf Moisture (NDMI)', icon: Droplets },
  { id: 'ndre', name: 'Nitrogen Content (NDRE)', icon: FlaskConical },
  { id: 'bsi', name: 'Bare Soil / Ploughed (BSI)', icon: () => <div className="h-4 w-4 rounded-full bg-orange-900 border-2 border-orange-950/50" /> },
  { id: 'nbr', name: 'Stubble Burning (NBR)', icon: Flame },
];

export default function SentinelVisionClient() {
  const [tileUrls, setTileUrls] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<string>('s2_true_color');

  useEffect(() => {
    const fetchTiles = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/gee/tiles');
        const data = await res.json();
        if (data.status === 'success') {
          setTileUrls(data.tiles);
        } else {
          throw new Error(data.error || 'Failed to fetch GEE tile layers.');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTiles();
  }, []);

  const activeTileUrl = tileUrls[selectedLayer] || null;

  return (
    <div className="absolute inset-0 bg-background overflow-hidden">
        <MapContainer center={[30.6682, 73.1114]} zoom={12} zoomControl={false} style={{ height: '100%', width: '100%', backgroundColor: '#1a1a1a' }}>
            <TileLayer attribution='&copy; Google' url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" zIndex={1} />

            {activeTileUrl && (
              <TileLayer key={activeTileUrl} url={activeTileUrl} opacity={0.9} zIndex={10} />
            )}

            <div className="absolute top-4 left-4 z-[1000]">
              <LocationSearch />
            </div>
            
            <MapLegends currentBand={selectedLayer} />

            <Card className="absolute top-4 right-4 z-[1000] w-72 bg-card/80 backdrop-blur-md shadow-2xl border-border/50">
                <CardHeader className="p-4 border-b border-border/50">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Layers className="h-5 w-5 text-primary" />
                        Sentinel-2 Vision
                    </CardTitle>
                    <CardDescription className="text-xs pt-1">
                        Explore global analysis-ready satellite imagery from the past 60 days.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  {isLoading ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                      {Array.from({length: 4}).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
                    </div>
                  ) : error ? (
                    <p className="text-sm text-destructive">{error}</p>
                  ) : (
                    <RadioGroup value={selectedLayer} onValueChange={setSelectedLayer} className="space-y-1">
                      {AVAILABLE_LAYERS.map((layer) => (
                          tileUrls[layer.id] && (
                            <div key={layer.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-accent">
                                <RadioGroupItem value={layer.id} id={layer.id} />
                                <Label htmlFor={layer.id} className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                                  <layer.icon className="h-4 w-4 text-muted-foreground" />
                                  {layer.name}
                                </Label>
                            </div>
                          )
                      ))}
                    </RadioGroup>
                  )}
                </CardContent>
            </Card>
        </MapContainer>
    </div>
  );
}
