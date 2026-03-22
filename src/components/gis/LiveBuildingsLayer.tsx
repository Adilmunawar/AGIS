"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import { GeoJSON } from 'react-leaflet';

export default function LiveBuildingsLayer() {
  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  const [isFetching, setIsFetching] = useState(false);
  const map = useMap();
  const abortControllerRef = useRef<AbortController | null>(null);

  // The function to fetch buildings, memoized to prevent re-creation on every render.
  const fetchBuildings = useCallback(async () => {
    if (map.getZoom() < 15) {
      setGeoJsonData(null);
      return;
    }
    
    // Abort any ongoing fetch request.
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setIsFetching(true);

    try {
      const bounds = map.getBounds();
      const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];

      const response = await fetch('/api/gee/extract-live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bbox, type: 'buildings' }),
        signal,
      });

      if (signal.aborted) return;

      const data = await response.json();
      
      if (data.url) {
        const res = await fetch(data.url, { signal });
        if (signal.aborted) return;
        const featureCollection = await res.json();
        setGeoJsonData(featureCollection);
      } else if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch building data');
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error("Error fetching live buildings:", error);
      }
    } finally {
      if (!signal.aborted) {
        setIsFetching(false);
      }
    }
  }, [map]);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Creates a stable, debounced version of the fetchBuildings function.
  const debouncedFetch = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      fetchBuildings();
    }, 500);
  }, [fetchBuildings]);

  // Safely use the debounced function in map events.
  useMapEvents({
    moveend: debouncedFetch,
    zoomend: debouncedFetch,
  });

  // Initial fetch when the component mounts and cleanup on unmount.
  useEffect(() => {
    debouncedFetch();
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [debouncedFetch]);

  if (!geoJsonData || map.getZoom() < 15) return null;

  return (
    <GeoJSON 
      key={geoJsonData.features.length > 0 ? geoJsonData.features[0].id + geoJsonData.features.length : Math.random()} 
      data={geoJsonData} 
      style={{
        color: '#00FFFF', // Cyan outlines
        weight: 1.5,
        fillColor: '#00FFFF',
        fillOpacity: 0.1
      }} 
    />
  );
}
