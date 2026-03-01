'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import L from 'leaflet';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2, Files, CheckCircle, Database, Map, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { uploadMauzaData } from '@/firebase/services/gis-upload';
import * as turf from '@turf/turf';


const schemaMappingFormSchema = z.object({
  mauzaName: z.string().min(1, 'You must map the Mauza Name column.'),
  plotNumber: z.string().min(1, 'You must map the Plot Number column.'),
  landUse: z.string().min(1, 'You must map the Land Use column.'),
  area: z.string().min(1, 'You must map the Area column.'),
});

type SchemaMappingFormValues = z.infer<typeof schemaMappingFormSchema>;


export default function ImportParcelsClient() {
  const [step, setStep] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [geoJsonData, setGeoJsonData] = useState<any | null>(null);
  const [dbfColumns, setDbfColumns] = useState<string[]>([]);
  const workerRef = useRef<Worker | null>(null);
  const { toast } = useToast();

  const form = useForm<SchemaMappingFormValues>({
    resolver: zodResolver(schemaMappingFormSchema),
    defaultValues: { mauzaName: '', plotNumber: '', landUse: '', area: '' },
  });

  useEffect(() => {
    workerRef.current = new Worker('/workers/shapefileWorker.js');
    workerRef.current.onmessage = (event: MessageEvent) => {
      setIsProcessing(false);
      const { geojson, columns, error } = event.data;
      if (error) {
        toast({ variant: 'destructive', title: 'Shapefile Parsing Error', description: error });
        return;
      }

      if (!geojson) {
        toast({
          variant: 'destructive',
          title: 'Processing Error',
          description: 'Failed to parse the shapefile. Please ensure it is valid and try again.',
        });
        return;
      }
      
      setGeoJsonData(geojson);
      setDbfColumns(columns || []);
      setStep(2);
      toast({ title: 'Shapefile Processed', description: `Found ${geojson.features?.length || 0} features.` });
    };
    return () => {
      workerRef.current?.terminate();
    };
  }, [toast]);

  const handleFileChange = (files: File[] | null) => {
    if (!files || files.length === 0) return;

    const hasShp = files.some(f => f.name.toLowerCase().endsWith('.shp'));
    const hasDbf = files.some(f => f.name.toLowerCase().endsWith('.dbf'));

    if (!hasShp || !hasDbf) {
      toast({ variant: 'destructive', title: 'Missing Required Files', description: 'Your selection must include both .shp and .dbf files.' });
      return;
    }

    setIsProcessing(true);
    toast({ title: 'Processing Shapefile...', description: 'Zipping and parsing files in browser memory.' });
    workerRef.current?.postMessage(files);
  };

  const handleCommitToFirebase = async (mappedSchema: SchemaMappingFormValues) => {
    if (!geoJsonData || !mappedSchema.mauzaName) {
      toast({ variant: 'destructive', title: 'Missing Data', description: 'Cannot commit without GeoJSON data and a mapped Mauza name.' });
      return;
    }

    setIsCommitting(true);
    try {
      const firstFeature = geoJsonData.features[0];
      if (!firstFeature?.properties) {
        throw new Error("The shapefile's attribute table is empty or invalid.");
      }
      
      const mauzaNameValue = firstFeature.properties[mappedSchema.mauzaName] as string;
      if (!mauzaNameValue) {
        throw new Error(`The mapped 'Mauza Name' column '${mappedSchema.mauzaName}' was not found on the feature.`);
      }

      // 1. Calculate master bounding box using Turf.js
      const bbox = turf.bbox(geoJsonData) as [number, number, number, number];

      // 2. Call the upload service
      const result = await uploadMauzaData(mauzaNameValue, geoJsonData, firstFeature.properties, bbox);

      toast({
        title: 'Commit Successful',
        description: `Mauza '${result.docId}' has been saved to Firebase.`,
      });
      setStep(3); // Advance to success screen

    } catch (error: any) {
      console.error("Firebase commit error:", error);
      toast({
        variant: 'destructive',
        title: 'Commit Failed',
        description: error.message || 'An unknown error occurred during the upload process.',
      });
    } finally {
      setIsCommitting(false);
    }
  };


  const onDrag = useCallback((event: React.DragEvent, type: 'enter' | 'leave' | 'over') => {
    event.preventDefault();
    event.stopPropagation();
    if (isProcessing) return;
    if (type === 'enter' || type === 'over') setIsDragging(true);
    else setIsDragging(false);
  }, [isProcessing]);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (isProcessing) return;
    setIsDragging(false);
    handleFileChange(Array.from(event.dataTransfer.files));
  }, [isProcessing]);


  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <>
            <CardHeader className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 mb-4">
                <Files className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Step 1: Upload Shapefile Components</CardTitle>
              <CardDescription>Select all parts of your shapefile (.shp, .dbf, .shx, etc.).</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                onDragEnter={(e) => onDrag(e, 'enter')}
                onDragLeave={(e) => onDrag(e, 'leave')}
                onDragOver={(e) => onDrag(e, 'over')}
                onDrop={onDrop}
                className={cn(
                  'relative flex flex-col items-center justify-center p-10 border-2 border-dashed rounded-lg transition-colors duration-200',
                  isProcessing ? 'cursor-not-allowed bg-gray-100' : isDragging ? 'border-primary bg-primary/10' : 'border-gray-300 bg-gray-50'
                )}
              >
                <input
                  type="file"
                  id="file-upload"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  multiple
                  accept=".shp,.shx,.dbf,.prj,.cpg,.sbn,.sbx,.xml"
                  onChange={(e) => handleFileChange(Array.from(e.target.files || []))}
                  disabled={isProcessing}
                />
                {isProcessing ? (
                  <>
                    <Loader2 className="h-12 w-12 text-primary animate-spin" />
                    <p className="mt-4 text-center text-muted-foreground">Processing files in memory...</p>
                  </>
                ) : (
                  <>
                    <Files className={cn("h-12 w-12", isDragging ? 'text-primary' : 'text-gray-400')} />
                    <p className="mt-4 text-center text-muted-foreground">
                      {isDragging ? "Drop files here" : "Drag & drop shapefile components, or click to browse"}
                    </p>
                  </>
                )}
              </div>
               <div className="mt-6 flex items-start gap-4 rounded-lg border border-amber-300 bg-amber-50 p-4">
                    <AlertTriangle className="h-6 w-6 flex-shrink-0 text-amber-600" />
                    <div className="text-sm text-amber-800">
                        <h4 className="font-semibold">Important</h4>
                        <p className="mt-1">Please ensure your shapefile is projected in **WGS 84 (Latitude/Longitude)**. The system does not currently re-project other coordinate systems.</p>
                    </div>
                </div>
            </CardContent>
          </>
        );
      case 2:
        return (
          <>
            <CardHeader>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 mb-4">
                <Map className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Step 2: Map Attribute Schema</CardTitle>
              <CardDescription>Tell the system which columns in your data correspond to the required fields.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCommitToFirebase)} className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <FormField control={form.control} name="mauzaName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mauza Name Column</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select a column..." /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {dbfColumns.map((col) => (
                              <SelectItem key={col} value={col}>{col}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="plotNumber" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plot Number Column</FormLabel>
                         <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select a column..." /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {dbfColumns.map((col) => (
                              <SelectItem key={col} value={col}>{col}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="landUse" render={({ field }) => (
                       <FormItem>
                        <FormLabel>Land Use Column</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select a column..." /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {dbfColumns.map((col) => (
                              <SelectItem key={col} value={col}>{col}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="area" render={({ field }) => (
                       <FormItem>
                        <FormLabel>Area (Sqm) Column</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Select a column..." /></SelectTrigger>
                          </FormControl>
                           <SelectContent>
                            {dbfColumns.map((col) => (
                              <SelectItem key={col} value={col}>{col}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                   <Button type="submit" className="w-full h-11 text-base" disabled={isCommitting}>
                    {isCommitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin"/> : <Database className="mr-2 h-5 w-5"/>}
                    {isCommitting ? 'Committing to Database...' : 'Commit to Firebase'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </>
        );
        case 3:
            return (
                 <>
                    <CardHeader className="text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-500/20 to-green-500/5 mb-4">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <CardTitle className="text-2xl">Upload Successful</CardTitle>
                        <CardDescription>Your Mauza data has been successfully imported and saved to the AGIS database.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                        <p className="text-center text-muted-foreground">You can now query this data in other parts of the application or import another dataset.</p>
                        <Button onClick={() => { setStep(1); setGeoJsonData(null); setDbfColumns([]); form.reset(); }} className="w-full max-w-sm">
                            Import Another Shapefile
                        </Button>
                    </CardContent>
                </>
            )
      default:
        return null;
    }
  };

  return (
    <div className="flex items-center justify-center h-full bg-gray-100/50 p-4 sm:p-8">
      <Card className="w-full max-w-3xl shadow-lg transition-all duration-300">
        {renderStepContent()}
      </Card>
    </div>
  );
}
