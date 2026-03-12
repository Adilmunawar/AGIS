'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import L, { type LatLng } from 'leaflet';
import { MapContainer, TileLayer, FeatureGroup, Popup, useMap } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Layers, Map as MapIcon, Activity, Droplets, FlaskConical, Flame, Wheat, Snowflake, Waves, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapLegends } from './MapLegends';

import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

const AVAILABLE_LAYERS = [
  { id: 'classification', name: 'AI Crop Classification', icon: Wheat },
  { id: 's2_true_color', name: 'Live Sentinel-2 Photo', icon: MapIcon },
  { id: 'ndvi', name: 'Greenness / Health (NDVI)', icon: Activity },
  { id: 'ndmi', name: 'Leaf Moisture (NDMI)', icon: Droplets },
  { id: 'ndre', name: 'Nitrogen Content (NDRE)', icon: FlaskConical },
  { id: 'ndwi', name: 'Flood / Water Risk (NDWI)', icon: Waves },
  { id: 'bsi', name: 'Bare Soil / Ploughed (BSI)', icon: () => <span className="text-lg">🟫</span> },
  { id: 'nbr', name: 'Stubble Burning (NBR)', icon: Flame },
  { id: 'ndci', name: 'Toxic Algae in Water (NDCI)', icon: () => <span className="text-lg">🦠</span> },
  { id: 'ndsi', name: 'Frost & Snow Cover (NDSI)', icon: Snowflake },
];

const ScorecardPopup = ({ data }: { data: any }) => (
    <div className="w-64">
        <div className="bg-primary/10 p-2.5 rounded-lg border border-primary/20 text-center mb-3">
            <p className="text-xs font-semibold text-primary/80">Calculated Area</p>
            <p className="text-xl font-bold text-primary">{data.area_acres.toLocaleString()} Acres</p>
        </div>
        <div className="border p-2 rounded-lg mb-2">
            <p className="text-xs font-medium text-muted-foreground">Primary Classification</p>
            <p className="font-bold text-base flex items-center gap-2"><Wheat className="h-4 w-4 text-amber-600"/> {data.primary_crop}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="border p-1.5 rounded-md">
                <p className="text-muted-foreground">Health</p>
                <p className="font-semibold flex items-center gap-1.5"><Activity className="h-3 w-3 text-green-500"/> {data.avg_ndvi}</p>
            </div>
            <div className="border p-1.5 rounded-md">
                <p className="text-muted-foreground">Moisture</p>
                <p className="font-semibold flex items-center gap-1.5"><Droplets className="h-3 w-3 text-blue-500"/> {data.avg_ndmi}</p>
            </div>
            <div className="border p-1.5 rounded-md">
                <p className="text-muted-foreground">Nitrogen</p>
                <p className="font-semibold flex items-center gap-1.5"><FlaskConical className="h-3 w-3 text-amber-500"/> {data.avg_ndre}</p>
            </div>
            <div className="border p-1.5 rounded-md">
                <p className="text-muted-foreground">Burn Scar</p>
                <p className="font-semibold flex items-center gap-1.5"><Flame className="h-3 w-3 text-red-500"/> {data.burn_damage}</p>
            </div>
        </div>
    </div>
);

