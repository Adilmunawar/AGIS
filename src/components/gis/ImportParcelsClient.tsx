'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import { useToast } from '@/hooks/use-toast';
import { ParcelEditorDocker, type EditorTool } from './ParcelEditorDocker';
import { useGisData } from '@/context/GisDataContext';
import * as turf from '@turf/turf';
import { MapHeader, type BaseLayer } from './MapHeader';
import MousePositionControl from './MousePositionControl';

// Declare Google's global variables to satisfy TypeScript
declare const gapi: any;
declare const google: any;

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

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export default function ImportParcelsClient() {
  const { toast } = useToast();
  const { 
    importParcels: { boundaryData, parcelsData, homesData, selectedFeatureIds, history, historyIndex }, 
    updateToolState,
    toggleFeatureSelection,
    undo,
    redo,
    deleteSelectedFeatures,
    mergeSelectedFeatures,
  } = useGisData();
  
  const [isProcessing, setIsProcessing] = useState({ boundary: false, parcels: false, homes: false });
  const workerRef = useRef<Worker | null>(null);

  const [activeTool, setActiveTool] = useState<EditorTool>('select');
  const mapRef = useRef<L.Map>(null);
  const [activeLayer, setActiveLayer] = useState<BaseLayer>(baseLayers[0]);
  
  // --- Google Drive Integration State ---
  const [googleApisReady, setGoogleApisReady] = useState(false);
  const [oauthToken, setOauthToken] = useState<any | null>(null);


  // --- Worker & API Script Setup ---
  useEffect(() => {
    // Shapefile Worker
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
        geojson.features.forEach((feature: any, i: number) => {
          if (!feature.id) feature.id = `${processedLayer}-${Date.now()}-${i}`;
        });
        updateToolState('importParcels', { [dataKey]: geojson });
        toast({ title: `${processedLayer.charAt(0).toUpperCase() + processedLayer.slice(1)} Layer Processed`, description: `Found ${geojson.features.length} features.` });
      } else {
         toast({ variant: 'destructive', title: 'Processing Error', description: 'Failed to parse shapefile.' });
      }
    };

    // Google APIs
    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    gapiScript.async = true;
    gapiScript.defer = true;
    gapiScript.onload = () => gapi.load('client:picker', () => {});
    document.body.appendChild(gapiScript);

    const gsiScript = document.createElement('script');
    gsiScript.src = 'https://accounts.google.com/gsi/client';
    gsiScript.async = true;
    gsiScript.defer = true;
    gsiScript.onload = () => setGoogleApisReady(true);
    document.body.appendChild(gsiScript);

    return () => {
      workerRef.current?.terminate();
      document.body.removeChild(gapiScript);
      document.body.removeChild(gsiScript);
    };
  }, [toast, updateToolState]);

  // --- Data Handlers ---
  const handleUpload = (files: (File | Blob)[], layer: 'boundary' | 'parcels' | 'homes') => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;
    const hasShp = fileArray.some(f => (f as File).name?.toLowerCase().endsWith('.shp'));
    const hasDbf = fileArray.some(f => (f as File).name?.toLowerCase().endsWith('.dbf'));
    if (!hasShp || !hasDbf) {
      toast({ variant: 'destructive', title: 'Missing Required Files', description: 'Selection must include .shp and .dbf files.' });
      return;
    }
    setIsProcessing(prev => ({ ...prev, [layer]: true }));
    toast({ title: `Processing ${layer}...`, description: 'Parsing files.' });
    workerRef.current?.postMessage({ files: fileArray, layer });
  };
  
  // --- Google Drive Handlers ---
  const pickerCallback = async (data: any, layer: 'boundary' | 'parcels') => {
    if (data.action === google.picker.Action.PICKED) {
      const files: any[] = data.docs;
      if (!files || files.length === 0) return toast({ title: 'No files selected', variant: 'destructive' });
      
      toast({ title: 'Downloading from Drive...', description: `Fetching ${files.length} selected files.` });

      try {
        const filePromises = files.map(async (file) => {
          const res = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
            headers: { 'Authorization': `Bearer ${oauthToken?.access_token}` }
          });
          if (!res.ok) throw new Error(`Failed to download ${file.name}`);
          const blob = await res.blob();
          return new File([blob], file.name, { type: file.mimeType });
        });
        const fileObjects = await Promise.all(filePromises);
        handleUpload(fileObjects, layer);
      } catch (err: any) {
        toast({ title: 'Drive Download Error', description: err.message, variant: 'destructive' });
      }
    }
  };

  const showPicker = (layer: 'boundary' | 'parcels') => {
    const view = new google.picker.View(google.picker.ViewId.DOCS);
    view.setMimeTypes("application/octet-stream,application/x-dbf,application/vnd.google-earth.kml+xml,application/zip");
    const picker = new google.picker.PickerBuilder()
        .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
        .setAppId(GOOGLE_CLIENT_ID!.split('-')[0])
        .setOAuthToken(oauthToken.access_token)
        .addView(view)
        .setDeveloperKey(GOOGLE_API_KEY!)
        .setCallback((data: any) => pickerCallback(data, layer))
        .build();
    picker.setVisible(true);
  };

  const handleDriveImport = (layer: 'boundary' | 'parcels') => {
    if (!googleApisReady) return toast({ title: 'Google API Not Ready', description: 'Please wait a moment.', variant: 'destructive' });
    if (!GOOGLE_API_KEY || !GOOGLE_CLIENT_ID) return toast({ title: 'Missing Configuration', description: 'Google API credentials not set.', variant: 'destructive' });

    const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        callback: (tokenResponse: any) => {
            if (tokenResponse && tokenResponse.access_token) {
                setOauthToken(tokenResponse);
                showPicker(layer);
            }
        },
    });
    if (oauthToken) showPicker(layer);
    else tokenClient.requestAccessToken({ prompt: '' });
  };
  
  // --- Map Interaction Handlers ---
  const boundsToFly = useMemo(() => {
    if (!parcelsData && !boundaryData) return null;
    const bounds = new L.LatLngBounds([]);
    if (parcelsData) bounds.extend(L.geoJSON(parcelsData).getBounds());
    if (boundaryData) bounds.extend(L.geoJSON(boundaryData).getBounds());
    return bounds.isValid() ? bounds : null;
  }, [parcelsData, boundaryData]);

  useEffect(() => {
    if (mapRef.current && boundsToFly) {
      mapRef.current.flyToBounds(boundsToFly, { padding: [50, 50] });
    }
  }, [boundsToFly]);

  const handleFeatureClick = useCallback((feature: any) => toggleFeatureSelection(feature.id, activeTool === 'multi-select'), [toggleFeatureSelection, activeTool]);

  const handleTableRowClick = useCallback((feature: any) => {
    toggleFeatureSelection(feature.id, false);
    if (mapRef.current && feature?.geometry) {
        try {
            const boundingBox = turf.bbox(feature);
            mapRef.current.flyToBounds([[boundingBox[1], boundingBox[0]], [boundingBox[3], boundingBox[2]]], { padding: [50, 50], maxZoom: 18 });
        } catch(e) { console.error("Could not fly to feature:", e); }
    }
  }, [toggleFeatureSelection]);

  const getBoundaryStyle = (feature: any) => ({ color: selectedFeatureIds.includes(feature.id) ? '#fbbf24' : '#dc2626', weight: selectedFeatureIds.includes(feature.id) ? 4 : 3, fillOpacity: selectedFeatureIds.includes(feature.id) ? 0.5 : 0, fillColor: selectedFeatureIds.includes(feature.id) ? '#f59e0b' : '#dc2626' });
  const getFeatureStyle = (feature: any) => ({ color: selectedFeatureIds.includes(feature.id) ? '#fbbf24' : '#2563eb', weight: selectedFeatureIds.includes(feature.id) ? 3 : 2, fillOpacity: selectedFeatureIds.includes(feature.id) ? 0.7 : 0.1, fillColor: selectedFeatureIds.includes(feature.id) ? '#f59e0b' : '#2563eb' });
  const homeStyle = { color: "#16a34a", weight: 1.5, fillOpacity: 0.6 };

  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className="flex-1 h-full relative min-w-0">
        <MapContainer
          ref={mapRef}
          center={[30.3753, 69.3451]}
          zoom={6}
          style={{ height: '100%', width: '100%', backgroundColor: '#f0f0f0' }}
          zoomControl={false}
        >
          <MapHeader layers={baseLayers} activeLayer={activeLayer} onLayerSelect={setActiveLayer} />
          <TileLayer key={activeLayer.url} attribution={activeLayer.attribution} url={activeLayer.url} subdomains={activeLayer.subdomains || ''} />
          {boundaryData && <GeoJSON key={`boundary-${historyIndex}-${selectedFeatureIds.join('-')}`} data={boundaryData} style={getBoundaryStyle} onEachFeature={(feature, layer) => layer.on({ click: () => handleFeatureClick(feature) })} />}
          {parcelsData && <GeoJSON key={`parcels-${historyIndex}-${selectedFeatureIds.join('-')}`} data={parcelsData} style={getFeatureStyle} onEachFeature={(feature, layer) => layer.on({ click: () => handleFeatureClick(feature) })} />}
          {homesData && <GeoJSON key={`homes-${historyIndex}`} data={homesData} style={homeStyle} />}
          <MousePositionControl />
        </MapContainer>
      </div>
      <div className="w-[350px] flex-shrink-0 h-full flex flex-col border-l bg-background">
        <ParcelEditorDocker 
            onUpload={handleUpload}
            isProcessing={isProcessing}
            boundaryData={boundaryData}
            parcelsData={parcelsData}
            homesData={homesData}
            selectedFeatureIds={selectedFeatureIds}
            onFeatureSelect={handleTableRowClick}
            onDriveImport={handleDriveImport}
        />
      </div>
    </div>
  );
}
