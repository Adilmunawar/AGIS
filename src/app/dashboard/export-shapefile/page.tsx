'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import JSZip from 'jszip';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Download, MapIcon, Layers, Replace, FileJson, FileArchive, FileCode, Route, Settings, Sheet, Upload, ArrowRightLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import * as turf from '@turf/turf';
import L, { LatLngBoundsExpression } from 'leaflet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

// Conversion libraries
import { kml as toKml } from '@tmcw/togeojson';
import tokml from 'tokml';
import togpx from 'togpx';
import Papa from 'papaparse';


// Dynamically import map components to avoid SSR issues
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import { useDebounce } from '@/hooks/use-debounce';

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
const FileUploadArea = ({ onDrop, onDrag, isDragging, onChange, accept, multiple = false, title, format, icon }: any) => (
  <div
    onDragEnter={(e) => onDrag(e, 'enter')}
    onDragLeave={(e) => onDrag(e, 'leave')}
    onDragOver={(e) => onDrag(e, 'over')}
    onDrop={onDrop}
    className={cn(
      'relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg transition-colors duration-200 cursor-pointer group',
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
    {icon}
    <p className="mt-2 text-center text-sm text-muted-foreground">{title}</p>
    <p className="text-xs text-muted-foreground font-semibold mt-1">Allowed: {format}</p>
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

const formatOptions = [
    { value: 'geojson', label: 'GeoJSON', icon: FileJson, accepts: ".geojson,application/json" },
    { value: 'shapefile', label: 'Shapefile (.zip)', icon: FileArchive, accepts: ".shp,.shx,.dbf,.prj,.sbn,.sbx,.cpg,.xml,.zip,application/zip", multiple: true },
    { value: 'kml', label: 'KML', icon: FileCode, accepts: ".kml" },
    { value: 'gpx', label: 'GPX', icon: Route, accepts: ".gpx" },
    { value: 'csv', label: 'CSV', icon: Sheet, accepts: ".csv,text/csv" }
];

export default function DataConverterPage() {
  const { toast } = useToast();
  
  // --- STATE MANAGEMENT ---
  const [inputFormat, setInputFormat] = useState('geojson');
  const [outputFormat, setOutputFormat] = useState('shapefile');
  const [sourceFiles, setSourceFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const [processedGeoJson, setProcessedGeoJson] = useState<any | null>(null);
  const [simplifiedGeoJson, setSimplifiedGeoJson] = useState<any | null>(null);

  const [csvLatField, setCsvLatField] = useState('latitude');
  const [csvLonField, setCsvLonField] = useState('longitude');
  
  const [simplifyTolerance, setSimplifyTolerance] = useState(0);
  const debouncedTolerance = useDebounce(simplifyTolerance, 300);

  // --- WORKER REFS (for existing Shapefile logic) ---
  const exportWorkerRef = useRef<Worker | null>(null);
  const shapefileWorkerRef = useRef<Worker | null>(null);

  // --- WORKER INITIALIZATION ---
  useEffect(() => {
    // GeoJSON -> SHP worker
    exportWorkerRef.current = new Worker('/workers/exportWorker.js');
    exportWorkerRef.current.onmessage = async (e: MessageEvent) => {
      const { status, message, action, payload } = e.data;
      if (status === 'info') toast({ title: 'Python Engine', description: message });
      else if (status === 'success' && action === 'CONVERT_SHAPEFILE') {
        toast({ title: 'Conversion Successful', description: 'Zipping files for download.' });
        try {
          const { shp, shx, dbf, prj } = payload;
          const zip = new JSZip();
          zip.file('export.shp', shp);
          zip.file('export.shx', shx);
          zip.file('export.dbf', dbf);
          zip.file('export.prj', prj);
          const zipBlob = await zip.generateAsync({ type: 'blob' });
          downloadBlob(zipBlob, `converted.zip`);
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
    
    // SHP -> GeoJSON worker
    shapefileWorkerRef.current = new Worker('/workers/shapefileWorker.js');
    shapefileWorkerRef.current.onmessage = (e: MessageEvent) => {
        const { status, geojson, error } = e.data;
        if (status === 'success' && geojson) {
            setProcessedGeoJson(geojson);
        } else {
            toast({ variant: 'destructive', title: 'Processing Error', description: error || 'Failed to parse the shapefile.' });
            setProcessedGeoJson(null);
        }
        setIsProcessing(false);
    };

    return () => {
        exportWorkerRef.current?.terminate();
        shapefileWorkerRef.current?.terminate();
    };
  }, [toast]);
  
  // --- GEOMETRY SIMPLIFICATION ---
  useEffect(() => {
    if (!processedGeoJson) {
      setSimplifiedGeoJson(null);
      return;
    }
    if (debouncedTolerance === 0) {
      setSimplifiedGeoJson(processedGeoJson);
      return;
    }
    try {
        const simplified = turf.simplify(processedGeoJson, { tolerance: debouncedTolerance, highQuality: true });
        setSimplifiedGeoJson(simplified);
    } catch(e) {
        console.error("Simplification error:", e);
        setSimplifiedGeoJson(processedGeoJson); // fallback to original
    }
  }, [processedGeoJson, debouncedTolerance]);


  // --- DYNAMIC UI LOGIC ---
  const selectedInputFormat = useMemo(() => formatOptions.find(f => f.value === inputFormat), [inputFormat]);
  const allowedOutputFormats = useMemo(() => {
      if (inputFormat === 'shapefile' || inputFormat === 'geojson') return formatOptions.filter(f => f.value !== inputFormat);
      return formatOptions.filter(f => f.value === 'geojson'); // Can only convert KML/GPX/CSV to GeoJSON for now
  }, [inputFormat]);

  useEffect(() => {
    setOutputFormat(allowedOutputFormats[0].value);
  }, [inputFormat, allowedOutputFormats]);
  
  const featureCount = useMemo(() => simplifiedGeoJson?.features?.length || processedGeoJson?.features?.length || 0, [processedGeoJson, simplifiedGeoJson]);

  const uploadTitle = useMemo(() => {
    if (isDragging) return "Drop your file(s) here";
    if (inputFormat === 'shapefile') {
        return `Drag & drop Shapefile components or a single .zip file, or click`;
    }
    return `Drag & drop ${selectedInputFormat?.label} files, or click`;
}, [isDragging, inputFormat, selectedInputFormat]);

  const uploadFormatString = useMemo(() => {
      if (inputFormat === 'shapefile') {
          return ".shp, .dbf, .zip, etc.";
      }
      return selectedInputFormat?.accepts;
  }, [inputFormat, selectedInputFormat]);


  // --- FILE HANDLING ---
  const resetState = () => {
    setSourceFiles([]);
    setProcessedGeoJson(null);
    setSimplifiedGeoJson(null);
    setSimplifyTolerance(0);
    setIsProcessing(false);
  }
  
  const handleFileChange = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    resetState();
    setSourceFiles(Array.from(files));
    setIsProcessing(true);
    toast({ title: "Processing Upload", description: "Reading and converting input file..." });

    const firstFile = files[0];
    
    // --- NEW ZIP HANDLING LOGIC ---
    if (inputFormat === 'shapefile' && firstFile.name.toLowerCase().endsWith('.zip')) {
        if (files.length > 1) {
            toast({ title: "Multiple Files Detected", description: "Processing the first zip file only." });
        }
        try {
            const zip = new JSZip();
            const content = await zip.loadAsync(firstFile);
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
                            const blob = new Blob([buffer]);
                            const file = new File([blob], cleanFileName);
                            shpFiles.push(file);
                        })
                    );
                }
            });

            await Promise.all(filePromises);

            if (!requiredExts.every(ext => foundExts.has(ext))) {
                throw new Error("The zip file is missing required shapefile components (.shp, .shx, .dbf).");
            }

            shapefileWorkerRef.current?.postMessage({ files: shpFiles, layer: 'parcels' });
            return; // Worker will handle isProcessing state

        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Zip Processing Error', description: e.message });
            resetState();
            setIsProcessing(false);
            return;
        }
    }

    // --- REFACTORED LOGIC FOR OTHER FILE TYPES ---
    try {
        let geojson: any;
        switch (inputFormat) {
            case 'geojson':
                geojson = JSON.parse(await firstFile.text());
                break;
            case 'kml':
                const kmlText = await firstFile.text();
                geojson = toKml(new DOMParser().parseFromString(kmlText, 'text/xml'));
                break;
            case 'gpx':
                 const gpxText = await firstFile.text();
                 geojson = togpx(new DOMParser().parseFromString(gpxText, 'text/xml'));
                break;
            case 'csv':
                 Papa.parse(await firstFile.text(), {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        try {
                            const features = results.data.map((row: any) => {
                                const lat = parseFloat(row[csvLatField]);
                                const lon = parseFloat(row[csvLonField]);
                                if (isNaN(lat) || isNaN(lon)) return null;
                                return turf.point([lon, lat], row);
                            }).filter(Boolean);
                            geojson = turf.featureCollection(features as any);
                            if (geojson.features.length === 0) {
                                throw new Error("No valid coordinates found in CSV. Check column names.");
                            }
                            setProcessedGeoJson(geojson);
                            setIsProcessing(false);
                        } catch (e: any) {
                            toast({ variant: 'destructive', title: 'File Processing Error', description: e.message });
                            resetState();
                        }
                    },
                    error: (err) => {
                        throw new Error(`CSV parsing error: ${err.message}`);
                    }
                });
                return; // PapaParse is async and will handle state updates
            case 'shapefile':
                // Handles multi-file drop
                shapefileWorkerRef.current?.postMessage({ files: Array.from(files), layer: 'parcels' });
                return; // Worker will handle setting state
            default:
                throw new Error("Unsupported input format");
        }
        setProcessedGeoJson(geojson);
        
    } catch(e: any) {
        toast({ variant: 'destructive', title: 'File Processing Error', description: e.message });
        resetState();
    } finally {
        if(inputFormat !== 'shapefile' && inputFormat !== 'csv') {
          setIsProcessing(false);
        }
    }
  }, [inputFormat, csvLatField, csvLonField, toast]);
  
  // --- CONVERSION LOGIC ---
  const downloadBlob = (blob: Blob, filename: string) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };
  
  const handleConvert = () => {
    if (!simplifiedGeoJson) {
        toast({ variant: 'destructive', title: 'No Data', description: 'Please upload a file first.' });
        return;
    }
    
    setIsProcessing(true);
    toast({ title: `Converting to ${outputFormat.toUpperCase()}`, description: 'Please wait...' });

    try {
        let blob: Blob;
        let filename: string;
        
        switch (outputFormat) {
            case 'geojson':
                blob = new Blob([JSON.stringify(simplifiedGeoJson, null, 2)], { type: "application/json" });
                filename = 'converted.geojson';
                break;
            case 'kml':
                const kmlString = tokml(simplifiedGeoJson);
                blob = new Blob([kmlString], { type: "application/vnd.google-earth.kml+xml" });
                filename = 'converted.kml';
                break;
            case 'gpx':
                const gpxString = togpx(simplifiedGeoJson);
                blob = new Blob([gpxString], { type: 'application/gpx+xml' });
                filename = 'converted.gpx';
                break;
            case 'csv':
                const csvData = simplifiedGeoJson.features.map((f: any) => ({
                    ...f.properties,
                    longitude: f.geometry.coordinates[0],
                    latitude: f.geometry.coordinates[1]
                }));
                const csvString = Papa.unparse(csvData);
                blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
                filename = 'converted.csv';
                break;
            case 'shapefile':
                 exportWorkerRef.current?.postMessage({
                    action: 'CONVERT_SHAPEFILE',
                    payload: JSON.stringify(simplifiedGeoJson),
                });
                return; // Worker handles the rest
            default:
                throw new Error("Unsupported output format selected.");
        }
        
        downloadBlob(blob, filename);
        
    } catch(e: any) {
        toast({ variant: 'destructive', title: 'Conversion Error', description: e.message });
    } finally {
        if (outputFormat !== 'shapefile') setIsProcessing(false);
    }
  };

  // --- Drag & Drop Handlers ---
  const onDrag = (event: React.DragEvent, type: 'enter' | 'leave' | 'over') => { event.preventDefault(); event.stopPropagation(); setIsDragging(type === 'enter' || type === 'over'); };
  const onDrop = (event: React.DragEvent) => { event.preventDefault(); event.stopPropagation(); setIsDragging(false); handleFileChange(event.dataTransfer.files); };

  return (
    <div className="flex h-full w-full bg-muted/30">
        <aside className="w-[450px] border-r bg-background flex flex-col h-full">
            <header className="p-4 border-b">
                <h1 className="text-xl font-bold tracking-tight">GIS Data Converter</h1>
                <p className="text-sm text-muted-foreground">Advanced conversion between geospatial formats.</p>
            </header>
            
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-6">
                    
                    <div className="space-y-3">
                        <Label className="flex items-center gap-2 text-base font-semibold">
                           <ArrowRightLeft className="h-5 w-5 text-primary" />
                           1. Select Conversion Formats
                        </Label>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>From</Label>
                                <Select value={inputFormat} onValueChange={v => { setInputFormat(v); resetState(); }}>
                                    <SelectTrigger><SelectValue placeholder="Select input format..." /></SelectTrigger>
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
                            <div className="space-y-1.5">
                                <Label>To</Label>
                                <Select value={outputFormat} onValueChange={setOutputFormat}>
                                    <SelectTrigger><SelectValue placeholder="Select output format..." /></SelectTrigger>
                                    <SelectContent>
                                        {allowedOutputFormats.map(f => (
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
                        </div>
                    </div>
                    
                    <Separator />

                    <div className="space-y-3">
                        <Label className="flex items-center gap-2 text-base font-semibold">
                           <Upload className="h-5 w-5 text-primary" />
                           2. Upload Source Data
                        </Label>
                        {sourceFiles.length > 0 ? (
                            <FilePreview
                                files={sourceFiles}
                                onRemove={resetState}
                                icon={selectedInputFormat && <selectedInputFormat.icon className="h-6 w-6" />}
                                featureCount={featureCount}
                            />
                        ) : (
                            <FileUploadArea 
                                onDrag={onDrag}
                                onDrop={onDrop}
                                isDragging={isDragging}
                                onChange={handleFileChange}
                                accept={selectedInputFormat?.accepts}
                                multiple={selectedInputFormat?.multiple}
                                title={uploadTitle}
                                format={uploadFormatString}
                                icon={selectedInputFormat && <selectedInputFormat.icon className="h-10 w-10 text-gray-400 group-hover:text-primary transition-colors" />}
                            />
                        )}
                    </div>
                    
                    {(inputFormat === 'csv' || processedGeoJson) && <Separator />}
                    {(inputFormat === 'csv' || processedGeoJson) && (
                        <div className="space-y-3">
                             <Label className="flex items-center gap-2 text-base font-semibold">
                                <Settings className="h-5 w-5 text-primary" />
                                3. Configure (Optional)
                            </Label>
                            {inputFormat === 'csv' && (
                                 <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="lat-field">Latitude Field</Label>
                                        <Input id="lat-field" value={csvLatField} onChange={e => setCsvLatField(e.target.value)} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="lon-field">Longitude Field</Label>
                                        <Input id="lon-field" value={csvLonField} onChange={e => setCsvLonField(e.target.value)} />
                                    </div>
                                </div>
                            )}
                            {processedGeoJson && (
                                <div className="space-y-2">
                                    <Label>Geometry Simplification (Tolerance: {simplifyTolerance})</Label>
                                    <div className="flex items-center gap-2">
                                        <Slider value={[simplifyTolerance]} onValueChange={([v]) => setSimplifyTolerance(v)} min={0} max={0.01} step={0.0001} />
                                    </div>
                                    <p className="text-xs text-muted-foreground">Higher values reduce detail and file size. Useful for web maps. Set to 0 to disable.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </ScrollArea>
            
             <footer className="p-4 border-t bg-background">
                 <Button onClick={handleConvert} disabled={isProcessing || !processedGeoJson} className="w-full h-12 text-base">
                    {isProcessing ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Converting...</> : <><Replace className="mr-2 h-5 w-5"/> Convert & Download</>}
                </Button>
            </footer>
        </aside>
        <main className="flex-1 h-full bg-background relative">
            {simplifiedGeoJson ? (
                <MapPreview data={simplifiedGeoJson} />
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
