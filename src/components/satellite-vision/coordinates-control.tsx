'use client';

import * as React from 'react';
import { useMapEvents } from 'react-leaflet';
import type { LatLng } from 'leaflet';

export function CoordinatesControl() {
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
    <div className="absolute bottom-2 left-2 z-[1000] rounded-md bg-background/80 p-1.5 text-xs shadow-md backdrop-blur-sm">
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
