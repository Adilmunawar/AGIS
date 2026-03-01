'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L, { LatLngBounds } from 'leaflet';
import { useToast } from '@/hooks/use-toast';
import { useGisData } from '@/context/GisDataContext';
import { MapHeader, type BaseLayer } from './MapHeader';
import { ParcelEditorDocker, EditorTool } from './ParcelEditorDocker';
import type { Feature, FeatureCollection } from 'geojson';

// Base Layers Configuration
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

// Component to fly to bounds when data changes
function FlyToBounds({ bounds }: { bounds: L.LatLngBounds | null}) {
    const map = useMap();
    useEffect(() => {
        if (bounds && bounds.isValid()) {
            map.flyToBounds(bounds, { padding: [50, 50], duration: 1 });
        }
    }, [bounds, map]);
    return null;
}

// Map Component with Editor Integration
export default function ImportParcelsClient() {
    const { toast } = useToast();
    const { importParcels, updateToolState, undo, redo } = useGisData();
    const { 
        boundaryData, parcelsData, homesData, 
        boundaryName, parcelsName, homesName,
        selectedFeatureId, historyIndex, history 
    } = importParcels;

    const [activeLayer, setActiveLayer] = useState<BaseLayer>(baseLayers[0]);
    const [isProcessing, setIsProcessing] = useState<Record<string, boolean>>({});
    const [activeTool, setActiveTool] = useState<EditorTool>('select');
    
    const boundaryWorkerRef = useRef<Worker | null>(null);
    const parcelsWorkerRef = useRef<Worker | null>(null);
    const homesWorkerRef = useRef<Worker | null>(null);
    
    const parcelsGeoJsonRef = useRef<L.GeoJSON | null>(null);
    const homesGeoJsonRef = useRef<L.GeoJSON | null>(null);

    // --- Worker Initialization ---
    useEffect(() => {
        const setupWorker = (ref: React.MutableRefObject<Worker | null>, layer: 'boundary' | 'parcels' | 'homes') => {
            ref.current = new Worker('/workers/shapefileWorker.js');
            ref.current.onmessage = (event: MessageEvent) => {
                const { geojson, error } = event.data;
                setIsProcessing(prev => ({ ...prev, [layer]: false }));
                if (error) {
                    toast({ variant: 'destructive', title: `Error processing ${layer}`, description: error });
                    return;
                }
                toast({ title: `${layer.charAt(0).toUpperCase() + layer.slice(1)} Layer Loaded`, description: `Processed ${geojson.features.length} features.` });
                
                const featuresWithIds = geojson.features.map((f: Feature, index: number) => {
                    f.id = f.properties?.id ?? f.id ?? `${layer}-${index}`;
                    return f;
                });

                const dataKey = `${layer}Data` as 'boundaryData' | 'parcelsData' | 'homesData';
                updateToolState('importParcels', { [dataKey]: { ...geojson, features: featuresWithIds } });
            };
            ref.current.onerror = (e) => {
                setIsProcessing(prev => ({ ...prev, [layer]: false }));
                toast({ variant: 'destructive', title: `Worker Error for ${layer}`, description: e.message });
            };
        };
        
        setupWorker(boundaryWorkerRef, 'boundary');
        setupWorker(parcelsWorkerRef, 'parcels');
        setupWorker(homesWorkerRef, 'homes');
        
        return () => {
            boundaryWorkerRef.current?.terminate();
            parcelsWorkerRef.current?.terminate();
            homesWorkerRef.current?.terminate();
        };
    }, [toast, updateToolState]);

    // --- File Upload Handler ---
    const handleFileUpload = useCallback((files: File[], layer: 'boundary' | 'parcels' | 'homes') => {
        if (files.length === 0) return;
        const hasShp = files.some(f => f.name.toLowerCase().endsWith('.shp'));
        const hasDbf = files.some(f => f.name.toLowerCase().endsWith('.dbf'));
        if (!hasShp || !hasDbf) {
            toast({ variant: 'destructive', title: 'Missing Required Files', description: 'Your selection must include both .shp and .dbf files.' });
            return;
        }

        setIsProcessing(prev => ({ ...prev, [layer]: true }));
        updateToolState('importParcels', { [`${layer}Name`]: files[0].name.replace(/\.[^/.]+$/, "") });
        
        const worker = { boundary: boundaryWorkerRef, parcels: parcelsWorkerRef, homes: homesWorkerRef }[layer];
        worker.current?.postMessage(files);
    }, [toast, updateToolState]);

    // --- Feature Selection ---
    const handleFeatureSelect = useCallback((feature: Feature | null) => {
        updateToolState('importParcels', { selectedFeatureId: feature?.id ?? null });
    }, [updateToolState]);

    // --- Styling ---
    const getStyle = (type: 'boundary' | 'parcel' | 'home') => (feature?: Feature) => {
        const isSelected = feature?.id === selectedFeatureId;
        switch (type) {
            case 'boundary': return { color: '#ef4444', weight: 4, fill: false };
            case 'home': return { color: isSelected ? '#e11d48' : '#22c55e', weight: isSelected ? 3 : 1, fillOpacity: isSelected ? 0.6 : 0.5 };
            case 'parcel':
            default:
                return { color: isSelected ? '#e11d48' : '#3b82f6', weight: isSelected ? 3 : 2, fillOpacity: isSelected ? 0.4 : 0.2 };
        }
    };
    
    // --- Map Event Handlers ---
    const onEachFeature = (feature: Feature, layer: L.Layer) => {
        layer.on({ click: () => handleFeatureSelect(feature) });
    };

    const allFeatures = [...(parcelsData?.features ?? []), ...(homesData?.features ?? [])];
    const selectedFeature = allFeatures.find(f => f.id === selectedFeatureId) ?? null;

    useEffect(() => {
        const highlightLayer = (ref: React.RefObject<L.GeoJSON | null>) => {
            if (!ref.current) return;
            ref.current.eachLayer((layer: any) => {
                if (layer.feature?.id === selectedFeatureId) {
                    layer.bringToFront();
                }
            });
        };
        highlightLayer(parcelsGeoJsonRef);
        highlightLayer(homesGeoJsonRef);
    }, [selectedFeatureId]);
    

    const handleDeleteSelected = () => {
        if (!selectedFeatureId) return;
        updateToolState('importParcels', {
            parcelsData: parcelsData ? { ...parcelsData, features: parcelsData.features.filter(f => f.id !== selectedFeatureId) } : null,
            homesData: homesData ? { ...homesData, features: homesData.features.filter(f => f.id !== selectedFeatureId) } : null,
            selectedFeatureId: null
        });
        toast({ title: 'Feature Deleted', description: `ID: ${selectedFeatureId}` });
    };

    const handleClearData = () => {
        updateToolState('importParcels', {
            boundaryData: null, parcelsData: null, homesData: null, selectedFeatureId: null,
            boundaryName: '', parcelsName: '', homesName: ''
        });
        toast({ title: 'All layers cleared' });
    };

    const boundsToFly = useMemo(() => {
        if (!parcelsData && !boundaryData) return null;
        const bounds = new L.LatLngBounds([]);
        if (parcelsData) {
            const parcelLayer = L.geoJSON(parcelsData);
            if (Object.keys(parcelLayer.getBounds()).length > 0) bounds.extend(parcelLayer.getBounds());
        }
        if (boundaryData) {
            const boundaryLayer = L.geoJSON(boundaryData);
            if (Object.keys(boundaryLayer.getBounds()).length > 0) bounds.extend(boundaryLayer.getBounds());
        }
        return bounds.isValid() ? bounds : null;
    }, [parcelsData, boundaryData]);

    return (
        <div className="flex h-full w-full">
            <div className="flex-1 h-full relative">
                <MapContainer center={[31.46, 74.38]} zoom={13} zoomControl={false} style={{ height: '100%', width: '100%' }}>
                    <MapHeader layers={baseLayers} activeLayer={activeLayer} onLayerSelect={setActiveLayer} />
                    <TileLayer url={activeLayer.url} attribution={activeLayer.attribution} subdomains={activeLayer.subdomains || ''} noWrap={true} />
                    
                    {boundaryData && <GeoJSON data={boundaryData} style={getStyle('boundary')} />}
                    {parcelsData && <GeoJSON key={selectedFeatureId} data={parcelsData} style={getStyle('parcel')} onEachFeature={onEachFeature} ref={parcelsGeoJsonRef} />}
                    {homesData && <GeoJSON key={selectedFeatureId + '_homes'} data={homesData} style={getStyle('home')} onEachFeature={onEachFeature} ref={homesGeoJsonRef} />}
                    
                    {<FlyToBounds bounds={boundsToFly} />}
                </MapContainer>
            </div>
            
            <ParcelEditorDocker 
                onUpload={handleFileUpload}
                isProcessing={isProcessing}
                boundaryName={boundaryName}
                parcelsName={parcelsName}
                homesName={homesName}
                selectedFeature={selectedFeature}
                allFeatures={parcelsData?.features ?? []}
                homesCount={homesData?.features?.length ?? 0}
                onDeleteSelected={handleDeleteSelected}
                hasData={!!parcelsData || !!boundaryData || !!homesData}
                onClearData={handleClearData}
                onFeatureSelect={handleFeatureSelect}
                onExportGeoJSON={() => toast({ title: 'Export (Future)', description: 'Exporting to GeoJSON will be implemented here.' })}
                activeTool={activeTool}
                onToolSelect={setActiveTool}
                onUndo={undo}
                onRedo={redo}
                canUndo={historyIndex > 0}
                canRedo={history.length > 1 && historyIndex < history.length - 1}
            />
        </div>
    );
}
