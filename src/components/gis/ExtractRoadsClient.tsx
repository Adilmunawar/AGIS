"use client";
import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, FeatureGroup, LayersControl, GeoJSON } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useServerConfig } from '@/hooks/use-server-config';
import { Loader2, Download, Play, Route as RouteIcon, Server, ShieldAlert } from 'lucide-react';
import type { LatLng, LatLngBounds } from 'leaflet';
import { MapSearchControl } from './MapSearchControl';

const { BaseLayer } = LayersControl;

function osmToGeoJSONRoads(osmData: any): GeoJSON.FeatureCollection {
  const nodes = new Map<number, number[]>();
  for (const el of osmData.elements) {
    if (el.type === 'node') {
      nodes.set(el.id, [el.lon, el.lat]);
    }
  }

  const features = osmData.elements
    .filter((element: any) => element.type === 'way' && element.nodes)
    .map((way: any) => {
      const coordinates = way.nodes
        .map((nodeId: number) => nodes.get(nodeId))
        .filter(Boolean);

      if (coordinates.length < 2) return null;

      return {
        type: 'Feature',
        properties: way.tags || {},
        geometry: {
          type: 'LineString',
          coordinates: coordinates,
        },
      };
    }).filter(Boolean);

  return { type: 'FeatureCollection', features: features as GeoJSON.Feature[] };
}


