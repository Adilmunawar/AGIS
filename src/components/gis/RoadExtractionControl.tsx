"use client";

import React, { useState, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { Button } from "@/components/ui/button";
import { Loader2, Route } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function RoadExtractionControl() {
  const map = useMap();
  const { toast } = useToast();
  const [isExtracting, setIsExtracting] = useState(false);
  const roadsLayerRef = useRef<L.GeoJSON | null>(null);

  const handleExtractRoads = async () => {
    setIsExtracting(true);
    // Clear previous roads layer if it exists
    if (roadsLayerRef.current) {
        map.removeLayer(roadsLayerRef.current);
    }
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

      // FIX: Check for direct geoJson payload from OSM
      if (data.geoJson) {
        if (data.geoJson.features.length === 0) {
            toast({ title: "No Roads Found", description: "No road features were found in the current view.", variant: "destructive" });
            setIsExtracting(false);
            return;
        }
        
        roadsLayerRef.current = L.geoJSON(data.geoJson, {
          style: { color: '#FF0000', weight: 3, opacity: 0.8 }
        }).addTo(map);

        toast({ title: "Roads Extracted", description: `${data.geoJson.features.length} road segments added to map.` });
      }

    } catch (error: any) {
      console.error(error);
      toast({ title: "Extraction Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <div className="absolute top-4 right-40 z-[1000]">
      <Button 
        onClick={handleExtractRoads} 
        disabled={isExtracting}
        className="shadow-lg border-slate-200/50 bg-white/80 backdrop-blur-xl hover:bg-white/90 text-slate-800"
      >
        {isExtracting ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin text-red-500" />
        ) : (
          <Route className="h-4 w-4 mr-2 text-red-500" />
        )}
        {isExtracting ? "Extracting..." : "Extract Roads"}
      </Button>
    </div>
  );
}
