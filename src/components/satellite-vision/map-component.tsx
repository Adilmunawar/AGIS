'use client';

import React, { useEffect, useState } from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import type { BBox } from '@/lib/api';

interface MapProps {
  geoJsonData: any;
  setBBox: (bbox: BBox) => void;
}

// Component to track map movement
function MapTracker({ setBBox }: { setBBox: (bbox: BBox) => void }) {
  const map = useMapEvents({
    moveend: () => {
      const bounds = map.getBounds();
      setBBox({
        west: bounds.getWest(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        north: bounds.getNorth(),
      });
    },
    // Set initial bounds
    load: () => {
       const bounds = map.getBounds();
      setBBox({
        west: bounds.getWest(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        north: bounds.getNorth(),
      });
    }
  });
  return null;
}

export default function MapComponent({ geoJsonData, setBBox }: MapProps) {
  const [geoKey, setGeoKey] = useState(0);

  // Style for buildings
  const geoJsonStyle = {
    color: '#ff0000', // Red outline
    weight: 2,
    fillColor: '#3388ff',
    fillOpacity: 0.2,
  };

  // Popup for Area
  const onEachFeature = (feature: any, layer: any) => {
    if (feature.properties) {
      const marla = feature.properties.area_marla
        ? feature.properties.area_marla.toFixed(2)
        : 'N/A';
      const sqm = feature.properties.area_sqm
        ? feature.properties.area_sqm.toFixed(2)
        : 'N/A';
      layer.bindPopup(`
        <div style="font-family: sans-serif; font-size: 14px;">
          <div style="font-weight: bold; margin-bottom: 4px;">Building Details</div>
          <div style="font-size: 12px;">Area: ${sqm} m²</div>
          <div style="font-size: 12px;">Marla: ${marla}</div>
        </div>
      `);
    }
  };

  useEffect(() => {
    setGeoKey((prev) => prev + 1); // Force redraw when data changes
  }, [geoJsonData]);

  return (
    <MapContainer
      center={[31.5204, 74.3587]} // Default: Lahore
      zoom={18}
      style={{ height: '100%', width: '100%', background: '#000' }}
    >
      {/* 1. Google Satellite Layer */}
      <TileLayer
        url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
        attribution="&copy; Google Satellite"
        maxZoom={22}
      />

      {/* 2. Tracker to update BBOX state */}
      <MapTracker setBBox={setBBox} />

      {/* 3. Results Layer */}
      {geoJsonData && (
        <GeoJSON
          key={geoKey}
          data={geoJsonData}
          style={geoJsonStyle}
          onEachFeature={onEachFeature}
        />
      )}
    </MapContainer>
  );
}
