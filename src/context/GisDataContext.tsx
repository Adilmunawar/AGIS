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

// A snapshot of the editable data layers for history
interface HistoryEntry {
    parcelsData: any | null;
    boundaryData: any | null;
    homesData: any | null;
}

// Shape of state for the multi-step import tool
interface ImportParcelsState {
  step: 'boundary' | 'parcels' | 'preview';
  boundaryData: any | null;
  boundaryName: string;
  parcelsData: any | null;
  parcelsName: string;
  homesData: any | null;
  homesName: string;
  selectedFeatureId: number | string | null;
  history: HistoryEntry[];
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
  updateToolState: <T extends keyof GisDataContextState>(tool: T, newState: Partial<GisDataContextState[T]>, options?: { manageHistory?: boolean }) => void;
  resetToolState: (tool: keyof GisDataContextState) => void;
  undo: () => void;
  redo: () => void;
  deleteFeature: (featureId: string) => void;
  clearAllLayers: () => void;
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
  homesData: null,
  homesName: '',
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
                if (mergedState.importParcels.parcelsData || mergedState.importParcels.boundaryData || mergedState.importParcels.homesData) {
                    mergedState.importParcels.history = [{
                        parcelsData: mergedState.importParcels.parcelsData,
                        boundaryData: mergedState.importParcels.boundaryData,
                        homesData: mergedState.importParcels.homesData,
                    }];
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
                
                const hasDataChanged = JSON.stringify({
                    p: oldParcelsState.parcelsData, 
                    b: oldParcelsState.boundaryData,
                    h: oldParcelsState.homesData
                }) !== JSON.stringify({
                    p: newParcelsState.parcelsData,
                    b: newParcelsState.boundaryData,
                    h: newParcelsState.homesData
                });

                if (hasDataChanged) {
                    const history = oldParcelsState.history.slice(0, oldParcelsState.historyIndex + 1);
                    history.push({
                        parcelsData: newParcelsState.parcelsData,
                        boundaryData: newParcelsState.boundaryData,
                        homesData: newParcelsState.homesData,
                    });
                    
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

    const deleteFeature = useCallback((featureId: string) => {
        const { importParcels } = state;
        let changed = false;

        const createFilteredCollection = (data: FeatureCollection | null) => {
            if (!data || !data.features) return null;
            const newFeatures = data.features.filter((f: any) => {
                if (f.id === featureId) {
                    changed = true;
                    return false;
                }
                return true;
            });
            
            if (newFeatures.length === data.features.length) return data;
            
            return { ...data, features: newFeatures };
        };

        const newParcelsData = createFilteredCollection(importParcels.parcelsData);
        const newBoundaryData = createFilteredCollection(importParcels.boundaryData);
        const newHomesData = createFilteredCollection(importParcels.homesData);

        if (changed) {
            updateToolState('importParcels', {
                parcelsData: newParcelsData,
                boundaryData: newBoundaryData,
                homesData: newHomesData,
                selectedFeatureId: importParcels.selectedFeatureId === featureId ? null : importParcels.selectedFeatureId,
            });
        }
    }, [state, updateToolState]);

    const clearAllLayers = useCallback(() => {
        updateToolState('importParcels', {
            boundaryData: null,
            boundaryName: '',
            parcelsData: null,
            parcelsName: '',
            homesData: null,
            homesName: '',
            selectedFeatureId: null,
        });
    }, [updateToolState]);

    const undo = useCallback(() => {
        const { history, historyIndex } = state.importParcels;
        if (historyIndex > 0) {
            const previousState = history[historyIndex - 1];
            updateToolState('importParcels', {
                ...previousState, // contains parcelsData, boundaryData, homesData
                historyIndex: historyIndex - 1,
            }, { manageHistory: false });
        }
    }, [state.importParcels, updateToolState]);

    const redo = useCallback(() => {
        const { history, historyIndex } = state.importParcels;
        if (historyIndex < history.length - 1) {
            const nextState = history[historyIndex + 1];
            updateToolState('importParcels', {
                ...nextState,
                historyIndex: historyIndex + 1,
            }, { manageHistory: false });
        }
    }, [state.importParcels, updateToolState]);

    const value: GisDataContextValue = {
        ...state,
        updateToolState,
        resetToolState,
        undo,
        redo,
        deleteFeature,
        clearAllLayers,
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
