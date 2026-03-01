'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, FeatureGroup } from 'react-leaflet';
import L, { LatLngBounds } from 'leaflet';
import { useToast } from '@/hooks/use-toast';
import { ParcelEditorDocker, EditorTool } from './ParcelEditorDocker';
import { useGisData } from '@/context/GisDataContext';
import { EditControl } from 'react-leaflet-draw';
import * as turf from '@turf/turf';
import { MapHeader, type BaseLayer } from './MapHeader';

// Set up default Leaflet icon path
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
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

export default function ImportParcelsClient() {
  const { toast } = useToast();
  const { 
    importParcels: { boundaryData, parcelsData, homesData, selectedFeatureIds, history, historyIndex }, 
    updateToolState,
    undo,
    redo,
    deleteSelectedFeatures,
    clearAllLayers,
    toggleFeatureSelection,
    mergeSelectedFeatures
  } = useGisData();
  
  const [isProcessing, setIsProcessing] = useState({ boundary: false, parcels: false, homes: false });
  const workerRef = useRef<Worker | null>(null);

  const [activeTool, setActiveTool] = useState<EditorTool>('select');
  const featureGroupRef = useRef<L.FeatureGroup>(null);
  const mapRef = useRef<L.Map>(null);
  const [activeLayer, setActiveLayer] = useState<BaseLayer>(baseLayers[0]);

  const selectedFeature = useMemo(() => {
    if (selectedFeatureIds.length !== 1) return null;
    const selectedId = selectedFeatureIds[0];
    return parcelsData?.features.find((f: any) => f.id === selectedId) || null;
  }, [parcelsData, selectedFeatureIds]);


  const handleUpload = (files: File[], layer: 'boundary' | 'parcels' | 'homes') => {
    if (!files || files.length === 0) return;

    const hasShp = files.some(f => f.name.toLowerCase().endsWith('.shp'));
    const hasDbf = files.some(f => f.name.toLowerCase().endsWith('.dbf'));

    if (!hasShp || !hasDbf) {
      toast({ variant: 'destructive', title: 'Missing Required Files', description: 'Your selection must include both .shp and .dbf files.' });
      return;
    }

    setIsProcessing(prev => ({ ...prev, [layer]: true }));
    toast({ title: `Processing ${layer}...`, description: 'Parsing files in browser memory.' });
    workerRef.current?.postMessage({ files, layer });
  };
  
  useEffect(() => {
    workerRef.current = new Worker('/workers/shapefileWorker.js');
    workerRef.current.onmessage = (event: MessageEvent) => {
      const { status, geojson, error, layer: processedLayer } = event.data;
      
      if (!processedLayer) return;

      setIsProcessing(prev => ({ ...prev, [processedLayer]: false }));

      if (error) {
        toast({ variant: 'destructive', title: `Error Processing ${processedLayer}`, description: error });
        return;
      }
      
      if (status === 'success' && geojson && geojson.features) {
        const dataKey = `${processedLayer}Data` as 'boundaryData' | 'parcelsData' | 'homesData';
        
        let featureIdCounter = 0;
        geojson.features.forEach((feature: any) => {
          if (!feature.id) {
            feature.id = `${processedLayer}-${Date.now()}-${featureIdCounter++}`;
          }
        });

        updateToolState('importParcels', { [dataKey]: geojson }, { manageHistory: true });

        toast({ title: `${processedLayer.charAt(0).toUpperCase() + processedLayer.slice(1)} Layer Processed`, description: `Found ${geojson.features.length} features.` });
      } else {
         toast({ variant: 'destructive', title: 'Processing Error', description: 'Failed to parse the shapefile. Please ensure it is valid.' });
      }
    };
    return () => {
      workerRef.current?.terminate();
    };
  }, [toast, updateToolState]);

  const boundsToFly = useMemo(() => {
    if (!parcelsData && !boundaryData) return null;
    const bounds = new L.LatLngBounds([]);
    if (parcelsData) {
      const geoJsonLayer = L.geoJSON(parcelsData);
      bounds.extend(geoJsonLayer.getBounds());
    }
     if (boundaryData) {
      const geoJsonLayer = L.geoJSON(boundaryData);
      bounds.extend(geoJsonLayer.getBounds());
    }
    return bounds.isValid() ? bounds : null;
  }, [parcelsData, boundaryData]);

  useEffect(() => {
    if (mapRef.current && boundsToFly) {
      mapRef.current.flyToBounds(boundsToFly, { padding: [50, 50] });
    }
  }, [boundsToFly]);

  // Handler for clicking a feature on the map
  const handleFeatureClick = useCallback((feature: any) => {
      toggleFeatureSelection(feature.id, activeTool === 'multi-select');
  }, [toggleFeatureSelection, activeTool]);

  // Handler for clicking a row in the attribute table
  const handleTableRowClick = useCallback((feature: any) => {
    // When a table row is clicked, we always want to do a single-selection
    toggleFeatureSelection(feature.id, false);

    // And fly to that feature on the map
    if (mapRef.current && feature && feature.geometry) {
        try {
            const boundingBox = turf.bbox(feature);
            const leafletBounds = L.latLngBounds(
                [boundingBox[1], boundingBox[0]], // SW corner
                [boundingBox[3], boundingBox[2]]  // NE corner
            );
            mapRef.current.flyToBounds(leafletBounds, { padding: [50, 50], maxZoom: 18 });
        } catch(e) {
            console.error("Could not fly to feature:", e);
        }
    }
  }, [toggleFeatureSelection, mapRef]);

  const handleExportGeoJSON = () => {
    if (!parcelsData) return;
    const blob = new Blob([JSON.stringify(parcelsData)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "edited_parcels.geojson";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: 'Export Successful', description: 'Parcels exported to edited_parcels.geojson' });
  };
  
  const getFeatureStyle = (feature: any) => {
    const isSelected = selectedFeatureIds.includes(feature.id);
    if (isSelected) {
      return { color: '#fbbf24', weight: 3, fillOpacity: 0.7, fillColor: '#f59e0b' };
    }
    // Differentiate styles for different layers if needed, e.g., based on properties
    return { color: "#2563eb", weight: 2, fillOpacity: 0.1 };
  }

  const boundaryStyle = { color: "#dc2626", weight: 3, fill: false };
  const homeStyle = { color: "#16a34a", weight: 1.5, fillOpacity: 0.6 };
  
  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className="flex-1 h-full relative min-w-0">
        <MapContainer
          ref={mapRef}
          center={[30.3753, 69.3451]} // Center of Pakistan
          zoom={6}
          style={{ height: '100%', width: '100%', backgroundColor: '#f0f0f0' }}
          zoomControl={false}
        >
          <MapHeader layers={baseLayers} activeLayer={activeLayer} onLayerSelect={setActiveLayer} />
          <TileLayer
            key={activeLayer.url}
            attribution={activeLayer.attribution}
            url={activeLayer.url}
            subdomains={activeLayer.subdomains || ''}
          />
          <FeatureGroup ref={featureGroupRef}>
            <EditControl
              position="topleft"
              draw={{
                polygon: true,
                polyline: false,
                rectangle: true,
                circle: false,
                marker: false,
                circlemarker: false,
              }}
              edit={{
                edit: true,
                remove: true,
              }}
            />
          </FeatureGroup>
          {boundaryData && <GeoJSON key={`boundary-${historyIndex}-${boundaryData.features.length}`} data={boundaryData} style={boundaryStyle} />}
          {parcelsData && <GeoJSON 
            key={`parcels-${historyIndex}-${parcelsData.features.length}-${selectedFeatureIds.join('-')}`}
            data={parcelsData} 
            style={getFeatureStyle}
            onEachFeature={(feature, layer) => {
                layer.on({
                    click: () => handleFeatureClick(feature)
                });
            }}
          />}
          {homesData && <GeoJSON key={`homes-${historyIndex}-${homesData.features.length}`} data={homesData} style={homeStyle} />}
        </MapContainer>
      </div>
      <div className="w-[550px] flex-shrink-0 h-full flex flex-col border-l bg-background">
        <ParcelEditorDocker 
            onUpload={handleUpload}
            isProcessing={isProcessing}
            boundaryData={boundaryData}
            parcelsData={parcelsData}
            homesData={homesData}
            selectedFeatureIds={selectedFeatureIds}
            onDeleteSelected={deleteSelectedFeatures}
            onClearData={clearAllLayers}
            onFeatureSelect={handleTableRowClick}
            onExportGeoJSON={handleExportGeoJSON}
            activeTool={activeTool}
            onToolSelect={setActiveTool}
            onUndo={undo}
            onRedo={redo}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
            onMerge={mergeSelectedFeatures}
        />
      </div>
    </div>
  );
}
