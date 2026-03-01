'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import type { FeatureCollection } from 'geojson';
import type { LatLngBounds } from 'leaflet';

// --- TYPE DEFINITIONS ---

// Shape of state for a standard map tool
interface MapToolState {
  geoData: FeatureCollection | null;
  selectionBounds: LatLngBounds | null;
  polygonCoords: string | null;
}

// Shape of state for the multi-step import tool
interface ImportParcelsState {
  step: 'boundary' | 'parcels' | 'preview';
  boundaryData: any | null;
  boundaryName: string;
  parcelsData: any | null;
  parcelsName: string;
  selectedFeatureId: number | string | null;
}

// Defines the overall state structure managed by the context
interface GisDataContextState {
  digitize: MapToolState;
  extractRoads: MapToolState;
  nanoVision: MapToolState;
  importParcels: ImportParcelsState;
}

// Defines the context value, including state and updater functions
interface GisDataContextValue extends GisDataContextState {
  updateToolState: <T extends keyof GisDataContextState>(tool: T, newState: Partial<GisDataContextState[T]>) => void;
  resetToolState: (tool: keyof GisDataContextState) => void;
}

// --- INITIAL STATES ---

const initialMapToolState: MapToolState = {
  geoData: null,
  selectionBounds: null,
  polygonCoords: null,
};

const initialImportParcelsState: ImportParcelsState = {
  step: 'boundary',
  boundaryData: null,
  boundaryName: '',
  parcelsData: null,
  parcelsName: '',
  selectedFeatureId: null,
};

const initialState: GisDataContextState = {
  digitize: initialMapToolState,
  extractRoads: initialMapToolState,
  nanoVision: initialMapToolState,
  importParcels: initialImportParcelsState,
};

// --- CONTEXT & PROVIDER ---

const GisDataContext = createContext<GisDataContextValue | undefined>(undefined);

export function GisDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GisDataContextState>(initialState);

  const updateToolState = useCallback(<T extends keyof GisDataContextState>(tool: T, newState: Partial<GisDataContextState[T]>) => {
    setState(prevState => ({
      ...prevState,
      [tool]: {
        ...prevState[tool],
        ...newState,
      },
    }));
  }, []);
  
  const resetToolState = useCallback((tool: keyof GisDataContextState) => {
    let initial;
    switch(tool) {
        case 'importParcels':
            initial = initialImportParcelsState;
            break;
        default:
            initial = initialMapToolState;
            break;
    }
    setState(prevState => ({
        ...prevState,
        [tool]: initial as any, // Type assertion is safe here
    }));
  }, []);

  const value = {
    ...state,
    updateToolState,
    resetToolState,
  };

  return (
    <GisDataContext.Provider value={value}>
      {children}
    </GisDataContext.Provider>
  );
}

// --- HOOK ---

export function useGisData() {
  const context = useContext(GisDataContext);
  if (context === undefined) {
    throw new Error('useGisData must be used within a GisDataProvider');
  }
  return context;
}
