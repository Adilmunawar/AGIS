"use client";
import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, FeatureGroup, GeoJSON, useMap } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import { useToast } from '@/hooks/use-toast';
import { useServerConfig } from '@/hooks/use-server-config';
import { Route as RouteIcon, Download, Loader2 } from 'lucide-react';
import type { LatLng, LatLngBounds } from 'leaflet';
import { GisControlBar } from './GisControlBar';
import { MapHeader, type BaseLayer } from './MapHeader';
import L from 'leaflet';
import { useGisData } from '@/context/GisDataContext';
import MousePositionControl from './MousePositionControl';
import LiveBuildingsLayer from './LiveBuildingsLayer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
    polygonCoords, isProcessing, geoData, colabUrl, statusMessage, liveBuildings, liveRoads,
    runStandardExtraction, runRealtimeExtraction, handleDownload, setLiveRoads
} : {
    polygonCoords: string | null; isProcessing: boolean; geoData: any;
    colabUrl: string; statusMessage: string | null; liveBuildings: any; liveRoads: any;
    runStandardExtraction: () => void;
    runRealtimeExtraction: () => void; handleDownload: () => void;
    setLiveRoads: (data: any) => void;
}) {
    const map = useMap();
    const controlRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();
    const [isExtractingRoads, setIsExtractingRoads] = useState(false);

    useEffect(() => {
        if (controlRef.current) {
            L.DomEvent.disableClickPropagation(controlRef.current);
            L.DomEvent.disableScrollPropagation(controlRef.current);
        }
    }, []);

    const handleLiveRoadExtraction = async () => {
      setIsExtractingRoads(true);
      setLiveRoads(null);
      try {
        const bounds = map.getBounds();
        const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
  
        toast({ title: "Extracting Roads...", description: "Querying OpenStreetMap..." });
  
        const response = await fetch('/api/gee/extract-live', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bbox, type: 'roads' }),
        });
  
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch roads from the server');
  
        if (data.geoJson) {
          if (data.geoJson.features.length === 0) {
              toast({ title: "No Roads Found", description: "No road features were found in the current view.", variant: "destructive" });
              return;
          }
          setLiveRoads(data.geoJson);
          toast({ title: "Roads Extracted", description: `${data.geoJson.features.length} road segments ready.` });
        }
  
      } catch (error: any) {
        console.error(error);
        toast({ title: "Extraction Failed", description: error.message, variant: "destructive" });
      } finally {
        setIsExtractingRoads(false);
      }
    };

    const handleDownloadLive = () => {
      const buildingFeatures = liveBuildings?.features || [];
      const roadFeatures = liveRoads?.features || [];
      const features = [...buildingFeatures, ...roadFeatures];
  
      if (features.length === 0) {
          toast({ variant: 'destructive', title: 'No Live Data to Download', description: 'Extract some roads or ensure buildings are visible.' });
          return;
      }
  
      const combinedGeoJson = {
          type: "FeatureCollection",
          features: features
      };
  
      const blob = new Blob([JSON.stringify(combinedGeoJson)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = "live_data_export.geojson";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

    const hasSelection = !!polygonCoords;

    return (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1001] flex flex-col items-center gap-2">
            <div className="flex items-end gap-2">
                 <div ref={controlRef}>
                    <GisControlBar
                        title={<><RouteIcon className="h-5 w-5 text-primary"/> Extract Roads</>}
                        hasSelection={hasSelection}
                        isProcessing={isProcessing}
                        geoData={geoData}
                        colabUrl={colabUrl}
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
                <Card className="rounded-xl border-slate-200/50 bg-white/80 shadow-lg backdrop-blur-xl p-1.5 flex items-center gap-1.5">
                    <Button onClick={handleLiveRoadExtraction} disabled={isExtractingRoads} variant="outline" className="h-9 bg-white/50">
                        {isExtractingRoads ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-red-500" /> : <RouteIcon className="mr-2 h-4 w-4 text-red-500" />}
                        Extract Roads
                    </Button>
                    <Button onClick={handleDownloadLive} variant="outline" size="icon" className="h-9 w-9 bg-white/50" disabled={!liveBuildings && !liveRoads}>
                        <Download className="h-4 w-4" />
                    </Button>
                </Card>
            </div>
             {statusMessage && (
                <div
                className="flex items-center gap-2 rounded-full border border-slate-200/50 bg-white/80 px-4 py-1.5 text-xs shadow-lg backdrop-blur-xl"
                >
                {isProcessing && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                <p className="text-muted-foreground">{statusMessage}</p>
                </div>
            )}
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
  
  const [liveBuildings, setLiveBuildings] = useState<any>(null);
  const [liveRoads, setLiveRoads] = useState<any>(null);

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
    <div className="relative h-full w-full">
      <MapContainer center={[31.46, 74.38]} zoom={16} zoomControl={false} style={{ height: '100%', width: '100%' }}>
        <MapHeader layers={baseLayers} activeLayer={activeLayer} onLayerSelect={setActiveLayer} />

        <TileLayer
          key={activeLayer.url}
          url={activeLayer.url}
          attribution={activeLayer.attribution}
          subdomains={activeLayer.subdomains || ''}
          noWrap={true}
        />
        
        <LiveBuildingsLayer onDataFetched={setLiveBuildings} />
        {liveBuildings && (
            <GeoJSON 
                key={JSON.stringify(liveBuildings)}
                data={liveBuildings} 
                style={{ color: '#00FFFF', weight: 1.5, fillColor: '#00FFFF', fillOpacity: 0.1 }} 
            />
        )}
        {liveRoads && (
            <GeoJSON 
                key={JSON.stringify(liveRoads)}
                data={liveRoads} 
                style={{ color: '#facc15', weight: 3, opacity: 0.8 }} 
            />
        )}
        
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
            liveBuildings={liveBuildings}
            liveRoads={liveRoads}
            setLiveRoads={setLiveRoads}
        />
        <MousePositionControl />
      </MapContainer>
    </div>
  );
}
