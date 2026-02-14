'use client';

import * as React from 'react';
import { ImageDown } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type MapToolbarExtensionsProps = {
  onDownloadImage: () => void;
  hasSelection: boolean;
};

export function MapToolbarExtensions({ onDownloadImage, hasSelection }: MapToolbarExtensionsProps) {
  const title = !hasSelection
    ? 'Draw a shape on the map to select an area first'
    : 'Download GeoTIFF image of the selected area';

  return (
    <div className="custom-leaflet-toolbar">
      <div className="leaflet-bar leaflet-control">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onDownloadImage}
                disabled={!hasSelection}
                title={title}
                className="flex items-center justify-center"
              >
                <ImageDown size={16} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{title}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
