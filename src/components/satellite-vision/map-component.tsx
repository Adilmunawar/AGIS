'use client';

import * as React from 'react';
import {
  MapContainer,
  ImageOverlay,
  Marker,
  GeoJSON as LeafletGeoJSON,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L, { LatLng, LatLngBoundsExpression } from 'leaflet';
import type { GeoJsonObject } from 'geojson';
import { UploadCloud } from 'lucide-react';

// Fix for default icon not showing in React-Leaflet
import 'leaflet/dist/leaflet.css';
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});


type MapComponentProps = {
  imageUrl: string | null;
  imageDimensions: { width: number; height: number } | null;
  points: LatLng[];
  geoJson: GeoJsonObject | null;
  onMapClick: (latlng: LatLng) => void;
};

// Component to handle map click events
function MapEvents({ onMapClick }: { onMapClick: (latlng: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

// Component to update map view when image changes
function MapUpdater({ bounds }: { bounds: LatLngBoundsExpression | null }) {
  const map = useMap();
  React.useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds);
    }
  }, [bounds, map]);
  return null;
}

export default function MapComponent({
  imageUrl,
  imageDimensions,
  points,
  geoJson,
  onMapClick,
}: MapComponentProps) {
  const bounds = imageDimensions
    ? ([[0, 0], [imageDimensions.height, imageDimensions.width]] as LatLngBoundsExpression)
    : null;
    
  const geoJsonStyle = {
    color: '#DC2626', // Red color for polygons
    weight: 2,
    opacity: 0.8,
    fillOpacity: 0.3,
  };

  return (
    <div className="h-full w-full bg-muted">
      <MapContainer
        center={[0, 0]}
        zoom={1}
        scrollWheelZoom={true}
        className="h-full w-full"
        crs={L.CRS.Simple}
        minZoom={-5}
      >
        {imageUrl && bounds && (
          <>
            <ImageOverlay url={imageUrl} bounds={bounds} />
            <MapUpdater bounds={bounds} />
            <MapEvents onMapClick={onMapClick} />
            {points.map((point, idx) => (
              <Marker key={idx} position={point} />
            ))}
            {geoJson && <LeafletGeoJSON data={geoJson} style={geoJsonStyle} />}
          </>
        )}

        {!imageUrl && (
            <div className="flex h-full w-full flex-col items-center justify-center text-center text-muted-foreground">
                <UploadCloud className="mb-4 h-16 w-16" />
                <h2 className="text-xl font-medium">No Image Uploaded</h2>
                <p className="mt-1">Please upload a satellite image using the controls on the left.</p>
            </div>
        )}
      </MapContainer>
    </div>
  );
}
