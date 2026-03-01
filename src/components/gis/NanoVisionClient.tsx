'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, FeatureGroup, GeoJSON, useMap } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import L, { type LatLngBounds } from 'leaflet';

import { useToast } from '@/hooks/use-toast';
import { useServerConfig } from '@/hooks/use-server-config';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, Download, Plus, Minus, MousePointer, ShieldAlert, Terminal } from 'lucide-react';
import { MapHeader, type BaseLayer } from './MapHeader';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

const baseLayers: BaseLayer[] = [
    {
        name: 'Google Hybrid',
        url: 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
        attribution: '&copy; Google',
        previewUrl: 'https://picsum.photos/seed/googlehybrid/400/300',
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    },
    {
        name: 'Google Satellite',
        url: 'https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
        attribution: '&copy; Google',
        previewUrl: 'https://picsum.photos/seed/googlesatellite/400/300',
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
    },
    {
        name: 'ESRI Satellite',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Tiles &copy; Esri',
        previewUrl: 'https://picsum.photos/seed/esrisat/400/300',
        subdomains: [],
    },
];

function NanoVisionControlBar({
    hasSelection,
    isProcessing,
    geoData,
    colabUrl,
    statusMessage,
    onRunScan,
    onDownload,
    onZoomIn,
    onZoomOut
}: {
    hasSelection: boolean;
    isProcessing: boolean;
    geoData: any;
    colabUrl: string;
    statusMessage: string | null;
    onRunScan: () => void;
    onDownload: () => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
}) {

    const runButtonTooltipContent = !hasSelection
        ? 'Please draw a polygon on the map to define the scan area.'
        : !colabUrl
            ? 'The AGIS Realtime engine is not connected. Please add the URL on the Server Config page.'
            : 'Extracts precise features using the AGIS Realtime engine.';

    return (
        <TooltipProvider delayDuration={300}>
            <div className="flex flex-col items-center gap-3 w-full max-w-4xl mx-auto pointer-events-none px-4">
                
                <div className="flex w-full items-end justify-center md:justify-start gap-3 pointer-events-auto">
                    
                    <Card className="hidden sm:flex flex-col rounded-xl border-slate-200/60 bg-white/90 shadow-xl backdrop-blur-xl overflow-hidden shrink-0">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button onClick={onZoomIn} variant="ghost" size="icon" className="h-10 w-10 rounded-none border-b border-slate-200/60 hover:bg-slate-100/80">
                                    <Plus className="h-5 w-5 text-slate-700" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left"><p>Zoom In</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button onClick={onZoomOut} variant="ghost" size="icon" className="h-10 w-10 rounded-none hover:bg-slate-100/80">
                                    <Minus className="h-5 w-5 text-slate-700" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left"><p>Zoom Out</p></TooltipContent>
                        </Tooltip>
                    </Card>

                    <Card className="flex-1 w-full rounded-2xl border-slate-200/60 bg-white/90 shadow-2xl backdrop-blur-xl p-2 transition-all">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            
                            <div className="flex items-center gap-3 px-2">
                                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-slate-100/80 border border-slate-200 shrink-0">
                                    <Sparkles className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-slate-800 text-sm md:text-base">Nano Vision</span>
                                        <span className="relative flex h-2.5 w-2.5">
                                            {hasSelection && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                                            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${hasSelection ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                        {!hasSelection && <MousePointer className="h-3 w-3" />}
                                        {hasSelection ? 'Area selected for extraction.' : 'Draw a polygon to begin.'}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex w-full md:w-auto items-center gap-2 bg-slate-50/50 md:bg-transparent p-2 md:p-0 rounded-xl md:rounded-none">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span tabIndex={0} className="w-full sm:w-auto">
                                            {!colabUrl ? (
                                                <Button variant="destructive" disabled className="w-full sm:w-auto h-10 md:h-9 opacity-90">
                                                    <ShieldAlert className="mr-2 h-4 w-4" />
                                                    Engine Not Connected
                                                </Button>
                                            ) : (
                                                <Button onClick={onRunScan} disabled={!hasSelection || isProcessing} className="w-full sm:w-auto h-10 md:h-9 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                                                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                                    Run High-Precision Scan
                                                </Button>
                                            )}
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs"><p className="text-xs leading-relaxed">{runButtonTooltipContent}</p></TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span tabIndex={0}>
                                            <Button onClick={onDownload} variant="outline" size="icon" className="h-10 w-10 md:h-9 md:w-9 shrink-0 bg-white shadow-sm" disabled={!geoData || isProcessing}>
                                                <Download className="h-4 w-4 text-slate-700" />
                                            </Button>
                                        </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top"><p>Download GeoJSON</p></TooltipContent>
                                </Tooltip>
                            </div>
                        </div>
                    </Card>
                </div>
                
                 {statusMessage && (
                    <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-slate-200/50 bg-white/95 px-5 py-2.5 text-sm shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-4 fade-in duration-300">
                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <Terminal className="h-4 w-4 text-primary" />}
                        <p className="text-slate-600 font-medium tracking-wide">{statusMessage}</p>
                    </div>
                )}
            </div>
        </TooltipProvider>
    );
}

function MapContent() {
  const map = useMap();
  const controlRef = useRef<HTMLDivElement>(null);
  
  const [hasSelection, setHasSelection] = useState(false);
  const [selectionBounds, setSelectionBounds] = useState<LatLngBounds | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [geoData, setGeoData] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>('Initializing...');
  
  const { colabUrl, isLoaded } = useServerConfig();
  const { toast } = useToast();
  const [activeLayer, setActiveLayer] = useState<BaseLayer>(baseLayers[0]);

  useEffect(() => {
    if (controlRef.current) {
      L.DomEvent.disableClickPropagation(controlRef.current);
      L.DomEvent.disableScrollPropagation(controlRef.current);
    }
  }, []);

  useEffect(() => {
    if (isLoaded) {
        if (colabUrl) {
            setStatusMessage('Nano Vision Engine ready. Draw a polygon to begin.');
        } else {
            setStatusMessage('AGIS Engine is not connected. Configure it on the "Server Config" page.');
        }
    }
  }, [isLoaded, colabUrl]);

  const handleCreated = (e: any) => {
    const layer = e.layer;
    setSelectionBounds(layer.getBounds());
    setHasSelection(true);
    setStatusMessage('Area selected. Ready for high-precision extraction.');
    setGeoData(null);
  };

  const handleDeleted = () => {
    setHasSelection(false);
    setSelectionBounds(null);
    setGeoData(null);
    if(isLoaded && colabUrl) {
        setStatusMessage('Engine ready. Draw a new polygon to begin.');
    } else if (isLoaded) {
        setStatusMessage('AGIS Engine is not connected.');
    }
  };

  const runNanoVisionExtraction = async () => {
    if (!selectionBounds || !colabUrl) {
      const description = !colabUrl 
        ? 'Please connect the AGIS Realtime engine in the Server Config page.'
        : 'Please draw a polygon on the map to define the extraction area.';
      toast({ variant: "destructive", title: "Cannot Start Extraction", description });
      return;
    }
    
    setIsProcessing(true);
    setGeoData(null);
    
    try {
        const bbox = [
            selectionBounds.getWest(),
            selectionBounds.getSouth(),
            selectionBounds.getEast(),
            selectionBounds.getNorth()
        ];

        setStatusMessage("Contacting AGIS Engine: Extracting building footprints...");
        const buildingsResponse = await fetch(`${colabUrl}/extract_overture`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bbox, type: 'building' })
        });
        if (!buildingsResponse.ok) {
            const errorData = await buildingsResponse.json().catch(() => ({details: `Server returned status ${buildingsResponse.status}`}));
            throw new Error(`Failed to fetch building data: ${errorData.details || 'Unknown error'}`);
        }
        const buildingsData = await buildingsResponse.json();
        buildingsData.features.forEach((f: any) => f.properties.entity_type = 'building');

        setStatusMessage("Contacting AGIS Engine: Extracting road networks...");
        const roadsResponse = await fetch(`${colabUrl}/extract_overture`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bbox, type: 'segment' })
        });
        if (!roadsResponse.ok) {
            const errorData = await roadsResponse.json().catch(() => ({details: `Server returned status ${roadsResponse.status}`}));
            throw new Error(`Failed to fetch road data: ${errorData.details || 'Unknown error'}`);
        }
        const roadsData = await roadsResponse.json();
        roadsData.features.forEach((f: any) => f.properties.entity_type = 'road');

        const mergedFeatures = [...buildingsData.features, ...roadsData.features];
        const mergedGeoJson = {
            type: "FeatureCollection",
            features: mergedFeatures
        };

        setGeoData(mergedGeoJson);
        setStatusMessage(`Extraction complete. Found ${mergedFeatures.length} total features.`);
        toast({ title: "High-Precision Extraction Complete", description: `Found ${buildingsData.features.length} buildings and ${roadsData.features.length} roads.` });

    } catch (error: any) {
        setStatusMessage(`Error: ${error.message}`);
        toast({ variant: "destructive", title: "Extraction Error", description: error.message });
    } finally {
        setIsProcessing(false);
    }
  };
  
  const handleDownload = () => {
    if (!geoData) return;
    const blob = new Blob([JSON.stringify(geoData)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "nano_vision_output.geojson";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <MapHeader layers={baseLayers} activeLayer={activeLayer} onLayerSelect={setActiveLayer} />
      
      <TileLayer
        key={activeLayer.url}
        url={activeLayer.url}
        attribution={activeLayer.attribution}
        subdomains={activeLayer.subdomains || ''}
        noWrap={true}
      />
      
      <FeatureGroup>
        <EditControl 
          position="bottomright" 
          onCreated={handleCreated}
          onEdited={(e) => {
            const layers = e.layers;
            layers.eachLayer((layer: any) => {
              setSelectionBounds(layer.getBounds());
              setStatusMessage('Selection updated. Ready for high-precision extraction.');
            });
          }}
          onDeleted={handleDeleted} 
          draw={{ 
            polygon: { shapeOptions: { color: '#16a34a', weight: 2, fillOpacity: 0.1 } },
            rectangle: { shapeOptions: { color: '#16a34a', weight: 2, fillOpacity: 0.1 } },
            circle: false, marker: false, polyline: false, circlemarker: false
          }}
          edit={{ edit: true, remove: true }}
        />
      </FeatureGroup>

      {geoData && (
        <GeoJSON 
          data={geoData} 
          style={(feature) => {
            if (feature?.properties?.entity_type === 'road') {
                return {
                    color: '#ef4444', // Red for roads
                    weight: 3,
                    opacity: 0.9,
                };
            }
            // Default for buildings
            return {
                color: '#3b82f6', // Blue for buildings
                weight: 2,
                opacity: 0.9,
                fillColor: '#60a5fa',
                fillOpacity: 0.5
            };
          }} 
        />
      )}

      {!isLoaded ? (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1001] w-full max-w-4xl flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div ref={controlRef} className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1001] w-full max-w-4xl">
            <NanoVisionControlBar
                hasSelection={hasSelection}
                isProcessing={isProcessing}
                geoData={geoData}
                colabUrl={colabUrl}
                statusMessage={statusMessage}
                onRunScan={runNanoVisionExtraction}
                onDownload={handleDownload}
                onZoomIn={() => map.zoomIn()}
                onZoomOut={() => map.zoomOut()}
            />
        </div>
      )}
    </>
  );
}

export default function NanoVisionClient() {
  return (
    <MapContainer
      center={[31.46, 74.38]}
      zoom={17}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
    >
      <MapContent />
    </MapContainer>
  );
}
