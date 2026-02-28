'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, FeatureGroup, GeoJSON, useMap } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import L, { type LatLng, type LatLngBounds } from 'leaflet';
import html2canvas from 'html2canvas';

import { useToast } from '@/hooks/use-toast';
import { useGeminiConfig } from '@/hooks/use-gemini-config';

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
    geminiApiKey,
    statusMessage,
    onRunScan,
    onDownload,
    onZoomIn,
    onZoomOut
}: {
    hasSelection: boolean;
    isProcessing: boolean;
    geoData: any;
    geminiApiKey: string;
    statusMessage: string | null;
    onRunScan: () => void;
    onDownload: () => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
}) {

    const runButtonTooltipContent = !hasSelection
        ? 'Please draw a polygon on the map to define the scan area.'
        : !geminiApiKey
            ? 'A Gemini API Key is required. Please add your key on the Server Config page.'
            : 'Scans the selected region using the Gemini 2.5 Flash vision model.';

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
                                        {hasSelection ? 'Area selected for digitization.' : 'Draw a polygon to begin.'}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex w-full md:w-auto items-center gap-2 bg-slate-50/50 md:bg-transparent p-2 md:p-0 rounded-xl md:rounded-none">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span tabIndex={0} className="w-full sm:w-auto">
                                            {!geminiApiKey ? (
                                                <Button variant="destructive" disabled className="w-full sm:w-auto h-10 md:h-9 opacity-90">
                                                    <ShieldAlert className="mr-2 h-4 w-4" />
                                                    API Key Missing
                                                </Button>
                                            ) : (
                                                <Button onClick={onRunScan} disabled={!hasSelection || isProcessing} className="w-full sm:w-auto h-10 md:h-9 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                                                    {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                                    Run Nano Vision
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
                    <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-slate-700 bg-slate-800/95 px-5 py-2.5 text-sm shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-4 fade-in duration-300">
                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin text-teal-400" /> : <Terminal className="h-4 w-4 text-teal-400" />}
                        <p className="text-slate-100 font-medium tracking-wide">{statusMessage}</p>
                    </div>
                )}
            </div>
        </TooltipProvider>
    );
}

function MapContent() {
  const map = useMap();
  const controlRef = useRef<HTMLDivElement>(null);
  
  const [polygonCoords, setPolygonCoords] = useState<string | null>(null);
  const [selectionBounds, setSelectionBounds] = useState<LatLngBounds | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [geoData, setGeoData] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>('Initializing...');
  
  const { geminiApiKey, isLoaded } = useGeminiConfig();
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
        if (geminiApiKey) {
            setStatusMessage('Nano Vision ready. Draw a polygon to begin.');
        } else {
            setStatusMessage('Gemini API Key is missing. Configure it on the "Server Config" page.');
        }
    }
  }, [isLoaded, geminiApiKey]);

  const handleCreated = (e: any) => {
    const layer = e.layer;
    setSelectionBounds(layer.getBounds());
    // For simplicity, we just use bounds for Nano Vision, not complex polygon strings.
    setPolygonCoords("selected"); // Use a simple truthy value to indicate a selection exists.
    setStatusMessage('Area selected. Ready for digitization.');
    setGeoData(null);
  };

  const handleDeleted = () => {
    setPolygonCoords(null);
    setSelectionBounds(null);
    setGeoData(null);
    if(isLoaded && geminiApiKey) {
        setStatusMessage('Engine ready. Draw a new polygon to begin.');
    } else if (isLoaded) {
        setStatusMessage('Gemini API Key is missing.');
    }
  };

  const runNanoVisionExtraction = async () => {
    if (!selectionBounds || !geminiApiKey) {
      const description = !geminiApiKey 
        ? 'Please add your Gemini API Key in the Server Config page.'
        : 'Please draw a polygon on the map to define the scan area.';
      toast({ variant: "destructive", title: "Cannot Start Scan", description });
      return;
    }
    
    setIsProcessing(true);
    setGeoData(null);
    setStatusMessage("Capturing satellite data for Nano Vision...");
    toast({ title: "Capturing Satellite Data", description: "Preparing image for Nano Vision..." });

    try {
        const mapElement = document.querySelector('.leaflet-container') as HTMLElement;
        if (!mapElement) throw new Error("Map container element not found.");

        const canvas = await html2canvas(mapElement, { 
            useCORS: true, 
            allowTaint: false,
            scale: 1, // Keep scale 1 to maintain 1:1 pixel/coordinate ratio
            logging: false
        });
        const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);
        
        const bounds = {
            north: selectionBounds.getNorth(),
            south: selectionBounds.getSouth(),
            east: selectionBounds.getEast(),
            west: selectionBounds.getWest()
        };

        setStatusMessage("Nano Vision Engine: Analyzing spatial data with Gemini 2.5 Flash...");
        toast({ title: "Nano Vision Engine", description: "Analyzing spatial data with Gemini 2.5 Flash..." });

        const response = await fetch('/api/gemini-digitize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64, bounds, apiKey: geminiApiKey })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || "Vision Engine Failed");
        }

        const result = await response.json();
        setGeoData(result);
        setStatusMessage(`Nano Vision complete. Extracted ${result.features.length} features.`);
        toast({ title: "Map Digitized via Nano Vision", description: `Extracted ${result.features.length} features.` });

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
        crossOrigin="anonymous"
      />
      
      <FeatureGroup>
        <EditControl 
          position="bottomright" 
          onCreated={handleCreated}
          onEdited={(e) => {
            const layers = e.layers;
            layers.eachLayer((layer: any) => {
              setSelectionBounds(layer.getBounds());
              setStatusMessage('Selection updated. Ready for digitization.');
            });
          }}
          onDeleted={handleDeleted} 
          draw={{ 
            polygon: { shapeOptions: { color: '#8b5cf6', weight: 2, fillOpacity: 0.1 } },
            rectangle: { shapeOptions: { color: '#8b5cf6', weight: 2, fillOpacity: 0.1 } },
            circle: false, marker: false, polyline: false, circlemarker: false
          }}
          edit={{ edit: true, remove: true }}
        />
      </FeatureGroup>

      {geoData && (
        <GeoJSON 
          data={geoData} 
          style={(feature) => {
            // Style differently based on what the API detected
            if (feature?.properties?.type === 'road') {
                return {
                    color: '#eab308', // Yellow for roads
                    weight: 4,
                    opacity: 1,
                    dashArray: '5, 5'
                };
            }
            // Default styling for buildings
            return {
                color: '#f43f5e', // Rose for buildings
                weight: 2,
                opacity: 0.9,
                fillColor: '#fb7185',
                fillOpacity: 0.4
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
                hasSelection={!!polygonCoords}
                isProcessing={isProcessing}
                geoData={geoData}
                geminiApiKey={geminiApiKey}
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
