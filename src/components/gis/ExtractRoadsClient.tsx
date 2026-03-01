"use client";
import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, FeatureGroup, GeoJSON, useMap } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import { useToast } from '@/hooks/use-toast';
import { useServerConfig } from '@/hooks/use-server-config';
import { Route as RouteIcon } from 'lucide-react';
import type { LatLng, LatLngBounds } from 'leaflet';
import { GisControlBar } from './GisControlBar';
import { MapHeader, type BaseLayer } from './MapHeader';
import L from 'leaflet';
import { useGisData } from '@/context/GisDataContext';

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
                title={<><RouteIcon className="h-5 w-5 text-primary"/> Extract Roads</>}
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
                    description: 'Extracts road networks using standard open-source data. Ideal for quick analysis.',
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

export default function ExtractRoadsClient() {
  const { extractRoads: { polygonCoords, selectionBounds, geoData }, updateToolState } = useGisData();
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>('Engine ready. Draw a polygon to begin.');
  const workerRef = useRef<Worker | null>(null);
  const { toast } = useToast();
  const { colabUrl } = useServerConfig();
  const [activeLayer, setActiveLayer] = useState<BaseLayer>(baseLayers[2]);
  const featureGroupRef = useRef<L.FeatureGroup>(null);

  useEffect(() => {
    const fg = featureGroupRef.current;
    if (!fg) return;

    fg.clearLayers();

    if (polygonCoords) {
      try {
        const latlngs = polygonCoords.split(' ').map(coord => {
            const [lat, lng] = coord.split(',').map(Number);
            return L.latLng(lat, lng);
        });
        const polygon = L.polygon(latlngs, {
            color: '#16a34a', weight: 2, fillOpacity: 0.1
        });
        fg.addLayer(polygon);
      } catch (error) {
          console.error("Error creating polygon from stored coords:", error);
      }
    }
  }, [polygonCoords]);
  
  useEffect(() => {
    workerRef.current = new Worker('/workers/roadsWorker.js');
    workerRef.current.onmessage = (e: MessageEvent) => {
      const { status, message, action, data } = e.data;

      if (status === 'info') {
        setStatusMessage(message);
      } else if (status === 'success' && action === 'EXTRACT_ROADS') {
        updateToolState('extractRoads', { geoData: data });
        setIsProcessing(false);
        setStatusMessage(`Topological analysis finished. ${data?.features?.length || 0} linear features extracted.`);
      } else if (status === 'error') {
        setIsProcessing(false);
        setStatusMessage(message);
        toast({ title: "Network Analysis Error", description: message, variant: "destructive" });
      }
    };
    return () => workerRef.current?.terminate();
  }, [toast, updateToolState]);

  const handleCreated = (e: any) => {
    const layer = e.layer;
    const latlngs: LatLng[] = layer.getLatLngs()[0];
    const polyString = latlngs.map((ll) => `${ll.lat},${ll.lng}`).join(' ');
    updateToolState('extractRoads', {
      polygonCoords: polyString,
      selectionBounds: layer.getBounds(),
      geoData: null,
    });
    setStatusMessage('Area selected. Ready for extraction.');
  };

  const handleDeleted = (e: any) => {
    updateToolState('extractRoads', {
      polygonCoords: null,
      selectionBounds: null,
      geoData: null,
    });
    setStatusMessage('Selection cleared. Draw a new polygon to begin.');
  };

  const runStandardExtraction = async () => {
    if (!polygonCoords) return;
    setIsProcessing(true);
    updateToolState('extractRoads', { geoData: null });
    setStatusMessage("Querying data source for highway vectors...");

    try {
      const overpassPoly = polygonCoords.split(' ').map(c => c.replace(',', ' ')).join(' ');
      const query = `[out:json][timeout:25];(way["highway"](poly:"${overpassPoly}"););(._;>;);out;`;
      const response = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error(`Data fetching failed: ${response.status}`);
      }
      
      const rawData = await response.json();
      const roadsGeoJSON = osmToGeoJSONRoads(rawData);

      if (!roadsGeoJSON.features.length) {
         toast({ title: "No Data Found", description: "No roads were found in the selected area.", variant: "destructive" });
         setIsProcessing(false);
         setStatusMessage("No roads found in the selected area.");
         return;
      }

      setStatusMessage("Performing topological structuring on linear features...");
      workerRef.current?.postMessage({
        action: "EXTRACT_ROADS",
        payload: { roads: roadsGeoJSON }
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
    updateToolState('extractRoads', { geoData: null });
    setStatusMessage("Contacting AGIS Realtime service for transport segments...");

    try {
        const leafletBounds = L.latLngBounds(selectionBounds._southWest, selectionBounds._northEast);
        const bbox = [
            leafletBounds.getWest(),
            leafletBounds.getSouth(),
            leafletBounds.getEast(),
            leafletBounds.getNorth()
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
        updateToolState('extractRoads', { geoData: result });
        setStatusMessage(`Topological analysis finished. ${result?.features?.length || 0} linear features extracted.`);
        toast({
            title: "AGIS Realtime Extraction Complete",
            description: `Found ${result?.features?.length || 0} road features.`,
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
    a.download = "extracted_roads.geojson";
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
        
        <FeatureGroup ref={featureGroupRef}>
          <EditControl 
            position="topleft" 
            onCreated={handleCreated}
            onEdited={(e) => {
              const layers = e.layers;
              layers.eachLayer((layer: any) => {
                const latlngs: LatLng[] = layer.getLatLngs()[0];
                const polyString = latlngs.map((ll) => `${ll.lat},${ll.lng}`).join(' ');
                updateToolState('extractRoads', {
                  polygonCoords: polyString,
                  selectionBounds: layer.getBounds(),
                });
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
