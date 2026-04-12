'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import type { LatLng } from 'leaflet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trees, Waves, LayoutGrid, BrainCircuit } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// --- TYPE DEFINITIONS ---
interface AnalyticsStats {
  trees: number;
  grass: number;
  water: number;
  builtUp: number;
  bare: number;
}

interface TileUrls {
  classified: string;
  ndviChange: string;
}

// --- UI SUB-COMPONENTS ---

const StatCard = ({ icon: Icon, label, value, unit, isLoading }: { icon: React.ElementType, label: string, value: number, unit: string, isLoading: boolean }) => (
    <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
        <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
            </div>
            <span className="text-sm font-medium">{label}</span>
        </div>
        {isLoading ? <Skeleton className="h-5 w-16"/> : 
            <div className="text-right">
                <span className="text-lg font-bold">{value.toLocaleString()}</span>
                <span className="ml-1 text-xs text-muted-foreground">{unit}</span>
            </div>
        }
    </div>
);

const MapEventsComponent = ({ setCenter }: { setCenter: (center: LatLng) => void }) => {
  const map = useMap();
  useMapEvents({
    moveend: () => setCenter(map.getCenter()),
    load: () => setCenter(map.getCenter()) // Set initial center on load
  });
  return null;
};

// --- MAIN COMPONENT ---
export default function GreeneryAnalyticsClient() {
  const { toast } = useToast();
  const [mapCenter, setMapCenter] = useState<LatLng | null>(null);
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [tileUrls, setTileUrls] = useState<TileUrls | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showTimeTravel, setShowTimeTravel] = useState(false);

  const handleRunAnalytics = useCallback(async () => {
    if (!mapCenter) {
      toast({ variant: 'destructive', title: 'Error', description: 'Map center not available.' });
      return;
    }
    
    setIsAnalyzing(true);
    setStats(null); // Clear previous stats
    setTileUrls(null);

    try {
      const response = await fetch('/api/gee/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: mapCenter.lat, lng: mapCenter.lng }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to run analytics.');
      }

      const data = await response.json();
      setStats(data.stats);
      setTileUrls(data.tileUrls);
      toast({ title: 'Analysis Complete', description: 'Property report and map layer updated.' });

    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Analysis Failed', description: error.message });
    } finally {
      setIsAnalyzing(false);
    }
  }, [mapCenter, toast]);
  
  const activeTileUrl = useMemo(() => {
    if (!tileUrls) return null;
    return showTimeTravel ? tileUrls.ndviChange : tileUrls.classified;
  }, [tileUrls, showTimeTravel]);

  return (
    <div className="flex h-full w-full bg-muted/30">
      <aside className="w-[380px] border-r bg-background flex flex-col h-full">
        <header className="p-4 border-b">
          <h1 className="text-xl font-bold tracking-tight">Greenery Analytics</h1>
          <p className="text-sm text-muted-foreground">AI-powered land cover analysis.</p>
        </header>
        <div className="flex-1 p-4 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Analysis Controls</CardTitle>
                    <CardDescription>Run analysis on the current map center and toggle map views.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button onClick={handleRunAnalytics} disabled={isAnalyzing || !mapCenter} className="w-full h-11 text-base">
                        {isAnalyzing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <BrainCircuit className="mr-2 h-5 w-5"/>}
                        Analyze Current View
                    </Button>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <Label htmlFor="time-travel-switch" className="flex flex-col">
                            <span className="font-semibold">Time Travel</span>
                            <span className="text-xs text-muted-foreground">Show 1-year NDVI change.</span>
                        </Label>
                        <Switch id="time-travel-switch" checked={showTimeTravel} onCheckedChange={setShowTimeTravel} disabled={!tileUrls} />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Property Report</CardTitle>
                    <CardDescription>Land cover breakdown for a 1km radius around the map center.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <StatCard icon={Trees} label="Trees" value={stats?.trees ?? 0} unit="acres" isLoading={isAnalyzing} />
                    <StatCard icon={LayoutGrid} label="Grass / Crops" value={stats?.grass ?? 0} unit="acres" isLoading={isAnalyzing} />
                    <StatCard icon={Waves} label="Water" value={stats?.water ?? 0} unit="acres" isLoading={isAnalyzing} />
                </CardContent>
            </Card>
        </div>
      </aside>
      <main className="flex-1 h-full bg-background relative">
        <MapContainer
          center={[31.5204, 74.3587]}
          zoom={14}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            url="https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}"
            subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
            attribution="&copy; Google"
            zIndex={1}
          />
          {activeTileUrl && (
            <TileLayer
              key={activeTileUrl} // Force re-render on URL change
              url={activeTileUrl}
              opacity={0.7}
              zIndex={10}
            />
          )}
          <MapEventsComponent setCenter={setMapCenter} />
        </MapContainer>
      </main>
    </div>
  );
}
