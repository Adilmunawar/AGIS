'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import type { LatLng } from 'leaflet';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/use-debounce';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Loader2, Trees, Waves, Building, Leaf } from 'lucide-react';
import { MapLegends } from './MapLegends';
import MousePositionControl from './MousePositionControl';
import 'leaflet/dist/leaflet.css';

// --- TYPE DEFINITIONS ---
interface AnalyticsStats {
  trees: number;
  grass: number;
  water: number;
  builtUp: number;
}

interface TileUrls {
  classification: string;
  deforestation: string;
  timeTravel: string;
  vectorOutlines: string;
  ndvi: string;
  ndwi: string;
  savi: string;
  evi: string;
}

const ANALYTICAL_LAYERS = [
    { id: 'classification', name: 'Land Cover Classification' },
    { id: 'timeTravel', name: 'Time Travel (1-Yr NDVI)' },
    { id: 'deforestation', name: 'Deforestation Hotspots' },
    { id: 'ndvi', name: 'Vegetation Health (NDVI)' },
    { id: 'ndwi', name: 'Water Presence (NDWI)' },
    { id: 'savi', name: 'Soil-Adjusted Veg. (SAVI)' },
    { id: 'evi', name: 'Enhanced Veg. (EVI)' },
];

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

// --- MAP CONTROLLER COMPONENT ---
const MapAnalysisController = ({ onAnalyticsRequested }: { onAnalyticsRequested: (center: LatLng) => void }) => {
    const [center, setCenter] = useState<LatLng | null>(null);
    const debouncedCenter = useDebounce(center, 750);

    useMapEvents({
        moveend: (e) => setCenter(e.target.getCenter()),
        load: (e) => onAnalyticsRequested(e.target.getCenter()), // Trigger on initial map load
    });

    useEffect(() => {
        if (debouncedCenter) {
            onAnalyticsRequested(debouncedCenter);
        }
    }, [debouncedCenter, onAnalyticsRequested]);

    return null; // This component does not render anything
};


// --- MAIN COMPONENT ---
export default function GreeneryAnalyticsClient() {
  const { toast } = useToast();
  const [mapCenter, setMapCenter] = useState<LatLng | null>(null);

  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [tileUrls, setTileUrls] = useState<TileUrls | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true); // Start analyzing on load
  const [activeLayer, setActiveLayer] = useState('classification');
  const [showVectors, setShowVectors] = useState(true);

  const handleRunAnalytics = useCallback(async (centerToAnalyze: LatLng) => {
    if (!centerToAnalyze) return;
    setIsAnalyzing(true);
    // Don't clear old data here for a smoother UX. The old layer remains while new one loads.

    try {
      const response = await fetch('/api/gee/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: centerToAnalyze.lat, lng: centerToAnalyze.lng }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to run analytics.');
      }
      const data = await response.json();
      setStats(data.stats);
      setTileUrls(data.tileUrls);
      setMapCenter(centerToAnalyze);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Analysis Failed', description: error.message });
      setStats(null);
      setTileUrls(null); // Explicitly nullify on error
    } finally {
      setIsAnalyzing(false);
    }
  }, [toast]);

  const displayedTileUrl = useMemo(() => {
      if (!tileUrls) return null;
      return tileUrls[activeLayer as keyof TileUrls] || null;
  }, [tileUrls, activeLayer]);

  return (
    <div className="flex h-full w-full bg-muted/30">
      <aside className="w-[420px] border-r bg-background flex flex-col h-full">
        <header className="p-4 border-b">
          <h1 className="text-xl font-bold tracking-tight">Greenery Analytics</h1>
          <p className="text-sm text-muted-foreground">Live, AI-powered land cover intelligence.</p>
        </header>

        <Accordion type="multiple" defaultValue={['item-1', 'item-2']} className="w-full px-4 py-2 flex-1 overflow-y-auto">
            <AccordionItem value="item-1">
                <AccordionTrigger>Display Layers</AccordionTrigger>
                <AccordionContent className="space-y-4">
                    <div>
                        <Label className="text-xs font-semibold text-muted-foreground">Base Analysis Layer</Label>
                        <RadioGroup value={activeLayer} onValueChange={setActiveLayer} className="mt-2 grid grid-cols-1 gap-2">
                            {ANALYTICAL_LAYERS.map(layer => (
                                <Label key={layer.id} htmlFor={layer.id} className="flex items-center justify-between p-3 rounded-lg border has-[:checked]:bg-accent has-[:checked]:border-primary transition-colors cursor-pointer">
                                    <span className="font-semibold text-sm">{layer.name}</span>
                                    <RadioGroupItem value={layer.id} id={layer.id} />
                                </Label>
                            ))}
                        </RadioGroup>
                    </div>
                    <div>
                         <Label className="text-xs font-semibold text-muted-foreground">Vector Overlay</Label>
                        <div className="flex items-center justify-between p-3 mt-2 rounded-lg border">
                            <Label htmlFor="vector-switch" className="font-semibold text-sm">Vectorized Trees</Label>
                            <Switch id="vector-switch" checked={showVectors} onCheckedChange={setShowVectors} disabled={!tileUrls} />
                        </div>
                    </div>
                </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
                <AccordionTrigger>Property Report</AccordionTrigger>
                <AccordionContent className="space-y-2">
                    <p className="text-xs text-muted-foreground text-center">Analysis for a 1km radius around map center.</p>
                    <StatCard icon={Trees} label="Tree Canopy" value={stats?.trees ?? 0} unit="acres" isLoading={isAnalyzing && !stats} />
                    <StatCard icon={Leaf} label="Grass / Crops" value={stats?.grass ?? 0} unit="acres" isLoading={isAnalyzing && !stats} />
                    <StatCard icon={Waves} label="Water Bodies" value={stats?.water ?? 0} unit="acres" isLoading={isAnalyzing && !stats} />
                    <StatCard icon={Building} label="Built-up / Roads" value={stats?.builtUp ?? 0} unit="acres" isLoading={isAnalyzing && !stats} />
                </AccordionContent>
            </AccordionItem>
        </Accordion>
        
        <footer className="p-4 border-t text-center text-xs text-muted-foreground">
            {isAnalyzing ? (
                <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin"/>
                    <span>Analyzing new map area...</span>
                </div>
            ) : mapCenter ? (
                 <span>Report for Lat: {mapCenter.lat.toFixed(4)}, Lng: {mapCenter.lng.toFixed(4)}</span>
            ) : <span>Move map to begin analysis.</span>}
        </footer>
      </aside>
      <main className="flex-1 h-full bg-background relative">
        <MapContainer center={[31.5204, 74.3587]} zoom={14} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
          <TileLayer url="https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}" subdomains={['mt0', 'mt1', 'mt2', 'mt3']} attribution="&copy; Google" zIndex={1} />
          
          {displayedTileUrl && <TileLayer key={displayedTileUrl} url={displayedTileUrl} opacity={0.65} zIndex={10} />}
          {showVectors && tileUrls?.vectorOutlines && <TileLayer key={`vectors-${tileUrls.vectorOutlines}`} url={tileUrls.vectorOutlines} opacity={0.9} zIndex={11} />}
          
          <MapAnalysisController onAnalyticsRequested={handleRunAnalytics} />
          <MousePositionControl />
          <MapLegends currentBand={activeLayer}/>
        </MapContainer>
      </main>
    </div>
  );
}
