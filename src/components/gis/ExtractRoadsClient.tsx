"use client";
import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, FeatureGroup, GeoJSON } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import { useToast } from '@/hooks/use-toast';
import { useServerConfig } from '@/hooks/use-server-config';
import type { LatLng } from 'leaflet';
import { MapControlsWrapper } from './MapControlsWrapper';
import { MapHeader, type BaseLayer } from './MapHeader';
import L from 'leaflet';
import { useGisData } from '@/context/GisDataContext';
import MousePositionControl from './MousePositionControl';
import LiveBuildingsLayer from './LiveBuildingsLayer';

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

export default function ExtractRoadsClient() {
  const { extractRoads: { polygonCoords, selectionBounds, geoData }, updateToolState } = useGisData();
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>('Engine ready. Draw a polygon to begin.');
  const { toast } = useToast();
  const { colabUrl } = useServerConfig();
  const [activeLayer, setActiveLayer] = useState<BaseLayer>(baseLayers[0]);
  const featureGroupRef = useRef<L.FeatureGroup>(null);
  
  const [liveBuildings, setLiveBuildings] = useState<any>(null);
  const [liveRoads, setLiveRoads] = useState<any>(null);
  const [isExtractingRoads, setIsExtractingRoads] = useState(false);

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
    if (!selectionBounds) return;
    setIsProcessing(true);
    updateToolState('extractRoads', { geoData: null });
    setStatusMessage("Querying GEE for road networks...");
    
    try {
        const bounds = L.latLngBounds(selectionBounds._southWest, selectionBounds._northEast);
        const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];

        const response = await fetch('/api/gee/extract-live', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bbox, type: 'roads' }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to fetch GEE data');

        if (data.geoJson) {
            updateToolState('extractRoads', { geoData: data.geoJson });
            setStatusMessage(`GEE extraction complete. ${data.geoJson?.features?.length || 0} features found.`);
        }
    } catch (error: any) {
        setStatusMessage("GEE data retrieval failed.");
        toast({ title: "Error", description: error.message || "Failed to fetch GEE data.", variant: "destructive" });
    } finally {
        setIsProcessing(false);
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
        
        <LiveBuildingsLayer onDataFetched={setLiveBuildings} onStatusChange={setStatusMessage} />
        
        {liveBuildings && (
            <GeoJSON 
                data={liveBuildings} 
                style={{ color: '#00FFFF', weight: 1.5, fillColor: '#00FFFF', fillOpacity: 0.1 }} 
            />
        )}
        {liveRoads && (
            <GeoJSON 
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
            isExtractingRoads={isExtractingRoads}
            setIsExtractingRoads={setIsExtractingRoads}
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
