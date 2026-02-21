'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  FeatureGroup,
  useMap,
  useMapEvents,
  Popup,
} from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-defaulticon-compatibility';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import type { BBox } from '@/lib/api';
import { CoordinatesControl } from './coordinates-control';
import type { ActiveTool } from './controls-sidebar';

// --- Interfaces ---
interface MapProps {
  geoJsonData: any;
  setBBox: (bbox: BBox | null) => void;
  searchResult?: { lat: number; lon: number } | null;
  isDrawing: boolean;
  setIsDrawing: (isDrawing: boolean) => void;
  onManualFeaturesChange: (features: any) => void;
  activeTool: ActiveTool;
  isSidebarCollapsed: boolean;
  layerUrl: string;
  layerAttribution: string;
}

// --- Helper Components ---

function MapTracker({
  setBBox,
  isDrawing,
}: {
  setBBox: (bbox: BBox | null) => void;
  isDrawing: boolean;
}) {
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
    },
  });
  return null;
}

function MapController({
  coords,
}: {
  coords?: { lat: number; lon: number } | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.flyTo([coords.lat, coords.lon], 18, { duration: 1.5 });
    }
  }, [coords, map]);
  return null;
}

const createAreaPopup = (layer: L.Polygon | L.Rectangle) => {
  const area = L.GeometryUtil.geodesicArea(layer.getLatLngs()[0] as L.LatLng[]);
  const areaSqm = area.toFixed(2);
  const areaMarla = (area / 25.2929).toFixed(2);
  return `
    <div style="font-family: Inter, sans-serif; font-size: 14px; line-height: 1.5; color: hsl(var(--card-foreground)); min-width: 180px;">
      <div style="font-weight: 600; margin-bottom: 8px; color: hsl(var(--primary)); font-size: 15px;">Feature Details</div>
      <div style="display: flex; justify-content: space-between; padding-top: 4px; border-top: 1px solid hsl(var(--border));">
          <span style="color: hsl(var(--muted-foreground));">Area (sqm)</span>
          <span style="font-weight: 500;">${areaSqm} m²</span>
      </div>
      <div style="display: flex; justify-content: space-between; padding-top: 4px;">
          <span style="color: hsl(var(--muted-foreground));">Area (Marla)</span>
          <span style="font-weight: 500;">${areaMarla}</span>
      </div>
    </div>
  `;
};

const createLengthPopup = (layer: L.Polyline) => {
  const latlngs = layer.getLatLngs() as L.LatLng[];
  let totalDistance = 0;
  for (let i = 0; i < latlngs.length - 1; i++) {
    totalDistance += latlngs[i].distanceTo(latlngs[i + 1]);
  }
  const distanceKm = (totalDistance / 1000).toFixed(2);
  return `
    <div style="font-family: Inter, sans-serif; font-size: 14px; line-height: 1.5; color: hsl(var(--card-foreground)); min-width: 150px;">
        <div style="font-weight: 600; margin-bottom: 8px; color: hsl(var(--primary)); font-size: 15px;">Measurement</div>
        <div style="display: flex; justify-content: space-between; padding-top: 4px; border-top: 1px solid hsl(var(--border));">
            <span style="color: hsl(var(--muted-foreground));">Length</span>
            <span style="font-weight: 500;">${distanceKm} km</span>
        </div>
    </div>
  `;
};

