'use client'
import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import * as turf from '@turf/turf'
import {
  MousePointerSquare, Trash2, X, Undo, Redo, UploadCloud, File as FileIcon, Loader2, Layers, Table as TableIcon, Wrench, Combine, Ruler, Download
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'


export type EditorTool = 'select' | 'multi-select';

// A small component to render the preview map for a layer
const LayerPreviewMap = ({ data }: { data: any }) => {
    // This component runs inside the map to fit the view to the data
    const MapEffect = ({ dataToFit }: { dataToFit: any }) => {
        const map = useMap();
        useEffect(() => {
            if (dataToFit && dataToFit.features && dataToFit.features.length > 0) {
                try {
                    const geoJsonLayer = L.geoJSON(dataToFit);
                    map.fitBounds(geoJsonLayer.getBounds().pad(0.1));
                } catch(e) {
                    console.error("Could not fit bounds for preview:", e);
                }
            }
        }, [map, dataToFit]);
        return null;
    };

    if (!data) return null;

    return (
        <div className="h-24 rounded-md overflow-hidden relative border bg-muted/30">
            <MapContainer
                center={[0, 0]}
                zoom={1}
                zoomControl={false}
                scrollWheelZoom={false}
                dragging={false}
                doubleClickZoom={false}
                touchZoom={false}
                attributionControl={false}
                style={{ height: '100%', width: '100%', backgroundColor: 'transparent' }}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />
                <GeoJSON data={data} style={{ color: "#2563eb", weight: 1.5 }} />
                <MapEffect dataToFit={data} />
            </MapContainer>
        </div>
    );
};


const FileUploader = ({ layer, title, data, onUpload, isProcessing }: { layer: 'boundary' | 'parcels', title: string, data: any, onUpload: (files: File[], layer: 'boundary' | 'parcels') => void, isProcessing: boolean }) => {
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDrag = useCallback((event: React.DragEvent, type: 'enter' | 'leave' | 'over') => {
        event.preventDefault();
        event.stopPropagation();
        if (type === 'enter' || type === 'over') setIsDragging(true);
        else setIsDragging(false);
    }, []);

    const handleDrop = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);
        if (event.dataTransfer.files) {
            onUpload(Array.from(event.dataTransfer.files), layer);
        }
    }, [onUpload, layer]);

    return (
        <Card 
            className={cn('relative transition-all duration-200 shadow-sm hover:shadow-md', isDragging && 'ring-2 ring-primary')}
            onDragEnter={(e) => handleDrag(e, 'enter')}
            onDragLeave={(e) => handleDrag(e, 'leave')}
            onDragOver={(e) => handleDrag(e, 'over')}
            onDrop={handleDrop}
        >
            <input
                ref={inputRef}
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                multiple
                accept=".shp,.shx,.dbf,.prj,.sbn,.sbx,.fbn,.fbx,.ain,.aih,.ixs,.mxs,.atx,.cpg,.xml"
                onChange={(e) => e.target.files && onUpload(Array.from(e.target.files), layer)}
            />
             <CardContent className="p-2">
                <div className="flex items-center justify-between px-1">
                     <h4 className="font-semibold text-xs">{title}</h4>
                     {data && <Badge variant="secondary">{data.features.length} Features</Badge>}
                </div>
                <div className="mt-2">
                    {isProcessing ? (
                         <div className="h-24 flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg text-muted-foreground bg-secondary/50">
                            <Loader2 className="h-6 w-6 text-primary animate-spin" />
                            <p className="mt-2 font-semibold text-xs">Processing...</p>
                        </div>
                    ) : data ? (
                         <LayerPreviewMap data={data} />
                    ) : (
                         <div
                            className={cn(
                                "h-24 flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg text-muted-foreground transition-colors",
                                isDragging ? "bg-primary/10 border-primary" : "bg-background hover:bg-muted/50"
                            )}
                         >
                            <UploadCloud className="h-6 w-6" />
                            <p className="mt-2 text-xs text-center font-semibold">
                                {isDragging ? "Drop files here" : "Drag & drop or click"}
                            </p>
                        </div>
                    )}
                </div>
             </CardContent>
        </Card>
    );
};


