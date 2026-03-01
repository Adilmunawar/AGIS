'use client';
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import * as shapefile from 'shapefile';

import { useToast } from '@/hooks/use-toast';
import { MapHeader, type BaseLayer } from './MapHeader';
import { ParcelEditorDocker } from './ParcelEditorDocker';
import { Layers, ArrowLeft, Loader2, Shield, FileCheck2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { useGisData } from '@/context/GisDataContext';

// --- TYPES & CONFIGS ---
type Step = 'boundary' | 'parcels' | 'preview';

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
  return { name: `${name}.shp`, data };
};


// --- STEP COMPONENTS ---

const UploadZone = ({ onFilesUploaded, isProcessing, title, description, icon }: { onFilesUploaded: (files: File[]) => void, isProcessing: boolean, title: string, description: string, icon: React.ReactNode }) => {
    const [isDragging, setIsDragging] = useState(false);
    const onDrag = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }, []);
    const onDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }, []);
    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files) {
            onFilesUploaded(Array.from(e.dataTransfer.files));
        }
    }, [onFilesUploaded]);

    return (
        <div onDragEnter={onDrag} onDragLeave={onDragLeave} onDragOver={onDrag} onDrop={onDrop}
            className={cn("w-full h-64 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-colors relative",
                isDragging ? 'border-primary bg-primary/10' : 'border-border bg-gray-50/50'
            )}>
            <input id="file-upload" type="file" multiple
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={(e) => onFilesUploaded(Array.from(e.target.files || []))}
                accept=".shp,.shx,.dbf,.prj,.sbn,.sbx,.fbn,.fbx,.ain,.aih,.ixs,.mxs,.atx,.cpg"
            />
            <div className="text-center p-6 pointer-events-none">
                {isProcessing ? (
                    <>
                        <Loader2 className="mx-auto h-16 w-16 mb-4 text-primary animate-spin" />
                        <h2 className="text-2xl font-semibold">Processing Files...</h2>
                        <p className="text-muted-foreground mt-2 max-w-md mx-auto">Parsing shapefile and preparing data layers.</p>
                    </>
                ) : (
                    <>
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 mb-4">{icon}</div>
                        <h2 className="text-2xl font-semibold">{title}</h2>
                        <p className="text-muted-foreground mt-2 max-w-md mx-auto">{description}</p>
                    </>
                )}
            </div>
        </div>
    );
};

const BoundaryUploadStep = ({ onBoundaryUploaded, isProcessing }: { onBoundaryUploaded: (name: string, data: any) => void, isProcessing: boolean }) => {
    const { toast } = useToast();
    const handleFiles = async (files: File[]) => {
        if (files.length === 0) return;
        try {
            const { name, data } = await processShapefile(files);
            toast({ title: "Boundary Loaded", description: `Successfully loaded ${name}.` });
            onBoundaryUploaded(name, data);
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Import Error", description: error.message });
        }
    };
    return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-100/50 p-8">
            <Card className="w-full max-w-3xl shadow-xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">Step 1: Import Boundary Data</CardTitle>
                </CardHeader>
                <CardContent>
                    <UploadZone 
                        onFilesUploaded={handleFiles} 
                        isProcessing={isProcessing}
                        title="Drop Boundary Shapefile Here"
                        description="Drag & drop all related boundary files (.shp, .dbf, etc)."
                        icon={<Shield className="h-8 w-8 text-primary" />}
                    />
                </CardContent>
            </Card>
        </div>
    );
};

const ParcelsUploadStep = ({ onParcelsUploaded, isProcessing, boundaryName, onBack }: { onParcelsUploaded: (name: string, data: any) => void, isProcessing: boolean, boundaryName: string, onBack: () => void }) => {
    const { toast } = useToast();
    const handleFiles = async (files: File[]) => {
        if (files.length === 0) return;
        try {
            const { name, data } = await processShapefile(files);
            toast({ title: "Parcels Loaded", description: `Successfully loaded ${name}.` });
            onParcelsUploaded(name, data);
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Import Error", description: error.message });
        }
    };
    return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-100/50 p-8">
            <Card className="w-full max-w-3xl shadow-xl">
                <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold">Step 2: Import Parcel Data</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Card className="bg-green-50 border-green-200">
                        <CardHeader className="flex flex-row items-center gap-4 p-4">
                           <FileCheck2 className="h-6 w-6 text-green-600" />
                           <div>
                             <CardTitle className="text-base text-green-800">Boundary Loaded</CardTitle>
                             <CardDescription className="text-green-700">{boundaryName}</CardDescription>
                           </div>
                        </CardHeader>
                    </Card>
                    <UploadZone 
                        onFilesUploaded={handleFiles} 
                        isProcessing={isProcessing}
                        title="Drop Parcels Shapefile Here"
                        description="Drag & drop all related parcel files (.shp, .dbf, etc)."
                        icon={<Layers className="h-8 w-8 text-primary" />}
                    />
                </CardContent>
                <CardFooter>
                     <Button variant="outline" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4"/>Back</Button>
                </CardFooter>
            </Card>
        </div>
    );
};

