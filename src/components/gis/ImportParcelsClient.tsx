'use client';
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap, FeatureGroup } from 'react-leaflet';
import L from 'leaflet';
import * as shapefile from 'shapefile';
import { EditControl } from 'react-leaflet-draw';

import { useToast } from '@/hooks/use-toast';
import { MapHeader, type BaseLayer } from './MapHeader';
import { ParcelEditorDocker } from './ParcelEditorDocker';
import { Layers, ArrowLeft, Loader2, Shield, FileCheck2, UploadCloud, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { useGisData } from '@/context/GisDataContext';

// --- TYPES & CONFIGS ---
const baseLayers: BaseLayer[] = [
    { name: 'Google Hybrid', url: 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', attribution: '&copy; Google', previewUrl: 'https://picsum.photos/seed/googlehybrid/400/300', subdomains: ['mt0', 'mt1', 'mt2', 'mt3']},
    { name: 'Google Satellite', url: 'https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', attribution: '&copy; Google', previewUrl: 'https://picsum.photos/seed/googlesatellite/400/300', subdomains: ['mt0', 'mt1', 'mt2', 'mt3']},
    { name: 'ESRI Satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: 'Tiles &copy; Esri', previewUrl: 'https://picsum.photos/seed/esrisat/400/300', subdomains: []},
];

const boundaryStyle = { color: '#e11d48', weight: 3, fillOpacity: 0.1, fillColor: '#e11d48' };
const parcelsStyle = { color: '#3b82f6', weight: 1, fillColor: '#bfdbfe', fillOpacity: 0.5 };
const highlightStyle = { color: '#16a34a', weight: 3, fillColor: '#86efac', fillOpacity: 0.7 };


// --- FILE PROCESSING ---
const processShapefile = async (files: File[]): Promise<{ name: string; data: any }> => {
  const fileGroups = new Map<string, { [key: string]: File }>();
  for (const file of files) {
    const basename = file.name.substring(0, file.name.lastIndexOf('.'));
    const ext = file.name.substring(file.name.lastIndexOf('.') + 1).toLowerCase();
    if (!fileGroups.has(basename)) fileGroups.set(basename, {});
    fileGroups.get(basename)![ext] = file;
  }

  if (fileGroups.size > 1) {
    throw new Error(`Multiple shapefiles detected: ${Array.from(fileGroups.keys()).join(', ')}. Please upload files for one shapefile at a time.`);
  }
  if (fileGroups.size === 0) {
    throw new Error('No files found to process.');
  }

  const [name, group] = fileGroups.entries().next().value;
  if (!group.shp || !group.dbf) {
    throw new Error(`Shapefile "${name}" is missing required .shp or .dbf file.`);
  }
  
  const [shpBuffer, dbfBuffer] = await Promise.all([group.shp.arrayBuffer(), group.dbf.arrayBuffer()]);
  const data = await shapefile.read(shpBuffer, dbfBuffer);
  
  // Add unique, stable IDs to each feature for reliable editing
  if (data && data.features) {
    const basename = name.replace(/\.[^/.]+$/, "");
    data.features = data.features.map((feature: any, index: number) => ({
      ...feature,
      id: feature.id || `${basename}-${index}-${Date.now()}` // Use existing ID or create one
    }));
  }

  return { name: `${name}.shp`, data };
};


// --- SUB-COMPONENTS ---
const UploadZone = ({ onFilesUploaded, isProcessing, disabled }: { onFilesUploaded: (files: File[]) => void, isProcessing: boolean, disabled?: boolean }) => {
    const [isDragging, setIsDragging] = useState(false);
    const onDrag = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); if(!disabled) setIsDragging(true); }, [disabled]);
    const onDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }, []);
    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && !disabled) {
            onFilesUploaded(Array.from(e.dataTransfer.files));
        }
    }, [onFilesUploaded, disabled]);

    return (
        <div onDragEnter={onDrag} onDragLeave={onDragLeave} onDragOver={onDrag} onDrop={onDrop}
            className={cn("w-full h-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center transition-colors relative p-4",
                disabled ? 'bg-gray-200/50 border-gray-300 cursor-not-allowed' :
                isDragging ? 'border-primary bg-primary/10' : 'border-border bg-gray-50/50 hover:border-primary/50'
            )}>
            <input id="file-upload" type="file" multiple disabled={disabled}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                onChange={(e) => onFilesUploaded(Array.from(e.target.files || []))}
                accept=".shp,.shx,.dbf,.prj,.sbn,.sbx,.fbn,.fbx,.ain,.aih,.ixs,.mxs,.atx,.cpg"
            />
             {isProcessing ? (
                <>
                    <Loader2 className="h-8 w-8 mb-2 text-primary animate-spin" />
                    <p className="text-sm font-semibold">Processing...</p>
                </>
             ) : (
                <>
                    <UploadCloud className={cn("h-8 w-8 mb-2", disabled ? 'text-gray-400' : 'text-primary/70')} />
                    <p className={cn("text-sm font-semibold", disabled ? 'text-muted-foreground' : 'text-foreground')}>Drop files or click to upload</p>
                    <p className="text-xs text-muted-foreground">{disabled ? 'Please upload boundary first.' : 'All related files (.shp, .dbf, etc.)'}</p>
                </>
            )}
        </div>
    );
};

