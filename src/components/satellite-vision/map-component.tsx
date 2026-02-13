'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  FeatureGroup,
  LayersControl,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-defaulticon-compatibility';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import type { BBox } from '@/lib/api';

// --- Interfaces ---
interface MapProps {
  geoJsonData: any;
  setBBox: (bbox: BBox) => void;
  searchResult?: { lat: number; lon: number } | null; // New Prop for Search
}

// --- Helper Components ---

// 1. MapTracker: Updates BBox when you move the map (ONLY if no rectangle is drawn)
function MapTracker({ setBBox, isDrawing }: { setBBox: (bbox: BBox) => void, isDrawing: boolean }) {
  const map = useMapEvents({
    moveend: () => {
      if (!isDrawing) {
        const bounds = map.getBounds();
        setBBox({
          west: bounds.getWest(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          north: bounds.getNorth(),
        });
      }
    },
    load: () => {
      if (!isDrawing) {
        const bounds = map.getBounds();
        setBBox({
            west: bounds.getWest(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            north: bounds.getNorth(),
          });
      }
    }
  });
  return null;
}

// 2. MapController: Flies to search results
function MapController({ coords }: { coords?: { lat: number; lon: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.flyTo([coords.lat, coords.lon], 16, { duration: 1.5 });
    }
  }, [coords, map]);
  return null;
}

// --- Main Component ---
export default function MapComponent({ geoJsonData, setBBox, searchResult }: MapProps) {
  const [geoKey, setGeoKey] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const featureGroupRef = useRef<any>(null);

  // Style for buildings
  const geoJsonStyle = {
    color: '#ff0000',
    weight: 2,
    fillColor: '#3388ff',
    fillOpacity: 0.2,
  };

  const onEachFeature = (feature: any, layer: any) => {
    if (feature.properties) {
        const marla = feature.properties.area_marla ? feature.properties.area_marla.toFixed(2) : 'N/A';
        const sqm = feature.properties.area_sqm ? feature.properties.area_sqm.toFixed(2) : 'N/A';
        layer.bindPopup(`
          <div style="font-family: sans-serif; font-size: 14px;">
            <div style="font-weight: bold; margin-bottom: 4px;">Building Details</div>
            <div style="font-size: 12px;">Area: ${sqm} m²</div>
            <div style="font-size: 12px;">Marla: ${marla}</div>
          </div>
        `);
      }
  };

  // --- Drawing Handlers ---
  const onCreated = (e: any) => {
    setIsDrawing(true);
    const layer = e.layer;
    const bounds = layer.getBounds();
    
    // Clear previous drawings so we only have 1 ROI at a time
    if (featureGroupRef.current) {
        Object.values(featureGroupRef.current._layers).forEach((l: any) => {
            if (l !== layer) featureGroupRef.current.removeLayer(l);
        });
    }

    setBBox({
      west: bounds.getWest(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      north: bounds.getNorth(),
    });
  };

  const onDeleted = () => {
    setIsDrawing(false);
    // When deleted, BBox will reset to map view on next move, 
    // or you can force an update here if needed.
    const map = featureGroupRef.current._map;
    if (map) {
      const bounds = map.getBounds();
      setBBox({
        west: bounds.getWest(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        north: bounds.getNorth(),
      });
    }
  };

  useEffect(() => {
    setGeoKey((prev) => prev + 1);
  }, [geoJsonData]);

  return (
    <MapContainer
      center={[31.5204, 74.3587]}
      zoom={16}
      style={{ height: '100%', width: '100%', background: '#111' }}
    >
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="Google Satellite">
          <TileLayer
            url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
            attribution="Google Satellite"
            maxZoom={22}
          />
        </LayersControl.BaseLayer>
        
        <LayersControl.BaseLayer name="Google Hybrid">
          <TileLayer
            url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
            attribution="Google Hybrid"
            maxZoom={22}
          />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer name="OpenStreetMap">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="OpenStreetMap"
          />
        </LayersControl.BaseLayer>
      </LayersControl>

      <MapTracker setBBox={setBBox} isDrawing={isDrawing} />
      <MapController coords={searchResult} />

      {/* Drawing Controls */}
      <FeatureGroup ref={featureGroupRef}>
        <EditControl
          position="topleft"
          onCreated={onCreated}
          onDeleted={onDeleted}
          draw={{
            rectangle: true,
            polygon: false,
            polyline: false,
            circle: false,
            circlemarker: false,
            marker: false,
          }}
        />
      </FeatureGroup>

      {/* AI Results Layer */}
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