// Helper to get all columns. The user wants to see all data.
const getVisibleColumns = (features: any[]) => {
  if (!features || features.length === 0) return [];
  
  const allHeaders = features.reduce((acc, f) => {
    if (f.properties) {
      Object.keys(f.properties).forEach(key => acc.add(key));
    }
    return acc;
  }, new Set<string>());

  return Array.from(allHeaders);
};

export function ParcelEditorDocker({ onUpload, isProcessing, boundaryData, parcelsData, homesData, selectedFeatureIds, onDeleteSelected, onClearData, onFeatureSelect, onExportGeoJSON, activeTool, onToolSelect, onUndo, onRedo, canUndo, canRedo, onMerge }) {
    const { toast } = useToast();
    const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'} | null>(null);

    const sortedParcels = useMemo(() => {
        if (!parcelsData?.features) return [];
        let features = [...parcelsData.features];
        if (sortConfig !== null) {
            features.sort((a, b) => {
                const aVal = a.properties[sortConfig.key];
                const bVal = b.properties[sortConfig.key];

                const aNum = Number(aVal);
                const bNum = Number(bVal);

                if (!isNaN(aNum) && !isNaN(bNum)) {
                    return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
                }
                
                const aStr = String(aVal).toLowerCase();
                const bStr = String(bVal).toLowerCase();

                if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return features;
    }, [parcelsData, sortConfig]);


    const visibleColumns = useMemo(() => getVisibleColumns(parcelsData?.features || []), [parcelsData]);
    const selectedRowRef = useRef<HTMLTableRowElement>(null);
    
    useEffect(() => {
        if (selectedRowRef.current) {
            selectedRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [selectedFeatureIds]);
    
    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleMeasureArea = () => {
        if (selectedFeatureIds.length !== 1 || !parcelsData) return;
        const feature = parcelsData.features.find((f: any) => f.id === selectedFeatureIds[0]);
        if (!feature) return;

        const areaSqm = turf.area(feature);
        const areaAcres = areaSqm * 0.000247105;
        
        toast({
            title: "Area Measurement",
            description: `Area: ${areaSqm.toFixed(2)} sq. meters (${areaAcres.toFixed(4)} acres)`
        })
    }

    const selectedFeature = useMemo(() => {
        if (selectedFeatureIds.length !== 1) return null;
        return parcelsData?.features.find((f: any) => f.id === selectedFeatureIds[0]);
    }, [parcelsData, selectedFeatureIds]);

    return (
        <div className="flex flex-col h-full w-full overflow-hidden">
            <div className="p-2 border-b flex items-center justify-between shrink-0">
                <h3 className="font-semibold text-sm text-foreground">Parcel Editor</h3>
            </div>
            
            <Tabs defaultValue="layers" className="flex flex-col flex-1 h-full w-full min-h-0">
                <div className="border-b px-2.5">
                    <TabsList className="grid w-full grid-cols-3 h-9">
                        <TabsTrigger value="layers" className="text-xs"><Layers className="size-3 mr-1"/>Layers</TabsTrigger>
                        <TabsTrigger value="table" className="text-xs" disabled={!parcelsData}><TableIcon className="size-3 mr-1"/>Table</TabsTrigger>
                        <TabsTrigger value="tools" className="text-xs" disabled={!parcelsData}><Wrench className="size-3 mr-1"/>Tools</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="layers" className="flex-1 min-h-0 overflow-y-auto p-2.5 data-[state=inactive]:hidden space-y-2">
                    <FileUploader layer="boundary" title="Main Boundary" data={boundaryData} onUpload={onUpload} isProcessing={isProcessing['boundary']} />
                    <FileUploader layer="parcels" title="Parcels Layer" data={parcelsData} onUpload={onUpload} isProcessing={isProcessing['parcels']} />
                </TabsContent>

                <TabsContent value="table" className="flex-1 min-h-0 overflow-auto data-[state=inactive]:hidden">
                    <div className="p-2 h-full">
                        <table className="w-max min-w-full text-[10px] border-collapse">
                            <thead className="sticky top-0 bg-background z-10 shadow-sm">
                                <tr>
                                    {visibleColumns.map(h => 
                                        <th key={h} className="p-1 font-semibold text-left border-b truncate min-w-[70px] cursor-pointer" title={h} onClick={() => requestSort(h)}>
                                            <div className="flex items-center gap-1">
                                                {h}
                                                {sortConfig?.key === h && (sortConfig.direction === 'asc' ? '▲' : '▼')}
                                            </div>
                                        </th>
                                    )}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedParcels.map((f: any) => (
                                    <tr
                                        key={f.id}
                                        ref={selectedFeatureIds.includes(f.id) && selectedFeatureIds.length === 1 && f.id === selectedFeatureIds[0] ? selectedRowRef : null}
                                        onClick={() => onFeatureSelect(f)}
                                        className={cn("cursor-pointer border-b border-border hover:bg-muted/50", selectedFeatureIds.includes(f.id) && "bg-primary/10 hover:bg-primary/20")}
                                    >
                                        {visibleColumns.map(h => <td key={h} className="p-1 truncate" title={String(f.properties[h] ?? '')}>{String(f.properties[h] ?? '')}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </TabsContent>

                <TabsContent value="tools" className="flex-1 min-h-0 overflow-y-auto p-2.5 data-[state=inactive]:hidden">
                    <div className="grid grid-cols-2 gap-1.5">
                        <Button size="sm" variant={activeTool === 'multi-select' ? 'default' : 'outline'} onClick={() => onToolSelect(activeTool === 'select' ? 'multi-select' : 'select')} className="text-xs h-8"><MousePointerSquare className="mr-1.5 h-3.5 w-3.5"/> Multi-Select</Button>
                        <Button size="sm" variant="outline" onClick={onMerge} disabled={selectedFeatureIds.length < 2} className="text-xs h-8"><Combine className="mr-1.5 h-3.5 w-3.5"/> Merge Parcels</Button>
                        <Button size="sm" variant="outline" onClick={handleMeasureArea} disabled={selectedFeatureIds.length !== 1} className="text-xs h-8"><Ruler className="mr-1.5 h-3.5 w-3.5"/> Measure Area</Button>
                        <Button size="sm" variant="outline" onClick={onExportGeoJSON} disabled={!parcelsData} className="text-xs h-8"><Download className="mr-1.5 h-3.5 w-3.5"/> Export GeoJSON</Button>
                        <Button size="sm" variant="destructive" onClick={onDeleteSelected} disabled={selectedFeatureIds.length === 0} className="text-xs h-8"><Trash2 className="mr-1.5 h-3.5 w-3.5"/> Delete Selected</Button>
                        <Button size="sm" variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground text-xs h-8" onClick={onClearData}><X className="mr-1.5 h-3.5 w-3.5"/> Clear All Data</Button>
                        <Button size="sm" variant="outline" onClick={onUndo} disabled={!canUndo} className="text-xs h-8"><Undo className="mr-1.5 h-3.5 w-3.5"/> Undo</Button>
                        <Button size="sm" variant="outline" onClick={onRedo} disabled={!canRedo} className="text-xs h-8"><Redo className="mr-1.5 h-3.5 w-3.5"/> Redo</Button>
                    </div>
                </TabsContent>
            </Tabs>

            <Card className="shrink-0 border-t rounded-t-none border-x-0 border-b-0 max-h-32">
                <CardHeader className="p-1.5 border-b">
                    <CardTitle className="text-xs">
                        {selectedFeatureIds.length > 1 
                            ? `${selectedFeatureIds.length} Features Selected`
                            : "Selected Feature"
                        }
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-2 text-[10px] overflow-y-auto">
                    {!selectedFeature ? (
                         <p className="text-muted-foreground text-center text-[10px] pt-4">
                            {selectedFeatureIds.length > 1 ? `Click a single feature to see its properties.` : `No feature selected`}
                         </p>
                    ) : (
                        <div className="space-y-1.5">
                            {Object.entries(selectedFeature.properties).map(([key, value]) => (
                                <div key={key} className="leading-tight">
                                    <span className="font-semibold text-muted-foreground/90">{key}: </span>
                                    <span className="text-foreground font-medium break-words">{String(value)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
    
