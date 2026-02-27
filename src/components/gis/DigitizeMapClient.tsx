'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, FeatureGroup, LayersControl, GeoJSON } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import { useToast } from '@/hooks/use-toast';
import { useServerConfig } from '@/hooks/use-server-config';
import { Map as MapIcon } from 'lucide-react';
import type { LatLng, LatLngBounds } from 'leaflet';
import { MapSearchControl } from './MapSearchControl';
import { GisControlBar } from './GisControlBar';

const { BaseLayer } = LayersControl;

function osmToGeoJSON(osmData: any): GeoJSON.FeatureCollection {
    const nodes = new Map<number, number[]>();
    const ways = new Map<number, any>();

    for (const el of osmData.elements) {
        if (el.type === 'node') {
            nodes.set(el.id, [el.lon, el.lat]);
        } else if (el.type === 'way') {
            ways.set(el.id, el);
        }
    }

    const processedWayIds = new Set<number>();
    const finalFeatures: GeoJSON.Feature[] = [];

    osmData.elements.forEach((el: any) => {
        if (el.type !== 'relation' || !el.tags?.building) return;

        const outerRings: any[][] = [];
        const innerRings: any[][] = [];
        const memberWayIds = new Set<number>();

        el.members.forEach((member: any) => {
            if (member.type !== 'way') return;
            const way = ways.get(member.ref);
            if (!way) return;
            memberWayIds.add(way.id);

            const ring = way.nodes.map((id: number) => nodes.get(id)).filter(Boolean);
            if (ring.length > 1 && JSON.stringify(ring[0]) !== JSON.stringify(ring[ring.length-1])) {
                ring.push(ring[0]);
            }
            if (ring.length < 4) return;

            if (member.role === 'outer') outerRings.push(ring);
            else if (member.role === 'inner') innerRings.push(ring);
        });

        if (outerRings.length === 1) {
            finalFeatures.push({ type: 'Feature', properties: el.tags, geometry: { type: 'Polygon', coordinates: [outerRings[0], ...innerRings] } });
            memberWayIds.forEach(id => processedWayIds.add(id));
        } else if (outerRings.length > 1) {
            outerRings.forEach(ring => {
                finalFeatures.push({ type: 'Feature', properties: el.tags, geometry: { type: 'Polygon', coordinates: [ring] } });
            });
            memberWayIds.forEach(id => processedWayIds.add(id));
        }
    });

    ways.forEach((way: any) => {
        if (!way.tags?.building || processedWayIds.has(way.id)) return;
        const coordinates = way.nodes.map((id: number) => nodes.get(id)).filter(Boolean);
        if (coordinates.length > 1 && JSON.stringify(coordinates[0]) !== JSON.stringify(coordinates[coordinates.length - 1])) {
            coordinates.push(coordinates[0]);
        }
        if (coordinates.length < 4) return;

        finalFeatures.push({ type: 'Feature', properties: way.tags, geometry: { type: 'Polygon', coordinates: [coordinates] } });
    });

    return { type: 'FeatureCollection', features: finalFeatures };
}

export default function DigitizeMapClient() {
  const [polygonCoords, setPolygonCoords] = useState<string | null>(null);
  const [selectionBounds, setSelectionBounds] = useState<LatLngBounds | null>(null);
  const [geoData, setGeoData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const { toast } = useToast();
  const { colabUrl } = useServerConfig();

  useEffect(() => {
    workerRef.current = new Worker('/workers/digitizeWorker.js');
    workerRef.current.onmessage = (e: MessageEvent) => {
      const { status, message, action, data } = e.data;

      if (status === 'info') {
        toast({ title: "Python Engine", description: message });
      } else if (status === 'success' && action === 'DIGITIZE_MAP') {
        setGeoData(data);
        setIsProcessing(false);
        toast({ title: "Map Digitized", description: "Geometry successfully processed." });
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
    toast({ title: "Standard Extraction", description: "Fetching building footprints..." });

    try {
      const query = `[out:json][timeout:25];(way["building"](poly:"${polygonCoords}");relation["building"](poly:"${polygonCoords}"););out body;>;out skel qt;`;
      const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
      
      if (!response.ok) throw new Error(`Data fetching failed: ${response.status}`);
      const rawData = await response.json();
      const buildingsGeoJSON = osmToGeoJSON(rawData);

      if (!buildingsGeoJSON.features.length) {
         toast({ title: "No Data Found", description: "No buildings were found in the selected area.", variant: "destructive" });
         setIsProcessing(false);
         return;
      }

      toast({ title: "Standard Extraction", description: "Processing geometries..." });
      workerRef.current?.postMessage({
        action: "DIGITIZE_MAP",
        payload: { buildings: buildingsGeoJSON }
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
    toast({ title: "AGIS Realtime", description: "Requesting data from the extraction engine..." });

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
            body: JSON.stringify({ bbox, type: 'building' })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({details: `Server returned status ${response.status}`}));
            throw new Error(errorData.details);
        }

        const result = await response.json();
        setGeoData(result);
        toast({
            title: "AGIS Realtime Extraction Complete",
            description: `Found ${result?.features?.length || 0} building features.`,
        });

    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Backend Connection Error",
            description: "Could not connect to the AGIS Realtime engine. Check Server Configuration.",
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
    a.download = "digitized_map.geojson";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const hasSelection = !!polygonCoords;

  return (
    <div className="absolute inset-0 z-0">
      <GisControlBar
        title={<><MapIcon className="h-5 w-5 text-primary"/> Digitize Area</>}
        hasSelection={hasSelection}
        isProcessing={isProcessing}
        geoData={geoData}
        colabUrl={colabUrl}
        onRunStandard={runStandardExtraction}
        onRunRealtime={runRealtimeExtraction}
        onDownload={handleDownload}
        standardTab={{
            title: 'Standard',
            description: 'Extracts building footprints using standard open-source data. Good for general use.',
            buttonText: 'Run Standard'
        }}
        realtimeTab={{
            title: 'AGIS Realtime',
            description: 'Leverages the connected AGIS engine for higher accuracy and more comprehensive data.',
            buttonText: 'Run Realtime'
        }}
      />

      <MapContainer center={[31.46, 74.38]} zoom={16} zoomControl={true} style={{ height: '100%', width: '100%' }}>
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
              polygon: {
                  shapeOptions: { color: '#16a34a', weight: 2, fillOpacity: 0.1 }
              },
              rectangle: false,
              circle: false, 
              marker: false, 
              polyline: false, 
              circlemarker: false
            }}
            edit={{ edit: true, remove: true }}
            />
        </FeatureGroup>
        
        {geoData && <GeoJSON data={geoData} style={{ color: '#2563eb', weight: 2, fillColor: '#60a5fa', fillOpacity: 0.4 }} />}
      </MapContainer>
    </div>
  );
}
