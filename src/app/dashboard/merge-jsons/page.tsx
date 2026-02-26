'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { FileJson, UploadCloud, Loader2, Trash2, LayersIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MergeJSONsPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    workerRef.current = new Worker('/workers/mergeWorker.js');
    workerRef.current.onmessage = (e: MessageEvent) => {
      const { status, message, action, data } = e.data;
      if (status === 'info') {
        toast({ title: 'Python Engine', description: message });
      } else if (status === 'success' && action === 'MERGE_JSONS') {
        toast({ title: 'Merge Successful', description: 'Your files have been merged.' });
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'merged_master.geojson';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
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
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      toast({ variant: 'destructive', title: 'Not Enough Files', description: 'Please upload at least two GeoJSON files to merge.' });
      return;
    }
    setIsProcessing(true);
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
                <LayersIcon className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Merge GeoJSON Files</CardTitle>
            <CardDescription className="mt-2 text-lg text-muted-foreground">
                Drag & drop multiple GeoJSON files to combine them into one.
            </CardDescription>
        </CardHeader>
        <CardContent className="px-6 py-4">
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
              multiple
              accept=".geojson,application/json"
              onChange={(e) => handleFileChange(e.target.files)}
            />
            <UploadCloud className={cn("h-12 w-12", isDragging ? 'text-primary' : 'text-gray-400')} />
            <p className="mt-4 text-center text-muted-foreground">
              {isDragging ? "Drop files here" : "Drag & drop GeoJSON files, or click to browse"}
            </p>
          </div>

          {files.length > 0 && (
            <div className="mt-6 space-y-2">
              <h3 className="font-semibold text-muted-foreground">Uploaded Files:</h3>
              <ul className="max-h-48 overflow-y-auto rounded-md border p-2 space-y-1">
                {files.map((file, index) => (
                  <li key={index} className="flex items-center justify-between p-2 rounded-md bg-gray-50/50">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileJson className="h-5 w-5 text-primary flex-shrink-0" />
                      <span className="text-sm font-medium truncate" title={file.name}>{file.name}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => handleRemoveFile(index)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
        <CardFooter>
            <Button onClick={handleMerge} disabled={isProcessing || files.length < 2} className="w-full h-12 text-lg">
                {isProcessing ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Merging...</> : 'Merge Files'}
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