const FileStatusCard = ({ name, onClear }: { name: string; onClear: () => void; }) => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-green-50 border-2 border-dashed border-green-200 rounded-xl p-4">
        <FileCheck2 className="h-8 w-8 text-green-600 mb-2" />
        <p className="text-sm font-semibold text-green-800 text-center break-all">{name}</p>
        <Button variant="link" size="sm" className="text-red-500 h-auto p-0 mt-2" onClick={onClear}>
            <Trash2 className="mr-1 h-3 w-3" /> Remove
        </Button>
    </div>
);

const UploadCard = ({ title, description, icon, fileName, onFilesUploaded, onClear, isProcessing, disabled }: { title: string, description: string, icon: React.ReactNode, fileName: string, onFilesUploaded: (f: File[]) => void, onClear: () => void, isProcessing: boolean, disabled?: boolean }) => (
    <Card className={cn("flex flex-col", disabled && 'bg-gray-100')}>
        <CardHeader>
            <div className="flex items-center gap-3">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", disabled ? 'bg-gray-200' : 'bg-primary/10')}>
                    {React.cloneElement(icon as React.ReactElement, { className: cn("h-5 w-5", disabled ? 'text-gray-400' : 'text-primary') })}
                </div>
                <div>
                    <CardTitle className="text-lg">{title}</CardTitle>
                    <CardDescription className="text-xs">{description}</CardDescription>
                </div>
            </div>
        </CardHeader>
        <CardContent className="flex-1">
            {fileName ? (
                <FileStatusCard name={fileName} onClear={onClear} />
            ) : (
                <UploadZone onFilesUploaded={onFilesUploaded} isProcessing={isProcessing} disabled={disabled} />
            )}
        </CardContent>
    </Card>
);

const PreAnalysisView = ({ onBoundaryUpload, onParcelsUpload, boundaryName, parcelsName, onClearBoundary, onClearParcels, processingState }: {
    onBoundaryUpload: (f: File[]) => void, onParcelsUpload: (f: File[]) => void, boundaryName: string, parcelsName: string, onClearBoundary: () => void, onClearParcels: () => void, processingState: 'boundary' | 'parcels' | null
}) => (
    <div className="flex flex-col items-center justify-center h-full p-4 md:p-8 bg-gray-100/50">
        <div className="w-full max-w-4xl space-y-4">
            <header className="text-center">
                <h1 className="text-3xl font-bold tracking-tight">Import Parcels for Analysis</h1>
                <p className="text-muted-foreground mt-2">Upload your boundary and parcel shapefiles to begin editing.</p>
            </header>
            <div className="grid md:grid-cols-2 gap-6 items-stretch">
                <UploadCard
                    title="Boundary Layer"
                    description="The main shapefile defining the area of interest (e.g., a Tehsil)."
                    icon={<Shield />}
                    fileName={boundaryName}
                    onFilesUploaded={onBoundaryUpload}
                    onClear={onClearBoundary}
                    isProcessing={processingState === 'boundary'}
                />
                <UploadCard
                    title="Parcels Layer"
                    description="The shapefile containing the individual properties or plots (e.g., Mouzas)."
                    icon={<Layers />}
                    fileName={parcelsName}
                    onFilesUploaded={onParcelsUpload}
                    onClear={onClearParcels}
                    isProcessing={processingState === 'parcels'}
                    disabled={!boundaryName}
                />
            </div>
        </div>
    </div>
);