export default function SentinelVisionClient() {
  const [tileUrls, setTileUrls] = useState<Record<string, string>>({});
  const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>({ classification: true });
  const [scorecard, setScorecard] = useState<{ data: any; position: LatLng } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFetchingTiles, setIsFetchingTiles] = useState(true);
  const featureGroupRef = useRef<L.FeatureGroup>(null);

  useEffect(() => {
    const fetchTiles = async () => {
      try {
        const res = await fetch(`/api/gee/tiles`);
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({error: "Failed to parse API error response"}));
          throw new Error(errorData.error || `API responded with status ${res.status}`);
        }
        const data = await res.json();
        if (data.status === 'success') {
          setTileUrls(data.tiles);
        } else {
          throw new Error(data.error || "API did not return a success status.");
        }
      } catch (error: any) {
        console.error("Failed to fetch GEE Tiles:", error);
      } finally {
        setIsFetchingTiles(false);
      }
    };
    fetchTiles();
  }, []);

  const toggleLayer = (layerId: string) => {
    setActiveLayers(prev => ({ ...prev, [layerId]: !prev[layerId] }));
  };

  const handleClear = useCallback(() => {
    featureGroupRef.current?.clearLayers();
    setScorecard(null);
  }, []);

  const onPolygonDrawn = async (e: any) => {
    handleClear(); // Clear previous analysis before starting a new one
    
    const layer = e.layer;
    const geoJson = layer.toGeoJSON();
    const center = layer.getBounds().getCenter();
    featureGroupRef.current?.addLayer(layer);

    setIsAnalyzing(true);
    try {
      const res = await fetch(`/api/gee/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geometry: geoJson.geometry })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setScorecard({ data: data.scorecard, position: center });
      } else {
          throw new Error(data.error || 'Analysis failed on the server.');
      }
    } catch (error: any) {
      console.error("Analysis failed:", error);
      handleClear();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const activeBand = Object.keys(activeLayers).find(key => key !== 's2_true_color' && activeLayers[key]);

  return (
    <div className="absolute inset-0 bg-background overflow-hidden">
        <MapContainer center={[30.6682, 73.1114]} zoom={12} zoomControl={false} style={{ height: '100%', width: '100%', backgroundColor: '#1a1a1a' }}>
            <TileLayer attribution='&copy; Google' url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" zIndex={1} />
            
            {AVAILABLE_LAYERS.map((layer) => (
                activeLayers[layer.id] && tileUrls[layer.id] ? (
                <TileLayer key={layer.id} url={tileUrls[layer.id]} opacity={0.8} zIndex={10} />
                ) : null
            ))}
            
            <FeatureGroup ref={featureGroupRef}>
                <EditControl
                    position="topleft"
                    onCreated={onPolygonDrawn}
                    onDeleted={handleClear}
                    draw={{
                        polygon: { allowIntersection: false, shapeOptions: { color: '#22c55e', weight: 3, fillOpacity: 0.2 } },
                        rectangle: false, circle: false, circlemarker: false, marker: false, polyline: false,
                    }}
                    edit={{ remove: true, edit: false }}
                />
            </FeatureGroup>
             {isAnalyzing && (
                <div className="leaflet-center">
                    <div className="flex flex-col items-center gap-2 p-4 bg-card/80 backdrop-blur-md rounded-lg shadow-2xl">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="font-semibold text-foreground">Running AI Analysis...</p>
                    </div>
                </div>
            )}
            {scorecard && !isAnalyzing && (
                <Popup position={scorecard.position}>
                    <ScorecardPopup data={scorecard.data} />
                </Popup>
            )}
        </MapContainer>

        <Card className="absolute top-4 right-4 z-[1000] w-72 bg-card/80 backdrop-blur-md shadow-2xl border-border/50">
            <CardHeader className="p-3 border-b border-border/50">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Layers className="h-5 w-5 text-primary" />
                    Enterprise Layers
                </CardTitle>
            </CardHeader>
            <CardContent className="p-1">
              <ScrollArea className="h-80">
                <div className="space-y-1 p-1">
                  {isFetchingTiles ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-5 w-5 rounded-full" />
                          <Skeleton className="h-4 w-40" />
                        </div>
                        <Skeleton className="h-6 w-11 rounded-full" />
                      </div>
                    ))
                  ) : (
                    AVAILABLE_LAYERS.map(layer => (
                        <div key={layer.id} className="flex items-center justify-between p-1.5 rounded-md hover:bg-accent/50 transition-colors">
                            <Label htmlFor={layer.id} className="flex items-center gap-3 cursor-pointer text-sm font-medium">
                                <layer.icon className="h-5 w-5 text-muted-foreground" />
                                {layer.name}
                            </Label>
                            <Switch id={layer.id} checked={activeLayers[layer.id] || false} onCheckedChange={() => toggleLayer(layer.id)} />
                        </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
        </Card>
        <MapLegends currentBand={activeBand} />
    </div>
  );
}