'use client';

import React, { useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { useToast } from '@/hooks/use-toast';
import { GisControlBar } from './GisControlBar';
import { Route, Download, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';


interface MapControlsWrapperProps {
    polygonCoords: string | null;
    isProcessing: boolean;
    geoData: any;
    colabUrl: string;
    statusMessage: string | null;
    liveBuildings: any;
    liveRoads: any;
    setLiveRoads: (data: any) => void;
    runStandardExtraction: () => void;
    runRealtimeExtraction: () => void;
    handleDownload: () => void;
    isExtractingRoads: boolean;
    setIsExtractingRoads: (isExtracting: boolean) => void;
}

export function MapControlsWrapper({
    polygonCoords,
    isProcessing,
    geoData,
    colabUrl,
    statusMessage,
    liveBuildings,
    liveRoads,
    setLiveRoads,
    runStandardExtraction,
    runRealtimeExtraction,
    handleDownload,
    isExtractingRoads,
    setIsExtractingRoads
}: MapControlsWrapperProps) {
    const map = useMap();
    const controlRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (controlRef.current) {
            L.DomEvent.disableClickPropagation(controlRef.current);
            L.DomEvent.disableScrollPropagation(controlRef.current);
        }
    }, []);

    const handleLiveRoadExtraction = async () => {
        setIsExtractingRoads(true);
        setLiveRoads(null);
        try {
          const bounds = map.getBounds();
          const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
    
          toast({ title: "Extracting Roads...", description: "Querying OpenStreetMap..." });
    
          const response = await fetch('/api/gee/extract-live', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bbox, type: 'roads' }),
          });
    
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Failed to fetch roads from the server');
    
          if (data.geoJson) {
            if (data.geoJson.features.length === 0) {
                toast({ title: "No Roads Found", description: "No road features were found in the current view.", variant: "destructive" });
                return;
            }
            setLiveRoads(data.geoJson);
            toast({ title: "Roads Extracted", description: `${data.geoJson.features.length} road segments ready.` });
          }
    
        } catch (error: any) {
          console.error(error);
          toast({ title: "Extraction Failed", description: error.message, variant: "destructive" });
        } finally {
          setIsExtractingRoads(false);
        }
    };
    
    const handleDownloadLive = () => {
        const buildingFeatures = liveBuildings?.features || [];
        const roadFeatures = liveRoads?.features || [];
        const features = [...buildingFeatures, ...roadFeatures];
    
        if (features.length === 0) {
            toast({ variant: 'destructive', title: 'No Live Data to Download', description: 'Extract some roads or ensure buildings are visible.' });
            return;
        }
    
        const combinedGeoJson = {
            type: "FeatureCollection",
            features: features
        };
    
        const blob = new Blob([JSON.stringify(combinedGeoJson)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "live_data_export.geojson";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const hasSelection = !!polygonCoords;

    const showSpinner = isProcessing || isExtractingRoads || (statusMessage && statusMessage.toLowerCase().includes('fetching'));

    return (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1001] flex flex-col items-center gap-2">
            {statusMessage && (
                <div
                    key={statusMessage} // Force re-render for animation
                    className="flex items-center gap-3 rounded-full border border-slate-200/50 bg-white/80 px-4 py-2 text-xs shadow-lg backdrop-blur-xl animate-in slide-in-from-bottom-3 fade-in-50 duration-300"
                >
                    {showSpinner && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    <p className={cn("font-medium", showSpinner ? "text-muted-foreground" : "text-foreground")}>{statusMessage}</p>
                </div>
            )}
            <div className="flex items-end gap-2" ref={controlRef}>
                <GisControlBar
                    hasSelection={hasSelection}
                    isProcessing={isProcessing}
                    geoData={geoData}
                    colabUrl={colabUrl}
                    onRunStandard={runStandardExtraction}
                    onRunRealtime={runRealtimeExtraction}
                    onDownload={handleDownload}
                    onZoomIn={() => map.zoomIn()}
                    onZoomOut={() => map.zoomOut()}
                />
                <Card className="rounded-xl border-slate-200/50 bg-white/80 shadow-lg backdrop-blur-xl p-1.5 flex items-center gap-1.5">
                    <Button onClick={handleLiveRoadExtraction} disabled={isExtractingRoads} variant="outline" className="h-9 bg-white/50">
                        {isExtractingRoads ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-yellow-500" /> : <Route className="mr-2 h-4 w-4 text-yellow-500" />}
                        Extract Roads
                    </Button>
                    <Button onClick={handleDownloadLive} variant="outline" size="icon" className="h-9 w-9 bg-white/50" disabled={!liveBuildings && !liveRoads}>
                        <Download className="h-4 w-4" />
                    </Button>
                </Card>
            </div>
        </div>
    );
}
