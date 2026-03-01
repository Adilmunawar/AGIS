'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, FeatureGroup, GeoJSON, useMap } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import { useToast } from '@/hooks/use-toast';
import { useServerConfig } from '@/hooks/use-server-config';
import { Map as MapIcon } from 'lucide-react';
import type { LatLng, LatLngBounds } from 'leaflet';
import { GisControlBar } from './GisControlBar';
import { MapHeader, type BaseLayer } from './MapHeader';
import L from 'leaflet';

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

const baseLayers: BaseLayer[] = [
    { 
      name: 'Google Hybrid', 
      url: 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      attribution: '&copy; Google',
      previewUrl: 'https://picsum.photos/seed/googlehybrid/400/300',
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    },
    { 
      name: 'Google Satellite',
      url: 'https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
      attribution: '&copy; Google',
      previewUrl: 'https://picsum.photos/seed/googlesatellite/400/300',
      subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    },
    { 
      name: 'ESRI Satellite', 
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri',
      previewUrl: 'https://picsum.photos/seed/esrisat/400/300',
      subdomains: [],
    },
];

function MapControlsWrapper({
    polygonCoords, isProcessing, geoData, colabUrl, statusMessage,
    runStandardExtraction, runRealtimeExtraction, handleDownload
} : {
    polygonCoords: string | null; isProcessing: boolean; geoData: any;
    colabUrl: string; statusMessage: string | null; runStandardExtraction: () => void;
    runRealtimeExtraction: () => void; handleDownload: () => void;
}) {
    const map = useMap();
    const controlRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (controlRef.current) {
            L.DomEvent.disableClickPropagation(controlRef.current);
            L.DomEvent.disableScrollPropagation(controlRef.current);
        }
    }, []);

    const hasSelection = !!polygonCoords;

    return (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1001] w-auto max-w-[90vw]">
            <div ref={controlRef}>
                <GisControlBar
                    title={<><MapIcon className="h-5 w-5 text-primary"/> Digitize Area</>}
                    hasSelection={hasSelection}
                    isProcessing={isProcessing}
                    geoData={geoData}
                    colabUrl={colabUrl}
                    statusMessage={statusMessage}
                    onRunStandard={runStandardExtraction}
                    onRunRealtime={runRealtimeExtraction}
                    onDownload={handleDownload}
                    onZoomIn={() => map.zoomIn()}
                    onZoomOut={() => map.zoomOut()}
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
            </div>
        </div>
    );
}

export default function DigitizeMapClient() {
  const [polygonCoords, setPolygonCoords] = useState<string | null>(null);
  const [selectionBounds, setSelectionBounds] = useState<LatLngBounds | null>(null);
  const [geoData, setGeoData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>('Engine ready. Draw a polygon to begin.');
  const workerRef = useRef<Worker | null>(null);
  const { toast } = useToast();
  const { colabUrl } = useServerConfig();
  const [activeLayer, setActiveLayer] = useState<BaseLayer>(baseLayers[2]);
  
  useEffect(() => {
    workerRef.current = new Worker('/workers/digitizeWorker.js');
    workerRef.current.onmessage = (e: MessageEvent) => {
      const { status, message, action, data } = e.data;

      if (status === 'info') {
        setStatusMessage(message);
      } else if (status === 'success' && action === 'DIGITIZE_MAP') {
        setGeoData(data);
        setIsProcessing(false);
        setStatusMessage(`Vectorization complete. ${data?.features?.length || 0} building footprints delineated.`);
      } else if (status === 'error') {
        setIsProcessing(false);
        setStatusMessage(message);
        toast({ title: "Geoprocessing Error", description: message, variant: "destructive" });
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
    setStatusMessage('Area selected. Ready for extraction.');
    setGeoData(null);
  };
  
  const handleDeleted = () => {
    setPolygonCoords(null);
    setSelectionBounds(null);
    setGeoData(null);
    setStatusMessage('Selection cleared. Draw a new polygon to begin.');
  };

  const runStandardExtraction = async () => {
    if (!polygonCoords) return;
    setIsProcessing(true);
    setGeoData(null);
    setStatusMessage("Querying data source for building footprints...");

    try {
      const query = `[out:json][timeout:25];(way["building"](poly:"${polygonCoords}");relation["building"](poly:"${polygonCoords}"););out body;>;out skel qt;`;
      const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
      
      if (!response.ok) throw new Error(`Data fetching failed: ${response.status}`);
      const rawData = await response.json();
      const buildingsGeoJSON = osmToGeoJSON(rawData);

      if (!buildingsGeoJSON.features.length) {
         toast({ title: "No Data Found", description: "No building footprints were found in the selected area.", variant: "destructive" });
         setIsProcessing(false);
         setStatusMessage("No building footprints found in the selected area.");
         return;
      }

      setStatusMessage("Executing geometric simplification and validation...");
      workerRef.current?.postMessage({
        action: "DIGITIZE_MAP",
        payload: { buildings: buildingsGeoJSON }
      });
    } catch (error: any) {
      setIsProcessing(false);
      setStatusMessage("Vector data retrieval failed. Check data source endpoint.");
      toast({ title: "Error", description: error.message || "Failed to fetch map data.", variant: "destructive" });
    }
  };

  const runRealtimeExtraction = async () => {
    if (!selectionBounds || !colabUrl) return;
    setIsProcessing(true);
    setGeoData(null);
    setStatusMessage("Interfacing with AGIS Realtime service for Overture data...");

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
        setStatusMessage(`Vectorization complete. ${result?.features?.length || 0} features delineated.`);
        toast({
            title: "AGIS Realtime Extraction Complete",
            description: `Found ${result?.features?.length || 0} building features.`,
        });

    } catch (error: any) {
        setStatusMessage("AGIS service endpoint unreachable.");
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
  
  return (
    <div className="absolute inset-0 z-0">
      <MapContainer center={[31.46, 74.38]} zoom={16} zoomControl={false} style={{ height: '100%', width: '100%' }}>
        <MapHeader layers={baseLayers} activeLayer={activeLayer} onLayerSelect={setActiveLayer} />
        
        <TileLayer
          key={activeLayer.url}
          url={activeLayer.url}
          attribution={activeLayer.attribution}
          subdomains={activeLayer.subdomains || ''}
          noWrap={true}
        />
        
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
        
        <MapControlsWrapper 
            polygonCoords={polygonCoords}
            isProcessing={isProcessing}
            geoData={geoData}
            colabUrl={colabUrl}
            statusMessage={statusMessage}
            runStandardExtraction={runStandardExtraction}
            runRealtimeExtraction={runRealtimeExtraction}
            handleDownload={handleDownload}
        />
      </MapContainer>
    </div>
  );
}
