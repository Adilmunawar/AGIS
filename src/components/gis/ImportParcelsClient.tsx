'use client';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import L, { LatLngBounds } from 'leaflet';
import * as shapefile from 'shapefile';

import { useToast } from '@/hooks/use-toast';
import { MapHeader, type BaseLayer } from './MapHeader';
import { ParcelEditorDocker } from './ParcelEditorDocker';
import { UploadCloud, FileJson, XCircle, ArrowRight, ArrowLeft, Layers, Check, Search, LandPlot, Loader2, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"


// --- TYPES & CONFIGS ---
type Step = 'upload' | 'select' | 'preview';
type ShapefileData = { [key: string]: any };

const baseLayers: BaseLayer[] = [
    { name: 'Google Hybrid', url: 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', attribution: '&copy; Google', previewUrl: 'https://picsum.photos/seed/googlehybrid/400/300', subdomains: ['mt0', 'mt1', 'mt2', 'mt3']},
    { name: 'Google Satellite', url: 'https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', attribution: '&copy; Google', previewUrl: 'https://picsum.photos/seed/googlesatellite/400/300', subdomains: ['mt0', 'mt1', 'mt2', 'mt3']},
    { name: 'ESRI Satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: 'Tiles &copy; Esri', previewUrl: 'https://picsum.photos/seed/esrisat/400/300', subdomains: []},
];

const boundaryStyle = { color: '#e11d48', weight: 3, fillOpacity: 0 };
const parcelsStyle = { color: '#3b82f6', weight: 1, fillColor: '#bfdbfe', fillOpacity: 0.5 };
const highlightStyle = { color: '#ef4444', weight: 3, fillColor: '#fecaca', fillOpacity: 0.7 };


// --- STEP COMPONENTS ---

const UploadStep = ({ onFilesUploaded, isProcessing }: { onFilesUploaded: (files: File[]) => void, isProcessing: boolean }) => {
    const [isDragging, setIsDragging] = useState(false);
    const onDrag = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }, []);
    const onDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }, []);
    const onDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); onFilesUploaded(Array.from(e.dataTransfer.files)); }, [onFilesUploaded]);

    return (
         <div className="flex flex-col items-center justify-center h-full bg-gray-50/50 p-8">
            <Card className="w-full max-w-3xl shadow-xl">
                <CardHeader className="text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 mb-4">
                        <Package className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Import Parcel Data</CardTitle>
                    <CardDescription className="mt-2 text-lg text-muted-foreground">
                        Drag and drop all shapefile components to begin.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <div onDragEnter={onDrag} onDragLeave={onDragLeave} onDragOver={onDrag} onDrop={onDrop}
                        className={cn("w-full h-64 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-colors relative",
                            isDragging ? 'border-primary bg-primary/10' : 'border-border bg-gray-50/50'
                        )}>
                        <input
                            id="file-upload" type="file" multiple
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={(e) => onFilesUploaded(Array.from(e.target.files || []))}
                            accept=".shp,.shx,.dbf,.prj,.sbn,.sbx,.fbn,.fbx,.ain,.aih,.ixs,.mxs,.atx,.cpg"
                        />
                        <div className="text-center p-6 pointer-events-none">
                            {isProcessing ? (
                                <>
                                    <Loader2 className="mx-auto h-16 w-16 mb-4 text-primary animate-spin" />
                                    <h2 className="text-2xl font-semibold">Processing Files...</h2>
                                    <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                                        Parsing shapefiles and preparing data layers.
                                    </p>
                                </>
                            ) : (
                                <>
                                    <UploadCloud className={cn("mx-auto h-16 w-16 mb-4", isDragging ? "text-primary" : "text-muted-foreground")} />
                                    <h2 className="text-2xl font-semibold">Drop Shapefiles Here</h2>
                                    <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                                        Include all related files (.shp, .dbf, .shx, etc) for each layer.
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

const SelectionStep = ({ shapefileData, onProceed, onBack }: { shapefileData: ShapefileData, onProceed: (boundary: string, parcels: string) => void, onBack: () => void }) => {
    const [boundaryFile, setBoundaryFile] = useState<string>('');
    const [parcelsFile, setParcelsFile] = useState<string>('');
    const shapefileNames = Object.keys(shapefileData);

    const handleProceed = () => {
        if (boundaryFile && parcelsFile) {
            onProceed(boundaryFile, parcelsFile);
        }
    }

    return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-50/50 p-8">
            <Card className="w-full max-w-3xl shadow-xl">
                 <CardHeader className="text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 mb-4">
                        <Layers className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Assign Layer Roles</CardTitle>
                    <CardDescription className="mt-2 text-lg text-muted-foreground">
                        Define which shapefile contains the boundaries and which contains the parcels.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <Search className="h-6 w-6 text-muted-foreground"/>
                                <CardTitle className="text-lg">Boundary Layer</CardTitle>
                            </div>
                            <CardDescription>Select the shapefile representing the outer boundary (e.g., Tehsil).</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Select value={boundaryFile} onValueChange={setBoundaryFile}>
                                <SelectTrigger><SelectValue placeholder="Select boundary file..." /></SelectTrigger>
                                <SelectContent>
                                    {shapefileNames.map(name => <SelectItem key={name} value={name}>{name}.shp</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <LandPlot className="h-6 w-6 text-muted-foreground"/>
                                <CardTitle className="text-lg">Parcels Layer</CardTitle>
                            </div>
                            <CardDescription>Select the shapefile containing the individual parcels or plots.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Select value={parcelsFile} onValueChange={setParcelsFile}>
                                <SelectTrigger><SelectValue placeholder="Select parcels file..." /></SelectTrigger>
                                <SelectContent>
                                    {shapefileNames.filter(name => name !== boundaryFile).map(name => <SelectItem key={name} value={name}>{name}.shp</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </CardContent>
                    </Card>
                </CardContent>
                <CardContent className="flex justify-between items-center">
                    <Button variant="outline" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4"/>Back</Button>
                    <Button onClick={handleProceed} disabled={!boundaryFile || !parcelsFile}><Check className="mr-2 h-4 w-4"/>Process & Preview</Button>
                </CardContent>
            </Card>
        </div>
    )
}

const PreviewStep = ({ boundaryData, parcelsData, onBack }: { boundaryData: any, parcelsData: any, onBack: () => void }) => {
    const [selectedFeature, setSelectedFeature] = useState<any>(null);
    const [activeLayer, setActiveLayer] = useState<BaseLayer>(baseLayers[0]);
    const mapRef = useRef<L.Map>(null);
    const geoJsonLayerRef = useRef<L.GeoJSON>(null);
    const { toast } = useToast();

    const enrichedParcels = useMemo(() => {
        if (!parcelsData?.features) return null;
        const featuresWithId = parcelsData.features.map((f: any, i: number) => ({ ...f, id: i }));
        return { ...parcelsData, features: featuresWithId };
    }, [parcelsData]);

    useEffect(() => {
        if (boundaryData && mapRef.current) {
            const geoJsonLayer = L.geoJSON(boundaryData);
            const bounds = geoJsonLayer.getBounds();
            if (bounds.isValid()) {
                mapRef.current.fitBounds(bounds, { padding: [50, 50] });
            }
        }
    }, [boundaryData]);

    useEffect(() => {
        if (geoJsonLayerRef.current) {
            geoJsonLayerRef.current.eachLayer((layer: any) => {
                if (layer.feature.id === selectedFeature?.id) {
                    layer.setStyle(highlightStyle);
                    layer.bringToFront();
                } else {
                    layer.setStyle(parcelsStyle);
                }
            });
        }
    }, [selectedFeature]);

    const onEachFeature = (feature: any, layer: L.Layer) => {
        layer.on({ click: (e) => { L.DomEvent.stopPropagation(e); setSelectedFeature(feature); } });
    };

    const handleDeleteSelected = () => {
        // This is a placeholder for actual deletion logic
        toast({ variant: 'destructive', title: "Not Implemented", description: "Deletion is a future enhancement." });
    };

    return (
        <div className="w-full h-full flex">
            <div className="flex-1 relative h-full">
                <MapContainer ref={mapRef} center={[31.46, 74.38]} zoom={13} zoomControl={false} style={{ height: '100%', width: '100%' }}>
                    <MapHeader layers={baseLayers} activeLayer={activeLayer} onLayerSelect={setActiveLayer} />
                    <TileLayer key={activeLayer.url} url={activeLayer.url} attribution={activeLayer.attribution} subdomains={activeLayer.subdomains || ''} noWrap={true} />
                    
                    {boundaryData && <GeoJSON data={boundaryData} style={boundaryStyle} />}
                    {enrichedParcels && <GeoJSON ref={geoJsonLayerRef} key={JSON.stringify(enrichedParcels.features.map((f:any) => f.id))} data={enrichedParcels} style={parcelsStyle} onEachFeature={onEachFeature} />}
                
                    <div className="absolute top-24 left-4 z-20">
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
                onFeatureSelect={setSelectedFeature}
             />
        </div>
    );
};


// --- MAIN COMPONENT ---

export default function ImportParcelsClient() {
    const [step, setStep] = useState<Step>('upload');
    const [isProcessing, setIsProcessing] = useState(false);
    const [shapefileData, setShapefileData] = useState<ShapefileData | null>(null);
    const [boundaryFile, setBoundaryFile] = useState<string>('');
    const [parcelsFile, setParcelsFile] = useState<string>('');
    const { toast } = useToast();

    const handleFileDrop = useCallback(async (files: File[]) => {
        if (files.length === 0) return;
        setIsProcessing(true);
        
        const fileGroups = new Map<string, { [key: string]: File }>();
        for (const file of files) {
            const basename = file.name.substring(0, file.name.lastIndexOf('.'));
            const ext = file.name.substring(file.name.lastIndexOf('.') + 1);
            if (!fileGroups.has(basename)) fileGroups.set(basename, {});
            fileGroups.get(basename)![ext] = file;
        }

        const parsedData: ShapefileData = {};
        const errors: string[] = [];

        for (const [name, group] of fileGroups.entries()) {
            if (!group.shp || !group.dbf) {
                errors.push(`Shapefile "${name}" is missing required .shp or .dbf file.`);
                continue;
            }
            try {
                const [shpBuffer, dbfBuffer] = await Promise.all([ group.shp.arrayBuffer(), group.dbf.arrayBuffer() ]);
                const source = await shapefile.read(shpBuffer, dbfBuffer);
                parsedData[name] = source;
            } catch (err: any) {
                errors.push(`Error parsing "${name}": ${err.message}`);
            }
        }
        
        setIsProcessing(false);

        if (errors.length > 0) {
            toast({ variant: 'destructive', title: "Import Error", description: errors.join(' ') });
            return;
        }
        
        if (Object.keys(parsedData).length === 0) {
            toast({ variant: 'destructive', title: "No Valid Shapefiles Found", description: "Please check your dropped files." });
            return;
        }

        toast({ title: "Files Processed", description: `Successfully parsed ${Object.keys(parsedData).length} shapefile(s).` });
        setShapefileData(parsedData);
        setStep('select');

    }, [toast]);
    
    const handleSelection = (boundary: string, parcels: string) => {
        setBoundaryFile(boundary);
        setParcelsFile(parcels);
        setStep('preview');
    };

    const handleReset = () => {
        setStep('upload');
        setShapefileData(null);
        setBoundaryFile('');
        setParcelsFile('');
    };

    switch (step) {
        case 'upload':
            return <UploadStep onFilesUploaded={handleFileDrop} isProcessing={isProcessing} />;
        case 'select':
            return shapefileData && <SelectionStep shapefileData={shapefileData} onProceed={handleSelection} onBack={handleReset} />;
        case 'preview':
            return shapefileData && boundaryFile && parcelsFile && <PreviewStep boundaryData={shapefileData[boundaryFile]} parcelsData={shapefileData[parcelsFile]} onBack={handleReset} />;
        default:
            return <UploadStep onFilesUploaded={handleFileDrop} isProcessing={isProcessing} />;
    }
}