// --- Main Component ---
export default function MapComponent({
  geoJsonData,
  setBBox,
  searchResult,
  isDrawing,
  setIsDrawing,
  onManualFeaturesChange,
  activeTool,
  isSidebarCollapsed,
  layerUrl,
  layerAttribution,
}: MapProps) {
  const [geoKey, setGeoKey] = useState(0);
  const featureGroupRef = useRef<any>(null);

  useEffect(() => {
    setGeoKey((prev) => prev + 1);
  }, [geoJsonData]);

  const geoJsonStyle = {
    color: 'hsl(var(--primary))',
    weight: 2.5,
    fillColor: 'hsl(var(--primary))',
    fillOpacity: 0.2,
  };

  const onEachFeature = (feature: any, layer: any) => {
    if (feature.properties) {
      const marla = feature.properties.area_mrl?.toFixed(2) ?? 'N/A';
      const sqm = feature.properties.area_sqm?.toFixed(2) ?? 'N/A';
      layer.bindPopup(`
          <div style="font-family: Inter, sans-serif; font-size: 14px; line-height: 1.5; color: hsl(var(--card-foreground)); min-width: 180px;">
            <div style="font-weight: 600; margin-bottom: 8px; color: hsl(var(--primary)); font-size: 15px;">Building Details</div>
            <div style="display: flex; justify-content: space-between; padding-top: 4px; border-top: 1px solid hsl(var(--border));">
                <span style="color: hsl(var(--muted-foreground));">Area (sqm)</span>
                <span style="font-weight: 500;">${sqm} m²</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-top: 4px;">
                <span style="color: hsl(var(--muted-foreground));">Area (Marla)</span>
                <span style="font-weight: 500;">${marla}</span>
            </div>
          </div>
        `);
    }
  };

  const updateFeatures = () => {
    if (featureGroupRef.current) {
      onManualFeaturesChange(featureGroupRef.current.toGeoJSON());
    }
  };

  const onCreated = (e: any) => {
    const layer = e.layer;
    const type = e.layerType;

    if (type === 'rectangle') {
       if (activeTool === 'detection') {
          setIsDrawing(true);

          if (featureGroupRef.current) {
            featureGroupRef.current.eachLayer((l: any) => {
              if (l instanceof L.Rectangle && l !== layer) {
                featureGroupRef.current.removeLayer(l);
              }
            });
          }

          const bounds = layer.getBounds();
          setBBox({
            west: bounds.getWest(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            north: bounds.getNorth(),
          });
       }
      layer.bindPopup(createAreaPopup(layer)).openPopup();
    } else if (type === 'polygon') {
      layer.bindPopup(createAreaPopup(layer)).openPopup();
    } else if (type === 'polyline') {
      layer.bindPopup(createLengthPopup(layer)).openPopup();
    }
    updateFeatures();
  };

  const onEdited = (e: any) => {
    e.layers.eachLayer((layer: any) => {
      if (layer instanceof L.Rectangle) {
        layer.setPopupContent(createAreaPopup(layer));
        layer.openPopup();
        if (activeTool === 'detection') {
          const bounds = layer.getBounds();
          setBBox({
            west: bounds.getWest(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            north: bounds.getNorth(),
          });
        }
      } else if (layer instanceof L.Polygon) {
        layer.setPopupContent(createAreaPopup(layer)).openPopup();
      } else if (layer instanceof L.Polyline) {
        layer.setPopupContent(createLengthPopup(layer)).openPopup();
      }
    });
    updateFeatures();
  };

  const onDeleted = (e: any) => {
    let wasROIDeleted = false;
    e.layers.eachLayer((layer: any) => {
        if (layer instanceof L.Rectangle && activeTool === 'detection') {
            wasROIDeleted = true;
        }
    });

    if (wasROIDeleted) {
      setIsDrawing(false);
      const map = featureGroupRef.current?._map;
      if (map) {
        const bounds = map.getBounds();
        setBBox({
          west: bounds.getWest(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          north: bounds.getNorth(),
        });
      } else {
        setBBox(null);
      }
    }
    updateFeatures();
  };

  return (
    <MapContainer
      center={[31.5204, 74.3587]}
      zoom={16}
      style={{ height: '100%', width: '100%', background: '#111' }}
      zoomControl={false}
    >
        <TileLayer
            url={layerUrl}
            attribution={layerAttribution}
            maxZoom={22}
        />

        <MapTracker setBBox={setBBox} isDrawing={isDrawing} />
        <MapController coords={searchResult} />

        <FeatureGroup ref={featureGroupRef}>
            <EditControl
            key={activeTool}
            position="topleft"
            onCreated={onCreated}
            onEdited={onEdited}
            onDeleted={onDeleted}
            draw={{
                rectangle: activeTool === 'detection' ? {
                shapeOptions: {
                    color: 'hsl(var(--primary))',
                    fillColor: 'hsl(var(--accent))',
                    fillOpacity: 0.1,
                    weight: 2,
                    dashArray: '5, 5'
                },
                } : false,
                polygon: activeTool === 'digitize' ? {
                shapeOptions: {
                    color: 'hsl(var(--primary))',
                    fillColor: 'hsl(var(--primary))',
                    fillOpacity: 0.1,
                    weight: 2,
                },
                } : false,
                polyline: activeTool === 'digitize' ? {
                shapeOptions: {
                    color: 'hsl(var(--primary))',
                    weight: 3,
                },
                } : false,
                circle: false,
                circlemarker: false,
                marker: false,
            }}
            edit={{
                featureGroup: featureGroupRef.current,
                edit: true,
                remove: true
            }}
            />
        </FeatureGroup>
        {geoJsonData && (
            <GeoJSON
            key={geoKey}
            data={geoJsonData}
            style={geoJsonStyle}
            onEachFeature={onEachFeature}
            />
        )}
        <CoordinatesControl isSidebarCollapsed={isSidebarCollapsed} />
    </MapContainer>
  );
}
