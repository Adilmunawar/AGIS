'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import type { FeatureCollection } from 'geojson';
import L, { type LatLngBounds } from 'leaflet';

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

// --- CONSTANTS ---
const LOCAL_STORAGE_KEY = 'agis_gis_data_state';


// --- CONTEXT & PROVIDER ---

const GisDataContext = createContext<GisDataContextValue | undefined>(undefined);

export function GisDataProvider({ children }: { children: ReactNode }) {
    // Lazy initialization of state from localStorage on the client side
    const [state, setState] = useState<GisDataContextState>(() => {
        if (typeof window === 'undefined') {
            return initialState;
        }
        try {
            const item = window.localStorage.getItem(LOCAL_STORAGE_KEY);
            if (item) {
                // Use a reviver to reconstruct Leaflet LatLngBounds objects from JSON
                const parsedState = JSON.parse(item, (key, value) => {
                    if (value && value._southWest && value._northEast && value._southWest.lat !== undefined) {
                        return L.latLngBounds(value._southWest, value._northEast);
                    }
                    return value;
                });
                
                // Deep merge with initial state to prevent errors if the stored data structure is outdated
                const mergedState = {
                    ...initialState,
                    ...parsedState,
                    digitize: { ...initialState.digitize, ...(parsedState.digitize || {}) },
                    extractRoads: { ...initialState.extractRoads, ...(parsedState.extractRoads || {}) },
                    nanoVision: { ...initialState.nanoVision, ...(parsedState.nanoVision || {}) },
                    importParcels: { ...initialState.importParcels, ...(parsedState.importParcels || {}) },
                };

                return mergedState;
            }
        } catch (error) {
            console.error("Error reading GIS state from localStorage:", error);
        }
        return initialState;
    });

    // Effect to persist state to localStorage whenever it changes
    useEffect(() => {
        try {
            const serializedState = JSON.stringify(state);
            window.localStorage.setItem(LOCAL_STORAGE_KEY, serializedState);
        } catch (error) {
            console.error("Error writing GIS state to localStorage:", error);
        }
    }, [state]);

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
