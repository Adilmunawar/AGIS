'use client';

import * as React from 'react';
import { useMapEvents } from 'react-leaflet';
import type { LatLng } from 'leaflet';
import { cn } from '@/lib/utils';

type CoordinatesControlProps = {
  isSidebarCollapsed: boolean;
};

export function CoordinatesControl({ isSidebarCollapsed }: CoordinatesControlProps) {
  const [coords, setCoords] = React.useState<LatLng | null>(null);

  useMapEvents({
    mousemove(e) {
      setCoords(e.latlng);
    },
    mouseout() {
      setCoords(null);
    }
  });

  return (
    <div className={cn(
      "absolute bottom-2 z-[1000] rounded-md bg-background/80 p-1.5 text-xs shadow-md backdrop-blur-sm transition-all duration-300 ease-in-out",
      isSidebarCollapsed ? "left-[calc(5rem+1rem)]" : "left-[calc(16rem+1rem)]"
    )}>
      {coords ? (
        <div className="text-foreground">
          <span className="font-semibold">Lat:</span> {coords.lat.toFixed(5)},{' '}
          <span className="font-semibold">Lng:</span> {coords.lng.toFixed(5)}
        </div>
      ) : (
        <div className="text-muted-foreground">Hover map for coordinates</div>
      )}
    </div>
  );
}
