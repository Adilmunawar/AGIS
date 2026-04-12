
'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import JSZip from 'jszip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { FileJson, UploadCloud, Loader2, Download, CheckCircle, Archive, FileArchive, ArrowRightLeft, MapIcon, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import * as turf from '@turf/turf';
import L, { LatLngBoundsExpression } from 'leaflet';

// Dynamically import map components to avoid SSR issues
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';

// --- LEAFLET HELPER COMPONENTS ---

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
    
    const mapKey = useMemo(() => data ? JSON.stringify(data.features.map((f:any) => f.id || f.properties)) : 'no-data', [data]);

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


// --- UI Components ---
const FileUploadArea = ({ onDrop, onDrag, isDragging, onChange, accept, multiple = false, title }: any) => (
  <div
    onDragEnter={(e) => onDrag(e, 'enter')}
    onDragLeave={(e) => onDrag(e, 'leave')}
    onDragOver={(e) => onDrag(e, 'over')}
    onDrop={onDrop}
    className={cn(
      'relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg transition-colors duration-200 cursor-pointer',
      isDragging ? 'border-primary bg-primary/10' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
    )}
  >
    <input
      type="file"
      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      accept={accept}
      multiple={multiple}
      onChange={(e) => onChange(e.target.files)}
    />
    <UploadCloud className={cn("h-10 w-10", isDragging ? 'text-primary' : 'text-gray-400')} />
    <p className="mt-4 text-center text-sm text-muted-foreground">{title}</p>
  </div>
);

const FilePreview = ({ files, onRemove, icon, featureCount }: { files: File[], onRemove: () => void, icon: React.ReactNode, featureCount: number }) => (
  <div className="p-4 border rounded-lg bg-gray-50/50 space-y-3">
    <div className="flex items-start justify-between">
      <div className='flex items-center gap-3'>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
        <div>
          <p className="text-sm font-bold">{files.length > 1 ? `${files.length} files` : files[0].name}</p>
          <p className="text-xs text-muted-foreground">{files.map(f => f.name).join(', ')}</p>
        </div>
      </div>
      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={onRemove}>
        Remove
      </Button>
    </div>
     {featureCount > 0 && 
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-white border rounded-md p-2">
            <Layers className="h-4 w-4 text-primary" />
            <span>{featureCount.toLocaleString()} features detected.</span>
        </div>
     }
  </div>
);

export default function DataConverterPage() {
  const { toast } = useToast();
  const [previewData, setPreviewData] = useState<any | null>(null);

  // --- State for GeoJSON -> Shapefile ---
  const [geojsonFile, setGeojsonFile] = useState<File | null>(null);
  const [isProcessingG2S, setIsProcessingG2S] = useState(false);
  const [isDraggingG2S, setIsDraggingG2S] = useState(false);
  const exportWorkerRef = useRef<Worker | null>(null);
  
  // --- State for Shapefile -> GeoJSON ---
  const [shapefiles, setShapefiles] = useState<File[]>([]);
  const [isProcessingS2G, setIsProcessingS2G] = useState(false);
  const [isDraggingS2G, setIsDraggingS2G] = useState(false);
  const shapefileWorkerRef = useRef<Worker | null>(null);

  // --- Worker Setup Effect ---
  useEffect(() => {
    // GeoJSON -> SHP worker
    exportWorkerRef.current = new Worker('/workers/exportWorker.js');
    exportWorkerRef.current.onmessage = async (e: MessageEvent) => {
      const { status, message, action, payload } = e.data;

      if (status === 'info') {
        toast({ title: 'Python Engine', description: message });
      } else if (status === 'success' && action === 'CONVERT_SHAPEFILE') {
        toast({ title: 'Conversion Successful', description: 'Zipping files for download.' });
        try {
          const { shp, shx, dbf, prj } = payload;
          const zip = new JSZip();
          zip.file('export.shp', shp);
          zip.file('export.shx', shx);
          zip.file('export.dbf', dbf);
          zip.file('export.prj', prj);

          const zipBlob = await zip.generateAsync({ type: 'blob' });
          const url = URL.createObjectURL(zipBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'shapefile_export.zip';
          document.body.appendChild(a);
a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast({ title: 'Download Started', description: 'Your shapefile has been downloaded.' });
        } catch (zipError: any) {
           toast({ variant: 'destructive', title: 'Zipping Error', description: zipError.message });
        }
        setIsProcessingG2S(false);
      } else if (status === 'error') {
        toast({ variant: 'destructive', title: 'Processing Error', description: message });
        setIsProcessingG2S(false);
      }
    };
    
    // SHP -> GeoJSON worker
    shapefileWorkerRef.current = new Worker('/workers/shapefileWorker.js');
    shapefileWorkerRef.current.onmessage = (e: MessageEvent) => {
        const { status, geojson, error } = e.data;
        if (status === 'success' && geojson) {
            toast({ title: 'Conversion Successful', description: `Found ${geojson.features.length} features.` });
            setPreviewData(geojson);
            const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "converted_from_shapefile.geojson";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast({ title: 'Download Started', description: 'Your GeoJSON file has been downloaded.' });
        } else {
            toast({ variant: 'destructive', title: 'Processing Error', description: error || 'Failed to parse the shapefile.' });
            setPreviewData(null);
        }
        setIsProcessingS2G(false);
    };

    return () => {
        exportWorkerRef.current?.terminate();
        shapefileWorkerRef.current?.terminate();
    };
  }, [toast]);

  // --- Handlers for GeoJSON -> Shapefile ---
  const handleG2SFileChange = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.name.endsWith('.geojson') || file.type === 'application/json') {
      setGeojsonFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          setPreviewData(json);
        } catch (err) {
          toast({ variant: 'destructive', title: 'Invalid JSON', description: 'Could not parse the GeoJSON file for preview.' });
          setPreviewData(null);
        }
      };
      reader.readAsText(file);
    } else {
      toast({ variant: 'destructive', title: 'Invalid File Type', description: 'Please upload a valid .geojson file.' });
    }
  };
  
  const handleConvertG2S = () => {
    if (!geojsonFile) return;
    setIsProcessingG2S(true);
    toast({ title: 'Processing GeoJSON...', description: 'Sending file to the conversion engine.' });
    const reader = new FileReader();
    reader.onload = (e) => {
        exportWorkerRef.current?.postMessage({
            action: 'CONVERT_SHAPEFILE',
            payload: e.target?.result as string,
        });
    };
    reader.readAsText(geojsonFile);
  };

  // --- Handlers for Shapefile -> GeoJSON ---
  const handleS2GFileChange = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const requiredFiles = ['shp', 'dbf'];
    const uploadedExtensions = Array.from(files).map(f => f.name.split('.').pop()?.toLowerCase());
    const hasRequired = requiredFiles.every(ext => uploadedExtensions.includes(ext));

    if (hasRequired) {
        setShapefiles(Array.from(files));
        setPreviewData(null); // Clear previous preview
    } else {
        toast({ variant: 'destructive', title: 'Incomplete Shapefile', description: 'Please make sure to upload at least the .shp and .dbf files together.' });
    }
  };
  
  const handleConvertS2G = () => {
      if(shapefiles.length === 0) return;
      setIsProcessingS2G(true);
      toast({ title: 'Processing Shapefile...', description: 'Sending files to the conversion engine.' });
      shapefileWorkerRef.current?.postMessage({ files: shapefiles, layer: 'parcels' });
  };
  
  // --- Drag & Drop Handlers ---
  const onDrag = (event: React.DragEvent, type: 'enter' | 'leave' | 'over', setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    event.preventDefault();
    event.stopPropagation();
    if (type === 'enter' || type === 'over') setter(true); else setter(false);
  };
  
  const onDropG2S = (event: React.DragEvent) => { event.preventDefault(); event.stopPropagation(); setIsDraggingG2S(false); handleG2SFileChange(event.dataTransfer.files); };
  const onDropS2G = (event: React.DragEvent) => { event.preventDefault(); event.stopPropagation(); setIsDraggingS2G(false); handleS2GFileChange(event.dataTransfer.files); };

  const featureCount = useMemo(() => previewData?.features?.length || 0, [previewData]);

  return (
    <div className="flex h-full w-full bg-muted/30">
        <aside className="w-[450px] border-r bg-background flex flex-col h-full">
             <header className="p-4 border-b">
                <h1 className="text-xl font-bold tracking-tight">GIS Data Converter</h1>
                <p className="text-sm text-muted-foreground">Two-way conversion between GeoJSON and Shapefile formats.</p>
            </header>
            <div className="p-4">
                 <Tabs defaultValue="g2s" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="g2s">GeoJSON to Shapefile</TabsTrigger>
                    <TabsTrigger value="s2g">Shapefile to GeoJSON</TabsTrigger>
                    </TabsList>
                    <TabsContent value="g2s" className="pt-6 space-y-4">
                        {!geojsonFile ? (
                            <FileUploadArea 
                                onDrag={(e: React.DragEvent, type: 'enter' | 'leave' | 'over') => onDrag(e, type, setIsDraggingG2S)}
                                onDrop={onDropG2S}
                                isDragging={isDraggingG2S}
                                onChange={handleG2SFileChange}
                                accept=".geojson,application/json"
                                title="Drag & drop a GeoJSON file, or click"
                            />
                        ) : (
                            <FilePreview
                                files={[geojsonFile]}
                                onRemove={() => { setGeojsonFile(null); setPreviewData(null); }}
                                icon={<FileJson className="h-6 w-6" />}
                                featureCount={featureCount}
                            />
                        )}
                        <Button onClick={handleConvertG2S} disabled={isProcessingG2S || !geojsonFile} className="w-full h-12 text-base">
                            {isProcessingG2S ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Converting...</> : <><Archive className="mr-2 h-5 w-5"/> Convert to Shapefile (.zip)</>}
                        </Button>
                    </TabsContent>
                    <TabsContent value="s2g" className="pt-6 space-y-4">
                        {shapefiles.length === 0 ? (
                            <FileUploadArea 
                                onDrag={(e: React.DragEvent, type: 'enter' | 'leave' | 'over') => onDrag(e, type, setIsDraggingS2G)}
                                onDrop={onDropS2G}
                                isDragging={isDraggingS2G}
                                onChange={handleS2GFileChange}
                                accept=".shp,.shx,.dbf,.prj,.sbn,.sbx,.cpg,.xml"
                                multiple={true}
                                title="Drag & drop Shapefile parts (.shp, .dbf, etc)"
                            />
                        ) : (
                            <FilePreview
                                files={shapefiles}
                                onRemove={() => { setShapefiles([]); setPreviewData(null); }}
                                icon={<FileArchive className="h-6 w-6" />}
                                featureCount={featureCount}
                            />
                        )}
                        <Button onClick={handleConvertS2G} disabled={isProcessingS2G || shapefiles.length === 0} className="w-full h-12 text-base">
                            {isProcessingS2G ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Converting...</> : <><Download className="mr-2 h-5 w-5"/> Convert & Download GeoJSON</>}
                        </Button>
                    </TabsContent>
                </Tabs>
            </div>
        </aside>
        <main className="flex-1 h-full bg-background relative">
            {previewData ? (
                <MapPreview data={previewData} />
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                    <MapIcon className="h-16 w-16 text-gray-300 mb-4" />
                    <h3 className="font-semibold text-lg text-foreground">Map Preview</h3>
                    <p className="max-w-md">Upload or convert a file to see a preview of the geospatial data here.</p>
                </div>
            )}
        </main>
    </div>
  );
}
