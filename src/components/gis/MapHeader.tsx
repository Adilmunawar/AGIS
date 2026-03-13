'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { LayersIcon } from 'lucide-react';
import { LocationSearch } from './LocationSearch';

// --- TYPES ---
export interface BaseLayer {
    name: string;
    url: string;
    attribution: string;
    previewUrl: string;
    subdomains?: string[];
}

interface MapHeaderProps {
    layers: BaseLayer[];
    activeLayer: BaseLayer;
    onLayerSelect: (layer: BaseLayer) => void;
}

// --- MAIN COMPONENT ---
export function MapHeader({ layers, activeLayer, onLayerSelect }: MapHeaderProps) {
  const [isLayerDialogOpen, setIsLayerDialogOpen] = useState(false);

  const handleLayerSelectAndClose = (layer: BaseLayer) => {
    onLayerSelect(layer);
    setIsLayerDialogOpen(false);
  };

  return (
    <div className="absolute top-4 right-4 z-[1000] flex items-start gap-2">
      <LocationSearch />
      
      <Dialog open={isLayerDialogOpen} onOpenChange={setIsLayerDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon" className="h-[52px] w-[52px] flex-shrink-0 rounded-xl bg-white/80 backdrop-blur-xl shadow-lg border-slate-200/50 hover:bg-white/90">
            <LayersIcon className="h-6 w-6 text-foreground" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl bg-white/90 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle>Select a Base Map</DialogTitle>
            <DialogDescription>
              Choose a map style that best suits your analysis.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            {layers.map((layer) => (
              <Card 
                  key={layer.name} 
                  onClick={() => handleLayerSelectAndClose(layer)}
                  className={cn(
                      "cursor-pointer transition-all overflow-hidden",
                      activeLayer.name === layer.name ? "border-primary ring-2 ring-primary" : "hover:border-primary/50 hover:shadow-lg"
                  )}
              >
                  <CardContent className="p-0">
                      <div className="relative aspect-[4/3]">
                          <Image src={layer.previewUrl} alt={layer.name} fill={true} className="object-cover" />
                      </div>
                  </CardContent>
                  <CardHeader className="p-3">
                      <CardTitle className="text-sm font-medium">{layer.name}</CardTitle>
                  </CardHeader>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
