'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useServerConfig } from '@/hooks/use-server-config';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Cpu, ScanSearch, AlertTriangle } from 'lucide-react';
import { Separator } from '../ui/separator';

function MapContent() {
  const map = useMap();
  const controlsRef = useRef<HTMLDivElement>(null);
  
  const [targetPrompt, setTargetPrompt] = useState('building, house');
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedGeoJson, setExtractedGeoJson] = useState<any>(null);
  
  const { colabUrl: serverUrl } = useServerConfig();
  const { toast } = useToast();

  useEffect(() => {
    if (controlsRef.current) {
      L.DomEvent.disableClickPropagation(controlsRef.current);
      L.DomEvent.disableScrollPropagation(controlsRef.current);
    }
  }, []);

  const handleScan = async () => {
    if (!serverUrl) {
      toast({
        variant: 'destructive',
        title: 'Server Not Connected',
        description: 'Please configure the backend server URL in the "Server Config" page.',
      });
      return;
    }

    setIsProcessing(true);
    setExtractedGeoJson(null);
    toast({
      title: 'Initiating Scan...',
      description: 'Sending current map view to the AI Vision backend.',
    });

    try {
      const bounds = map.getBounds();
      const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
      
      // The user wants a new endpoint called /vision_scan, different from /extract_overture
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
      setExtractedGeoJson(data);
      toast({
        title: 'Scan Complete',
        description: `Successfully extracted ${data.features?.length || 0} objects.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'AI Scan Failed',
        description: error.message || 'An unknown error occurred.',
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <>
      <TileLayer
        url="http://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
        subdomains={['mt0', 'mt1', 'mt2', 'mt3']}
        attribution="&copy; Google"
      />

      <div ref={controlsRef} className="absolute top-4 right-4 z-[1000]">
        <Card className="w-80 shadow-2xl bg-white/90 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScanSearch className="h-6 w-6 text-primary" />
              Real-Time AI Vision
            </CardTitle>
            <CardDescription>
              Scan the live map view to detect objects using an AI model.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="active-model">Active Model</Label>
              <div className="flex items-center gap-2 p-2 rounded-md border bg-gray-50">
                  <Cpu className="h-5 w-5 text-muted-foreground" />
                  <p className="text-sm font-medium text-muted-foreground">Meta SAM (Segment Anything)</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="target-object">Target Object</Label>
              <Input
                id="target-object"
                value={targetPrompt}
                onChange={(e) => setTargetPrompt(e.target.value)}
                placeholder="e.g., building, car, tree"
              />
            </div>
          </CardContent>
          <Separator />
          <CardFooter className="p-4">
            {!serverUrl ? (
                <div className="w-full flex items-center gap-2 text-sm text-destructive-foreground font-medium bg-destructive/90 p-2 rounded-md">
                    <AlertTriangle className="h-5 w-5" />
                    <span>Server Not Connected</span>
                </div>
            ) : (
                <Button onClick={handleScan} disabled={isProcessing} className="w-full h-11 text-base">
                {isProcessing ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Scanning...</>
                ) : (
                    'Scan Live Satellite'
                )}
                </Button>
            )}
          </CardFooter>
        </Card>
      </div>

      {extractedGeoJson && (
        <GeoJSON 
          data={extractedGeoJson} 
          style={{
            color: '#ff00ff', // Bright magenta
            weight: 2,
            opacity: 0.9,
            fillColor: '#ff00ff',
            fillOpacity: 0.2
          }} 
        />
      )}
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
