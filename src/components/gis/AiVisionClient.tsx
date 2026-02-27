'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, FeatureGroup, GeoJSON, useMap } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import L, { type LatLng, type LatLngBounds } from 'leaflet';
import { useServerConfig } from '@/hooks/use-server-config';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ScanSearch, Download, Plus, Minus, Cpu, MousePointer, ShieldAlert } from 'lucide-react';
import { MapHeader, type BaseLayer } from './MapHeader';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

// Base Layers definition (same as other pages for consistency)
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

// A dedicated control bar component for the AI Vision page workflow.
function AiVisionControlBar({
    hasSelection,
    isProcessing,
    geoData,
    colabUrl,
    statusMessage,
    targetPrompt,
    onPromptChange,
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
    targetPrompt: string;
    onPromptChange: (value: string) => void;
    onRunScan: () => void;
    onDownload: () => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
}) {
    const runButtonTooltipContent = !hasSelection
        ? 'Please draw a polygon on the map to define the scan area.'
        : !colabUrl
            ? 'AI Vision engine is unavailable. Please configure it on the Server Config page.'
            : 'Scans the selected region for the target object using the Meta SAM model.';

    return (
        <TooltipProvider delayDuration={300}>
            <div className="flex flex-col items-center gap-3 w-full max-w-4xl mx-auto pointer-events-none px-4">
                
                {/* Main Interface Row */}
                <div className="flex w-full items-end justify-center md:justify-start gap-3 pointer-events-auto">
                    
                    {/* Zoom Controls */}
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

                    {/* Main Control Panel */}
                    <Card className="flex-1 w-full rounded-2xl border-slate-200/60 bg-white/90 shadow-2xl backdrop-blur-xl p-2 transition-all">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            
                            {/* Left Section: Title & Status */}
                            <div className="flex items-center gap-3 px-2">
                                <div className="flex items-center justify-center h-10 w-10 rounded-full bg-slate-100/80 border border-slate-200 shrink-0">
                                    <ScanSearch className="h-5 w-5 text-slate-600" />
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-slate-800 text-sm md:text-base">AI Vision</span>
                                        <span className="relative flex h-2.5 w-2.5">
                                            {hasSelection && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                                            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${hasSelection ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                        {!hasSelection && <MousePointer className="h-3 w-3" />}
                                        {hasSelection ? 'Area selected for scan.' : 'Draw a polygon to begin.'}
                                    </p>
                                </div>
                            </div>
                            
                            {/* Right Section: Inputs & Actions */}
                            <div className="flex w-full md:w-auto flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-50/50 md:bg-transparent p-2 md:p-0 rounded-xl md:rounded-none">
                                <div className="relative">
                                    <Label htmlFor="target-prompt" className="absolute -top-2 left-3 text-xs bg-slate-50/50 md:bg-white/90 px-1 text-slate-500">Target Object</Label>
                                    <Input
                                        id="target-prompt"
                                        value={targetPrompt}
                                        onChange={(e) => onPromptChange(e.target.value)}
                                        placeholder="e.g., building, car"
                                        className="h-10 md:h-9 w-full sm:w-40 bg-white"
                                        disabled={isProcessing}
                                    />
                                </div>

                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span tabIndex={0} className="w-full sm:w-auto">
                                                {!colabUrl ? (
                                                    <Button variant="destructive" disabled className="w-full sm:w-auto h-10 md:h-9 opacity-90">
                                                        <ShieldAlert className="mr-2 h-4 w-4" />
                                                        Server Offline
                                                    </Button>
                                                ) : (
                                                    <Button onClick={onRunScan} disabled={!hasSelection || isProcessing} className="w-full sm:w-auto h-10 md:h-9 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                                                        {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Cpu className="mr-2 h-4 w-4" />}
                                                        Scan with SAM
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
                        </div>
                    </Card>
                </div>
                
                {statusMessage && (
                    <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-slate-700 bg-slate-800/95 px-5 py-2.5 text-sm shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-4 fade-in duration-300">
                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin text-indigo-400" /> : <div className="h-2 w-2 rounded-full bg-blue-400" />}
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
  const [targetPrompt, setTargetPrompt] = useState('building, house');
  const [isProcessing, setIsProcessing] = useState(false);
  const [geoData, setGeoData] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>('Engine ready. Draw a polygon to begin.');
  
  const { colabUrl: serverUrl } = useServerConfig();
  const { toast } = useToast();
  const [activeLayer, setActiveLayer] = useState<BaseLayer>(baseLayers[0]);

  useEffect(() => {
    if (controlRef.current) {
      L.DomEvent.disableClickPropagation(controlRef.current);
      L.DomEvent.disableScrollPropagation(controlRef.current);
    }
  }, []);

  const handleCreated = (e: any) => {
    const layer = e.layer;
    const latlngs: LatLng[] = layer.getLatLngs()[0];
    const polyString = latlngs.map((ll) => `${ll.lat} ${ll.lng}`).join(' ');
    setPolygonCoords(polyString);
    setSelectionBounds(layer.getBounds());
    setStatusMessage('Area selected. Ready for AI scan.');
    setGeoData(null);
  };

  const handleDeleted = () => {
    setPolygonCoords(null);
    setSelectionBounds(null);
    setGeoData(null);
    setStatusMessage('Selection cleared. Draw a new polygon to begin.');
  };

  const handleScan = async () => {
    if (!serverUrl) {
      toast({
        variant: 'destructive',
        title: 'Server Not Connected',
        description: 'Please configure the backend server URL in the "Server Config" page.',
      });
      return;
    }
    if (!selectionBounds) {
        toast({
          variant: 'destructive',
          title: 'No Area Selected',
          description: 'Please draw a polygon on the map to define the scan area.',
        });
        return;
    }

    setIsProcessing(true);
    setGeoData(null);
    setStatusMessage(`Scanning for '${targetPrompt}' with Meta SAM...`);

    try {
      const bbox = [selectionBounds.getWest(), selectionBounds.getSouth(), selectionBounds.getEast(), selectionBounds.getNorth()];
      
      const response = await fetch(`${serverUrl}/vision_scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bbox, prompt: targetPrompt }),
      });

      if (!response.ok) {
        let errorDetails = `Server responded with status: ${response.status}`;
        try {
            const errorData = await response.json();
            errorDetails = errorData.details || errorDetails;
        } catch {}
        throw new Error(errorDetails);
      }

      const data = await response.json();
      setGeoData(data);
      setStatusMessage(`Scan complete. Found ${data.features?.length || 0} objects.`);
      toast({
        title: 'Scan Complete',
        description: `Successfully extracted ${data.features?.length || 0} objects.`,
      });
    } catch (error: any) {
      setStatusMessage('AI Vision scan failed. Check server connection.');
      toast({
        variant: 'destructive',
        title: 'AI Scan Failed',
        description: error.message || 'An unknown error occurred.',
      });
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
    a.download = "ai_vision_output.geojson";
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
      />
      
      <FeatureGroup>
        <EditControl 
          position="bottomright" 
          onCreated={handleCreated}
          onEdited={(e) => {
            const layers = e.layers;
            layers.eachLayer((layer: any) => {
              const latlngs: LatLng[] = layer.getLatLngs()[0];
              const polyString = latlngs.map((ll) => `${ll.lat} ${ll.lng}`).join(' ');
              setPolygonCoords(polyString);
              setSelectionBounds(layer.getBounds());
              setStatusMessage('Selection updated. Ready for AI scan.');
            });
          }}
          onDeleted={handleDeleted} 
          draw={{ 
            polygon: { shapeOptions: { color: '#4f46e5', weight: 2, fillOpacity: 0.1 } },
            rectangle: false, circle: false, marker: false, polyline: false, circlemarker: false
          }}
          edit={{ edit: true, remove: true }}
        />
      </FeatureGroup>

      {geoData && (
        <GeoJSON 
          data={geoData} 
          style={{
            color: '#ff00ff', // Bright magenta
            weight: 2,
            opacity: 0.9,
            fillColor: '#ff00ff',
            fillOpacity: 0.3
          }} 
        />
      )}

      <div ref={controlRef} className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1001] w-full max-w-4xl">
          <AiVisionControlBar
              hasSelection={!!polygonCoords}
              isProcessing={isProcessing}
              geoData={geoData}
              colabUrl={serverUrl}
              statusMessage={statusMessage}
              targetPrompt={targetPrompt}
              onPromptChange={setTargetPrompt}
              onRunScan={handleScan}
              onDownload={handleDownload}
              onZoomIn={() => map.zoomIn()}
              onZoomOut={() => map.zoomOut()}
          />
      </div>
    </>
  );
}

export default function AiVisionClient() {
  return (
    <MapContainer
      center={[31.46, 74.38]}
      zoom={15}
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
    >
      <MapContent />
    </MapContainer>
  );
}
