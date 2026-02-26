'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import JSZip from 'jszip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { FileJson, UploadCloud, Loader2, Download, CheckCircle, Archive } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ExportShapefilePage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    workerRef.current = new Worker('/gisWorker.js');
    workerRef.current.onmessage = async (e: MessageEvent) => {
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
        setIsProcessing(false);
      } else if (status === 'error') {
        toast({ variant: 'destructive', title: 'Processing Error', description: message });
        setIsProcessing(false);
      }
    };
    return () => workerRef.current?.terminate();
  }, [toast]);

  const handleFileChange = (newFiles: FileList | null) => {
    if (newFiles && newFiles.length > 0) {
      const firstFile = newFiles[0];
      if (firstFile.name.endsWith('.geojson') || firstFile.type === 'application/json') {
        setFile(firstFile);
      } else {
        toast({ variant: 'destructive', title: 'Invalid File Type', description: 'Please upload a valid .geojson file.' });
      }
    }
  };

  const handleConvert = async () => {
    if (!file) {
      toast({ variant: 'destructive', title: 'No File Selected', description: 'Please upload a GeoJSON file to convert.' });
      return;
    }
    setIsProcessing(true);
    toast({ title: 'Processing...', description: 'Reading and sending file to the Python engine.' });
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const fileContent = e.target?.result as string;
        workerRef.current?.postMessage({
            action: 'CONVERT_SHAPEFILE',
            payload: fileContent,
        });
    };
    reader.readAsText(file);
  };
  
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
  }, []);

  return (
    <div className="flex items-center justify-center h-full bg-gray-100/50 p-4 sm:p-8">
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 mb-4">
                <Archive className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Export to Shapefile</CardTitle>
            <CardDescription className="mt-2 text-lg text-muted-foreground">
                Drag & drop a GeoJSON file to convert it into a Shapefile (.zip).
            </CardDescription>
        </CardHeader>
        <CardContent className="px-6 py-4">
          {!file ? (
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
                id="file-upload"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                accept=".geojson,application/json"
                onChange={(e) => handleFileChange(e.target.files)}
                />
                <UploadCloud className={cn("h-12 w-12", isDragging ? 'text-primary' : 'text-gray-400')} />
                <p className="mt-4 text-center text-muted-foreground">
                {isDragging ? "Drop file here" : "Drag & drop a GeoJSON file, or click to browse"}
                </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-gray-50">
                <CheckCircle className="h-12 w-12 text-green-500" />
                <div className="flex items-center gap-2 mt-4">
                    <FileJson className="h-5 w-5 text-primary" />
                    <span className="text-lg font-medium">{file.name}</span>
                </div>
                <Button variant="link" size="sm" className="mt-2 text-red-500" onClick={() => setFile(null)}>
                    Remove file
                </Button>
            </div>
          )}
        </CardContent>
        <CardFooter>
            <Button onClick={handleConvert} disabled={isProcessing || !file} className="w-full h-12 text-lg">
                {isProcessing ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Converting...</> : <><Download className="mr-2 h-5 w-5"/> Convert & Download Shapefile</>}
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
