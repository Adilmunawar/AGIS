'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import type { LatLngBounds } from 'leaflet';
import { useToast } from '@/hooks/use-toast';
import { useDebounce } from '@/hooks/use-debounce';

// UI Imports
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Loader2, Trees, Waves, Building, Leaf } from 'lucide-react';
import { MapLegends } from './MapLegends';
import MousePositionControl from './MousePositionControl';
import { LocationSearch } from './LocationSearch';

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
    { id: 'classification', name: 'Land Cover' },
    { id: 'timeTravel', name: '1-Yr NDVI Change' },
    { id: 'deforestation', name: 'Forest Change' },
    { id: 'ndvi', name: 'NDVI' },
    { id: 'ndwi', name: 'NDWI' },
    { id: 'savi', name: 'SAVI' },
    { id: 'evi', name: 'EVI' },
];

// --- UI SUB-COMPONENTS (More Compact) ---
const StatCard = ({ icon: Icon, label, value, unit, isLoading }: { icon: React.ElementType, label: string, value?: number, unit: string, isLoading: boolean }) => (
    <div className="flex items-center justify-between rounded-md border bg-muted/50 p-2">
        <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
            </div>
            <span className="text-xs font-semibold">{label}</span>
        </div>
        {isLoading || value === undefined ? <Skeleton className="h-4 w-12"/> : 
            <div className="text-right">
                <span className="text-base font-bold">{value.toLocaleString()}</span>
                <span className="ml-1 text-[10px] text-muted-foreground">{unit}</span>
            </div>
        }
    </div>
);


// --- MAP CONTROLLER COMPONENT ---
const MapAnalysisController = ({ onAnalyticsRequested }: { onAnalyticsRequested: (bounds: LatLngBounds) => void }) => {
    useMapEvents({
        moveend: (e) => onAnalyticsRequested(e.target.getBounds()),
        load: (e) => onAnalyticsRequested(e.target.getBounds()),
    });
    return null;
};

// --- MAIN COMPONENT ---
export default function GreeneryAnalyticsClient() {
  const { toast } = useToast();

  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [tileUrls, setTileUrls] = useState<TileUrls | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [activeLayer, setActiveLayer] = useState('classification');
  const [showVectors, setShowVectors] = useState(true);

  const handleRunAnalytics = useCallback((boundsToAnalyze: LatLngBounds) => {
    if (!boundsToAnalyze) return;
    setIsAnalyzing(true);
    setStats(null); // Clear old stats to show skeleton loaders, but keep old tiles visible

    const bbox = [
        boundsToAnalyze.getWest(),
        boundsToAnalyze.getSouth(),
        boundsToAnalyze.getEast(),
        boundsToAnalyze.getNorth(),
    ];

    fetch('/api/gee/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bbox }),
      })
      .then(response => {
        if (!response.ok) {
            return response.json().then(errorData => {
                throw new Error(errorData.error || 'Failed to run analytics.');
            });
        }
        return response.json();
      })
      .then(data => {
        setStats(data.stats);
        setTileUrls(data.tileUrls);
      })
      .catch((error: any) => {
        toast({ variant: 'destructive', title: 'Analysis Failed', description: error.message });
        setStats(null); // Clear stats on error
      })
      .finally(() => {
        setIsAnalyzing(false);
      });
  }, [toast]);
  
  // Debounce the analytics request to avoid spamming the API while panning
  const debouncedAnalyticsRequest = useDebounce(handleRunAnalytics, 1200);

  const displayedTileUrl = useMemo(() => {
      if (!tileUrls) return null;
      return tileUrls[activeLayer as keyof TileUrls] || null;
  }, [tileUrls, activeLayer]);

  return (
    <div className="h-full w-full relative bg-background">
      <MapContainer center={[31.5204, 74.3587]} zoom={14} style={{ height: '100%', width: '100%' }} zoomControl={false} scrollWheelZoom={true}>
        <TileLayer url="https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}" subdomains={['mt0', 'mt1', 'mt2', 'mt3']} attribution="&copy; Google" zIndex={1} />
        
        {displayedTileUrl && <TileLayer key={displayedTileUrl} url={displayedTileUrl} opacity={0.65} zIndex={10} />}
        {showVectors && tileUrls?.vectorOutlines && <TileLayer key={`vectors-${tileUrls.vectorOutlines}`} url={tileUrls.vectorOutlines} opacity={0.9} zIndex={11} />}
        
        <MapAnalysisController onAnalyticsRequested={debouncedAnalyticsRequest} />
        <div className="absolute top-4 left-4 z-[1000]"><LocationSearch /></div>
        <MousePositionControl />
        <MapLegends currentBand={activeLayer}/>

        <Card className="absolute top-4 right-4 z-[1000] w-80 bg-card/80 backdrop-blur-xl shadow-2xl border-border/50">
            <CardHeader className="p-3 border-b flex-row items-center justify-between">
                <div className="space-y-0.5">
                    <CardTitle className="text-base">Greenery Analytics</CardTitle>
                    <p className="text-xs text-muted-foreground">Live land cover intelligence.</p>
                </div>
                {isAnalyzing && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
            </CardHeader>

            <Accordion type="multiple" defaultValue={['item-1', 'item-2']} className="w-full">
                <AccordionItem value="item-1" className="border-b">
                    <AccordionTrigger className="px-3 py-2 text-xs font-bold hover:no-underline">Display Layers</AccordionTrigger>
                    <AccordionContent className="px-3 space-y-3">
                        <div>
                            <Label className="text-xs font-semibold text-muted-foreground">Base Analysis Layer</Label>
                             <RadioGroup value={activeLayer} onValueChange={setActiveLayer} className="mt-1 grid grid-cols-2 gap-2">
                                {ANALYTICAL_LAYERS.map(layer => (
                                    <Label key={layer.id} htmlFor={layer.id} className="flex items-center gap-2 p-1.5 rounded-md border has-[:checked]:bg-accent has-[:checked]:border-primary/50 has-[:checked]:ring-1 has-[:checked]:ring-primary transition-colors cursor-pointer">
                                        <RadioGroupItem value={layer.id} id={layer.id} className="h-3.5 w-3.5"/>
                                        <span className="text-xs font-semibold">{layer.name}</span>
                                    </Label>
                                ))}
                            </RadioGroup>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-md border">
                            <Label htmlFor="vector-switch" className="text-xs font-semibold">Vectorized Trees</Label>
                            <Switch id="vector-switch" checked={showVectors} onCheckedChange={setShowVectors} disabled={!tileUrls} />
                        </div>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2" className="border-b-0">
                    <AccordionTrigger className="px-3 py-2 text-xs font-bold hover:no-underline">Property Report</AccordionTrigger>
                    <AccordionContent className="px-3 space-y-1.5">
                        <p className="text-[11px] text-muted-foreground text-center -mt-1 pb-1">Analysis for the current map viewport.</p>
                        <StatCard icon={Trees} label="Tree Canopy" value={stats?.trees} unit="acres" isLoading={!stats} />
                        <StatCard icon={Leaf} label="Grass / Crops" value={stats?.grass} unit="acres" isLoading={!stats} />
                        <StatCard icon={Waves} label="Water Bodies" value={stats?.water} unit="acres" isLoading={!stats} />
                        <StatCard icon={Building} label="Built-up Area" value={stats?.builtUp} unit="acres" isLoading={!stats} />
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </Card>
      </MapContainer>
    </div>
  );
}
