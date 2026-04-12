'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import L, { LatLngBoundsExpression } from 'leaflet';
import * as turf from '@turf/turf';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  FileJson, UploadCloud, Loader2, Trash2, LayersIcon, MapIcon, Download, X, CheckCircle, AlertCircle, FileArchive, FileCode, Route, Sheet
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';


const FitBounds = ({ bounds }: { bounds: LatLngBoundsExpression | null }) => {
    const map = useMap();
    useEffect(() => {
        if (map && bounds) {
            map.flyToBounds(bounds, { padding: [50, 50] });
        }
    }, [map, bounds]);
    return null;
};

const MapPreview = ({ data }: { data: any }) => {
    const bounds = useMemo(() => {
        if (!data || !data.features || data.features.length === 0) return null;
        try {
            const bbox = turf.bbox(data);
            return L.latLngBounds([bbox[1], bbox[0]], [bbox[3], bbox[2]]);
        } catch (e) {
            console.error("Could not calculate bounds:", e); return null;
        }
    }, [data]);
    
    const mapKey = useMemo(() => data ? JSON.stringify(data.features.map((f:any) => f.id || f.properties)) : 'no-data', [data]);

    return (
        <MapContainer
            key={mapKey} center={[30, 70]} zoom={5}
            style={{ height: '100%', width: '100%', backgroundColor: '#f0f0f0' }} scrollWheelZoom={true}
        >
            <TileLayer url="https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}" subdomains={['mt0','mt1','mt2','mt3']} attribution="&copy; Google"/>
            {data && <GeoJSON data={data} style={{ color: '#3b82f6', weight: 2 }} />}
            <FitBounds bounds={bounds} />
        </MapContainer>
    );
};

const formatOptions = [
    { value: 'geojson', label: 'GeoJSON', icon: FileJson },
    { value: 'shapefile', label: 'Shapefile (.zip)', icon: FileArchive },
    { value: 'kml', label: 'KML', icon: FileCode },
    { value: 'gpx', label: 'GPX', icon: Route },
    { value: 'csv', label: 'CSV', icon: Sheet }
];

