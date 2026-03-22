"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';

interface LiveBuildingsLayerProps {
    onDataFetched: (data: any) => void;
    onStatusChange: (message: string) => void;
}

export default function LiveBuildingsLayer({ onDataFetched, onStatusChange }: LiveBuildingsLayerProps) {
  const map = useMap();
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchBuildings = useCallback(async () => {
    if (map.getZoom() < 15) {
      onDataFetched(null);
      onStatusChange('Zoom in to see live building footprints.');
      return;
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      onStatusChange('Fetching building footprints...');
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
        onDataFetched(featureCollection);
        onStatusChange(`${featureCollection?.features?.length || 0} building footprints loaded.`);
      } else if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch building data');
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error("Error fetching live buildings:", error);
        onDataFetched(null);
        onStatusChange('Failed to load building data.');
      }
    }
  }, [map, onDataFetched, onStatusChange]);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedFetch = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      fetchBuildings();
    }, 500);
  }, [fetchBuildings]);

  useMapEvents({
    moveend: debouncedFetch,
    zoomend: debouncedFetch,
  });

  useEffect(() => {
    debouncedFetch();
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [debouncedFetch]);

  return null;
}
