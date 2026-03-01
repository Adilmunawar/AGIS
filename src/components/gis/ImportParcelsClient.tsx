'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { FeatureCollection } from 'geojson';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, Files, FileCheck2, ArrowRight, CheckCircle, UploadCloud } from 'lucide-react';

// Define the structure for a schema field
interface SchemaField {
  id: 'mauzaName' | 'plotNumber' | 'landUse' | 'areaSqm';
  label: string;
  description: string;
}

// Configuration for the fields required for schema mapping
const SCHEMA_FIELDS: SchemaField[] = [
  { id: 'mauzaName', label: 'Mauza Name', description: 'The column identifying the administrative area name (e.g., "Chak 185/7-R").' },
  { id: 'plotNumber', label: 'Plot Number', description: 'The unique identifier for each individual parcel within the Mauza.' },
  { id: 'landUse', label: 'Land Use', description: 'The designated purpose of the parcel (e.g., "Residential", "Agricultural").' },
  { id: 'areaSqm', label: 'Area (Sqm)', description: 'The column containing the calculated area of the parcel in square meters.' },
];

export default function ImportParcelsClient() {
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  
  const [geoJson, setGeoJson] = useState<FeatureCollection | null>(null);
  const [dbfColumns, setDbfColumns] = useState<string[]>([]);
  const [mappedSchema, setMappedSchema] = useState<Record<SchemaField['id'], string>>({
    mauzaName: '',
    plotNumber: '',
    landUse: '',
    areaSqm: '',
  });

  const workerRef = useRef<Worker | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize the web worker
    workerRef.current = new Worker('/workers/shapefileWorker.js');

    // Handle messages from the worker
    workerRef.current.onmessage = (event: MessageEvent) => {
      const { geojson, columns, error } = event.data;
      setIsProcessing(false);

      if (error) {
        toast({
          variant: 'destructive',
          title: 'File Parsing Error',
          description: error,
        });
        setFiles([]); // Clear invalid files
        return;
      }
      
      setGeoJson(geojson);
      setDbfColumns(columns || []); // Ensure columns is always an array
      toast({
        title: 'Files Processed Successfully',
        description: 'Shapefile was parsed into GeoJSON. Please map the schema below.',
      });
      setStep(2);
    };

    // Handle errors from the worker
    workerRef.current.onerror = (error: ErrorEvent) => {
      setIsProcessing(false);
      toast({
        variant: 'destructive',
        title: 'Worker Error',
        description: error.message,
      });
       setFiles([]);
    };

    // Terminate the worker on component unmount
    return () => {
      workerRef.current?.terminate();
    };
  }, [toast]);

  const handleFileSelection = useCallback((selectedFiles: File[]) => {
    if (selectedFiles.length === 0) return;

    // Validate that both .shp and .dbf files are present
    const hasShp = selectedFiles.some(f => f.name.toLowerCase().endsWith('.shp'));
    const hasDbf = selectedFiles.some(f => f.name.toLowerCase().endsWith('.dbf'));

    if (!hasShp || !hasDbf) {
      toast({
        variant: 'destructive',
        title: 'Missing Required Files',
        description: 'Your selection must include both a .shp and a .dbf file.',
      });
      return;
    }

    setFiles(selectedFiles);
    setIsProcessing(true);
    toast({
      title: 'Processing Files',
      description: 'Zipping and parsing shapefile components in memory...',
    });
    // Post the files to the worker for processing
    workerRef.current?.postMessage(selectedFiles);
  }, [toast]);

  const handleDrag = useCallback((event: React.DragEvent, type: 'enter' | 'leave' | 'over') => {
    event.preventDefault();
    event.stopPropagation();
    if (type === 'enter' || type === 'over') setIsDragging(true);
    else setIsDragging(false);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (event.dataTransfer.files) {
      handleFileSelection(Array.from(event.dataTransfer.files));
    }
  }, [handleFileSelection]);

  const handleSchemaChange = (fieldId: SchemaField['id'], value: string) => {
    setMappedSchema(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleConfirmSchema = () => {
    // Check if all schema fields have been mapped
    const allMapped = Object.values(mappedSchema).every(value => value !== '');
    if (!allMapped) {
      toast({
        variant: 'destructive',
        title: 'Incomplete Schema',
        description: 'Please map all required fields before continuing.',
      });
      return;
    }
    setStep(3);
  };

  const handleCommitToFirebase = async () => {
    console.log("--- Ready for Firebase Commit ---");
    console.log("Parsed GeoJSON:", geoJson);
    console.log("Mapped Schema:", mappedSchema);
    toast({
      title: 'Ready for Firebase',
      description: 'Data has been logged to the console. Next step is wiring the upload service.',
    });
  };
  
  const resetWizard = () => {
      setStep(1);
      setFiles([]);
      setGeoJson(null);
      setDbfColumns([]);
      setMappedSchema({ mauzaName: '', plotNumber: '', landUse: '', areaSqm: '' });
  }

  // --- Render Functions for Each Step ---

  const renderStep1_Upload = () => (
    <Card className="w-full max-w-3xl">
      <CardHeader className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 mb-4">
            <Files className="h-8 w-8 text-primary" />
        </div>
        <CardTitle>Step 1: Upload Shapefile Components</CardTitle>
        <CardDescription>Drag and drop all parts of your shapefile (.shp, .dbf, .shx, etc.) below.</CardDescription>
      </CardHeader>
      <CardContent>
        {isProcessing ? (
            <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-lg bg-gray-50">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <p className="mt-4 font-semibold">Processing files in memory...</p>
                <p className="text-sm text-muted-foreground">This may take a moment for large files.</p>
            </div>
        ) : files.length > 0 ? (
            <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-green-50 border-green-200">
                <FileCheck2 className="h-12 w-12 text-green-600" />
                <p className="mt-4 text-lg font-medium">{files.length} files selected</p>
                <ul className="text-sm text-green-800/80 list-disc list-inside mt-2">
                    {files.map(f => <li key={f.name}>{f.name}</li>)}
                </ul>
                <Button variant="link" className="mt-4 text-red-500" onClick={resetWizard}>
                    Clear and start over
                </Button>
            </div>
        ) : (
             <div
                onDragEnter={(e) => handleDrag(e, 'enter')}
                onDragLeave={(e) => handleDrag(e, 'leave')}
                onDragOver={(e) => handleDrag(e, 'over')}
                onDrop={handleDrop}
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
                accept=".shp,.shx,.dbf,.prj,.sbn,.sbx,.fbn,.fbx,.ain,.aih,.ixs,.mxs,.atx,.cpg,.xml"
                onChange={(e) => handleFileSelection(Array.from(e.target.files || []))}
                />
                <UploadCloud className={cn("h-12 w-12", isDragging ? 'text-primary' : 'text-gray-400')} />
                <p className="mt-4 text-center text-muted-foreground">
                {isDragging ? "Drop files here" : "Drag & drop your files, or click to browse"}
                </p>
            </div>
        )}
      </CardContent>
    </Card>
  );

  const renderStep2_MapSchema = () => (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle>Step 2: Map Schema</CardTitle>
        <CardDescription>
          Match the columns from your shapefile's attribute table (.dbf) to the required fields for the AGIS database.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {SCHEMA_FIELDS.map((field) => (
          <div key={field.id} className="grid grid-cols-1 md:grid-cols-2 items-center gap-4">
            <div>
                <Label htmlFor={field.id} className="font-semibold">{field.label}</Label>
                <p className="text-xs text-muted-foreground mt-1">{field.description}</p>
            </div>
            <Select onValueChange={(value) => handleSchemaChange(field.id, value)} value={mappedSchema[field.id]}>
              <SelectTrigger id={field.id}>
                <SelectValue placeholder="Select a column..." />
              </SelectTrigger>
              <SelectContent>
                {dbfColumns.map((col) => (
                  <SelectItem key={col} value={col}>{col}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </CardContent>
      <CardFooter className="justify-between">
         <Button variant="outline" onClick={resetWizard}>Back to Upload</Button>
        <Button onClick={handleConfirmSchema}>
          Confirm Mapping <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );

  const renderStep3_Done = () => (
    <Card className="w-full max-w-3xl">
      <CardHeader className="text-center">
         <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-100 to-green-200 mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <CardTitle>Step 3: Ready for Integration</CardTitle>
        <CardDescription>
          Your data has been processed and your schema is mapped. You are now ready to commit the data to Firebase.
        </CardDescription>
      </CardHeader>
      <CardContent>
          <div className="rounded-lg bg-gray-50 p-4 border space-y-2">
              <h4 className="font-semibold">Summary:</h4>
              <p className="text-sm">
                  <span className="font-medium text-muted-foreground">Source File:</span> {files[0]?.name.replace(/\.[^/.]+$/, "")}
              </p>
              <p className="text-sm">
                  <span className="font-medium text-muted-foreground">Parcels Found:</span> {geoJson?.features.length}
              </p>
               <h4 className="font-semibold pt-2">Schema Mapping:</h4>
                {SCHEMA_FIELDS.map(field => (
                    <p key={field.id} className="text-sm">
                        <span className="font-medium text-muted-foreground">{field.label}:</span> {mappedSchema[field.id]}
                    </p>
                ))}
          </div>
      </CardContent>
      <CardFooter className="justify-between">
        <Button variant="outline" onClick={() => setStep(2)}>Back to Schema</Button>
        <Button onClick={handleCommitToFirebase}>
          Commit to Firebase <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <div className="flex items-center justify-center h-full bg-gray-100/50 p-4 sm:p-8">
      {step === 1 && renderStep1_Upload()}
      {step === 2 && renderStep2_MapSchema()}
      {step === 3 && renderStep3_Done()}
    </div>
  );
}