// --- MAIN COMPONENT ---
export default function MergeJsonsClient() {
    const [sourceFiles, setSourceFiles] = useState<SourceFile[]>([]);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [mergedData, setMergedData] = useState<any | null>(null);
    const [outputFormat, setOutputFormat] = useState('geojson');

    const { toast } = useToast();
    const shapefileWorkerRef = useRef<Worker | null>(null);
    const exportWorkerRef = useRef<Worker | null>(null);

    // --- WORKER INITIALIZATION ---
    useEffect(() => {
        shapefileWorkerRef.current = new Worker('/workers/shapefileWorker.js');
        shapefileWorkerRef.current.onmessage = (e: MessageEvent) => {
            const { status, geojson, error, fileId } = e.data;
            setSourceFiles(prev => prev.map(sf => {
                if (sf.id !== fileId) return sf;
                if (status === 'success' && geojson) {
                    return { ...sf, status: 'success', geojson, featureCount: geojson.features.length };
                }
                return { ...sf, status: 'error', error: error || 'Failed to parse shapefile.' };
            }));
        };

        exportWorkerRef.current = new Worker('/workers/exportWorker.js');
        exportWorkerRef.current.onmessage = async (e: MessageEvent) => {
            const { status, message, action, payload } = e.data;
            if (status === 'info') toast({ title: 'Python Engine', description: message });
            else if (status === 'success' && action === 'CONVERT_SHAPEFILE') {
                toast({ title: 'Conversion Successful', description: 'Zipping files for download.' });
                try {
                    const { shp, shx, dbf, prj } = payload;
                    const zip = new JSZip();
                    zip.file('merged_output.shp', shp);
                    zip.file('merged_output.shx', shx);
                    zip.file('merged_output.dbf', dbf);
                    zip.file('merged_output.prj', prj);
                    const zipBlob = await zip.generateAsync({ type: 'blob' });
                    downloadBlob(zipBlob, `merged_output.zip`);
                } catch (zipError: any) {
                   toast({ variant: 'destructive', title: 'Zipping Error', description: zipError.message });
                }
                setIsFinalizing(false);
            } else if (status === 'error') {
                toast({ variant: 'destructive', title: 'Processing Error', description: message });
                setIsFinalizing(false);
            }
        };

        return () => {
            shapefileWorkerRef.current?.terminate();
            exportWorkerRef.current?.terminate();
        };
    }, [toast]);
    
    // --- MERGE LOGIC ---
    useEffect(() => {
        const successfulFiles = sourceFiles.filter(sf => sf.status === 'success' && sf.geojson);
        if (successfulFiles.length === 0) {
            setMergedData(null);
            return;
        }
        const allFeatures = successfulFiles.flatMap(sf => sf.geojson.features.map((f:any) => ({...f, properties: {...f.properties, source_file: sf.file.name}})));
        setMergedData(turf.featureCollection(allFeatures));
    }, [sourceFiles]);

    // --- PARSING LOGIC ---
    const parseFile = useCallback(async (sourceFile: SourceFile) => {
        const { file, id } = sourceFile;
        const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
        let geojson: any;
        
        try {
            switch(extension) {
                case '.zip': {
                    const zip = new JSZip();
                    const content = await zip.loadAsync(file);
                    const shpFiles: File[] = [];
                    const filePromises: Promise<void>[] = [];
                    const requiredExts = ['.shp', '.shx', '.dbf'];
                    const foundExts = new Set<string>();

                    content.forEach((relativePath, zipEntry) => {
                        if (zipEntry.dir || relativePath.startsWith('__MACOSX/')) {
                            return;
                        }

                        const fileName = zipEntry.name.toLowerCase();
                        const fileExt = fileName.slice(fileName.lastIndexOf('.'));

                        if (requiredExts.includes(fileExt)) {
                           foundExts.add(fileExt);
                        }

                        if (['.shp', '.shx', '.dbf', '.prj', '.sbn', '.sbx', '.cpg', '.xml'].includes(fileExt)) {
                            filePromises.push(
                                zipEntry.async('arraybuffer').then(buffer => {
                                    const cleanFileName = zipEntry.name.split('/').pop() || zipEntry.name;
                                    shpFiles.push(new File([buffer], cleanFileName));
                                })
                            );
                        }
                    });

                    await Promise.all(filePromises);

                    if (!requiredExts.every(ext => foundExts.has(ext))) {
                        throw new Error("Zip is missing required files (.shp, .shx, .dbf).");
                    }

                    shapefileWorkerRef.current?.postMessage({ files: shpFiles, fileId: id });
                    return;
                }
                case '.geojson':
                    geojson = JSON.parse(await file.text());
                    break;
                case '.kml':
                    geojson = toKml(new DOMParser().parseFromString(await file.text(), 'text/xml'));
                    break;
                case '.gpx':
                    geojson = togpx(new DOMParser().parseFromString(await file.text(), 'text/xml'));
                    break;
                case '.csv':
                    await new Promise((resolve, reject) => {
                         Papa.parse(file, {
                            header: true, skipEmptyLines: true,
                            complete: (results) => {
                                const features = results.data.map((row: any) => {
                                    const lon = parseFloat(row.longitude || row.lon || row.long);
                                    const lat = parseFloat(row.latitude || row.lat);
                                    if (isNaN(lat) || isNaN(lon)) return null;
                                    return turf.point([lon, lat], row);
                                }).filter(Boolean);
                                geojson = turf.featureCollection(features as any);
                                resolve(geojson);
                            },
                            error: (err) => reject(new Error(`CSV parsing error: ${err.message}`))
                        });
                    });
                    break;
                default:
                    throw new Error(`Unsupported file type: ${extension}`);
            }
             setSourceFiles(prev => prev.map(sf => sf.id === id ? {...sf, status: 'success', geojson, featureCount: geojson?.features.length || 0} : sf));
        } catch(e: any) {
             setSourceFiles(prev => prev.map(sf => sf.id === id ? {...sf, status: 'error', error: e.message } : sf));
        }
    }, []);

    // --- FILE HANDLING & UI ---
    const handleFileChange = (newFiles: FileList | null) => {
        if (!newFiles) return;
    
        const filesArray = Array.from(newFiles);
        const hasShp = filesArray.some(f => f.name.toLowerCase().endsWith('.shp'));
    
        // If a .shp file is part of the drop, treat the entire batch as a single shapefile job.
        if (filesArray.length > 1 && hasShp) {
            const shpFile = filesArray.find(f => f.name.toLowerCase().endsWith('.shp'))!;
            const sourceFileForUI: SourceFile = {
                file: shpFile,
                id: `${shpFile.name}-${Date.now()}`,
                status: 'processing',
                geojson: null,
                featureCount: 0
            };
            setSourceFiles(prev => [...prev, sourceFileForUI]);
            // Send the entire array of dropped files to the worker.
            shapefileWorkerRef.current?.postMessage({ files: filesArray, fileId: sourceFileForUI.id });
        } else {
            // Otherwise, process each file individually (for zips, geojsons, etc.)
            const newSourceFiles: SourceFile[] = filesArray.map(file => ({
                file, id: `${file.name}-${Date.now()}`, status: 'queued', geojson: null, featureCount: 0
            }));
            
            setSourceFiles(prev => [...prev, ...newSourceFiles]);
            
            newSourceFiles.forEach(sf => {
                setSourceFiles(prev => prev.map(f => f.id === sf.id ? {...f, status: 'processing'} : f));
                parseFile(sf);
            });
        }
    };

    const removeFile = (id: string) => setSourceFiles(prev => prev.filter(sf => sf.id !== id));
    const clearAll = () => setSourceFiles([]);
    
    // --- CONVERSION & DOWNLOAD ---
    const downloadBlob = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleConvert = () => {
        if (!mergedData || mergedData.features.length === 0) {
            toast({ variant: 'destructive', title: 'No Data to Convert', description: 'Please upload and process at least one valid file.' });
            return;
        }
        setIsFinalizing(true);
        toast({ title: `Converting to ${outputFormat.toUpperCase()}`, description: 'Please wait...' });

        try {
            let blob: Blob; let filename: string;
            switch (outputFormat) {
                case 'geojson':
                    blob = new Blob([JSON.stringify(mergedData, null, 2)], { type: "application/json" });
                    filename = 'merged_output.geojson';
                    break;
                case 'kml':
                    blob = new Blob([tokml(mergedData)], { type: "application/vnd.google-earth.kml+xml" });
                    filename = 'merged_output.kml';
                    break;
                case 'gpx':
                    blob = new Blob([togpx(mergedData)], { type: 'application/gpx+xml' });
                    filename = 'merged_output.gpx';
                    break;
                case 'csv':
                    const csvData = mergedData.features.map((f: any) => ({
                        ...f.properties,
                        longitude: f.geometry.coordinates[0],
                        latitude: f.geometry.coordinates[1]
                    }));
                    blob = new Blob([Papa.unparse(csvData)], { type: 'text/csv;charset=utf-8;' });
                    filename = 'merged_output.csv';
                    break;
                case 'shapefile':
                    exportWorkerRef.current?.postMessage({ action: 'CONVERT_SHAPEFILE', payload: JSON.stringify(mergedData) });
                    return; // Worker handles the rest
                default: throw new Error("Unsupported output format.");
            }
            downloadBlob(blob, filename);
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Conversion Error', description: e.message });
        } finally {
            if (outputFormat !== 'shapefile') setIsFinalizing(false);
        }
    };

    const onDrag = (e: React.DragEvent, type: 'enter' | 'leave' | 'over') => { e.preventDefault(); e.stopPropagation(); setIsDragging(type === 'enter' || type === 'over'); };
    const onDrop = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); handleFileChange(e.dataTransfer.files); };

    return (
        <div className="flex h-full w-full bg-muted/30">
            <aside className="w-[450px] border-r bg-background flex flex-col h-full">
                <header className="p-4 border-b">
                    <h1 className="text-xl font-bold tracking-tight">Data Merger & Converter</h1>
                    <p className="text-sm text-muted-foreground">Combine multiple GIS files and export to a single format.</p>
                </header>

                <ScrollArea className="flex-1">
                    <div className="p-4 space-y-6">
                        <div>
                            <Label>1. Upload Source Files</Label>
                            <div
                                onDragEnter={(e) => onDrag(e, 'enter')} onDragLeave={(e) => onDrag(e, 'leave')} onDragOver={(e) => onDrag(e, 'over')} onDrop={onDrop}
                                className={cn('relative flex flex-col items-center justify-center mt-1.5 p-8 border-2 border-dashed rounded-lg transition-colors', isDragging ? 'border-primary bg-primary/10' : 'border-gray-300 bg-gray-50')}
                            >
                                <input type="file" id="file-upload" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" multiple
                                    accept=".geojson,.json,.zip,.kml,.gpx,.csv,.shp,.shx,.dbf,.prj,.sbn,.sbx,.cpg,.xml" onChange={(e) => handleFileChange(e.target.files)} />
                                <UploadCloud className={cn("h-10 w-10", isDragging ? 'text-primary' : 'text-gray-400')} />
                                <p className="mt-4 text-sm text-center text-muted-foreground">{isDragging ? "Drop files here" : "Drag & drop files, or click"}</p>
                                <p className="text-xs text-muted-foreground">Supports: GeoJSON, SHP (in .zip or as files), KML, GPX, CSV</p>
                            </div>
                        </div>
                        
                        {sourceFiles.length > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <Label>2. File Queue ({sourceFiles.length})</Label>
                                    <Button variant="link" size="sm" className="text-xs h-auto py-0" onClick={clearAll}>Clear All</Button>
                                </div>
                                <div className="max-h-60 overflow-y-auto rounded-md border p-2 space-y-1.5 bg-muted/50">
                                    {sourceFiles.map((sf) => (
                                    <div key={sf.id} className="flex items-center justify-between p-2 rounded-md bg-background shadow-sm">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                        {sf.status === 'processing' && <Loader2 className="h-5 w-5 text-primary animate-spin flex-shrink-0" />}
                                        {sf.status === 'success' && <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />}
                                        {sf.status === 'error' && <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />}
                                        <div className="overflow-hidden">
                                            <p className="text-sm font-medium truncate" title={sf.file.name}>{sf.file.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {sf.status === 'success' ? `${sf.featureCount} features` : sf.status === 'error' ? (sf.error || 'Unknown error') : 'Processing...'}
                                            </p>
                                        </div>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => removeFile(sf.id)}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {sourceFiles.length > 0 && (
                             <div>
                                <Label>3. Select Output Format</Label>
                                 <Select value={outputFormat} onValueChange={setOutputFormat}>
                                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select output format..." /></SelectTrigger>
                                    <SelectContent>
                                        {formatOptions.map(f => (
                                            <SelectItem key={f.value} value={f.value}>
                                                <div className="flex items-center gap-2">
                                                    <f.icon className="h-4 w-4 text-muted-foreground" />
                                                    <span>{f.label}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <footer className="p-4 border-t">
                     <Button onClick={handleConvert} disabled={isFinalizing || !mergedData || mergedData.features.length === 0} className="w-full h-11 text-base">
                        {isFinalizing ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Converting...</> : <> <Download className="mr-2 h-5 w-5"/>Convert & Download</>}
                    </Button>
                </footer>
            </aside>

            <main className="flex-1 h-full bg-background relative">
                {mergedData ? (
                    <MapPreview data={mergedData} />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                        <MapIcon className="h-16 w-16 text-gray-300 mb-4" />
                        <h3 className="font-semibold text-lg text-foreground">Map Preview</h3>
                        <p className="max-w-md">Your merged dataset will be previewed here. Upload files to get started.</p>
                    </div>
                )}
                 {mergedData && (
                     <Card className="absolute bottom-4 right-4 z-[1001] shadow-lg">
                        <CardHeader className="p-3">
                            <CardTitle className="text-sm flex items-center gap-2"><LayersIcon className="h-4 w-4 text-primary"/>Merge Result</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                            <p className="text-2xl font-bold text-primary">{mergedData.features.length} <span className="text-sm text-muted-foreground font-medium">total features</span></p>
                        </CardContent>
                    </Card>
                )}
            </main>
        </div>
    );
}
