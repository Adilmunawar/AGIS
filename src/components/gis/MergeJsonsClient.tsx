'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import L, { LatLngBoundsExpression } from 'leaflet';
import * as turf from '@turf/turf';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { FileJson, UploadCloud, Loader2, Trash2, LayersIcon, MapIcon, Download, X } from 'lucide-react';
import { cn } from '@/lib/utils';
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
            console.error("Could not calculate bounds:", e);
            return null;
        }
    }, [data]);
    
    // A key is used to force re-render when data changes significantly
    const mapKey = useMemo(() => data ? JSON.stringify(data.features.map((f:any) => f.properties)) : 'no-data', [data]);

    return (
        <MapContainer
            key={mapKey}
            center={[30, 70]}
            zoom={5}
            style={{ height: '100%', width: '100%', backgroundColor: '#f0f0f0' }}
            scrollWheelZoom={true}
        >
            <TileLayer
                url="https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}"
                subdomains={['mt0','mt1','mt2','mt3']}
                attribution="&copy; Google"
            />
            {data && <GeoJSON data={data} style={{ color: '#3b82f6', weight: 2 }} />}
            <FitBounds bounds={bounds} />
        </MapContainer>
    );
};

export default function MergeJsonsClient() {
    const [files, setFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [mergedData, setMergedData] = useState<any | null>(null);
    const workerRef = useRef<Worker | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        workerRef.current = new Worker('/workers/mergeWorker.js');
        workerRef.current.onmessage = (e: MessageEvent) => {
            const { status, message, action, data } = e.data;
            if (status === 'info') {
                toast({ title: 'Python Engine', description: message });
            } else if (status === 'success' && action === 'MERGE_JSONS') {
                const featureCount = data?.features?.length || 0;
                toast({ title: 'Merge Successful', description: `${featureCount} features combined.` });
                setMergedData(data);
                setIsProcessing(false);
            } else if (status === 'error') {
                toast({ variant: 'destructive', title: 'Processing Error', description: message });
                setIsProcessing(false);
            }
        };
        return () => workerRef.current?.terminate();
    }, [toast]);

    const handleFileChange = (newFiles: FileList | null) => {
        if (!newFiles) return;
        const geojsonFiles = Array.from(newFiles).filter(
            (file) => file.name.endsWith('.geojson') || file.type === 'application/json'
        );
        setFiles((prevFiles) => [...prevFiles, ...geojsonFiles]);
        setMergedData(null); // Invalidate previous merge result
    };

    const handleRemoveFile = (index: number) => {
        setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
        setMergedData(null);
    };
    
    const handleClearAll = () => {
        setFiles([]);
        setMergedData(null);
    }

    const handleMerge = async () => {
        if (files.length < 2) {
            toast({ variant: 'destructive', title: 'Not Enough Files', description: 'Please upload at least two GeoJSON files to merge.' });
            return;
        }
        setIsProcessing(true);
        setMergedData(null);
        toast({ title: 'Processing...', description: 'Reading and sending files to the Python engine.' });

        try {
            const fileContents = await Promise.all(
                files.map((file) => new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target?.result as string);
                    reader.onerror = (e) => reject(e);
                    reader.readAsText(file);
                }))
            );

            workerRef.current?.postMessage({
                action: 'MERGE_JSONS',
                payload: fileContents,
            });
        } catch (error) {
            setIsProcessing(false);
            toast({ variant: 'destructive', title: 'File Reading Error', description: 'Could not read one of the files.' });
        }
    };
    
    const handleDownload = () => {
        if (!mergedData) {
            toast({ variant: 'destructive', title: 'No Data to Download', description: 'Please merge files first.' });
            return;
        }
        const blob = new Blob([JSON.stringify(mergedData)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'merged_master.geojson';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    const onDrag = useCallback((event: React.DragEvent, type: 'enter' | 'leave' | 'over') => {
        event.preventDefault();
        event.stopPropagation();
        if (type === 'enter' || type === 'over') setIsDragging(true);
        else setIsDragging(false);
    }, []);

    const onDrop = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
        handleFileChange(event.dataTransfer.files);
    }, [handleFileChange]);

    return (
        <div className="flex h-full w-full bg-muted/30">
            <aside className="w-[450px] border-r bg-background flex flex-col h-full">
                <header className="p-4 border-b">
                    <h1 className="text-xl font-bold tracking-tight">Merge GeoJSON Files</h1>
                    <p className="text-sm text-muted-foreground">Combine multiple GeoJSON files into a single master file.</p>
                </header>

                <ScrollArea className="flex-1">
                    <div className="p-4 space-y-6">
                        <div>
                            <label className="text-sm font-medium">Upload Files</label>
                            <div
                                onDragEnter={(e) => onDrag(e, 'enter')}
                                onDragLeave={(e) => onDrag(e, 'leave')}
                                onDragOver={(e) => onDrag(e, 'over')}
                                onDrop={onDrop}
                                className={cn(
                                'relative flex flex-col items-center justify-center mt-2 p-8 border-2 border-dashed rounded-lg transition-colors duration-200',
                                isDragging ? 'border-primary bg-primary/10' : 'border-gray-300 bg-gray-50'
                                )}
                            >
                                <input
                                type="file"
                                id="file-upload"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                multiple
                                accept=".geojson,application/json"
                                onChange={(e) => handleFileChange(e.target.files)}
                                />
                                <UploadCloud className={cn("h-10 w-10", isDragging ? 'text-primary' : 'text-gray-400')} />
                                <p className="mt-4 text-sm text-center text-muted-foreground">
                                {isDragging ? "Drop files here" : "Drag & drop files, or click to browse"}
                                </p>
                            </div>
                        </div>
                        
                        {files.length > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-medium">File Queue ({files.length})</label>
                                    <Button variant="link" size="sm" className="text-xs" onClick={handleClearAll}>Clear All</Button>
                                </div>
                                <div className="max-h-60 overflow-y-auto rounded-md border p-2 space-y-1.5 bg-muted/50">
                                    {files.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between p-2 rounded-md bg-background shadow-sm">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                        <FileJson className="h-5 w-5 text-primary flex-shrink-0" />
                                        <span className="text-sm font-medium truncate" title={file.name}>{file.name}</span>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => handleRemoveFile(index)}>
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <footer className="p-4 border-t grid grid-cols-2 gap-3">
                    <Button onClick={handleMerge} disabled={isProcessing || files.length < 2} className="h-11 text-base">
                        {isProcessing ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Merging...</> : <><LayersIcon className="mr-2 h-5 w-5"/> Merge & Preview</>}
                    </Button>
                     <Button onClick={handleDownload} disabled={!mergedData} className="h-11 text-base" variant="outline">
                        <Download className="mr-2 h-5 w-5"/> Download
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
                        <p className="max-w-md">The result of your merged GeoJSON files will be displayed here for review before you download.</p>
                    </div>
                )}
                 {mergedData && (
                     <Card className="absolute bottom-4 right-4 z-[1001] shadow-lg">
                        <CardHeader className="p-3">
                            <CardTitle className="text-sm">Merge Complete</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 pt-0">
                            <p className="text-2xl font-bold text-primary">{mergedData.features.length} <span className="text-sm text-muted-foreground font-medium">features</span></p>
                        </CardContent>
                    </Card>
                )}
            </main>
        </div>
    );
}