export default function ExtractRoadsClient() {
  const [polygonCoords, setPolygonCoords] = useState<string | null>(null);
  const [selectionBounds, setSelectionBounds] = useState<LatLngBounds | null>(null);
  const [geoData, setGeoData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const { toast } = useToast();
  const { colabUrl } = useServerConfig();

  useEffect(() => {
    workerRef.current = new Worker('/workers/roadsWorker.js');
    workerRef.current.onmessage = (e: MessageEvent) => {
      const { status, message, action, data } = e.data;

      if (status === 'info') {
        toast({ title: "Python Engine", description: message });
      } else if (status === 'success' && action === 'EXTRACT_ROADS') {
        setGeoData(data);
        setIsProcessing(false);
        toast({ title: "Roads Extracted", description: "Geometry successfully processed." });
      } else if (status === 'error') {
        setIsProcessing(false);
        toast({ title: "Processing Error", description: message, variant: "destructive" });
      }
    };
    return () => workerRef.current?.terminate();
  }, [toast]);

  const handleCreated = (e: any) => {
    const layer = e.layer;
    const latlngs: LatLng[] = layer.getLatLngs()[0];
    const polyString = latlngs.map((ll) => `${ll.lat} ${ll.lng}`).join(' ');
    setPolygonCoords(polyString);
    setSelectionBounds(layer.getBounds());
  };

  const handleDeleted = () => {
    setPolygonCoords(null);
    setSelectionBounds(null);
    setGeoData(null);
  };

  const runStandardExtraction = async () => {
    if (!polygonCoords) return;
    setIsProcessing(true);
    setGeoData(null);
    toast({ title: "Step 1/2: Standard", description: "Fetching Road Network Data..." });

    try {
      const query = `[out:json][timeout:25];(way["highway"](poly:"${polygonCoords}"););(._;>;);out;`;
      const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error(`Overpass API failed with status ${response.status}`);
      }
      
      const rawData = await response.json();
      const roadsGeoJSON = osmToGeoJSONRoads(rawData);

      if (!roadsGeoJSON.features.length) {
         toast({ title: "No Data", description: "No roads found in the selected area.", variant: "destructive" });
         setIsProcessing(false);
         return;
      }

      toast({ title: "Step 2/2: Standard", description: "Running Browser Python Engine..." });
      workerRef.current?.postMessage({
        action: "EXTRACT_ROADS",
        payload: { roads: roadsGeoJSON }
      });
    } catch (error: any) {
      setIsProcessing(false);
      toast({ title: "Error", description: error.message || "Failed to fetch map data.", variant: "destructive" });
    }
  };
  
  const runRealtimeExtraction = async () => {
    if (!selectionBounds || !colabUrl) return;
    setIsProcessing(true);
    setGeoData(null);
    toast({ title: "AGIS Realtime Engine", description: "Sending request to external server..." });

    try {
        const bbox = [
            selectionBounds.getWest(),
            selectionBounds.getSouth(),
            selectionBounds.getEast(),
            selectionBounds.getNorth()
        ];
        
        const response = await fetch(`${colabUrl}/extract_overture`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bbox: bbox, type: "segment" })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({details: `Server returned status ${response.status}`}));
            throw new Error(errorData.details);
        }

        const result = await response.json();
        setGeoData(result);
        toast({
            title: "AGIS Realtime Extraction Complete",
            description: `Found ${result?.features?.length || 0} road features.`,
        });

    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Backend Connection Error",
            description: "Could not connect to the AGIS Realtime engine. Please check your Server Configuration.",
        });
    } finally {
        setIsProcessing(false);
    }
  };


  const handleDownload = () => {
    if (!geoData) return;
    const blob = new Blob([JSON.stringify(geoData)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "extracted_roads.geojson";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const hasSelection = !!polygonCoords;

  return (
    <div className="absolute inset-0 z-0">
      <div className="absolute top-6 left-6 z-[1000] w-80 max-w-[90vw] transition-all">
        <Card className="rounded-xl border-0 bg-white/90 shadow-xl backdrop-blur-md">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-xl"><RouteIcon className="h-6 w-6 text-primary"/> Extract Roads</CardTitle>
            <CardDescription>{hasSelection ? "Polygon area selected." : "Draw a polygon on the map to begin."}</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="standard" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="standard">Standard</TabsTrigger>
                    <TabsTrigger value="premium">AGIS Realtime</TabsTrigger>
                </TabsList>
                <TabsContent value="standard" className="space-y-4 pt-4">
                    <p className="text-xs text-muted-foreground">Extracts open-source road networks via the Overpass API directly in your browser.</p>
                    <Button onClick={runStandardExtraction} disabled={!hasSelection || isProcessing} className="w-full">
                        {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : <><Play className="mr-2 h-4 w-4" /> Run Standard Extraction</>}
                    </Button>
                </TabsContent>
                <TabsContent value="premium" className="space-y-4 pt-4">
                     {!colabUrl ? (
                        <Alert variant="destructive">
                            <ShieldAlert className="h-4 w-4" />
                            <AlertTitle>Server Not Configured</AlertTitle>
                            <AlertDescription>
                            The AGIS Realtime engine requires a Colab Backend. Go to Server Config to connect.
                            </AlertDescription>
                        </Alert>
                    ) : (
                         <p className="text-xs text-muted-foreground">Uses a connected external server for advanced Overture Maps road data extraction.</p>
                    )}
                    <Button onClick={runRealtimeExtraction} disabled={!hasSelection || isProcessing || !colabUrl} className="w-full">
                         {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</> : <><Server className="mr-2 h-4 w-4" /> Run AGIS Realtime Extraction</>}
                    </Button>
                </TabsContent>
            </Tabs>
            {geoData && (
                <div className="pt-4 mt-4 border-t">
                <Button onClick={handleDownload} variant="outline" size="sm" className="w-full">
                  <Download className="mr-2 h-4 w-4" /> Download GeoJSON
                </Button>
                </div>
            )}
          </CardContent>
        </Card>
      </div>

      <MapContainer center={[31.46, 74.38]} zoom={16} style={{ height: '100%', width: '100%' }}>
        <MapSearchControl />
        <LayersControl position="topright">
          <BaseLayer checked name="ESRI Satellite">
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Tiles &copy; Esri" />
          </BaseLayer>
          <BaseLayer name="Google Satellite">
            <TileLayer url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" attribution="&copy; Google" />
          </BaseLayer>
          <BaseLayer name="ESRI Terrain">
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}" attribution="Tiles &copy; Esri" />
          </BaseLayer>
        </LayersControl>
        
        <FeatureGroup>
          <EditControl 
            position="bottomright" 
            onCreated={handleCreated}
            onEdited={(e) => {
              const layers = e.layers;
              layers.eachLayer((layer: any) => {
                const latlngs: LatLng[] = layer.getLatLngs()[0];
                const polyString = latlngs.map((ll) => `${ll.lat} ${ll.lng}`).join(' ');
                setPolygonCoords(polyString);
                setSelectionBounds(layer.getBounds());
              });
            }}
            onDeleted={handleDeleted}
            draw={{ 
              polygon: { shapeOptions: { color: '#16a34a', weight: 2, fillOpacity: 0.1 } },
              rectangle: false,
              circle: false, 
              marker: false, 
              polyline: false, 
              circlemarker: false
            }}
            edit={{ edit: true, remove: true }}
            />
        </FeatureGroup>
        
        {geoData && <GeoJSON data={geoData} style={{ color: '#ef4444', weight: 4 }} />}
      </MapContainer>
    </div>
  );
}
