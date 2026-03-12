'use client';

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, FeatureGroup } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Layers, Map as MapIcon, Activity, Droplets, FlaskConical, Flame, Wheat, Snowflake, Waves } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

const AVAILABLE_LAYERS = [
  { id: 'classification', name: 'AI Crop Classification', icon: Wheat },
  { id: 's2_true_color', name: 'Live Sentinel-2 Photo', icon: MapIcon },
  { id: 'ndvi', name: 'Greenness / Health (NDVI)', icon: Activity },
  { id: 'ndmi', name: 'Leaf Moisture (NDMI)', icon: Droplets },
  { id: 'ndre', name: 'Nitrogen Content (NDRE)', icon: FlaskConical },
  { id: 'ndwi', name: 'Flood / Water Risk (NDWI)', icon: Waves },
  { id: 'bsi', name: 'Bare Soil / Ploughed (BSI)', icon: '🟫' },
  { id: 'nbr', name: 'Stubble Burning (NBR)', icon: Flame },
  { id: 'ndci', name: 'Toxic Algae in Water (NDCI)', icon: '🦠' },
  { id: 'ndsi', name: 'Frost & Snow Cover (NDSI)', icon: Snowflake },
];

export default function SentinelVisionClient() {
  const [tileUrls, setTileUrls] = useState<Record<string, string>>({});
  const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>({ classification: true });
  const [scorecard, setScorecard] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFetchingTiles, setIsFetchingTiles] = useState(true);

  // Calls the INTERNAL Next.js API
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

  // Calls the INTERNAL Next.js Analytics API
  const onPolygonDrawn = async (e: any) => {
    const layer = e.layer;
    const geoJson = layer.toGeoJSON();
    
    setIsAnalyzing(true);
    setScorecard(null);
    try {
      const res = await fetch(`/api/gee/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geometry: geoJson.geometry })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setScorecard(data.scorecard);
      }
    } catch (error: any) {
      console.error("Analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const LayerToggle = ({ layer }: { layer: typeof AVAILABLE_LAYERS[0] }) => (
    <div className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50 transition-colors">
        <Label htmlFor={layer.id} className="flex items-center gap-3 cursor-pointer text-sm font-medium">
            {typeof layer.icon === 'string' ? (
                <span className="text-lg">{layer.icon}</span>
            ) : (
                <layer.icon className="h-5 w-5 text-muted-foreground" />
            )}
            {layer.name}
        </Label>
        <Switch 
            id={layer.id} 
            checked={activeLayers[layer.id] || false} 
            onCheckedChange={() => toggleLayer(layer.id)} 
        />
    </div>
  );

  return (
    <div className="absolute inset-0 flex bg-background overflow-hidden">
      
      <aside className="w-80 h-full flex-shrink-0 p-4 flex flex-col gap-4 z-[1000] bg-card border-r shadow-lg">
        <div className="flex-1 flex flex-col min-h-0">
          <Card className="flex flex-col flex-1 min-h-0">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Layers className="h-5 w-5 text-primary" />
                Enterprise Data Layers
              </CardTitle>
              <CardDescription>Toggle on-demand satellite analysis.</CardDescription>
            </CardHeader>
            <CardContent className="p-2 flex-1 min-h-0">
              <ScrollArea className="h-full">
                <div className="space-y-1 pr-2">
                  {isFetchingTiles ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-2">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-5 w-5 rounded-full" />
                          <Skeleton className="h-4 w-40" />
                        </div>
                        <Skeleton className="h-6 w-11 rounded-full" />
                      </div>
                    ))
                  ) : (
                    AVAILABLE_LAYERS.map(layer => <LayerToggle key={layer.id} layer={layer} />)
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="flex-shrink-0">
            <Card className="shadow-lg">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3">
                <Activity className="h-6 w-6 text-primary" />
                Farm Scorecard
                </CardTitle>
                <CardDescription>Draw a polygon to run spatial analysis.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
                {isAnalyzing ? (
                <div className="flex flex-col flex-1 items-center justify-center py-8 text-muted-foreground space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="font-semibold text-primary">Running AI Analysis...</p>
                    <p className="text-xs text-center">Processing satellite imagery for your selected area.</p>
                </div>
                ) : scorecard ? (
                <div className="space-y-3">
                    <div className="bg-primary/10 p-3 rounded-lg border border-primary/20 text-center">
                    <p className="text-sm font-semibold text-primary">Calculated Area</p>
                    <p className="text-2xl font-bold">{scorecard.area_acres.toLocaleString()} Acres</p>
                    </div>
                    <div className="border p-3 rounded-lg">
                        <p className="text-sm font-medium text-muted-foreground mb-2">Primary Classification</p>
                        <p className="font-bold text-lg flex items-center gap-2"><Wheat className="h-5 w-5 text-amber-600"/> {scorecard.primary_crop}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                    <div className="border p-2 rounded-md">
                        <p className="text-xs text-muted-foreground">Health (NDVI)</p>
                        <p className="font-semibold flex items-center gap-1.5 mt-1"><Activity className="h-4 w-4 text-green-500"/> {scorecard.avg_ndvi}</p>
                    </div>
                    <div className="border p-2 rounded-md">
                        <p className="text-xs text-muted-foreground">Moisture (NDMI)</p>
                        <p className="font-semibold flex items-center gap-1.5 mt-1"><Droplets className="h-4 w-4 text-blue-500"/> {scorecard.avg_ndmi}</p>
                    </div>
                    <div className="border p-2 rounded-md">
                        <p className="text-xs text-muted-foreground">Nitrogen (NDRE)</p>
                        <p className="font-semibold flex items-center gap-1.5 mt-1"><FlaskConical className="h-4 w-4 text-amber-500"/> {scorecard.avg_ndre}</p>
                    </div>
                    <div className="border p-2 rounded-md">
                        <p className="text-xs text-muted-foreground">Burn Scar (NBR)</p>
                        <p className="font-semibold flex items-center gap-1.5 mt-1"><Flame className="h-4 w-4 text-red-500"/> {scorecard.burn_damage}</p>
                    </div>
                    </div>
                </div>
                ) : (
                <div className="py-8 flex-1 flex flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed rounded-lg bg-muted/30">
                    <MapIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="font-semibold">Draw a farm polygon</p>
                    <p className="text-xs mt-1">Use the toolbar on the map to outline an area.</p>
                </div>
                )}
            </CardContent>
            </Card>
        </div>
      </aside>

      <main className="flex-1 h-full relative z-0">
        <MapContainer center={[30.6682, 73.1114]} zoom={12} zoomControl={false} style={{ height: '100%', width: '100%', backgroundColor: '#1a1a1a' }}>
          
          <TileLayer attribution='&copy; Google' url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" />
          
          {AVAILABLE_LAYERS.map((layer) => (
            activeLayers[layer.id] && tileUrls[layer.id] ? (
              <TileLayer key={layer.id} url={tileUrls[layer.id]} opacity={0.8} zIndex={10} />
            ) : null
          ))}
          
          <FeatureGroup>
            <EditControl
              position="topleft"
              onCreated={onPolygonDrawn}
              draw={{ rectangle: false, circle: false, circlemarker: false, marker: false, polyline: false, polygon: { allowIntersection: false, shapeOptions: { color: '#00ff00', weight: 3, fillOpacity: 0.2 } } }}
              edit={{ remove: false, edit: false }}
            />
          </FeatureGroup>
        </MapContainer>
      </main>
    </div>
  );
}
