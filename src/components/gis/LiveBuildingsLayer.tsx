"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useMap, useMapEvents, GeoJSON } from 'react-leaflet';
import type { FeatureCollection } from 'geojson';

interface LiveBuildingsLayerProps {
    onDataFetched: (data: FeatureCollection | null) => void;
    onStatusChange: (message: string) => void;
}

// --- Tile Math Helpers ---
function long2tile(lon: number, zoom: number) {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}

function lat2tile(lat: number, zoom: number) {
  return Math.floor(
    ((1 -
      Math.log(
        Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)
      ) /
        Math.PI) /
      2) *
      Math.pow(2, zoom)
  );
}

function tile2long(x: number, z: number) {
    return (x / Math.pow(2, z)) * 360 - 180;
}

function tile2lat(y: number, z: number) {
    const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
    return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

function getVisibleTiles(bounds: L.LatLngBounds, zoom: number): string[] {
    const clampedZoom = Math.floor(zoom);
    const minLat = bounds.getSouth();
    const maxLat = bounds.getNorth();
    const minLon = bounds.getWest();
    const maxLon = bounds.getEast();

    const minX = long2tile(minLon, clampedZoom);
    const maxX = long2tile(maxLon, clampedZoom);
    const minY = lat2tile(maxLat, clampedZoom);
    const maxY = lat2tile(minLat, clampedZoom);

    const tiles = [];
    for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
            tiles.push(`${clampedZoom}-${x}-${y}`);
        }
    }
    return tiles;
}

// --- Component ---

export default function LiveBuildingsLayer({ onDataFetched, onStatusChange }: LiveBuildingsLayerProps) {
    const map = useMap();
    const [tiles, setTiles] = useState<Record<string, { status: 'loading' | 'loaded' | 'error', data: FeatureCollection | null }>>({});
    const activeRequests = useRef(new Map<string, AbortController>());

    // Effect to aggregate loaded tiles and pass data up to parent
    useEffect(() => {
        const allFeatures = Object.values(tiles)
            .filter(tile => tile.status === 'loaded' && tile.data)
            .flatMap(tile => tile.data!.features);

        onDataFetched(allFeatures.length > 0 ? { type: 'FeatureCollection', features: allFeatures } : null);
    }, [tiles, onDataFetched]);


    const fetchTileData = useCallback(async (tileId: string) => {
        if (activeRequests.current.has(tileId)) {
            activeRequests.current.get(tileId)?.abort();
        }
        const controller = new AbortController();
        activeRequests.current.set(tileId, controller);

        try {
            const [z, x, y] = tileId.split('-').map(Number);
            const west = tile2long(x, z);
            const east = tile2long(x + 1, z);
            const north = tile2lat(y, z);
            const south = tile2lat(y + 1, z);
            const bbox = [west, south, east, north];

            const response = await fetch('/api/gee/extract-live', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bbox, type: 'buildings' }),
                signal: controller.signal,
            });

            if (controller.signal.aborted) return;
            if (!response.ok) throw new Error(`Server error for tile ${tileId}`);
            
            const data = await response.json();

            if (data.url) {
                const res = await fetch(data.url, { signal: controller.signal });
                if (controller.signal.aborted) return;
                const featureCollection = await res.json();
                setTiles(prev => ({ ...prev, [tileId]: { status: 'loaded', data: featureCollection } }));
            } else {
                 throw new Error(data.error || 'Failed to get data URL');
            }
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                console.error(`Error fetching tile ${tileId}:`, error);
                setTiles(prev => ({ ...prev, [tileId]: { status: 'error', data: null } }));
                onStatusChange('Failed to load an area.');
            }
        } finally {
            activeRequests.current.delete(tileId);
        }
    }, [onStatusChange]);

    const updateTiles = useCallback(() => {
        const zoom = map.getZoom();

        if (zoom < 15) {
            if (Object.keys(tiles).length > 0) setTiles({}); // Clear tiles if we zoom out
            onStatusChange('Zoom in to see live building footprints.');
            return;
        }

        const requiredTiles = getVisibleTiles(map.getBounds(), zoom);
        let newTilesRequested = 0;

        for (const tileId of requiredTiles) {
            if (!tiles[tileId]) {
                newTilesRequested++;
                setTiles(prev => ({ ...prev, [tileId]: { status: 'loading', data: null } }));
                fetchTileData(tileId);
            }
        }

        if (newTilesRequested > 0) {
            onStatusChange(`Loading ${newTilesRequested} new area(s)...`);
        } else if(Object.values(tiles).some(t => t.status === 'loading')) {
            // Already loading
        } else {
            onStatusChange('All visible areas loaded.');
        }

    }, [map, tiles, fetchTileData, onStatusChange]);

    useMapEvents({
        moveend: updateTiles,
    });
    
    useEffect(() => {
      // Initial load check
      updateTiles();
      
      // Cleanup on unmount
      return () => {
          activeRequests.current.forEach(controller => controller.abort());
      };
    }, []);

    return (
        <>
            {Object.entries(tiles).map(([tileId, tileInfo]) => {
                if (tileInfo.status === 'loaded' && tileInfo.data?.features?.length) {
                    return (
                        <GeoJSON
                            key={tileId}
                            data={tileInfo.data}
                            style={{ color: '#00FFFF', weight: 1.5, fillColor: '#00FFFF', fillOpacity: 0.1 }}
                        />
                    );
                }
                return null;
            })}
        </>
    );
}