// MapUpdater component to handle imperative map actions
const MapUpdater = ({ parcelsLayerRef, selectedFeatureId, mapBounds }: { parcelsLayerRef: React.RefObject<L.GeoJSON>, selectedFeatureId: string | number | null, mapBounds?: L.LatLngBounds }) => {
    const map = useMap();

    useEffect(() => {
        if (mapBounds && mapBounds.isValid()) {
            map.fitBounds(mapBounds, { padding: [50, 50] });
        }
    }, [map, mapBounds]);

    useEffect(() => {
        const parcelsLayer = parcelsLayerRef.current;
        if (!parcelsLayer) return;

        let selectedLayer: L.Layer | null = null;

        parcelsLayer.eachLayer((layer: any) => {
            if (layer.feature && layer.feature.id === selectedFeatureId) {
                selectedLayer = layer;
                layer.setStyle(highlightStyle);
                if (layer.bringToFront) {
                    layer.bringToFront();
                }
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

    }, [selectedFeatureId, map, parcelsLayerRef]);

    return null;
}


const PreviewStep = ({ onBack }: { onBack: () => void }) => {
    const { importParcels, updateToolState } = useGisData();
    const { boundaryData, parcelsData, selectedFeatureId } = importParcels;

    const [activeLayer, setActiveLayer] = useState<BaseLayer>(baseLayers[0]);
    const parcelsLayerRef = useRef<L.GeoJSON>(null);
    const { toast } = useToast();

    const handleSetSelectedFeature = (feature: any) => {
        updateToolState('importParcels', { selectedFeatureId: feature?.id ?? null });
    };

    const enrichedParcels = useMemo(() => {
        if (!parcelsData?.features || parcelsData.features.length === 0) return null;
        return { 
            ...parcelsData, 
            features: parcelsData.features.map((f: any, i: number) => ({ ...f, id: i })) 
        };
    }, [parcelsData]);

    const mapBounds = useMemo(() => {
        if (!boundaryData) return undefined;
        try {
            const bounds = L.geoJSON(boundaryData).getBounds();
            if (bounds.isValid()) return bounds;
        } catch (e) {
            console.error("Could not calculate bounds from boundary data:", e);
        }
        return undefined;
    }, [boundaryData]);

    const selectedFeature = useMemo(() => {
        if (selectedFeatureId === null || !enrichedParcels?.features) return null;
        return enrichedParcels.features.find((f: any) => f.id === selectedFeatureId) || null;
    }, [selectedFeatureId, enrichedParcels]);

    const onEachFeature = (feature: any, layer: L.Layer) => {
        layer.on({
            click: (e) => {
                L.DomEvent.stopPropagation(e);
                handleSetSelectedFeature(feature);
            }
        });
    };

    const handleDeleteSelected = () => {
        toast({ variant: 'destructive', title: "Not Implemented", description: "Deletion is a future enhancement." });
    };

    return (
        <div className="w-full h-full flex">
            <div className="flex-1 relative h-full">
                <MapContainer 
                    center={[31.46, 74.38]} // Default center, will be overridden by MapUpdater
                    zoom={13}
                    zoomControl={false}
                    style={{ height: '100%', width: '100%' }}
                    >
                    <MapHeader layers={baseLayers} activeLayer={activeLayer} onLayerSelect={setActiveLayer} />
                    <TileLayer key={activeLayer.url} url={activeLayer.url} attribution={activeLayer.attribution} subdomains={activeLayer.subdomains || ''} noWrap={true} />
                    
                    {boundaryData && <GeoJSON data={boundaryData} style={boundaryStyle} />}
                    {enrichedParcels && <GeoJSON ref={parcelsLayerRef} key={JSON.stringify(enrichedParcels)} data={enrichedParcels} style={parcelsStyle} onEachFeature={onEachFeature} />}
                    
                    <MapUpdater parcelsLayerRef={parcelsLayerRef} selectedFeatureId={selectedFeatureId} mapBounds={mapBounds} />

                    <div className="absolute top-24 left-4 z-[1001]">
                         <Button variant="outline" onClick={onBack} className="bg-background/80 backdrop-blur-md shadow-lg hover:bg-background">
                            <ArrowLeft className="mr-2 h-4 w-4"/>Start Over
                        </Button>
                    </div>
                </MapContainer>
            </div>
             <ParcelEditorDocker
                activeTool={'select'}
                onToolChange={() => {}}
                selectedFeature={selectedFeature}
                allFeatures={enrichedParcels?.features || []}
                onDeleteSelected={handleDeleteSelected}
                onClearData={onBack}
                hasData={!!enrichedParcels}
                onFeatureSelect={handleSetSelectedFeature}
             />
        </div>
    );
};


// --- MAIN COMPONENT ---
export default function ImportParcelsClient() {
    const { importParcels, updateToolState, resetToolState } = useGisData();
    const { step, boundaryName } = importParcels;
    
    const [isProcessing, setIsProcessing] = useState(false);
    
    const handleBoundaryUpload = (name: string, data: any) => {
        updateToolState('importParcels', {
            boundaryName: name,
            boundaryData: data,
            step: 'parcels'
        });
    };

    const handleParcelsUpload = (name: string, data: any) => {
        updateToolState('importParcels', {
            parcelsName: name,
            parcelsData: data,
            step: 'preview'
        });
    };

    const handleReset = () => {
        resetToolState('importParcels');
    };

    switch (step) {
        case 'boundary':
            return <BoundaryUploadStep onBoundaryUploaded={handleBoundaryUpload} isProcessing={isProcessing} />;
        case 'parcels':
            return <ParcelsUploadStep onParcelsUploaded={handleParcelsUpload} isProcessing={isProcessing} boundaryName={boundaryName} onBack={handleReset} />;
        case 'preview':
            return <PreviewStep onBack={handleReset} />;
        default:
            return <BoundaryUploadStep onBoundaryUploaded={handleBoundaryUpload} isProcessing={isProcessing} />;
    }
}
