"use client";
import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, FeatureGroup, LayersControl, GeoJSON } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Download, Play, Route as RouteIcon } from 'lucide-react';
import type { LatLngBounds } from 'leaflet';

const { BaseLayer } = LayersControl;

function osmToGeoJSONRoads(osmData: any): GeoJSON.FeatureCollection {
  const features = osmData.elements
    .filter((element: any) => element.type === 'way' && element.nodes)
    .map((way: any) => {
      const coordinates = way.nodes.map((nodeId: number) => {
        const node = osmData.elements.find((el: any) => el.id === nodeId);
        return node ? [node.lon, node.lat] : null;
      }).filter(Boolean);

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
  const [bounds, setBounds] = useState<LatLngBounds | null>(null);
  const [geoData, setGeoData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    workerRef.current = new Worker('/gisWorker.js');
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
    setBounds(layer.getBounds());
  };

  const fetchOverpassData = async () => {
    if (!bounds) return;
    setIsProcessing(true);
    setGeoData(null);
    toast({ title: "Step 1/2", description: "Fetching Road Network Data..." });

    try {
      const b = bounds;
      const query = `[out:json][timeout:25];(way["highway"](${b.getSouth()},${b.getWest()},${b.getNorth()},${b.getEast()}););(._;>;);out;`;
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

      toast({ title: "Step 2/2", description: "Running Python Engine..." });
      workerRef.current?.postMessage({
        action: "EXTRACT_ROADS",
        payload: { roads: roadsGeoJSON }
      });
    } catch (error: any) {
      setIsProcessing(false);
      toast({ title: "Error", description: error.message || "Failed to fetch map data.", variant: "destructive" });
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

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-4 left-4 z-[1000] w-96">
        <Card className="shadow-lg border-border/20 bg-background/80 backdrop-blur-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl flex items-center gap-2"><RouteIcon className="w-6 h-6 text-primary"/> Extract Roads</CardTitle>
            <CardDescription>Draw a rectangle to select an area and extract the road network.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
             <div className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg border">
              {bounds ? `Selected Area: ${bounds.getNorth().toFixed(4)}N, ${bounds.getEast().toFixed(4)}E` : "Draw a rectangle on the map to begin."}
            </div>
            
            <div className="flex flex-col gap-2">
              <Button onClick={fetchOverpassData} disabled={!bounds || isProcessing} size="lg">
                {isProcessing ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Processing...</> : <><Play className="mr-2 h-5 w-5" /> Extract Road Network</>}
              </Button>
              
              {geoData && (
                <Button onClick={handleDownload} variant="outline" size="lg">
                  <Download className="mr-2 h-5 w-5" /> Download GeoJSON
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <MapContainer center={[31.46, 74.38]} zoom={16} style={{ height: '100%', width: '100%', zIndex: 1 }}>
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
              if (layers.getLayers().length > 0) {
                  setBounds(layers.getBounds());
              }
            }}
            onDeleted={() => {
              setBounds(null);
              setGeoData(null);
            }} 
            draw={{ 
              polygon: false, 
              circle: false, 
              marker: false, 
              polyline: false, 
              circlemarker: false,
              rectangle: {
                  shapeOptions: {
                    color: '#16a34a',
                    weight: 2,
                    fillOpacity: 0.1,
                  }
              }
            }} 
            />
        </FeatureGroup>
        
        {geoData && <GeoJSON data={geoData} style={{ color: '#ef4444', weight: 4 }} />}
      </MapContainer>
    </div>
  );
}
