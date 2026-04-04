'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import JSZip from 'jszip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { FileJson, UploadCloud, Loader2, Download, CheckCircle, Archive, FileArchive, ArrowRightLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// --- UI Components for Drag & Drop ---
const FileUploadArea = ({ onDrop, onDrag, isDragging, onChange, accept, multiple = false, title }: any) => (
  <div
    onDragEnter={(e) => onDrag(e, 'enter')}
    onDragLeave={(e) => onDrag(e, 'leave')}
    onDragOver={(e) => onDrag(e, 'over')}
    onDrop={onDrop}
    className={cn(
      'relative flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-lg transition-colors duration-200',
      isDragging ? 'border-primary bg-primary/10' : 'border-gray-300 bg-gray-50'
    )}
  >
    <input
      type="file"
      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      accept={accept}
      multiple={multiple}
      onChange={(e) => onChange(e.target.files)}
    />
    <UploadCloud className={cn("h-12 w-12", isDragging ? 'text-primary' : 'text-gray-400')} />
    <p className="mt-4 text-center text-muted-foreground">
      {isDragging ? "Drop files here" : title}
    </p>
  </div>
);

const FilePreview = ({ file, onRemove, icon }: any) => (
  <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-gray-50">
    <CheckCircle className="h-12 w-12 text-green-500" />
    <div className="flex items-center gap-2 mt-4">
      {icon}
      <span className="text-lg font-medium">{Array.isArray(file) ? `${file.length} files selected` : file.name}</span>
    </div>
    <Button variant="link" size="sm" className="mt-2 text-red-500" onClick={onRemove}>
      Remove
    </Button>
  </div>
);

export default function DataConverterPage() {
  const { toast } = useToast();

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
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.geojson') || file.type === 'application/json') {
        setGeojsonFile(file);
      } else {
        toast({ variant: 'destructive', title: 'Invalid File Type', description: 'Please upload a valid .geojson file.' });
      }
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
    if (files && files.length > 0) {
        const requiredFiles = ['shp', 'dbf'];
        const uploadedExtensions = Array.from(files).map(f => f.name.split('.').pop()?.toLowerCase());
        const hasRequired = requiredFiles.every(ext => uploadedExtensions.includes(ext));

        if (hasRequired) {
            setShapefiles(Array.from(files));
        } else {
            toast({ variant: 'destructive', title: 'Incomplete Shapefile', description: 'Please make sure to upload at least the .shp and .dbf files together.' });
        }
    }
  };
  
  const handleConvertS2G = () => {
      if(shapefiles.length === 0) return;
      setIsProcessingS2G(true);
      toast({ title: 'Processing Shapefile...', description: 'Sending files to the conversion engine.' });
      shapefileWorkerRef.current?.postMessage({ files: shapefiles, layer: 'parcels' });
  };
  
  // --- Drag & Drop Handlers ---
  const onDragG2S = useCallback((event: React.DragEvent, type: 'enter' | 'leave' | 'over') => {
    event.preventDefault();
    event.stopPropagation();
    if (type === 'enter' || type === 'over') setIsDraggingG2S(true); else setIsDraggingG2S(false);
  }, []);
  const onDropG2S = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingG2S(false);
    handleG2SFileChange(event.dataTransfer.files);
  }, []);

  const onDragS2G = useCallback((event: React.DragEvent, type: 'enter' | 'leave' | 'over') => {
    event.preventDefault();
    event.stopPropagation();
    if (type === 'enter' || type === 'over') setIsDraggingS2G(true); else setIsDraggingS2G(false);
  }, []);
  const onDropS2G = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDraggingS2G(false);
    handleS2GFileChange(event.dataTransfer.files);
  }, []);

  return (
    <div className="flex items-center justify-center h-full bg-gray-100/50 p-4 sm:p-8 overflow-y-auto">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 mb-4">
                <ArrowRightLeft className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">GIS Data Converter</CardTitle>
            <CardDescription className="mt-2 text-lg text-muted-foreground">
                Two-way conversion between GeoJSON and Shapefile formats.
            </CardDescription>
        </CardHeader>
        <CardContent className="px-6 py-4">
          <Tabs defaultValue="g2s" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="g2s">GeoJSON to Shapefile</TabsTrigger>
              <TabsTrigger value="s2g">Shapefile to GeoJSON</TabsTrigger>
            </TabsList>
            <TabsContent value="g2s" className="pt-6">
                {!geojsonFile ? (
                    <FileUploadArea 
                        onDrag={onDragG2S}
                        onDrop={onDropG2S}
                        isDragging={isDraggingG2S}
                        onChange={handleG2SFileChange}
                        accept=".geojson,application/json"
                        title="Drag & drop a GeoJSON file, or click"
                    />
                ) : (
                    <FilePreview
                        file={geojsonFile}
                        onRemove={() => setGeojsonFile(null)}
                        icon={<FileJson className="h-5 w-5 text-primary" />}
                    />
                )}
                <Button onClick={handleConvertG2S} disabled={isProcessingG2S || !geojsonFile} className="w-full h-12 text-lg mt-6">
                    {isProcessingG2S ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Converting...</> : <><Archive className="mr-2 h-5 w-5"/> Convert to Shapefile (.zip)</>}
                </Button>
            </TabsContent>
            <TabsContent value="s2g" className="pt-6">
                 {!shapefiles.length ? (
                    <FileUploadArea 
                        onDrag={onDragS2G}
                        onDrop={onDropS2G}
                        isDragging={isDraggingS2G}
                        onChange={handleS2GFileChange}
                        accept=".shp,.shx,.dbf,.prj,.sbn,.sbx,.cpg,.xml"
                        multiple={true}
                        title="Drag & drop Shapefile parts (.shp, .dbf, etc)"
                    />
                ) : (
                    <FilePreview
                        file={shapefiles}
                        onRemove={() => setShapefiles([])}
                        icon={<FileArchive className="h-5 w-5 text-primary" />}
                    />
                )}
                <Button onClick={handleConvertS2G} disabled={isProcessingS2G || shapefiles.length === 0} className="w-full h-12 text-lg mt-6">
                    {isProcessingS2G ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Converting...</> : <><Download className="mr-2 h-5 w-5"/> Convert to GeoJSON</>}
                </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
