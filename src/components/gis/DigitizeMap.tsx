'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, FeatureGroup, GeoJSON, LayersControl } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import { LatLngBounds } from 'leaflet';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Loader2 } from 'lucide-react';

function osmToGeoJSON(osmData: any): GeoJSON.FeatureCollection {
  const features = osmData.elements
    .filter((d: any) => d.type === 'way' && d.nodes)
    .map((way: any) => {
      const nodes = way.nodes.map((nodeId: number) => {
        const node = osmData.elements.find((n: any) => n.id === nodeId);
        return node ? [node.lon, node.lat] : null;
      }).filter((n: any) => n !== null); // Filter out null nodes if any are not found

      if (nodes.length > 1 && (nodes[0][0] !== nodes[nodes.length - 1][0] || nodes[0][1] !== nodes[nodes.length - 1][1])) {
        nodes.push(nodes[0]);
      }

      return {
        type: 'Feature',
        properties: way.tags,
        geometry: {
          type: 'Polygon',
          coordinates: [nodes],
        },
      };
    });
  return {
    type: 'FeatureCollection',
    features: features,
  };
}

export default function DigitizeMap() {
  const [bounds, setBounds] = useState<LatLngBounds | null>(null);
  const [geoData, setGeoData] = useState<GeoJSON.FeatureCollection | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    workerRef.current = new Worker('/gisWorker.js');
    workerRef.current.onmessage = (e: MessageEvent) => {
      const { status, message, action, data } = e.data;
      if (status === 'info') {
        toast({ title: "Python Engine", description: message });
      } else if (status === 'success' && action === 'DIGITIZE_MAP') {
        setGeoData(data);
        setIsProcessing(false);
        toast({ title: "Success", description: "Map Digitized Successfully!" });
      } else if (status === 'error') {
        setIsProcessing(false);
        toast({ variant: "destructive", title: "Processing Error", description: message });
      }
    };
    
    // Terminate worker on component unmount
    return () => workerRef.current?.terminate();
  }, [toast]);

  const handleCreated = (e: any) => {
    const layer = e.layer;
    setBounds(layer.getBounds());
  };

  const handleDigitize = async () => {
    if (!bounds) return;
    setIsProcessing(true);
    setGeoData(null);
    toast({ title: "Processing", description: "Fetching building data from Overpass API..." });
    
    try {
      const [s, w, n, e] = [bounds.getSouth(), bounds.getWest(), bounds.getNorth(), bounds.getEast()];
      const overpassQuery = `[out:json][timeout:25];(way["building"](${s},${w},${n},${e}););(._;>;);out;`;
      const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;
      
      const response = await fetch(overpassUrl);
      if (!response.ok) {
        throw new Error(`Overpass API failed with status: ${response.status}`);
      }
      const osmData = await response.json();
      const rawBuildings = osmToGeoJSON(osmData);

      if (!rawBuildings.features || rawBuildings.features.length === 0) {
        toast({ variant: "destructive", title: "No Data", description: "No buildings found in the selected area." });
        setIsProcessing(false);
        return;
      }
      
      toast({ title: "Processing", description: "Sending data to Python Geometry Engine..." });
      workerRef.current?.postMessage({
        action: "DIGITIZE_MAP",
        payload: { buildings: rawBuildings }
      });
    } catch (error: any) {
      setIsProcessing(false);
      toast({ variant: "destructive", title: "Error", description: error.message || "Failed to fetch or process data." });
    }
  };

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-4 right-4 z-[1000]">
        <Card>
          <CardHeader>
            <CardTitle>Digitize Selection</CardTitle>
            <CardDescription>Draw a rectangle on the map to select an area.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleDigitize} disabled={!bounds || isProcessing} className="w-full">
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isProcessing ? "Processing..." : "Digitize Selection"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <MapContainer center={[31.46, 74.38]} zoom={15} style={{ height: '100%', width: '100%' }}>
        <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="OpenStreetMap">
                <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Satellite">
                <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution='&copy; Esri &mdash; i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                />
            </LayersControl.BaseLayer>
        </LayersControl>
        
        <FeatureGroup>
          <EditControl
            position="topleft"
            onCreated={handleCreated}
            onEdited={(e) => {
                const layers = e.layers;
                if (layers.getLayers().length > 0) {
                    setBounds(layers.getBounds());
                }
            }}
            onDeleted={() => setBounds(null)}
            draw={{
              polygon: false,
              polyline: false,
              circle: false,
              circlemarker: false,
              marker: false,
              rectangle: {
                shapeOptions: {
                  color: '#4DB6AC',
                  weight: 2,
                  fillOpacity: 0.1,
                }
              }
            }}
            edit={{
                edit: true,
                remove: true,
            }}
          />
        </FeatureGroup>
        {geoData && <GeoJSON data={geoData} style={{ color: 'blue', weight: 2 }} />}
      </MapContainer>
    </div>
  );
}
