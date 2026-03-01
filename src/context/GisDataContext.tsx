'use client';

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import type { FeatureCollection } from 'geojson';

// --- TYPE DEFINITIONS ---

// A serializable representation of Leaflet's LatLng
interface SerializableLatLng {
  lat: number;
  lng: number;
}

// A serializable representation of Leaflet's LatLngBounds
interface SerializableLatLngBounds {
  _southWest: SerializableLatLng;
  _northEast: SerializableLatLng;
}

// Shape of state for a standard map tool
interface MapToolState {
  geoData: FeatureCollection | null;
  selectionBounds: SerializableLatLngBounds | null;
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
  history: any[];
  historyIndex: number;
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
  undo: () => void;
  redo: () => void;
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
  history: [],
  historyIndex: -1,
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
    const [state, setState] = useState<GisDataContextState>(() => {
        if (typeof window === 'undefined') {
            return initialState;
        }
        try {
            const item = window.localStorage.getItem(LOCAL_STORAGE_KEY);
            if (item) {
                const parsedState = JSON.parse(item);
                
                const mergedState = {
                    ...initialState,
                    ...parsedState,
                    digitize: { ...initialState.digitize, ...(parsedState.digitize || {}) },
                    extractRoads: { ...initialState.extractRoads, ...(parsedState.extractRoads || {}) },
                    nanoVision: { ...initialState.nanoVision, ...(parsedState.nanoVision || {}) },
                    importParcels: { ...initialState.importParcels, ...(parsedState.importParcels || {}), history: [], historyIndex: -1 }, // Reset history on load
                };

                 // If loaded data exists, initialize history
                if (mergedState.importParcels.parcelsData) {
                    mergedState.importParcels.history = [mergedState.importParcels.parcelsData];
                    mergedState.importParcels.historyIndex = 0;
                }

                return mergedState;
            }
        } catch (error) {
            console.error("Error reading GIS state from localStorage:", error);
        }
        return initialState;
    });

    useEffect(() => {
        try {
            // Don't persist history, it can be large and is session-specific
            const stateToSave = { ...state, importParcels: { ...state.importParcels, history: [], historyIndex: -1 } };
            const serializedState = JSON.stringify(stateToSave);
            window.localStorage.setItem(LOCAL_STORAGE_KEY, serializedState);
        } catch (error) {
            console.error("Error writing GIS state to localStorage:", error);
        }
    }, [state]);

    const updateToolState = useCallback(<T extends keyof GisDataContextState>(
        tool: T, 
        newState: Partial<GisDataContextState[T]>,
        options?: { manageHistory?: boolean }
    ) => {
        const manageHistory = options?.manageHistory ?? true;
        
        const processedNewState = { ...newState };
        if ('selectionBounds' in processedNewState && processedNewState.selectionBounds) {
            const bounds = processedNewState.selectionBounds as any;
            if (typeof bounds.toBBoxString === 'function') {
                (processedNewState as any).selectionBounds = bounds.toJSON();
            }
        }
        
        setState(prevState => {
            const oldToolState = prevState[tool];
            const newToolState = { ...oldToolState, ...processedNewState };

            if (tool === 'importParcels' && manageHistory) {
                const oldParcelsState = oldToolState as ImportParcelsState;
                const newParcelsState = newToolState as ImportParcelsState;

                const hasDataChanged = JSON.stringify(oldParcelsState.parcelsData) !== JSON.stringify(newParcelsState.parcelsData);

                if (hasDataChanged) {
                    const history = oldParcelsState.history.slice(0, oldParcelsState.historyIndex + 1);
                    history.push(newParcelsState.parcelsData);
                    
                    newParcelsState.history = history;
                    newParcelsState.historyIndex = history.length - 1;
                }
            }

            return { ...prevState, [tool]: newToolState };
        });
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
            [tool]: initial as any,
        }));
    }, []);

    const undo = useCallback(() => {
        const { history, historyIndex } = state.importParcels;
        if (historyIndex > 0) {
            updateToolState('importParcels', {
                parcelsData: history[historyIndex - 1],
                historyIndex: historyIndex - 1,
            }, { manageHistory: false });
        }
    }, [state.importParcels, updateToolState]);

    const redo = useCallback(() => {
        const { history, historyIndex } = state.importParcels;
        if (historyIndex < history.length - 1) {
            updateToolState('importParcels', {
                parcelsData: history[historyIndex + 1],
                historyIndex: historyIndex + 1,
            }, { manageHistory: false });
        }
    }, [state.importParcels, updateToolState]);


    const value = {
        ...state,
        updateToolState,
        resetToolState,
        undo,
        redo
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
