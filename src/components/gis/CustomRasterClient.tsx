'use client';

import React, { useState, useCallback } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Image as ImageIcon, CheckCircle, AlertTriangle, UploadCloud, File as FileIcon, Info } from 'lucide-react';
import { LocationSearch } from './LocationSearch';
import { cn } from '@/lib/utils';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type AssetVis = {
  name: string;
  url: string;
};

export default function CustomRasterClient() {
  // GEE Asset ID state
  const [assetId, setAssetId] = useState('');
  const [assetTiles, setAssetTiles] = useState<Record<string, AssetVis> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVis, setSelectedVis] = useState<string | null>(null);

  // Direct Upload State
  const [directUploadFile, setDirectUploadFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleLoadAsset = async () => {
    if (!assetId) {
      setError('Please enter a Google Earth Engine Asset ID.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setAssetTiles(null);
    setSelectedVis(null);

    try {
      const res = await fetch(`/api/gee/tiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId }),
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        setAssetTiles(data.tiles);
        const firstVisKey = Object.keys(data.tiles)[0];
        if (firstVisKey) {
          setSelectedVis(firstVisKey);
        }
      } else {
        throw new Error(data.error || 'Failed to load asset.');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const activeTileUrl = selectedVis && assetTiles ? assetTiles[selectedVis]?.url : null;

  // --- Direct Upload Handlers ---
  const handleFileChange = (files: FileList | null) => {
    if (files && files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.tif') || file.name.endsWith('.tiff')) {
        setDirectUploadFile(file);
      } else {
        setError('Please upload a valid .tif or .tiff file.');
        // clear the error after a few seconds
        setTimeout(() => setError(null), 4000);
      }
    }
  };

  const onDrag = useCallback((event: React.DragEvent, type: 'enter' | 'leave' | 'over') => {
    event.preventDefault();
    event.stopPropagation();
    if (type === 'enter' || type === 'over') setIsDragging(true); else setIsDragging(false);
  }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    handleFileChange(event.dataTransfer.files);
  }, []);

  return (
    <div className="absolute inset-0 bg-background overflow-hidden">
      <MapContainer center={[30.6682, 73.1114]} zoom={12} zoomControl={false} style={{ height: '100%', width: '100%', backgroundColor: '#1a1a1a' }}>
        <TileLayer attribution='&copy; Google' url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}" zIndex={1} />
        
        {activeTileUrl && (
          <TileLayer key={activeTileUrl} url={activeTileUrl} opacity={0.9} zIndex={10} />
        )}

        <div className="absolute top-4 left-4 z-[1000]">
          <LocationSearch />
        </div>

        <Card className="absolute top-4 right-4 z-[1000] w-96 bg-card/80 backdrop-blur-md shadow-2xl border-border/50">
            <CardHeader className="p-4 border-b border-border/50">
                <CardTitle className="flex items-center gap-2 text-base">
                    <ImageIcon className="h-5 w-5 text-primary" />
                    Custom Raster Explorer
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
                    <AccordionItem value="item-1" className="border-b">
                        <AccordionTrigger className="p-4 text-sm font-semibold hover:no-underline">
                           GEE Asset ID (Recommended)
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4 space-y-4">
                           <p className="text-xs text-muted-foreground -mt-2">Upload large rasters to your GEE account first for high-performance tiling.</p>
                            <div className="space-y-2">
                              <Label htmlFor="asset-id" className="font-semibold text-xs">GEE Asset ID</Label>
                              <div className="flex gap-2">
                                <Input 
                                  id="asset-id" 
                                  placeholder="e.g., users/username/asset_name"
                                  value={assetId}
                                  onChange={(e) => setAssetId(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleLoadAsset()}
                                  disabled={isLoading}
                                />
                                <Button onClick={handleLoadAsset} disabled={isLoading || !assetId}>
                                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Load'}
                                </Button>
                              </div>
                            </div>
                            {assetTiles && (
                              <div className="space-y-3 pt-2 animate-in fade-in duration-300">
                                  <div className="flex items-center gap-2">
                                      <CheckCircle className="h-5 w-5 text-green-500"/>
                                      <Label className="font-semibold text-xs">Visualizations</Label>
                                  </div>
                                  <RadioGroup value={selectedVis || ''} onValueChange={setSelectedVis}>
                                      {Object.entries(assetTiles).map(([key, vis]) => (
                                          <div key={key} className="flex items-center space-x-2">
                                              <RadioGroupItem value={key} id={key} />
                                              <Label htmlFor={key} className="text-sm font-medium cursor-pointer">{vis.name}</Label>
                                          </div>
                                      ))}
                                  </RadioGroup>
                              </div>
                            )}
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2" className="border-b-0">
                        <AccordionTrigger className="p-4 text-sm font-semibold hover:no-underline">
                           Direct Upload (UI Only)
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4 space-y-3">
                             <div
                                onDragEnter={(e) => onDrag(e, 'enter')}
                                onDragLeave={(e) => onDrag(e, 'leave')}
                                onDragOver={(e) => onDrag(e, 'over')}
                                onDrop={onDrop}
                                className={cn(
                                'relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg transition-colors duration-200',
                                isDragging ? 'border-primary bg-primary/10' : 'border-gray-300 bg-gray-50'
                                )}
                              >
                                <input
                                  type="file"
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  accept=".tif,.tiff"
                                  onChange={(e) => handleFileChange(e.target.files)}
                                />
                                <UploadCloud className={cn("h-8 w-8", isDragging ? 'text-primary' : 'text-gray-400')} />
                                <p className="mt-2 text-center text-xs text-muted-foreground">
                                  {isDragging ? "Drop your .tif file" : "Drag & drop a .tif file, or click"}
                                </p>
                              </div>

                              {directUploadFile && (
                                <div className="flex flex-col items-center justify-center p-4 border rounded-lg bg-gray-50 animate-in fade-in duration-300">
                                  <FileIcon className="h-8 w-8 text-primary" />
                                  <p className="text-sm font-medium mt-2">{directUploadFile.name}</p>
                                   <Button variant="link" size="sm" className="text-red-500 h-auto p-1 text-xs" onClick={() => setDirectUploadFile(null)}>
                                      Remove
                                    </Button>
                                </div>
                              )}
                              
                              <div className="flex items-start gap-3 text-destructive bg-destructive/10 p-3 rounded-lg mt-2">
                                <Info className="h-5 w-5 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-semibold text-xs">Backend Not Implemented</p>
                                    <p className="text-xs">Direct raster processing requires a powerful backend. For now, please use the GEE Asset ID method for visualization.</p>
                                </div>
                              </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
            {error && (
               <div className="absolute bottom-0 left-0 right-0 p-2 bg-destructive/90 text-destructive-foreground text-center text-xs font-semibold animate-in slide-in-from-bottom-2">
                  {error}
              </div>
            )}
        </Card>
      </MapContainer>
    </div>
  );
}
