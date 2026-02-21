'use client';

import * as React from 'react';
import Image from 'next/image';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Check, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MapLayer } from '@/lib/map-layers';

type MapLayerSwitcherProps = {
  layers: MapLayer[];
  currentLayer: MapLayer;
  onLayerChange: (layer: MapLayer) => void;
};

export function MapLayerSwitcher({
  layers,
  currentLayer,
  onLayerChange,
}: MapLayerSwitcherProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          size="icon"
          className="h-11 w-11 rounded-lg border border-black/10 bg-background/50 shadow-lg backdrop-blur-md"
        >
          <Layers className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2">
        <div className="space-y-2">
          <p className="px-2 text-sm font-medium text-muted-foreground">Map Type</p>
          <div className="grid grid-cols-3 gap-2">
            {layers.map((layer) => (
              <button
                key={layer.id}
                onClick={() => onLayerChange(layer)}
                className="group relative aspect-square w-full overflow-hidden rounded-md border-2 border-transparent transition-all hover:border-primary focus:border-primary focus:outline-none"
              >
                <Image
                  src={layer.previewImageUrl}
                  alt={layer.name}
                  width={128}
                  height={128}
                  className="object-cover transition-transform group-hover:scale-105"
                  data-ai-hint={layer.imageHint}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                {currentLayer.id === layer.id && (
                  <div className="absolute inset-0 border-2 border-primary rounded-md">
                    <div className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                      <Check className="h-4 w-4 text-primary-foreground" />
                    </div>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 p-1.5">
                  <p className="text-xs font-semibold text-white">{layer.name}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