// --- MAIN COMPONENT ---
export default function ImportParcelsClient() {
    const { importParcels, updateToolState, resetToolState } = useGisData();
    const { boundaryData, parcelsData, boundaryName, parcelsName, selectedFeatureId } = importParcels;
    
    const [processingState, setProcessingState] = useState<'boundary' | 'parcels' | null>(null);
    const { toast } = useToast();

    const [activeLayer, setActiveLayer] = useState<BaseLayer>(baseLayers[0]);
    const parcelsLayerRef = useRef<L.GeoJSON>(null);
    const layerIdToFeatureIdRef = useRef<Map<number, string | number>>(new Map());

    const handleFileUpload = async (files: File[], type: 'boundary' | 'parcels') => {
        if (files.length === 0) return;
        setProcessingState(type);
        try {
            const { name, data } = await processShapefile(files);
            toast({ title: `${type === 'boundary' ? 'Boundary' : 'Parcels'} Loaded`, description: `Successfully loaded ${name}.` });
            if (type === 'boundary') {
                updateToolState('importParcels', { boundaryName: name, boundaryData: data });
            } else {
                updateToolState('importParcels', { parcelsName: name, parcelsData: data });
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Import Error", description: error.message });
        } finally {
            setProcessingState(null);
        }
    };
    
    const handleClearBoundary = () => {
        resetToolState('importParcels');
    };

    const handleClearParcels = () => {
        updateToolState('importParcels', { parcelsData: null, parcelsName: '', selectedFeatureId: null });
    };

    const handleSetSelectedFeature = (feature: any) => {
        updateToolState('importParcels', { selectedFeatureId: feature?.id ?? null });
    };

    const handleDeleteSelected = () => {
        if (selectedFeatureId === null) {
            toast({ variant: 'destructive', title: 'No Parcel Selected', description: 'Please select a parcel from the map or table to delete.' });
            return;
        }
        if (parcelsData && parcelsData.features) {
            const newFeatures = parcelsData.features.filter((f: any) => f.id !== selectedFeatureId);
            updateToolState('importParcels', {
                parcelsData: { ...parcelsData, features: newFeatures },
                selectedFeatureId: null,
            });
            toast({ title: 'Parcel Deleted', description: `Parcel ID ${selectedFeatureId} has been removed.` });
        }
    };
    
    const handleExportGeoJSON = () => {
        if (!parcelsData) {
            toast({ variant: 'destructive', title: 'No Data to Export', description: 'There is no parcel data to export.' });
            return;
        }
        const blob = new Blob([JSON.stringify(parcelsData)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'edited_parcels.geojson';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast({ title: 'Export Successful', description: 'edited_parcels.geojson has been downloaded.' });
    };

    const selectedFeature = useMemo(() => {
        if (selectedFeatureId === null || !parcelsData?.features) return null;
        return parcelsData.features.find((f: any) => f.id === selectedFeatureId) || null;
    }, [selectedFeatureId, parcelsData]);

    const mapBounds = useMemo(() => {
        if (!boundaryData) return undefined;
        try {
            const bounds = L.geoJSON(boundaryData).getBounds();
            return bounds.isValid() ? bounds : undefined;
        } catch (e) {
            console.error("Could not calculate bounds from boundary data:", e);
        }
        return undefined;
    }, [boundaryData]);

    const onEachFeature = (feature: any, layer: L.Layer) => {
        const leafletId = (layer as any)._leaflet_id;
        if (feature.id) {
            layerIdToFeatureIdRef.current.set(leafletId, feature.id);
        }
        layer.on({
            click: (e) => {
                L.DomEvent.stopPropagation(e);
                handleSetSelectedFeature(feature);
            },
        });
    };
    
    const handleMapCreated = (e: any) => {
        const createdLayer = e.layer;
        const newFeature = createdLayer.toGeoJSON();
        newFeature.id = `drawn-${Date.now()}`;
        
        const newParcelsData = {
            ...(parcelsData || { type: "FeatureCollection", features: [] }),
            features: [...(parcelsData?.features || []), newFeature]
        };
        updateToolState('importParcels', { parcelsData: newParcelsData });
        toast({ title: 'Parcel Created', description: `New parcel (ID: ${newFeature.id}) added.` });
    };

    const handleMapEdited = (e: any) => {
        const layers = e.layers;
        if (!parcelsData) return;
    
        let updatedFeatures = [...parcelsData.features];
        layers.eachLayer((layer: any) => {
            const leafletId = layer._leaflet_id;
            const featureId = layerIdToFeatureIdRef.current.get(leafletId);
            if (featureId === undefined) return;
    
            const featureIndex = updatedFeatures.findIndex(f => f.id === featureId);
            if (featureIndex > -1) {
                const updatedGeoJSON = layer.toGeoJSON();
                updatedFeatures[featureIndex] = {
                    ...updatedFeatures[featureIndex],
                    geometry: updatedGeoJSON.geometry,
                };
            }
        });
        updateToolState('importParcels', { parcelsData: { ...parcelsData, features: updatedFeatures } });
        toast({ title: 'Parcels Updated', description: `${layers.getLayers().length} parcel(s) have been modified.` });
    };
    
    const handleMapDeleted = (e: any) => {
        const layers = e.layers;
        if (!parcelsData) return;
    
        let featuresToDeleteIds: (string | number)[] = [];
        layers.eachLayer((layer: any) => {
            const leafletId = layer._leaflet_id;
            const featureId = layerIdToFeatureIdRef.current.get(leafletId);
            if (featureId !== undefined) {
                featuresToDeleteIds.push(featureId);
            }
        });
    
        const newFeatures = parcelsData.features.filter((f: any) => !featuresToDeleteIds.includes(f.id));
        updateToolState('importParcels', {
            parcelsData: { ...parcelsData, features: newFeatures },
            selectedFeatureId: selectedFeatureId && featuresToDeleteIds.includes(selectedFeatureId) ? null : selectedFeatureId,
        });
        toast({ title: 'Parcels Deleted', description: `${featuresToDeleteIds.length} parcel(s) have been removed from the map.` });
    };
    
    const MapUpdater = ({ parcelsLayer, selectedFeatureId, mapBounds }: { parcelsLayer: L.GeoJSON | null, selectedFeatureId: string | number | null, mapBounds?: L.LatLngBounds }) => {
        const map = useMap();
    
        useEffect(() => {
            if (mapBounds && mapBounds.isValid()) {
                map.fitBounds(mapBounds, { padding: [50, 50] });
            }
        }, [map, mapBounds]);
    
        useEffect(() => {
            if (!parcelsLayer) return;
            let selectedLayer: L.Layer | null = null;
    
            parcelsLayer.eachLayer((layer: any) => {
                if (layer.feature && layer.feature.id === selectedFeatureId) {
                    selectedLayer = layer;
                    layer.setStyle(highlightStyle);
                    if (layer.bringToFront) layer.bringToFront();
                } else {
                    layer.setStyle(parcelsStyle);
                }
            });
    
            if (selectedLayer) {
                const bounds = (selectedLayer as L.GeoJSON).getBounds();
                if (bounds.isValid()) {
                    map.flyToBounds(bounds, { maxZoom: 18, padding: [50, 50] });
                }
            }
        }, [selectedFeatureId, map, parcelsLayer]);
    
        return null;
    }

    const showMap = boundaryData && parcelsData;

    return (
        <div className="w-full h-full flex bg-background">
            <main className="flex-1 relative h-full">
                {showMap ? (
                    <MapContainer
                        bounds={mapBounds}
                        zoomControl={false}
                        style={{ height: '100%', width: '100%' }}
                    >
                        <MapHeader layers={baseLayers} activeLayer={activeLayer} onLayerSelect={setActiveLayer} />
                        <TileLayer key={activeLayer.url} url={activeLayer.url} attribution={activeLayer.attribution} subdomains={activeLayer.subdomains || ''} noWrap={true} />
                        
                        <FeatureGroup>
                            <EditControl
                                position="topright"
                                onCreated={handleMapCreated}
                                onEdited={handleMapEdited}
                                onDeleted={handleMapDeleted}
                                draw={{
                                    polyline: false,
                                    rectangle: true,
                                    circle: false,
                                    circlemarker: false,
                                    marker: false,
                                    polygon: { allowIntersection: false, shapeOptions: highlightStyle },
                                }}
                            />
                        </FeatureGroup>

                        {boundaryData && <GeoJSON data={boundaryData} style={boundaryStyle} />}
                        {parcelsData && <GeoJSON ref={parcelsLayerRef} key={JSON.stringify(parcelsData)} data={parcelsData} style={parcelsStyle} onEachFeature={onEachFeature} />}
                        
                        <MapUpdater parcelsLayer={parcelsLayerRef.current} selectedFeatureId={selectedFeatureId} />
                    </MapContainer>
                ) : (
                    <PreAnalysisView
                        onBoundaryUpload={(files) => handleFileUpload(files, 'boundary')}
                        onParcelsUpload={(files) => handleFileUpload(files, 'parcels')}
                        boundaryName={boundaryName}
                        parcelsName={parcelsName}
                        onClearBoundary={handleClearBoundary}
                        onClearParcels={handleClearParcels}
                        processingState={processingState}
                    />
                )}
            </main>
             <ParcelEditorDocker
                selectedFeature={selectedFeature}
                allFeatures={parcelsData?.features || []}
                onDeleteSelected={handleDeleteSelected}
                onClearData={handleClearBoundary}
                hasData={!!parcelsData}
                onFeatureSelect={handleSetSelectedFeature}
                onExportGeoJSON={handleExportGeoJSON}
             />
        </div>
    );
}
