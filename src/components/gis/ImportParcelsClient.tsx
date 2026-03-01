'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, FeatureGroup } from 'react-leaflet';
import L, { LatLngBounds } from 'leaflet';
import { useToast } from '@/hooks/use-toast';
import { ParcelEditorDocker, EditorTool } from './ParcelEditorDocker';
import { useGisData } from '@/context/GisDataContext';
import { EditControl } from 'react-leaflet-draw';
import { feature } from '@turf/turf';

// Set up default Leaflet icon path
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

export default function ImportParcelsClient() {
  const { toast } = useToast();
  const { 
    importParcels: { boundaryData, parcelsData, homesData, selectedFeatureId, history, historyIndex }, 
    updateToolState,
    undo,
    redo,
    deleteFeature,
    clearAllLayers
  } = useGisData();
  
  const [isProcessing, setIsProcessing] = useState({ boundary: false, parcels: false, homes: false });
  const workerRef = useRef<Worker | null>(null);

  const [activeTool, setActiveTool] = useState<EditorTool>('select');
  const featureGroupRef = useRef<L.FeatureGroup>(null);
  const mapRef = useRef<L.Map>(null);

  const selectedFeature = useMemo(() => {
    return parcelsData?.features.find((f: any) => f.id === selectedFeatureId) || null;
  }, [parcelsData, selectedFeatureId]);


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
      const { status, geojson, columns, error, layer: processedLayer } = event.data;
      
      if (!processedLayer) return;

      setIsProcessing(prev => ({ ...prev, [processedLayer]: false }));

      if (error) {
        toast({ variant: 'destructive', title: `Error Processing ${processedLayer}`, description: error });
        return;
      }
      
      if (status === 'success' && geojson) {
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

  const handleFeatureClick = useCallback((feature: any) => {
      updateToolState('importParcels', { selectedFeatureId: feature.id }, { manageHistory: false });
      if (mapRef.current && feature.geometry) {
        const featureLayer = L.geoJSON(feature);
        mapRef.current.flyToBounds(featureLayer.getBounds(), { maxZoom: 18 });
      }
  }, [updateToolState]);

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
  
  const boundaryStyle = { color: "#dc2626", weight: 3, fill: false };
  const parcelStyle = { color: "#2563eb", weight: 2, fillOpacity: 0.1 };
  const homeStyle = { color: "#16a34a", weight: 1.5, fillOpacity: 0.6 };
  const selectedStyle = { color: "#e11d48", weight: 4, fillOpacity: 0.3 };
  
  return (
    <div className="flex h-full w-full">
      <div className="flex-1 relative">
        <MapContainer
          ref={mapRef}
          center={[30.3753, 69.3451]} // Center of Pakistan
          zoom={6}
          style={{ height: '100%', width: '100%', backgroundColor: '#f0f0f0' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.google.com/maps">Google</a>'
            url="https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}"
            subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
          />
          <FeatureGroup ref={featureGroupRef}>
            <EditControl
              position="topright"
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
          {boundaryData && <GeoJSON data={boundaryData} style={boundaryStyle} />}
          {parcelsData && <GeoJSON 
            key={JSON.stringify(parcelsData)} // Force re-render on data change
            data={parcelsData} 
            style={parcelStyle} 
            onEachFeature={(feature, layer) => {
                layer.on({
                    click: () => handleFeatureClick(feature)
                });
            }}
          />}
          {homesData && <GeoJSON data={homesData} style={homeStyle} />}
          {selectedFeature && <GeoJSON key={selectedFeature.id} data={selectedFeature} style={selectedStyle} />}

        </MapContainer>
      </div>
      <ParcelEditorDocker 
        onUpload={handleUpload}
        isProcessing={isProcessing}
        boundaryData={boundaryData}
        parcelsData={parcelsData}
        homesData={homesData}
        selectedFeature={selectedFeature}
        onDeleteSelected={() => selectedFeatureId && deleteFeature(selectedFeatureId)}
        onClearData={clearAllLayers}
        onFeatureSelect={handleFeatureClick}
        onExportGeoJSON={handleExportGeoJSON}
        onToolSelect={setActiveTool}
        onUndo={undo}
        onRedo={redo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
      />
    </div>
  );
}
