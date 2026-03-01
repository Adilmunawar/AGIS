'use client';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import L, { LatLngBounds } from 'leaflet';
import * as shapefile from 'shapefile';

import { useToast } from '@/hooks/use-toast';
import { MapHeader, type BaseLayer } from './MapHeader';
import { ParcelEditorDocker } from './ParcelEditorDocker';
import { UploadCloud, FileJson, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';

// --- TYPES & CONFIGS ---
const baseLayers: BaseLayer[] = [
    { name: 'Google Hybrid', url: 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', attribution: '&copy; Google', previewUrl: 'https://picsum.photos/seed/googlehybrid/400/300', subdomains: ['mt0', 'mt1', 'mt2', 'mt3']},
    { name: 'Google Satellite', url: 'https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', attribution: '&copy; Google', previewUrl: 'https://picsum.photos/seed/googlesatellite/400/300', subdomains: ['mt0', 'mt1', 'mt2', 'mt3']},
    { name: 'ESRI Satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: 'Tiles &copy; Esri', previewUrl: 'https://picsum.photos/seed/esrisat/400/300', subdomains: []},
];
const geoJsonStyle = { color: '#3b82f6', weight: 1, fillColor: '#bfdbfe', fillOpacity: 0.5 };
const geoJsonHighlightStyle = { color: '#ef4444', weight: 3, fillColor: '#fecaca', fillOpacity: 0.7 };

// --- MAIN COMPONENT ---

export default function ImportParcelsClient() {
    const [geoData, setGeoData] = useState<any>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fileNames, setFileNames] = useState<string[]>([]);
    const [activeTool, setActiveTool] = useState<string>('select');
    const [selectedFeature, setSelectedFeature] = useState<any>(null);
    const [activeLayer, setActiveLayer] = useState<BaseLayer>(baseLayers[0]);
    
    const mapRef = useRef<L.Map>(null);
    const geoJsonLayerRef = useRef<L.GeoJSON>(null); // Ref to hold the GeoJSON layer
    const { toast } = useToast();
    
    const handleFileDrop = useCallback(async (files: File[]) => {
        setIsDragging(false);
        setError(null);
        setGeoData(null);
        setSelectedFeature(null);
        
        if (files.length === 0) {
            setFileNames([]);
            return;
        }

        const fileGroups = new Map<string, File[]>();
        for (const file of files) {
            const basename = file.name.substring(0, file.name.lastIndexOf('.'));
            if (!fileGroups.has(basename)) {
                fileGroups.set(basename, []);
            }
            fileGroups.get(basename)!.push(file);
        }

        if (fileGroups.size > 1) {
             setError("Please drop files for only one shapefile at a time.");
             setFileNames(Array.from(fileGroups.keys()));
             return;
        }
        
        const mainGroupName = fileGroups.keys().next().value;
        const mainGroup = fileGroups.get(mainGroupName)!;
        setFileNames(mainGroup.map(f => f.name));

        const shpFile = mainGroup.find(f => f.name.endsWith('.shp'));
        const dbfFile = mainGroup.find(f => f.name.endsWith('.dbf'));

        if (!shpFile || !dbfFile) {
            setError("Import failed. A shapefile requires at least a .shp and a .dbf file with the same name. Please drop all associated files together.");
            return;
        }

        try {
            const [shpBuffer, dbfBuffer] = await Promise.all([
                shpFile.arrayBuffer(),
                dbfFile.arrayBuffer()
            ]);

            const source = await shapefile.read(shpBuffer, dbfBuffer);
            source.features.forEach((f: any, i: number) => f.id = i);
            setGeoData(source);
            
            toast({ title: "Import Successful", description: `${source.features.length} parcels loaded from ${shpFile.name}.` });

        } catch (err: any) {
            setError(`Parsing Error: ${err.message}. Ensure all required shapefile components are included.`);
            console.error(err);
        }
    }, [toast]);

    useEffect(() => {
        // This effect handles zooming to the data's bounds when it's loaded
        if (geoData && geoJsonLayerRef.current && mapRef.current) {
            const bounds = geoJsonLayerRef.current.getBounds();
            if (bounds.isValid()) {
                 mapRef.current.fitBounds(bounds, { padding: [50, 50] });
            }
        }
    }, [geoData]);

    useEffect(() => {
        // This effect handles re-styling when a feature is selected
        if (geoJsonLayerRef.current) {
            geoJsonLayerRef.current.eachLayer((layer: any) => {
                if (layer.feature.id === selectedFeature?.id) {
                    layer.setStyle(geoJsonHighlightStyle);
                    layer.bringToFront();
                } else {
                    layer.setStyle(geoJsonStyle);
                }
            });
        }
    }, [selectedFeature]);
    
    const onDrag = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }, []);
    const onDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }, []);
    const onDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); handleFileDrop(Array.from(e.dataTransfer.files)); }, [handleFileDrop]);

    const onEachFeature = (feature: any, layer: L.Layer) => {
        layer.on({
            click: (e) => {
                L.DomEvent.stopPropagation(e);
                setSelectedFeature(feature);
            },
        });
    };

    const handleDeleteSelected = () => {
        if (!selectedFeature || !geoData) return;
        
        const newFeatures = geoData.features.filter((f: any) => f.id !== selectedFeature.id);
        setGeoData({ ...geoData, features: newFeatures });
        setSelectedFeature(null);
        toast({ title: "Parcel Deleted", description: "The selected parcel has been removed." });
    };

    const clearData = () => {
        setGeoData(null);
        setFileNames([]);
        setError(null);
        setSelectedFeature(null);
    };

    return (
        <div className="w-full h-full flex">
            <div className="flex-1 relative h-full">
                <MapContainer ref={mapRef} center={[31.46, 74.38]} zoom={13} zoomControl={false} style={{ height: '100%', width: '100%' }}>
                    <MapHeader layers={baseLayers} activeLayer={activeLayer} onLayerSelect={setActiveLayer} />
                    <TileLayer key={activeLayer.url} url={activeLayer.url} attribution={activeLayer.attribution} subdomains={activeLayer.subdomains || ''} noWrap={true} />
                    
                    {geoData && <GeoJSON ref={geoJsonLayerRef} key={JSON.stringify(geoData)} data={geoData} style={geoJsonStyle} onEachFeature={onEachFeature} />}
                </MapContainer>

                {!geoData && (
                    <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-sm p-8 flex items-center justify-center">
                        <div onDragEnter={onDrag} onDragLeave={onDragLeave} onDragOver={onDrag} onDrop={onDrop}
                            className={cn("w-full h-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-colors",
                                isDragging ? 'border-primary bg-primary/10' : 'border-border bg-gray-50/50'
                            )}>
                            <input
                                id="file-upload" type="file" multiple
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={(e) => handleFileDrop(Array.from(e.target.files || []))}
                                accept=".shp,.shx,.dbf,.prj,.sbn,.sbx,.fbn,.fbx,.ain,.aih,.ixs,.mxs,.atx,.cpg"
                            />
                            <div className="text-center p-6 pointer-events-none">
                                <UploadCloud className={cn("mx-auto h-16 w-16 mb-4", isDragging ? "text-primary" : "text-muted-foreground")} />
                                <h2 className="text-2xl font-semibold">Drop Shapefiles Here</h2>
                                <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                                    Drag and drop all shapefile components (.shp, .shx, .dbf, etc.) to import parcels. No need to zip them.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                 
                 {(error || fileNames.length > 0) && (
                    <div className="absolute top-24 left-4 z-20 max-w-sm">
                        {error && (
                            <div className="p-4 rounded-lg bg-destructive/90 text-destructive-foreground shadow-lg flex items-start gap-3">
                                <XCircle className="h-5 w-5 mt-0.5 shrink-0" />
                                <div>
                                    <h4 className="font-semibold">Import Error</h4>
                                    <p className="text-sm">{error}</p>
                                </div>
                                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setError(null)}><XCircle className="h-4 w-4"/></Button>
                            </div>
                        )}
                        {!error && fileNames.length > 0 && !geoData &&(
                             <div className="p-4 rounded-lg bg-background/90 shadow-lg flex items-center gap-3">
                                <FileJson className="h-5 w-5 text-primary" />
                                <span className="text-sm font-medium">Processing {fileNames.length} files...</span>
                            </div>
                        )}
                    </div>
                )}

            </div>
            <ParcelEditorDocker
                activeTool={activeTool}
                onToolChange={setActiveTool}
                selectedFeature={selectedFeature}
                allFeatures={geoData?.features || []}
                onDeleteSelected={handleDeleteSelected}
                onClearData={clearData}
                hasData={!!geoData}
                onFeatureSelect={setSelectedFeature}
             />
        </div>
    );
}
